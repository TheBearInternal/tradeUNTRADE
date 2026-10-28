# Engine API contract

Everything below is exported from `src/engine/index.js` (pure ESM JS, explicit `.js` import
extensions, zero React / React Native imports). The UI depends only on this contract.

## Root state

```js
root = {
  game: {
    version: 2,              // GAME_VERSION
    seed, rng,               // rng: integer state for mulberry32 (deterministic)
    tick,                    // total ticks elapsed (1 tick = 1 game hour)
    day,                     // floor(tick / 24)
    tier,                    // 1 | 2 | 3
    size,                    // lot width = height (16 | 20 | 24)
    grid,                    // Array(size*size) of null | 'hall' | roomInstanceId
    rooms,                   // { [id]: { id, type, x, y, w, h, cost } }
    nextId,                  // integer for new ids ('r1', 's1', ...)
    staff,                   // { [id]: { id, role: 'teacher'|'janitor'|'nurse', skill, salary, name } }
    students,                // integer N
    happiness, learning, cleanliness,   // floats 0..100
    reputation,              // 0..1000
    cash,                    // integer dollars
    tuitionStep,             // -2..2
    xp, level,
    stars,                   // 0..5 (cached at daily settlement)
    unlocked,                // { [roomType]: true }  rooms unlocked early with Apples
    earlyUnlockLog,          // array of day numbers when early unlocks were bought
    event,                   // null | { id:'inspection'|'flu', phase, choices:[{id,label}], startedDay, ... }
    effects,                 // active timed effects, e.g. { fluSickUntil, closedUntil, cramPenaltyUntil }
    lastInspectionGrade,     // null | 'A'..'F'
    inspectionDueDay,
    achievements,            // { [achId]: true }
    lastReport,              // null | report card object (see below) — set at end of every term
    log,                     // last ~20 messages [{ day, text, kind:'info'|'good'|'bad' }]
    stats: { totalEarned, totalStudentsEver },
  },
  ledger: {
    version: 2,              // LEDGER_VERSION
    apples,                  // integer
    credited,                // { [creditKey]: true } — idempotency keys
    owned,                   // { [cosmeticId|productId]: true }
    equipped,                // { wall, floor, mascot, uniform, skin } -> cosmetic ids
    login: { lastDayKey: null|'YYYY-MM-DD', streakIndex: 0..6 },
    ageGate: null | 'under13' | 'adult',
  },
}
```

## Functions

```js
createInitialState(seed = 12345)  -> root           // office pre-placed + 3-tile hallway stub
reduce(root, action)              -> root           // pure; invalid actions return the same root object
                                                     // (identity) and never throw
simulateOffline(root, elapsedMs)  -> { root, summary: { days, cashDelta, studentsDelta } }
                                                     // 1 tick per whole real minute away, capped at 72 ticks
                                                     // (3 game days); negative / clock-back elapsed = no-op
serialize(root)   -> { game: string, ledger: string }
deserialize({ game, ledger }) -> root                // runs migrations; throws on newer version
validateConfig()  -> string[]                        // list of config errors ([] = OK)
```

## Actions (`actions` object of creators)

| creator | effect |
|---|---|
| `tick(n)` | advance n ticks (1..96); settles each day rollover; may open events / term report |
| `build(type, x, y)` | place room or `'hall'` at top-left x,y if `canBuild` |
| `buildHallLine(cells)` | place many hallway tiles `[{x,y}]` (skips invalid/occupied/unaffordable) |
| `sell(x, y)` | sell whatever occupies tile (hall or room; office not sellable), 50% refund |
| `hire(role, grade)` | role `'teacher'` grade `'rookie'|'veteran'|'expert'`, or `'janitor'`, `'nurse'` |
| `fire(staffId)` | remove staff |
| `setTuition(step)` | −2..2 |
| `resolveEvent(choiceId)` | choose an option in the active event |
| `dismissReport()` | clears `lastReport` |
| `tierUp()` | if `canTierUp` |
| `earlyUnlock(roomType)` | spend Apples per design §7 |
| `buyCosmetic(cosmeticId)` | with Apples or coins (per catalog `currency`) |
| `equipCosmetic(cosmeticId)` | if owned or free default |
| `claimDailyLogin(dayKey)` | dayKey 'YYYY-MM-DD' from the device; idempotent per dayKey |
| `applyReceipt(receipt)` | `{ txId, productId }` from StoreService; idempotent by txId |
| `setAgeGate(value)` | `'under13'|'adult'` |
| `resetSchool(seed, scenarioId?)` | new `game`, ledger kept (see v2 API: scenarios / sandbox) |

