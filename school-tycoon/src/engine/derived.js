// Memoized derived data. Nothing here is saved; it is recomputed from grid/rooms/staff.
import { ROOMS, BALANCE, FACILITY_KINDS } from './config/index.js';
import { adjacentIndices, hallBfs } from './grid.js';
import { clamp, idNum } from './util.js';

const baseCache = new WeakMap(); // grid -> { rooms, size, base }

// Connectivity, facility distances, counts and upkeep. Keyed by grid + rooms identity.
export function computeBase(game) {
  const { grid, rooms, size } = game;
  const hit = baseCache.get(grid);
  if (hit && hit.rooms === rooms && hit.size === size) return hit.base;
  const base = buildBase(grid, size, rooms);
  baseCache.set(grid, { rooms, size, base });
  return base;
}

function buildBase(grid, size, rooms) {
  const B = BALANCE;
  let office = null;
  for (const id in rooms) {
    if (rooms[id].type === 'office') { office = rooms[id]; break; }
  }
  const hallDist = hallBfs(grid, size, office ? adjacentIndices(office, size) : [], null);

  const connected = {};
  const counts = {}; // connected count by type
  const totals = {}; // total count by type
  const adj = {};
  const facilitySources = { restroom: [], cafeteria: [] };
  let upkeep = 0;
  let decor = 0;
  const ids = Object.keys(rooms).sort((a, b) => idNum(a) - idNum(b));
  for (const id of ids) {
    const r = rooms[id];
    const def = ROOMS[r.type];
    if (!def) continue;
    totals[r.type] = (totals[r.type] || 0) + 1;
    if (def.kind !== 'office') upkeep += Math.max(B.upkeepMinPerRoom, Math.round(r.cost * B.upkeepRate));
    if (def.kind === 'decor') decor += def.decor || 0;
    let isConn;
    if (def.kind === 'office' || def.kind === 'decor') {
      isConn = true;
      adj[id] = [];
    } else {
      const a = adjacentIndices(r, size).filter((i) => grid[i] === 'hall' && hallDist[i] >= 0);
      adj[id] = a;
      isConn = a.length > 0;
    }
    connected[id] = isConn;
    if (isConn) {
      counts[r.type] = (counts[r.type] || 0) + 1;
      if (def.facility && facilitySources[def.facility]) {
        for (const i of adj[id]) facilitySources[def.facility].push(i);
      }
    }
  }

  let hallCount = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] === 'hall') hallCount++;
  upkeep += Math.round(hallCount * ROOMS.hall.cost * B.upkeepRate);

  const fdist = {};
  for (const kind of FACILITY_KINDS) {
    fdist[kind] = facilitySources[kind].length ? hallBfs(grid, size, facilitySources[kind], hallDist) : null;
  }

  const dist = {}; // id -> { dR, dC }
  const seatRooms = [];
  for (const id of ids) {
    const r = rooms[id];
    const def = ROOMS[r.type];
    if (!def || def.kind !== 'room') continue;
    const d = { dR: B.missingDistance, dC: B.missingDistance };
    for (const i of adj[id]) {
      if (fdist.restroom && fdist.restroom[i] >= 0) d.dR = Math.min(d.dR, fdist.restroom[i] + 1);
      if (fdist.cafeteria && fdist.cafeteria[i] >= 0) d.dC = Math.min(d.dC, fdist.cafeteria[i] + 1);
    }
    dist[id] = d;
    if (def.seats && connected[id]) seatRooms.push(id);
  }
  // Best room first: highest learning bonus, then most seats, then oldest.
  seatRooms.sort((a, b) => {
    const da = ROOMS[rooms[a].type];
    const db = ROOMS[rooms[b].type];
    return (db.learnBonus - da.learnBonus) || (db.seats - da.seats) || (idNum(a) - idNum(b));
  });

  return {
    hallDist, connected, counts, totals, dist, seatRooms, upkeep, hallCount,
    decor: Math.min(B.decorCap, decor),
    staffCache: null,
    nCache: null,
  };
}

// Per-room modifiers for N enrolled students (DESIGN §3 designer formulas).
export function roomMods(d, N, nRest, nCaf) {
  const B = BALANCE;
  const L = nRest > 0 ? N / (B.restroomCapacity * nRest) : 0;
  const dReff = d.dR + B.restroomOverloadDistance * Math.max(0, L - 1);
  const over = nCaf === 0 || N > B.cafeteriaCapacity * nCaf;
  const late = clamp(
    (dReff - B.lateRestroomFree) / B.lateRestroomDiv + (d.dC - B.lateCafeteriaFree) / B.lateCafeteriaDiv,
    0, B.lateMax,
  );
  const hR = nRest === 0
    ? B.hRestroomMissing
    : B.hRestroomBase - B.hRestroomSpan * clamp((dReff - B.lateRestroomFree) / B.hRestroomDiv, 0, 1);
  const hC = over
    ? B.hCafeteriaBad
    : B.hCafeteriaBase - B.hCafeteriaSpan * clamp((d.dC - B.lateCafeteriaFree) / B.hCafeteriaDiv, 0, 1);
  return { dR: d.dR, dC: d.dC, late, hR, hC };
}

// Room stats + public derived view for the current student count (cached on base).
export function computeDerivedView(game) {
  const base = computeBase(game);
  const N = game.students;
  if (base.nCache && base.nCache.N === N) return base.nCache.view;
  const nRest = base.counts.restroom || 0;
  const nCaf = base.counts.cafeteria || 0;
  const roomStats = {};
  for (const id in base.dist) roomStats[id] = roomMods(base.dist[id], N, nRest, nCaf);
  const view = {
    connected: base.connected,
    roomStats,
    hallDist: base.hallDist,
    counts: base.counts,
    restroomLoad: nRest > 0 ? N / (BALANCE.restroomCapacity * nRest) : null,
    cafeteriaOver: nCaf === 0 || N > BALANCE.cafeteriaCapacity * nCaf,
  };
  base.nCache = { N, view };
  return view;
}

// Teacher assignment: best teacher to best connected seat room. Keyed by base + staff identity.
export function computeStaffing(game) {
  const base = computeBase(game);
  const staff = game.staff;
  if (base.staffCache && base.staffCache.staff === staff) return base.staffCache.value;
  const teachers = [];
  let janitors = 0;
  let nurses = 0;
  let salaries = 0;
  for (const id in staff) {
    const s = staff[id];
    salaries += s.salary;
    if (s.role === 'teacher') teachers.push(s);
    else if (s.role === 'janitor') janitors++;
    else if (s.role === 'nurse') nurses++;
  }
  teachers.sort((a, b) => (b.skill - a.skill) || (idNum(a.id) - idNum(b.id)));
  const penalty = (base.counts.staffroom || 0) > 0 ? 0 : BALANCE.noStaffRoomSkillPenalty;
  const assignment = {};
  const active = [];
  let capacity = 0;
  const n = Math.min(teachers.length, base.seatRooms.length);
  for (let i = 0; i < n; i++) {
    const roomId = base.seatRooms[i];
    const t = teachers[i];
    const room = game.rooms[roomId];
    const def = ROOMS[room.type];
    assignment[roomId] = t.id;
    const skill = Math.max(BALANCE.minTeacherSkill, t.skill - penalty);
    active.push({ id: roomId, seats: def.seats, bonus: def.learnBonus, skill });
    capacity += def.seats;
  }
  const value = { assignment, active, capacity, janitors, nurses, salaries, teachers: teachers.length };
  base.staffCache = { staff, value };
  return value;
}
