# School Tycoon — Design Document (v1)

Produced from a three-way design debate (Lead Game Designer, Monetization Lead, Tech Lead),
with final rulings by the arbiter. Numbers here are the source of truth for `src/engine/config`.

## 0. Debate outcome

| Topic | Designer | Monetization | Tech | **Ruling** |
|---|---|---|---|---|
| Student sim | 150 individual A* students | — | aggregate only | **Aggregate students**, BFS distance modifiers per room, ≤30 decorative walkers |
| Hallway rule | "the rule is the game" | — | OK if BFS only on grid change | **Kept.** Rooms not connected to the Front Office via hallways are inert |
| Lot size | 16→22→28 | — | ≤784 tiles fine | **16 → 20 → 24** (Elementary → Middle → High) |
| Premium currency | accepts w/ limits | first yes, then dropped it | accepts w/ idempotent ledger | **Apples ship in v1** — needed so "pay instead of grind" scales without one SKU per unlock. Also earnable free |
| Paid unlocks | only after requirement met | only non-tier cosmetics | — | **User requirement**: any *level-gated* unlock inside the player's *current tier* may be bought early. Tier-ups never |
| Never for sale | sim power, events, rating | rating, rep, coins | — | **Never**: tier-ups, stars/rating, reputation, coins, event outcomes, staff skill |
| Timers / energy | none | none | none | **None.** Building is instant |
| Ads / loot boxes | none | none | defer | **None in v1** |
| Rendering | — | — | Views + pan | **Plain RN Views + PanResponder pan + zoom buttons** (Expo Go safe, no native deps) |

Dissent noted: Monetization preferred direct non-consumables only; mitigated by showing the dollar
equivalent and the "≈ minutes of play saved" next to every Apple price.

## 1. Core loop

- **Minute:** place rooms/hallways, hire staff, react to thought bubbles ("🚽 restroom too far").
- **Session:** 1 tick = 1 game hour; 1 tick/second at 1× (2×, 4× available) → 1 day = 24 s.
  A **term** = 15 days (~6 min) ends with a **Report Card** (income, costs, grade, happiness, stars).
- **Long-term:** principal level (XP) unlocks rooms inside a tier; meeting tier goals grows the school
  Elementary → Middle → High and enlarges the lot.

## 2. Grid & building

- Lot is a square grid (`size` 16/20/24). Each tile is `null`, `'hall'`, or a room instance id.
- Front Office (3×2) is pre-placed at the bottom-middle; a short hallway stub leads from it.
- **Connectivity:** BFS over hallway tiles starting from hallway tiles orthogonally adjacent to the Office.
  A room is *connected* if any tile orthogonally adjacent to its footprint is a reached hallway tile.
  Decor does not need connectivity. Unconnected rooms do nothing and render greyed with ⚠️.
- **Distances:** for each facility kind (restroom, cafeteria) run a multi-source BFS over hallways from
  hallways adjacent to connected facilities. A classroom's `dR`/`dC` = min over its adjacent hallway
  tiles (+1). Missing facility ⇒ distance 99. Recomputed only when the grid changes (derived, not saved).
- Sell refunds 50% of build cost. Upkeep: 0.2% of build cost per day (min $1 per room).

| id | Name | Size | Cost | Tier | Lvl | Effect |
|---|---|---|---|---|---|---|
| hall | Hallway | 1×1 | $10 | 1 | 1 | connectivity |
| office | Front Office | 3×2 | — | 1 | — | start building, not buildable/sellable |
| classroom | Classroom | 3×3 | $500 | 1 | 1 | 20 seats, needs 1 teacher |
| restroom | Restroom | 2×2 | $300 | 1 | 1 | serves 40 students |
| cafeteria | Cafeteria | 4×3 | $1200 | 1 | 2 | feeds 60 students |
| playground | Playground | 4×4 | $600 | 1 | 3 | +10 happiness (max 1 counts) |
| staffroom | Staff Room | 2×2 | $400 | 1 | 4 | without one, teacher skill −1 |
| plant | Potted Plant | 1×1 | $25 | 1 | 1 | decor +1 happiness (decor total cap +15) |
| bench | Bench | 1×1 | $40 | 1 | 2 | decor +2 |
| lockers | Lockers | 1×1 | $50 | 1 | 3 | decor +2 |
| library | Library | 3×3 | $900 | 2 | 6 | +10% learning school-wide |
| nurse | Nurse's Office | 2×2 | $700 | 2 | 6 | flu lasts 1 day instead of 3 |
| sciencelab | Science Lab | 3×3 | $1500 | 2 | 8 | 15 seats, +25% learning in it, needs teacher |
| gym | Gym | 5×4 | $2500 | 2 | 10 | +10 happiness |
| computerlab | Computer Lab | 3×3 | $2000 | 3 | 12 | 20 seats, +30% learning, +1 rep/day |
| auditorium | Auditorium | 6×4 | $5000 | 3 | 15 | +2 rep/day, inspection +5 |