Achievements are checked inside the reducer after every action that changes state and grant Apples
via credit keys `ach:<id>`. Level-ups credit `lvl:<n>`.

## Selectors (pure, `(root, ...args)`)

| selector | returns |
|---|---|
| `selectDerived(root)` | memoized by `game.grid`/`game.rooms` identity: `{ connected: {[roomId]:bool}, roomStats: {[roomId]: {dR, dC, late, hR, hC}}, hallDist: Int16Array }` |
| `selectCapacity(root)` | active seats |
| `selectDailyPnL(root)` | `{ tuition, salaries, upkeep, net }` |
| `selectRating(root)` | `{ score, stars, coverage }` — must not read ledger |
| `selectRoomAvailability(root, type)` | `{ available, reason: null|'tier'|'level', canEarlyUnlock, earlyCost, minutesSaved }` |
| `selectCanBuild(root, type, x, y)` | `{ ok, reason }` reasons: `'bounds'|'occupied'|'cash'|'locked'` |
| `selectTierProgress(root)` | `{ nextTier, requirements: [{label, current, target, met}], eligible }` |
| `selectXpProgress(root)` | `{ level, xp, xpForThis, xpForNext }` |
| `selectBubbles(root)` | top problems `[{ icon, text, roomId? }]` e.g. 🚽 restroom far, 🍔 no cafeteria, 🧹 dirty, 👩‍🏫 no teacher, ⚠️ not connected |
| `selectEarlyUnlocksLeft(root)` | integer (3 per 7 days) |
| `selectLoginReward(root, dayKey)` | `{ claimable, amount, streakIndex }` |
| `selectTimeLabel(root)` | `{ year, term, dayOfTerm, hour }` |

## Config exports

`ROOMS` (by id, per DESIGN §2: `{ id, name, emoji, w, h, cost, tier, level, seats?, needsTeacher?, kind:'hall'|'room'|'decor'|'office', color, desc }`),
`STAFF` (roles & grades with salary, skill, level/tier gate), `TIERS`, `COSMETICS`
(`{ id, slot, name, price, currency:'apples'|'coins'|'free'|'achievement'|'product', colors/emoji }`),
`PRODUCTS` (IAP ids, type, apples, grants, `usdReference`), `ACHIEVEMENTS`, `BALANCE` (all tunables),
`TICKS_PER_DAY = 24`, `DAYS_PER_TERM = 15`, `TERMS_PER_YEAR = 3`.

## Report card (`game.lastReport`)

`{ term, year, income, salaries, upkeep, net, studentsStart, studentsEnd, happiness, learning, stars, grade: 'A'..'F' }`
(grade derived from learning: A≥85,B≥70,C≥55,D≥40,F).

## Engine implementation notes (additive; nothing above changed)

- `selectDerived(root)` is cached per `grid`/`rooms` identity for connectivity, `hallDist` and
  distances. `roomStats.late/hR/hC` depend on the student count (restroom load, cafeteria
  capacity), so the returned object is also re-created when `game.students` changes (only at
  daily settlement). Ticks that cross no day boundary return the identical object. Extra
  fields: `counts` (connected rooms by type), `restroomLoad`, `cafeteriaOver`. `connected` is
  `true` for the office and for decor, which needs no hallway.
