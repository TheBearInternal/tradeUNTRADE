import test from 'node:test';
import assert from 'node:assert/strict';
import { E, A, run, days, withGame, gridProblems } from './helpers.mjs';

const start = (id, seed = 7) => run(E.createInitialState(seed), A.resetSchool(seed, id));

test('every scenario starts valid and runs', () => {
  assert.equal(Object.keys(E.SCENARIOS).length, 8);
  for (const id of E.SCENARIO_ORDER) {
    let r = start(id);
    const sc = E.SCENARIOS[id];
    assert.equal(r.game.mode, 'scenario');
    assert.equal(r.game.size, sc.size);
    assert.equal(r.game.cash, sc.cash);
    assert.deepEqual(r.game.scenario, { id, goalsMet: [], endDay: sc.timeLimitDays, result: null });
    assert.deepEqual(gridProblems(r.game), []);
    const s = E.selectScenario(r);
    assert.equal(s.goals.length, sc.goals.length);
    assert.equal(s.daysLeft, sc.timeLimitDays);
    r = days(r, 20);
    assert.ok(Number.isInteger(r.game.cash));
  }
  const r0 = E.createInitialState();
  assert.equal(E.reduce(r0, A.resetSchool(1, 'no_such')), r0);
});

test('scenario modifiers: budget cuts', () => {
  const r = days(start('budget_cuts'), 3);
  const p = E.selectDailyPnL(r);
  assert.equal(E.selectTuitionPerStudent(r), Math.round(10 * 0.85));
  assert.equal(p.salaries, Math.round(130 * 1.3));
  const banned = withGame(r, { modifiers: { ...r.game.modifiers, bannedRooms: ['restroom'] } });
  assert.deepEqual(E.selectCanBuild(banned, 'restroom', 12, 0), { ok: false, reason: 'banned' });
  assert.equal(E.selectRoomAvailability(banned, 'restroom').reason, 'banned');
});

test('Clean Sweep: win path (gold) and medal stored', () => {
  let r = start('clean_sweep');
  assert.equal(r.game.students, 60);
  r = withGame(r, { cleanliness: 100, happiness: 80 });
  r = run(r, A.hire('janitor'), A.hire('janitor'));
  r = E.reduce(r, A.tick(24));
  const s = E.selectScenario(r);
  assert.equal(r.game.scenario.result, 'gold');
  assert.deepEqual(r.game.scenario.goalsMet, [0, 1, 2]);
  assert.equal(s.medal, 'gold');
  assert.equal(r.ledger.medals.clean_sweep, 'gold');
  // finished scenarios stay finished
  const later = days(r, 5);
  assert.equal(later.game.scenario.result, 'gold');
});

test('Clean Sweep: lose path (time runs out)', () => {
  let r = start('clean_sweep');
  for (let d = 0; d < 30; d++) {
    r = E.reduce(r, A.tick(24));
    if (r.game.event) r = E.reduce(r, A.resolveEvent(r.game.event.choices[0].id));
  }
  assert.equal(r.game.day, 30);
  assert.equal(r.game.scenario.result, 'failed');
  assert.equal(r.ledger.medals.clean_sweep, undefined, 'no medal for failing');
  assert.equal(E.selectScenario(r).daysLeft, 0);
});