Seat rooms (classroom, sciencelab, computerlab) are staffed by teachers automatically (best teacher
to the best room). Unstaffed or unconnected seat rooms give 0 seats.

## 3. Simulation (aggregate, settles once per day)

Let N = enrolled students, cap = total active seats.

**Staff** (salary per day): Teacher Rookie skill 1 $50, Veteran skill 3 $90 (lvl 5), Expert skill 5 $140 (lvl 9);
Janitor $30; Nurse $50 (tier 2). Staff are hired/fired instantly. Effective teacher skill = skill − 1 if
no connected Staff Room (min 1).

**Per-classroom modifiers** (designer formulas):
- Restroom load `L = N / (40 × connectedRestrooms)`; `dR_eff = dR + 10 × max(0, L − 1)`
- Cafeteria over-capacity if `N > 60 × connectedCafeterias`
- `late = clamp((dR_eff − 8)/20 + (dC − 12)/30, 0, 0.6)`; learning multiplier `1 − 0.4 × late`
- `hR = 10 − 30 × clamp((dR_eff − 8)/16, 0, 1)` (no restroom ⇒ −20)
- `hC = 10 − 35 × clamp((dC − 12)/20, 0, 1)`; over-capacity or none ⇒ −25
- School values = seat-weighted average over active seat rooms.

**Cleanliness** C ∈ [0,100]: daily `C −= N × 0.15`, `C += 12 × janitors`, clamp.
Dirt penalty `= −20 × (1 − C/100)`.

**Happiness** H target = `50 + hR + hC + decor(≤15) + playground(10) + gym(10) + dirtPenalty
− 15·[N > cap] − 3 × tuitionSteps`; `H += 0.1 × (target − H)` daily; clamp 0..100.

**Learning** G: daily learn = `avg over rooms (0.6 + 0.2 × skill) × roomBonus × lateMult × (0.5 + H/200)
× (1.1 if library)`; target `G* = clamp(learn × 60, 0, 100)`; `G += 0.1 × (G* − G)`.

**Rating:** `score = 0.4 G + 0.4 H + 0.2 coverage`, coverage = % of {restroom, cafeteria, playground,
staffroom, nurse(t≥2), library(t≥2)} that exist & are connected. Stars: thresholds 20/40/60/75/90 → 1..5
(0 stars below 20). **Rating never reads cosmetics or purchases (unit-tested).**

**Reputation** 0..1000: daily `rep += (stars − 2) × 2` + room bonuses.

**Enrollment:** tuition base per tier $10/$15/$22 per student per day; tuition setting −2..+2 steps of 10%.
Applicants/day = `floor((1 + rep/100) × (1 − 0.15 × step))` (min 0). Enroll up to cap.
Leavers/day = `ceil(N × (30 − H)/200)` if H < 30; plus if N > cap, the excess leaves.

**Money** (integers): daily `+ tuition × N − salaries − upkeep`. Start $4000. Building needs cash ≥ cost.
Cash may go negative from upkeep/salaries (no game over; a red warning shows).

**XP:** daily `+ ceil(N/10)`; +25 per term finished; inspection A +100. Level n needs `60 × (n−1)^1.6` total XP
(rounded). Max level 20. Level-up: +20 🍎 (earned).

## 4. Tiers (earned only — never purchasable)

| Tier | Lot | Requirement to reach |
|---|---|---|
| 1 Elementary | 16×16 | start |
| 2 Middle | 20×20 | ≥3 stars, ≥60 students, rep ≥ 150 |
| 3 High | 24×24 | ≥4 stars, ≥120 students, rep ≥ 400, last inspection grade B or better |

Tier-up is an explicit action when eligible; lot grows (existing layout keeps its coordinates
shifted so the office stays bottom-middle), tuition base rises.

## 5. Events (each is a decision)

- **Inspection:** every 45 days (end of each year), announced 5 days ahead. Grade from
  `0.35 C + 0.35 G + 0.3 coverage` (+5 with Auditorium): A ≥85, B ≥70, C ≥55, D ≥40, else F.
  A: +100 rep, +$2000, +100 XP. B: +40 rep, +$500. C: 0. D: −20 rep. F: −50 rep.
  Decision at announcement: **Deep clean** (+30 cleanliness now, −10% learning for 5 days) or **Cram**
  (+5 G now, −5 happiness).
- **Flu outbreak:** daily 1.5% chance once N ≥ 30 (seeded RNG). Choice: **Close school** for 2 days
  (no tuition, flu ends) or **Stay open** (20% students sick for 3 days, 1 with Nurse: learning ×0.7,
  happiness −5 while sick).
- Unresolved events auto-pick the first option after 2 days.

## 6. Goals & achievements