- Extra selectors: `selectStaffing(root)` → `{ assignment:{roomId:staffId}, active, capacity,
  janitors, nurses, salaries, teachers }`, `selectCanHire(root, role, grade)` → `{ ok, reason:
  null|'tier'|'level'|'role'|'limit', salary, skill }`, `selectTuitionPerStudent(root)`.
- `selectRoomAvailability` also returns `affordable` (ledger Apples ≥ `earlyCost`).
  `canEarlyUnlock` means the rules allow it (in tier, level-gated, weekly cap left), whether or
  not the player has enough Apples.
- `selectXpProgress` at max level returns `isMax: true` and `xpForNext > xpForThis`, so a
  progress bar never divides by zero.
- Extra exports: `credit(ledger, key, amount)`, `xpForLevel(n)`, `ROOM_ORDER` (build menu
  order), `STAFF_ROLES`, `TEACHER_GRADES`, `COSMETIC_SLOTS`, `DEFAULT_EQUIPPED`, `MAX_LEVEL`,
  `MAX_TIER`, `DAYS_PER_YEAR`, `GAME_VERSION`, `LEDGER_VERSION`.
- Config shapes: `TIERS` is keyed by tier number (`TIERS[game.tier]`), each `{ tier, id, name,
  size, tuitionBase, requirements }`. `COSMETICS`, `PRODUCTS` and `ACHIEVEMENTS` are keyed by
  id. Every `STAFF[role]` has `grades` (teacher: rookie/veteran/expert; janitor/nurse:
  `standard`, also mirrored on the role). `PRODUCTS[*].type` is `'consumable' |
  'nonconsumable'`.
- Staff members also carry `grade`. The game also stores `termStats`, the running totals for
  the current term's report.
- Events: `phase` is `'announce'` (inspection, choices deepclean/cram), `'result'`
  (inspection grade; a single `ok` choice; carries `grade` and `score`) or `'outbreak'` (flu,
  choices close/open). Events also carry `title` and `text`. Effects keys: `closedUntil`,
  `fluSickUntil`, `deepCleanUntil` (day numbers, exclusive).
- `deserialize({ game: null, ledger })` starts a fresh school and keeps the ledger. It throws on
  malformed JSON or a newer version, so the UI can fall back to `st:game.bak`.
- `resetSchool()` with no seed uses `game.seed + 1`.

---

## v2 API (interiors, new content, replay systems)

Everything here is additive and exported from `src/engine/index.js`. v1 behaviour is unchanged:
every room's free starter layout reproduces the v1 numbers exactly (verified by `validateConfig()` and
by a test that migrates a real v1 save and compares P&L, mods and the next simulated day).

### New state

```js
game: {
  version: 2,
  interiors: { [roomId]: { items: [{ id: 'i1', itemType, cx, cy, rot: 0 | 1 }] } },
      // one entry per room whose type has an interior (hasInterior(type)); item ids are unique per room
  unlockedItems: { [itemType]: true },     // items unlocked early with Apples
  eventCooldowns: { [packEventId]: dayLastFired },
  mode: 'normal' | 'scenario' | 'sandbox',
  scenario: null | { id, goalsMet: number[] /* goal indices, ascending */, endDay, result: null | 'bronze' | 'silver' | 'gold' | 'failed' },
  modifiers: { salaryMult, fluChanceMult, tuitionMult, bannedRooms: string[] },  // 1,1,1,[] outside scenarios
  schoolNo: integer,                       // increments on every resetSchool (weekly-goal credit keys)
  weekly: { week, goals: [WeeklyGoal] },   // see selectWeeklyGoals
  effects: { ..., offline: { [restroomId]: untilDay }, challenge: { room, until, reward } },
  event: ... | { id: packEventId, kind: 'pack', phase: 'decision', title, text, params: { room? }, choices: [{ id, label }], startedDay },
  staff: { [id]: { ..., role: 'teacher' | 'janitor' | 'nurse' | 'counselor' } },
}
ledger: { version: 2, ..., medals: { [scenarioId]: 'bronze' | 'silver' | 'gold' }, schools: integer,
          equipped: { ..., furniture: 'furniture_default' | 'furniture_gold' | 'furniture_neon' } }
```

