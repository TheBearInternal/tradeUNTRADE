import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, starterSchool, quiet } from './helpers.mjs';

// Forces one pack event to fire on the next settlement (other chances zeroed, flu disabled).
function force(id, fn) {
  const saved = {};
  for (const k of E.EVENT_ORDER) { saved[k] = E.EVENTS[k].chance; E.EVENTS[k].chance = k === id ? 0.999999 : 0; }
  const flu = E.BALANCE.fluChance;
  E.BALANCE.fluChance = 0;
  try { return fn(); } finally {
    for (const k of E.EVENT_ORDER) E.EVENTS[k].chance = saved[k];
    E.BALANCE.fluChance = flu;
  }
}

const school = (patch) => withGame(quiet(days(starterSchool(), 10)), { cash: 50000, ...patch });
const fire = (r) => { const x = E.reduce(r, A.tick(24)); assert.ok(x.game.event, 'event fired'); return x; };

test('event pack: conditions gate events', () => force('sports_day', () => {
  const r = school({ level: 3 });
  assert.equal(E.reduce(r, A.tick(24)).game.event, null, 'needs a gym or sports field');
  const early = withGame(starterSchool(), { cash: 50000 });
  assert.equal(E.reduce(early, A.tick(24)).game.event, null, 'minDay');
}));

test('Sports Day: host wins and the Trophy Case adds reputation', () => force('sports_day', () => {
  let r = school({ tier: 2, level: 10, reputation: 100 });
  r = run(r, A.build('gym', 0, 0), A.buildHallLine([{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 }, { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }]), A.build('trophycase', 15, 15));
  r = fire(r);
  const ev = r.game.event;
  assert.equal(ev.id, 'sports_day');
  assert.equal(ev.kind, 'pack');
  assert.deepEqual(ev.choices.map((c) => c.id), ['host', 'skip']);
  const h = run(r, A.resolveEvent('host'));
  assert.equal(h.game.cash, r.game.cash - 300);
  assert.equal(h.game.reputation, r.game.reputation + 10 + 15);
  assert.equal(h.game.eventCooldowns.sports_day, r.game.day);
  // cooldown: no second sports day right away
  assert.ok(!E.reduce(h, A.tick(24)).game.event);
}));

test('Science Fair rewards x2 with a Robotics Lab', () => force('science_fair', () => {
  let r = school({ tier: 3, size: 16, level: 18, reputation: 100 });
  r = run(r, A.build('sciencelab', 0, 0), A.buildHallLine([{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 }, { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }]));
  const f1 = fire(r);
  const plain = run(f1, A.resolveEvent('enter'));
  r = run(r, A.build('roboticslab', 3, 0), A.buildHallLine([{ x: 3, y: 3 }]));
  const f2 = fire(r);
  const robo = run(f2, A.resolveEvent('enter'));
  assert.equal(plain.game.reputation - f1.game.reputation, 15);
  assert.equal(robo.game.reputation - f2.game.reputation, 30);
  assert.equal(robo.game.cash, f2.game.cash - 200, 'costs are not doubled');
  assert.ok(robo.game.xp - f2.game.xp >= 60);
}));

test('Donor Challenge: build the room in time for $5000, or it expires', () => force('donor_challenge', () => {
  const r = fire(school({ level: 3 }));
  const room = r.game.event.params.room;
  assert.ok(E.ROOMS[room]);
  assert.ok(r.game.event.text.includes(E.ROOMS[room].name));
  const acc = run(r, A.resolveEvent('accept'));
  assert.deepEqual(acc.game.effects.challenge, { room, until: r.game.day + 10, reward: 5000 });
  const spots = { cafeteria: [0, 11, [[0, 10], [1, 10], [2, 10]]], playground: [12, 6, [[12, 10]]] };
  const [x, y, halls] = spots[room];
  const built = run(acc, A.build(room, x, y), A.buildHallLine(halls.map(([hx, hy]) => ({ x: hx, y: hy }))));
  const done = E.reduce(built, A.tick(24));
  assert.equal(done.game.effects.challenge, undefined);
  assert.equal(done.game.cash, built.game.cash + E.selectDailyPnL(built).net + 5000);
  const expired = days(acc, 10);
  assert.equal(expired.game.effects.challenge, undefined);
  assert.ok(expired.game.log.some((l) => l.text.includes('expired')));
}));

test('Broken Plumbing: waiting closes a restroom for 3 days', () => force('broken_plumbing', () => {
  const r = fire(school({}));
  const w = run(r, A.resolveEvent('wait'));
  const rest = Object.keys(w.game.effects.offline)[0];
  assert.equal(w.game.rooms[rest].type, 'restroom');
  assert.equal(E.selectDerived(w).restroomCapacity, 0);
  assert.ok(E.selectBubbles(w).some((b) => b.text === 'A restroom is out of order'));
  const later = days(w, 3);
  assert.equal(E.selectDerived(later).restroomCapacity, 40);
  assert.deepEqual(later.game.effects.offline, {});
  const fix = run(r, A.resolveEvent('repair'));
  assert.equal(fix.game.cash, r.game.cash - 400);
}));

test('Teacher Raise, Snow Day and auto-resolve', () => {
  force('teacher_raise', () => {
    const r = fire(school({ day: 20, tick: 20 * 24 }));
    const acc = run(r, A.resolveEvent('accept'));
    assert.equal(E.selectDailyPnL(acc).salaries, 2 * 55 + 30);
    const auto = days(r, 2);
    assert.equal(E.selectDailyPnL(auto).salaries, 2 * 55 + 30, 'auto-picked first option');
  });
  force('snow_day', () => {
    const r = fire(school({}));
    const c = run(r, A.resolveEvent('close'));
    assert.equal(E.selectDailyPnL(c).tuition, 0);
  });
});