Achievements (one-time, award 🍎 earned): First Classroom (10), 25 Students (15), 100 Students (30),
First Hire (10), 3 Stars (20), 5 Stars (50), Inspection A (40), Reach Middle School (30),
Reach High School (50), Spotless (cleanliness 100) (15), Happy School (H ≥ 85) (25),
Full House (N = cap ≥ 60) (20). Three of them also grant achievement-only cosmetics.

## 7. Monetization (v1, payments stubbed)

**Currencies:** Coins = the in-game $ (earned only, never sold). **Apples 🍎** = premium; 100 🍎 ≈ $0.99;
UI shows `~$` beside Apple prices. Apples are never converted into $.

**Free Apples:** daily login 7-day cycle `5,5,10,5,5,10,25` (missed day pauses streak, doesn't reset;
Supporter Pack doubles), achievements, +20 per level-up.

**IAP products** (prices only ever displayed from `StoreService.getProducts()`):

| id | type | contents | USD |
|---|---|---|---|
| apples_120 | consumable | 120 🍎 | 0.99 |
| apples_650 | consumable | 650 🍎 | 4.99 |
| apples_1400 | consumable | 1400 🍎 | 9.99 |
| apples_3000 | consumable | 3000 🍎 | 19.99 |
| starter_pack | non-consumable (one-time) | 500 🍎 + Professor Hoot mascot | 2.99 |
| supporter_pack | non-consumable | Founder skin + Gold Crest + 2× daily login Apples | 4.99 |

**Cosmetics** (owned in the ledger, survive school resets; equip one per slot):

| id | slot | name | price |
|---|---|---|---|
| wall_default / floor_default / mascot_none / uniform_navy / skin_default | each slot | defaults | free |
| wall_rainbow | wall | Rainbow Mural | 150 🍎 |
| wall_space | wall | Space Explorer | 200 🍎 |
| wall_mint | wall | Mint Paint | $800 coins |
| floor_checker | floor | Checkerboard Tile | 100 🍎 |
| floor_hardwood | floor | Polished Hardwood | 120 🍎 |
| floor_terrazzo | floor | Terrazzo | $600 coins |
| mascot_hoot | mascot | Professor Hoot 🦉 | 300 🍎 (Starter Pack) |
| mascot_dragon | mascot | Sparky the Dragon 🐉 | 400 🍎 |
| mascot_robot | mascot | Bolt the Robot 🤖 | 400 🍎 |
| mascot_bear | mascot | Bruno the Bear 🐻 | achievement: 5 Stars |
| uniform_crimson | uniform | Crimson | 150 🍎 |
| uniform_varsity | uniform | Varsity Jacket | 250 🍎 |
| uniform_forest | uniform | Forest Green | achievement: Reach Middle School |
| skin_brick | skin | Red-Brick Victorian | 500 🍎 |
| skin_glass | skin | Glass Modern | 500 🍎 |
| skin_founder | skin | Founder's Gold | Supporter Pack |
| skin_sunset | skin | Sunset Stucco | achievement: Inspection A |

**Early unlock ("skip the grind"):** a room whose tier ≤ current tier but level > player level can be
unlocked for `30 🍎 × (levels short)`. Dialog shows "Saves ≈ X min of play" (estimate from XP rate).
Limit 3 early unlocks per 7 in-game days. Never available for tier-ups.

**Compliance rules (enforced in UI/engine):**
1. No paid randomness anywhere.
2. Neutral age screen on first launch. Under-13 ⇒ parental gate (type a number shown in words) before
   every real-money purchase; no analytics.
3. Two-step confirmation: item, price, balance after.
4. Restore Purchases in Settings.
5. No countdowns, no fake scarcity, no shop pop-ups during build.
6. Rating/happiness/learning formulas ignore cosmetics and the ledger (tested).
7. Ledger: every credit has a unique key (`tx:<txId>`, `login:<dayKey>`, `ach:<id>`, `lvl:<n>`);
   duplicate keys are no-ops. Ledger is persisted **before** `finishTransaction`.

## 8. Technical architecture

- `src/engine/` — pure JS ESM, no React. `reduce(root, action) → root`. Deterministic (seeded RNG in
  state, wall-clock time passed in actions). Tested with `node --test`.
- Root state `{ game, ledger }`, persisted under two AsyncStorage keys (`st:game`, `st:ledger`) plus a
  `.bak` slot for game. Saves are versioned with migrations.
- `src/platform/` — storage adapter, `StoreService` interface, `MockStore`.
- `src/ui/` — React Native: `GameProvider` (external store + `useSyncExternalStore` selectors),
  map (PanResponder pan, zoom buttons), HUD, bottom panels (Build, Staff, School, Shop, Settings), modals.
- Game loop: `setInterval(1000)` dispatches `tick(speed)`; paused on background; offline progress on
  resume capped at 8 hours, simulated per day.

See `ENGINE_API.md` for the exact engine contract.