`rooms` keeps its identity when interiors change. Ticks never replace `interiors`.

### Interior geometry

- Each room of `kind` `'room'` or `'office'` has an interior grid of `cols = w*3`, `rows = h*3` cells
  (`BALANCE.cellsPerTile = 3`). Cell index = `cy * cols + cx`.
- **Door** = `{ cx: floor(cols/2), cy: rows - 1 }` (bottom-middle). No item may cover it.
- Item footprint: `ITEMS[t].w x h`. With `rot: 1` it is `h x w` (use `itemSize(itemDef, rot)`).
- `wall: true` items must touch the back walls, so their top-left must have `cx === 0` or `cy === 0`.
- Max `BALANCE.maxItemsPerRoom = 40` items per room.
- **Reachability:** a BFS over empty cells starting at the door (4-neighbour). An item that has `seats`,
  `stalls`, `required` or `shelf` only **counts** if at least one cell orthogonally adjacent to its
  footprint is reachable. All other items always count.

### Config

- `ITEMS` (by id) `{ id, name, emoji, w, h, cost, tier, level, rooms: [roomType], color, stats: { F?, Cf?, Hy?, rep? },
  seats?, stalls?, required?, wall?, shelf?, clean? /* cleanliness per day, negative = mess */, skinPart?: 'desk'|'table'|'stall'|'shelf' }`.
  `ITEM_ORDER` = catalogue order. Stat furniture costs Coins (cash). Items in starter layouts are free with no stats.
- `LAYOUTS[roomType]` = `[{ itemType, cx, cy, rot }]` starter layouts (ids `i1..iN` in that order).
- `ROOMS` new fields: `category: 'seat'|'restroom'|'cafeteria'|'library'` (absent = "other"), `requires: [{ item, count }]`,
  `outdoor` (no hallway needed: garden, sportsfield), `edge` (bus stop: must touch the lot edge), `seatHappiness`,
  `happiness`, `repPerDay`, `incomePerStudent`, `dirtPerDay`, `applicantMult`, `repOnWin`, `needsStaff`, `leaverMult`,
  `upkeepRate`, `scienceFairMult`. New rooms: garden, vending, artroom, busstop, musicroom, trophycase, counselor,
  sportsfield, workshop, pool, roboticslab. `SEAT_ROOMS` = room types with seats. `hasInterior(type) -> bool`.
- `STAFF.counselor` ($60/day, tier 2). Hire with `hire('counselor')`.
- `COSMETICS`: new slot `'furniture'` (`COSMETIC_SLOTS` includes it): `furniture_default` (free),
  `furniture_gold` (350 🍎, or product `designer_bundle_gold`), `furniture_neon` (300 🍎). Their `colors` is an object
  `{ desk, table, stall, shelf, lockers }`. Recolour items by `ITEMS[t].skinPart`. Stats never change.
- `PRODUCTS.designer_bundle_gold` `{ type: 'nonconsumable', apples: 0, grants: ['furniture_gold'], usdReference: 3.99 }`.
- `SCENARIOS` (by id), `SCENARIO_ORDER`, `SANDBOX_ID = 'sandbox'`, `MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 }`.
  Scenario: `{ id, name, emoji, desc, size, tier, cash, reputation, modifiers, preset?, goals: [{ cond, label }], timeLimitDays, medals: { bronze, silver, gold } }`.
