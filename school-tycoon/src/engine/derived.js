// Memoized derived data (never saved). Layers, each cached on the identity of its inputs:
//   base       (grid, rooms, size)        connectivity, adjacency, counts, upkeep
//   quality    (interiors, rooms)         per-room interior analysis (interior.js)
//   facilities (base, quality, offline)   working restrooms/cafeterias, distances, school-wide furniture
//   staffing   (facilities, staff)        teacher assignment, capacity
//   view       (facilities, students)     roomStats for the UI
import { ROOMS, BALANCE, hasInterior } from './config/index.js';
import { adjacentIndices, hallBfs } from './grid.js';
import { roomQuality } from './interior.js';
import { clamp, idNum } from './util.js';

const B = BALANCE;
const EMPTY = {};
const EMPTY_INTERIOR = { items: [] };

const baseCache = new WeakMap(); // grid -> { rooms, size, base }

export function computeBase(game) {
  const { grid, rooms, size } = game;
  const hit = baseCache.get(grid);
  if (hit && hit.rooms === rooms && hit.size === size) return hit.base;
  const base = buildBase(grid, size, rooms);
  baseCache.set(grid, { rooms, size, base });
  return base;
}

function buildBase(grid, size, rooms) {
  let office = null;
  for (const id in rooms) {
    if (rooms[id].type === 'office') { office = rooms[id]; break; }
  }
  const hallDist = hallBfs(grid, size, office ? adjacentIndices(office, size) : [], null);
  const connected = {};
  const counts = {};
  const totals = {};
  const adj = {};
  const onEdge = {};
  let upkeep = 0;
  let decor = 0;
  const ids = Object.keys(rooms).sort((a, b) => idNum(a) - idNum(b));
  for (const id of ids) {
    const r = rooms[id];
    const def = ROOMS[r.type];
    if (!def) continue;
    totals[r.type] = (totals[r.type] || 0) + 1;
    if (def.kind !== 'office') upkeep += Math.max(B.upkeepMinPerRoom, Math.round(r.cost * (def.upkeepRate || B.upkeepRate)));
    if (def.kind === 'decor') decor += def.decor || 0;
    if (def.edge) onEdge[id] = r.x === 0 || r.y === 0 || r.x + r.w === size || r.y + r.h === size;
    let isConn;
    if (def.kind === 'office' || def.kind === 'decor' || def.outdoor) {
      isConn = true;
      adj[id] = def.outdoor ? adjacentIndices(r, size).filter((i) => grid[i] === 'hall' && hallDist[i] >= 0) : [];
    } else {
      adj[id] = adjacentIndices(r, size).filter((i) => grid[i] === 'hall' && hallDist[i] >= 0);
      isConn = adj[id].length > 0;
    }
    connected[id] = isConn;
    if (isConn) counts[r.type] = (counts[r.type] || 0) + 1;
  }
  let hallCount = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] === 'hall') hallCount++;
  upkeep += Math.round(hallCount * ROOMS.hall.cost * B.upkeepRate);
  return {
    hallDist, connected, counts, totals, adj, ids, onEdge, upkeep, hallCount,
    decor: Math.min(B.decorCap, decor),
  };
}

const qualityCache = new WeakMap(); // interiors -> { rooms, value }

// { [roomId]: quality } for every room with an interior. Memoized on interiors + rooms.
export function computeQuality(game) {
  const interiors = game.interiors || EMPTY;
  const hit = qualityCache.get(interiors);
  if (hit && hit.rooms === game.rooms) return hit.value;
  const value = {};
  for (const id in game.rooms) {
    const type = game.rooms[id].type;
    if (hasInterior(type)) value[id] = roomQuality(type, interiors[id] || EMPTY_INTERIOR);
  }
  qualityCache.set(interiors, { rooms: game.rooms, value });
  return value;
}

const facCache = new WeakMap(); // base -> { quality, offline, value }

export function computeFacilities(game) {
  const base = computeBase(game);
  const quality = computeQuality(game);
  const offline = (game.effects && game.effects.offline) || EMPTY;
  const hit = facCache.get(base);
  if (hit && hit.quality === quality && hit.offline === offline) return hit.value;
  const value = buildFacilities(game, base, quality, offline);
  facCache.set(base, { quality, offline, value });
  return value;
}

