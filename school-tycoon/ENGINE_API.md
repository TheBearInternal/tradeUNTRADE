# Engine API contract

Everything below is exported from `src/engine/index.js` (pure ESM JS, explicit `.js` import
extensions, zero React / React Native imports). The UI depends only on this contract.

## Root state

```js
root = {
  game: {
    version: 1,
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
    version: 1,
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
                                                     // capped at 8h real time; 1 real sec = 1 tick
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
| `resetSchool(seed)` | new `game`, ledger kept |

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