- `EVENTS` (by id), `EVENT_ORDER`: `sports_day, science_fair, teacher_raise, donor_challenge, broken_plumbing, snow_day, concert`.
  `{ id, name, emoji, chance, cooldownDays, minDay, cond, text, choices: [{ id, label, effects }], rewardMult?, params? }`.
- `WEEKLY_GOALS` (templates), `COND_STATS`, `COND_OPS`, `EFFECT_KEYS` (the DSL whitelist; see `config/dsl.js`).
- `BALANCE` new keys: `cellsPerTile, maxItemsPerRoom, itemRefund, stallCapacity, seatFocusMax, seatFocusHalf, seatComfortMax,
  seatComfortHalf, libraryBase, libraryFocusMax, libraryFocusHalf, facilityComfortMax, facilityComfortHalf, otherComfortMax,
  otherComfortHalf, otherComfortCap, hygieneMax, hygieneHalf, furnitureRepCap, vendingMaxCount, winRep, weeklyGoalsPerWeek,
  weeklyGoalWeeksKept, weeklyGoalApples, daysPerWeek, sandboxCash, offlineTicksPerMinute (1), offlineMaxTicks (72)`.
  (`offlineCapMs` / `msPerTickOffline` were removed.)

### New functions

```js
interiorDims(roomType)         -> { cols, rows, door: { cx, cy } }
itemSize(itemDef, rot)         -> { w, h }                 // rot 1 swaps
computeQuality(game)           -> { [roomId]: internal quality object }   // memoized on game.interiors + game.rooms
offlineTicksFor(elapsedMs)     -> integer ticks simulateOffline would run (0..72)

// iso.js: 2:1 diamond projection. tw/th = diamond width/height in px, ox/oy = screen point of cell (0,0)'s TOP corner.
project(cx, cy, tw, th, ox, oy)        -> { x, y }    // top corner of cell (cx,cy); centre = project(cx+0.5, cy+0.5, ...)
unproject(sx, sy, tw, th, ox, oy)      -> { cx, cy }  // integer cell containing the screen point (may be out of range)
unprojectExact(sx, sy, tw, th, ox, oy) -> { cx, cy }  // fractional inverse of project
footprintPolygon(cx, cy, w, h, tw, th, ox, oy) -> [top, right, bottom, left] points ({x,y}) of a w x h footprint
depthSort(items)               -> new array, back-to-front draw order. items: [{ cx, cy, w, h, ... }] (w/h default 1,
                                  pass the rotated size; selectInterior().items already has w/h). Input not mutated.
```

Screen axes: +cx goes right-down, +cy goes left-down. For SVG draw the floor with `footprintPolygon(0, 0, cols, rows, ...)`
and each item with `footprintPolygon(it.cx, it.cy, it.w, it.h, ...)` in `depthSort(view.items)` order.

### New actions

| creator | effect / validation (invalid → same root) |
|---|---|
| `placeItem(roomId, itemType, cx, cy, rot = 0)` | if `selectCanPlaceItem(...).ok`; pays `ITEMS[t].cost`; new id `i<max+1>` |
| `moveItem(roomId, itemId, cx, cy, rot?)` | `rot` omitted = keep; free; same rules as placing (ignoring itself and cash); no-op if unchanged |
| `removeItem(roomId, itemId)` | refunds 50% of the item cost (free items: 0) |
| `autoArrange(roomId)` | resets to the starter layout, refunding 50% of all removed paid items; no-op if already starter |
| `earlyUnlockItem(itemType)` | `30 🍎 × levels short`, same rules as `earlyUnlock` and **shares its 3-per-7-days cap** |
| `resetSchool(seed, scenarioId?)` | `scenarioId`: omitted/`null` = normal game, `SANDBOX_ID`, or a `SCENARIOS` id (unknown id → invalid). Increments `ledger.schools` |

Building a room furnishes it with its starter layout. Selling it also refunds 50% of its paid furniture.

### New selectors