function buildFacilities(game, base, quality, offline) {
  const { rooms, grid, size } = game;
  const src = { restroom: [], cafeteria: [] };
  const cap = { restroom: 0, cafeteria: 0 };
  const comfort = { restroom: 0, cafeteria: 0 };
  const working = { restroom: 0, cafeteria: 0 };
  let Hy = 0; let clean = 0; let rep = 0; let otherHappy = 0; let libraryBonus = 0;
  for (const id of base.ids) {
    const r = rooms[id];
    const def = ROOMS[r.type];
    if (!def || !base.connected[id]) continue;
    const q = quality[id];
    if (!q) continue;
    Hy += q.stats.Hy; clean += q.stats.clean; rep += q.stats.rep;
    if (def.facility && src[def.facility] && q.capacity > 0 && !offline[id]) {
      for (const i of base.adj[id]) src[def.facility].push(i);
      cap[def.facility] += q.capacity;
      comfort[def.facility] += q.happyBonus;
      working[def.facility] += 1;
    }
    if (q.category === 'other' || q.category === 'library') otherHappy += q.happyBonus;
    if (q.category === 'library') libraryBonus = Math.max(libraryBonus, q.libraryBonus);
  }
  const fdist = {
    restroom: src.restroom.length ? hallBfs(grid, size, src.restroom, base.hallDist) : null,
    cafeteria: src.cafeteria.length ? hallBfs(grid, size, src.cafeteria, base.hallDist) : null,
  };
  const dist = {};
  const seatRooms = [];
  for (const id of base.ids) {
    const r = rooms[id];
    const def = ROOMS[r.type];
    if (!def || def.kind !== 'room') continue;
    const d = { dR: B.missingDistance, dC: B.missingDistance };
    for (const i of base.adj[id]) {
      if (fdist.restroom && fdist.restroom[i] >= 0) d.dR = Math.min(d.dR, fdist.restroom[i] + 1);
      if (fdist.cafeteria && fdist.cafeteria[i] >= 0) d.dC = Math.min(d.dC, fdist.cafeteria[i] + 1);
    }
    dist[id] = d;
    if (def.seats && base.connected[id] && quality[id] && quality[id].seats > 0) seatRooms.push(id);
  }
  const bonusOf = (id) => ROOMS[rooms[id].type].learnBonus * quality[id].learnMult;
  seatRooms.sort((a, b) => (bonusOf(b) - bonusOf(a)) || (quality[b].seats - quality[a].seats) || (idNum(a) - idNum(b)));
  return {
    dist, seatRooms,
    restroomCapacity: cap.restroom,
    cafeteriaCapacity: cap.cafeteria,
    restroomComfort: working.restroom ? comfort.restroom / working.restroom : 0,
    cafeteriaComfort: working.cafeteria ? comfort.cafeteria / working.cafeteria : 0,
    workingRestrooms: working.restroom,
    workingCafeterias: working.cafeteria,
    hygiene: Hy,
    hygieneMult: 1 - B.hygieneMax * (Hy > 0 ? Hy / (Hy + B.hygieneHalf) : 0),
    furnitureClean: clean,
    furnitureRep: Math.min(B.furnitureRepCap, rep),
    otherHappy: Math.min(B.otherComfortCap, otherHappy),
    libraryBonus,
    staffCache: null,
    nCache: null,
  };
}

// Per-room modifiers for N students (DESIGN §3, with v2 capacities and comfort).
export function roomMods(d, N, fac) {
  const restCap = fac.restroomCapacity;
  const cafCap = fac.cafeteriaCapacity;
  const L = restCap > 0 ? N / restCap : 0;
  const dReff = d.dR + B.restroomOverloadDistance * Math.max(0, L - 1);
  const over = cafCap === 0 || N > cafCap;
  const late = clamp(
    (dReff - B.lateRestroomFree) / B.lateRestroomDiv + (d.dC - B.lateCafeteriaFree) / B.lateCafeteriaDiv,
    0, B.lateMax,
  );
  const hR = restCap === 0
    ? B.hRestroomMissing
    : B.hRestroomBase - B.hRestroomSpan * clamp((dReff - B.lateRestroomFree) / B.hRestroomDiv, 0, 1) + fac.restroomComfort;
  const hC = over
    ? B.hCafeteriaBad
    : B.hCafeteriaBase - B.hCafeteriaSpan * clamp((d.dC - B.lateCafeteriaFree) / B.hCafeteriaDiv, 0, 1) + fac.cafeteriaComfort;
  return { dR: d.dR, dC: d.dC, late, hR, hC };
}

export function computeDerivedView(game) {
  const base = computeBase(game);
  const fac = computeFacilities(game);
  const N = game.students;
  if (fac.nCache && fac.nCache.N === N) return fac.nCache.view;
  const roomStats = {};
  for (const id in fac.dist) roomStats[id] = roomMods(fac.dist[id], N, fac);
  const view = {
    connected: base.connected,
    roomStats,
    hallDist: base.hallDist,
    counts: base.counts,
    restroomLoad: fac.restroomCapacity > 0 ? N / fac.restroomCapacity : null,
    cafeteriaOver: fac.cafeteriaCapacity === 0 || N > fac.cafeteriaCapacity,
    restroomCapacity: fac.restroomCapacity,
    cafeteriaCapacity: fac.cafeteriaCapacity,
  };
  fac.nCache = { N, view };
  return view;
}

export function computeStaffing(game) {
  const base = computeBase(game);
  const fac = computeFacilities(game);
  const quality = computeQuality(game);
  const staff = game.staff;
  const mult = (game.modifiers && game.modifiers.salaryMult) || 1;
  if (fac.staffCache && fac.staffCache.staff === staff && fac.staffCache.mult === mult) return fac.staffCache.value;
  const teachers = [];
  const roles = { janitor: 0, nurse: 0, counselor: 0 };
  let salaries = 0;
  for (const id in staff) {
    const s = staff[id];
    salaries += s.salary;
    if (s.role === 'teacher') teachers.push(s);
    else roles[s.role] = (roles[s.role] || 0) + 1;
  }
  teachers.sort((a, b) => (b.skill - a.skill) || (idNum(a.id) - idNum(b.id)));
  const penalty = (base.counts.staffroom || 0) > 0 ? 0 : B.noStaffRoomSkillPenalty;
  const assignment = {};
  const active = [];
  let capacity = 0;
  const n = Math.min(teachers.length, fac.seatRooms.length);
  for (let i = 0; i < n; i++) {
    const roomId = fac.seatRooms[i];
    const t = teachers[i];
    const def = ROOMS[game.rooms[roomId].type];
    const q = quality[roomId];
    assignment[roomId] = t.id;
    const skill = Math.max(B.minTeacherSkill, t.skill - penalty);
    active.push({ id: roomId, seats: q.seats, bonus: def.learnBonus * q.learnMult, skill, happy: (def.seatHappiness || 0) + q.happyBonus });
    capacity += q.seats;
  }
  const value = {
    assignment, active, capacity, salaries: Math.round(salaries * mult), teachers: teachers.length,
    janitors: roles.janitor, nurses: roles.nurse, counselors: roles.counselor,
  };
  fac.staffCache = { staff, mult, value };
  return value;
}