test('Rescue Riverside: partial win (silver), better medal upgrades, worse never downgrades', () => {
  let r = start('rescue_riverside');
  assert.equal(r.game.scenario.endDay, 60);
  r = withGame(r, { cleanliness: 95, happiness: 70 });
  r = run(r, A.hire('janitor'), A.hire('janitor'));
  r = E.reduce(r, A.tick(24));
  assert.deepEqual(r.game.scenario.goalsMet, [0, 1]);
  assert.equal(r.game.scenario.result, null, 'still running until all goals or time');
  assert.equal(E.selectScenario(r).medal, 'silver');
  r = withGame(r, { tick: 59 * 24, day: 59, stars: 0, learning: 0, happiness: 60 });
  r = E.reduce(r, A.tick(24));
  assert.equal(r.game.scenario.result, 'silver');
  assert.equal(r.ledger.medals.rescue_riverside, 'silver');
  // replay: lose (bronze) -> medal stays silver
  let again = run(r, A.resetSchool(3, 'rescue_riverside'));
  again = withGame(again, { cleanliness: 95, tick: 59 * 24, day: 59 });
  again = run(again, A.hire('janitor'), A.hire('janitor'));
  again = E.reduce(again, A.tick(24));
  assert.equal(again.game.scenario.result, 'bronze');
  assert.equal(again.ledger.medals.rescue_riverside, 'silver');
  assert.equal(E.selectScenario(again).bestMedal, 'silver');
  // lose path: nothing met by the deadline
  let lose = run(r, A.resetSchool(4, 'rescue_riverside'));
  lose = withGame(lose, { tick: 59 * 24, day: 59 });
  lose = E.reduce(lose, A.tick(24));
  assert.equal(lose.game.scenario.result, 'failed');
  assert.equal(lose.ledger.medals.rescue_riverside, 'silver');
});

test('Tiny Lot uses a 12x12 lot and survives a save round trip', () => {
  const r = days(start('tiny_lot'), 2);
  assert.equal(r.game.grid.length, 144);
  const office = Object.values(r.game.rooms).find((x) => x.type === 'office');
  assert.deepEqual([office.x, office.y], [4, 10]);
  assert.deepEqual(E.deserialize(E.serialize(r)), r);
});

test('Flu Season multiplies flu chance', () => {
  const r = start('flu_season');
  assert.equal(r.game.modifiers.fluChanceMult, 8);
  let flus = 0;
  let x = r;
  for (let d = 0; d < 60; d++) {
    x = E.reduce(x, A.tick(24));
    if (x.game.event && x.game.event.id === 'flu' && x.game.event.startedDay === x.game.day) flus++;
    if (x.game.event) x = E.reduce(x, A.resolveEvent(x.game.event.choices[x.game.event.choices.length - 1].id));
  }
  assert.ok(flus >= 2, `flu outbreaks: ${flus}`);
});

test('sandbox: infinite cash, everything unlocked, no achievements/medals/Apples', () => {
  let r = run(E.createInitialState(), A.applyReceipt({ txId: 'x', productId: 'apples_120' }), A.resetSchool(9, E.SANDBOX_ID));
  const g = r.game;
  assert.equal(g.mode, 'sandbox');
  assert.equal(g.size, 24);
  assert.equal(g.cash, E.BALANCE.sandboxCash);
  assert.equal(E.selectScenario(r).sandbox, true);
  assert.deepEqual(g.weekly.goals, []);
  for (const type of E.ROOM_ORDER) assert.equal(E.selectRoomAvailability(r, type).available, true, type);
  for (const it of Object.keys(E.ITEMS)) assert.equal(E.selectItemAvailability(r, it).available, true, it);
  r = run(r, A.build('auditorium', 0, 0), A.build('classroom', 10, 0), A.hire('teacher', 'expert'), A.hire('nurse'));
  assert.equal(r.game.cash, E.BALANCE.sandboxCash, 'cash pinned');
  const cls = Object.keys(r.game.rooms).find((k) => r.game.rooms[k].type === 'classroom');
  r = run(r, A.placeItem(cls, 'smartboard', 6, 0));
  assert.equal(r.game.cash, E.BALANCE.sandboxCash);
  assert.deepEqual(r.game.achievements, {});
  assert.equal(r.ledger.apples, 120, 'no Apples earned in sandbox');
  assert.equal(E.reduce(r, A.buyCosmetic('wall_mint')), r, 'sandbox coins cannot buy cosmetics');
  r = days(r, 30);
  assert.equal(r.game.cash, E.BALANCE.sandboxCash);
  assert.equal(r.ledger.apples, 120);
  assert.deepEqual(r.ledger.medals, {});
  assert.deepEqual(r.game.achievements, {});
});