```js
selectInterior(root, roomId) -> null | {
  roomId, roomType, cols, rows, door: { cx, cy },
  items: [{ id, itemType, cx, cy, rot, w, h }],   // w/h already rotated
  occupancy: (itemId | null)[cols*rows],           // index cy*cols+cx
  reachable: boolean[cols*rows],                   // empty cells reachable from the door
  counted: { [itemId]: boolean },                  // false = unreachable seat/stall/required/shelf (render greyed)
  itemCount, maxItems,
}   // memoized: same object until that room's interior changes

selectRoomQuality(root, roomId) -> null | {
  score,        // 0..100 for display; 0 when a requirement is missing, else 50 + 50 * ratio (see formulas)
  learnMult,    // seat rooms: 1 + 0.25*F/(F+20); library: 1 + libraryBonus (1.1 with 4 shelves, up to 1.2); else 1
  happyBonus,   // furniture happiness: seat 8*Cf/(Cf+15); restroom/cafeteria 4*Cf/(Cf+15); other 2*Cf/(Cf+15)
  hygiene,      // Hy in this room
  seats,        // seat rooms: min(room seats, counted desk seats) or 0 without a counted Teacher's Desk; cafeteria: counted table seats
  capacity,     // seat rooms = seats; restroom = 10 * counted stalls (0 without a sink); cafeteria = seats (0 without a Serving Counter)
  missing: string[],   // e.g. ["Teacher's Desk"], ["Sink"], ["Serving Counter"], ["4 × Shelf (3/4)"]
  functional, category: 'seat'|'restroom'|'cafeteria'|'library'|'other', stats: { F, Cf, Hy, rep, clean }, libraryBonus,
}

selectCanPlaceItem(root, roomId, itemType, cx, cy, rot) -> { ok, reason }
  // reason: null | 'room' (no such room / no interior) | 'item' (unknown) | 'wrongRoom' | 'locked' (tier/level)
  //         | 'limit' (40 items) | 'rot' | 'bounds' | 'door' | 'wall' | 'occupied' | 'cash'   (checked in this order)

selectItemAvailability(root, itemType) -> { available, reason: null|'tier'|'level', canEarlyUnlock, earlyCost, minutesSaved, affordable }
selectItemsForRoom(root, roomType) -> [{ itemType, item /* ITEMS entry */, available, reason, canEarlyUnlock, earlyCost,
                                         minutesSaved, affordable /* Apples */, canAffordCoins /* cash >= cost */ }]

selectWeeklyGoals(root) -> { week, daysLeft, goals: [{ key /* 'goal:<schoolNo>.<week>:<i>' */, id, label, progress, target,
                             done, week, carriedOver, reward: { xp, cash, apples }, credited }] }

selectScenario(root) -> null   (normal game)
  | { id: 'sandbox', name: 'Sandbox', sandbox: true, goals: [], goalsMet: 0, endDay: null, daysLeft: null, result: null, medal: null, bestMedal: null }
  | { id, name, emoji, desc, sandbox: false, goals: [{ label, met }], goalsMet /* count */, endDay, daysLeft,
      result /* null while running */, medal /* result or medal earned so far or null */, bestMedal /* ledger.medals[id] or null */, modifiers }
```

Changed v1 selectors (additive):
- `selectCanBuild` reasons add `'banned'` (scenario `bannedRooms`) and `'edge'` (Bus Stop not touching the lot edge).
- `selectRoomAvailability.reason` can be `'banned'`.
- `selectDailyPnL` → `{ tuition, salaries, upkeep, net, vending }`, with `net = tuition + vending - salaries - upkeep`.
  Tuition includes `modifiers.tuitionMult` and salaries include `modifiers.salaryMult`.
- `selectDerived` adds `restroomCapacity` and `cafeteriaCapacity` (working, connected, not out of order).
  `restroomLoad` uses those capacities.
- `selectStaffing` adds `counselors`.
- `selectBubbles` (now up to 8) adds `{ icon: '🪑', text: '<Room> is missing <labels>', roomId }`,
  `🔧 A restroom is out of order`, `🚌 Bus Stop must touch the lot edge` and `💬 Counselor's Office needs a counselor`.

### Simulation rules added in v2

- Seat rooms: learning × `learnMult`. Seat-weighted happiness adds `seatHappiness + 8*Cf/(Cf+15)`.
- Restroom and cafeteria: `hR` and `hC` get + the average `4*Cf/(Cf+15)` over working facilities. Load uses the summed
  capacities, and only working, connected restrooms and cafeterias are BFS sources.
- Other rooms (library included): + `2*Cf/(Cf+15)` school happiness each, capped at +6 in total.
- Library: learning × (1 + best library bonus), where the bonus is `10% + 10%*F/(F+20)` with ≥ 4 counted shelves.
- Dirt per student × `(1 - 0.3*Hy/(Hy+10))`, with Hy summed over connected rooms. Item `clean` is added daily.
  Each Vending Corner costs −1 cleanliness per day. One Vending Corner earns `round(0.5 * N)`.
- Reputation + min(3, Σ furniture rep). The Bus Stop multiplies applicants by 1.25. A Counselor's Office with a
  Counselor halves leavers. A Trophy Case adds +15 rep on each won event.
- Quality `ratio`: seat `(F/(F+20) + Cf/(Cf+15))/2`; restroom/cafeteria `(Cf/(Cf+15) + Hy/(Hy+10))/2`;
  library `(F/(F+20) + Cf/(Cf+15))/2`; other `(Cf/(Cf+15) + Hy/(Hy+10) + min(rep,3)/3)/3`.

### Events, scenarios, sandbox, weekly goals

- **Pack events:** rolled once per day when no event is active, with one RNG draw over the eligible events
  (cond true, day ≥ `minDay`, cooldown elapsed). Same modal contract as v1 (`event.choices`, `resolveEvent(choiceId)`),
  and the first choice is auto-picked after 2 days. Inspection and flu are unchanged.
  Donor Challenge: `event.params.room` names the room to build, and `effects.challenge` tracks it (+$5000 if built in 10 days).
- **Scenarios:** goals are evaluated daily (sticky once met). The scenario ends when every goal is met or at `endDay`.
  The medal is the count of goals met (≥1 bronze, ≥2 silver, ≥3 gold, otherwise `'failed'`), and the best medal is
  kept in `ledger.medals` (never downgraded, never purchasable). After the end the school keeps running.
- **Sandbox** (`resetSchool(seed, SANDBOX_ID)`): 24×24 lot, tier 3, level 20 (everything unlocked), and `cash` is
  pinned at `BALANCE.sandboxCash` after every action. No achievements, medals, weekly goals or Apples of any kind.
  Coin cosmetics cannot be bought.
- **Weekly goals:** 3 seeded goals at the start of each 7-day week (`week = floor(day/7)`). `sum` goals add daily
  enrolled, tuition income or XP. `streak` goals count consecutive days a condition holds. When done, they pay
  `reward.cash` and `reward.xp` once, plus 5 🍎 via credit key `goal:<schoolNo>.<week>:<i>` (idempotent).
  Unfinished goals stay for up to 3 weeks.
- **Offline:** `simulateOffline` = 1 tick per whole real minute, max 72 ticks (`offlineTicksFor`).

### Report card

`lastReport` adds `suggestBreak: boolean` (true for `ledger.ageGate === 'under13'` at the end of every 3rd term) and,
when true, `breakMessage: 'Great term — good time for a break!'`.

### Saves

`GAME_VERSION = 2`, `LEDGER_VERSION = 2`. Migration v1→v2 gives every room its starter layout and adds the fields
above. Ledger v1→v2 adds `medals: {}` and `schools: 1`. Saves newer than these versions throw.
