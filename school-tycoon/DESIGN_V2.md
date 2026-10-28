# School Tycoon — v2 Design (Interiors, Content, Replay)

Second debate round (Designer / Monetization / Tech) plus arbiter rulings. Extends DESIGN.md;
anything not mentioned here is unchanged.

## 0. Consensus & rulings

| Question | Designer | Monetization | Tech | **Ruling** |
|---|---|---|---|---|
| Buyable stat items | Coins only | "Coins buy power, Apples buy access & looks" | Coins; Apples only skins | **Unanimous: stat furniture costs Coins.** Apples may early-unlock a level-gated item (still pay Coins to place) or buy stat-identical skins |
| Iso rendering | — | — | react-native-svg 14.1.0 (in Expo Go SDK 50) | **SVG polygons + RN Text emoji overlay** |
| Interior grid | 4 cells / tile | — | 2 cells / tile | **3 cells / tile** (classroom 9×9 = 81 cells) |
| Where interiors live | on room | — | `game.interiors[roomId]` | **`game.interiors`** (keeps `rooms` identity stable for BFS memo + tests) |
| Starter furniture | v1 numbers exactly | free | zero-bonus | **Every room auto-furnished for free; starter layout = exactly v1 stats.** "Auto-arrange" restores it |
| Scope | 5 replay systems | scenarios, collections | interiors+content now, scenarios later | **This iteration:** interiors + iso editor, 11 new rooms, ~40 items, scenarios (8) + sandbox, data-driven event pack (+6), weekly goals. **Roadmap:** University tier, Legacy/New-School+, Yearbook pass, scenario-pack IAPs, district map |
| "Addictive" | — | "worth coming back to" | — | **Replay value through variety and goals**, not compulsion: no decay while away, weekly goals bank, Report Card suggests breaks for under-13 profiles |

## 1. New rooms (data in `config/rooms.js`)

| id | Name | Size | Cost | Tier/Lvl | Effect |
|---|---|---|---|---|---|
| garden | Garden 🌻 | 3×3 | $350 | 1/4 | +4 happiness (outside decor cap), outdoor (no connection needed) |
| vending | Vending Corner 🥤 | 1×1 | $150 | 1/3 | +$0.5/student/day income, cleanliness −1/day; needs connection |
| artroom | Art Room 🎨 | 3×3 | $700 | 1/5 | 15 seats, needs teacher, +5 happiness (seat-weighted) |
| busstop | Bus Stop 🚌 | 2×1 | $500 | 1/6 | must touch lot edge; applicants ×1.25 (max 1 counts) |
| musicroom | Music Room 🎵 | 3×3 | $900 | 2/7 | 15 seats, +5 happiness, enables Concert event |
| trophycase | Trophy Case 🏆 | 1×1 | $300 | 2/8 | decor +2; +15 rep whenever a "win" event outcome happens |
| counselor | Counselor's Office 💬 | 2×2 | $800 | 2/9 | needs a Counselor ($60/day, new staff role, tier 2): halves leavers |
| sportsfield | Sports Field ⚽ | 6×5 | $3000 | 2/11 | +5 happiness, +1 rep/day, enables Sports Day; outdoor |
| workshop | Workshop 🔧 | 3×3 | $1800 | 3/13 | 15 seats, +20% learning |
| pool | Pool 🏊 | 5×4 | $6000 | 3/16 | +8 happiness, +2 rep/day, upkeep 0.6%/day |
| roboticslab | Robotics Lab 🤖 | 3×3 | $3500 | 3/18 | 15 seats, +40% learning, Science Fair rewards ×2 |

## 2. Interior editor (Sims-style, isometric)

- Every non-hall, non-decor room has an interior grid of `(w·3) × (h·3)` cells. Door cell = bottom-middle
  cell of the room's bottom edge; it must stay empty.
- **Items** (`config/items.js`): `{ id, name, emoji, w, h, cost, tier, level, rooms:[types], color,
  seats?, stalls?, required?, wall?, stats:{ F?, Cf?, Hy?, rep? }, clean? (−dirt/day) }`. Footprint ≤ 3 long.
  `rot ∈ {0,1}` swaps w/h. Max 40 items per room.
- **Reachability:** BFS over empty cells from the door. A seat/stall item only counts if at least one of its
  orthogonal neighbours is a reachable empty cell (same idea as the hallway rule, at room scale).
- **Requirements:** seat rooms need a Teacher's Desk (else seats 0, bubble "🪑 missing teacher's desk");
  seats = min(room seats, counted desk seats). Restroom capacity = 10 × counted stalls and needs ≥1 sink.
  Cafeteria capacity = counted table seats and needs a Serving Counter. Library needs ≥4 shelves for its bonus.
  Other rooms have no requirements (furniture is pure bonus).
- **Quality (diminishing returns, caps built in)**, per room, sum of item stats:
  - Seat rooms: learning ×`(1 + 0.25·F/(F+20))`; happiness `+8·Cf/(Cf+15)` (seat-weighted into school H)
  - Library: school learning bonus `10% + 10%·F/(F+20)` (replaces flat 10%)
  - Restroom / Cafeteria: `hR` / `hC` + `4·Cf/(Cf+15)`; school dirt rate ×`(1 − 0.3·Hy/(Hy+10))` (Hy summed school-wide)
  - `rep` stat: + rep/day (cap +3 school-wide from furniture)
  - Room "quality score" 0–100 for display = 50 + 50·(bonus/maxBonus).
- **Starter layouts** (`config/layouts.js`) are free, give 0 stats and reproduce v1 numbers exactly
  (classroom 20 seats, restroom 4 stalls, cafeteria 60 seats, library 4 shelves, …). Placed automatically
  on build, and by the v1→v2 save migration. "Auto-arrange" = reset to starter layout (refund 50% of paid items).
- Removing an item refunds 50% of its cost; free items refund 0.

### Example items (abbrev.)
- **Classroom:** Desk Pair (2×1, free, 2 seats) · Teacher's Desk (2×1, free, required) · Chalkboard (3×1 wall, free) ·
  Bookshelf (1×2, $150, F+4) · Beanbag Corner (2×2, $250, Cf+5) · Class Pet Tank (1×1, $200, Cf+4, dirt+1) ·
  Globe ($80, F+1 Cf+1) · Smartboard (3×1 wall, $900, F+10, tier 2) · Ergonomic Desk Pair (2×1, $120, 2 seats, F+1 Cf+1)
- **Cafeteria:** Serving Counter (3×1, free, required) · Lunch Table (3×2, free, 10 seats) · Trash Bin (free, Hy+2) ·
  Round Table (2×2, $180, 6 seats, Cf+2) · Recycling Station ($250, Hy+5) · Salad Bar ($600, Cf+6) · Pizza Oven (2×2, $1200, Cf+12)
- **Restroom:** Stall (1×2, free, 10 cap) · Sink (free, required) · Mirror (free, Cf+1) · Air Freshener ($60, Cf+2) ·
  Hand Dryer ($100, Hy+3) · Touchless Fixtures ($400, Hy+6)
- **Library:** Shelf (1×2, free) · Reading Table (2×2, free) · Study Carrels (2×1, $250, F+4) · Reading Nook (2×2, $300, Cf+5) ·
  Rare Book Case (1×2, $700, F+8)
- Plus 2–5 items each for science lab, computer lab, art, music, workshop, robotics, staff room, nurse,
  gym, auditorium, counselor, office (~40+ items total).

### Furniture skins (Apples, stat parity)
`skin set` cosmetics in the ledger: **Gold** and **Neon** variants recolor desks, tables, stalls, shelves and lockers.
Stats never change. IAP `designer_bundle_gold` $3.99 grants the Gold set (also buyable for 350 🍎).

### Early unlock for items
Level-gated items in the current tier can be early-unlocked for `30 🍎 × levels short`, sharing the
3-per-7-days cap with rooms. Placing still costs Coins.

## 3. Replay systems

1. **Scenarios** (`config/scenarios.js`, data): `{ id, name, desc, size, tier, cash, reputation, modifiers:{ salaryMult,
   fluChanceMult, tuitionMult, bannedRooms }, preset?: rooms/hall layout, goals:[{cond, label}], timeLimitDays,
   medals:{ bronze:1, silver:2, gold:3 } (goals met) }`. 8 scenarios: Rescue Riverside, Tiny Lot, Flu Season, Budget Cuts,
   Grand Opening (fast growth), Clean Sweep, Brain Trust (avg learning 85), Big Campus (reach High).
   Best medal per scenario stored in `ledger.medals` (survives resets; never purchasable).
2. **Sandbox:** infinite cash, all rooms/items unlocked, no rating/achievements/medals.
3. **Event pack** — generic, data-driven event runner (`config/events.js`) with conditions/effects DSL:
   Sports Day (needs gym or sportsfield), Science Fair (needs sciencelab/roboticslab), Teacher Raise,
   Donor Challenge (build X within 10 days → $5000), Broken Plumbing (a restroom offline 3 days),
   Snow Day, Concert (needs musicroom). Inspection & flu keep their v1 behaviour.
4. **Weekly goals:** 3 seeded goals per 7 game days (e.g. "cleanliness ≥ 80 all week", "enroll 15 students",
   "earn $3000", "no late classrooms"). Reward XP + coins + 5 🍎 (earned; credit key `goal:<week>:<i>`).
   Unfinished goals simply roll over (bank up to 3 weeks); no penalty.

## 4. Healthy-retention rules
No decay while away (offline already only progresses the sim). No push notifications. Report Card shows
"Great term — good time for a break!" after 3 consecutive terms for under-13 profiles. No new pressure UX.

## 5. Roadmap (not in this iteration)
University tier (dorms, lecture halls, research grants) · Legacy / New-School+ perks · Yearbook pass
(permanent volumes, cosmetics + Apples only) · Scenario Pack IAPs (City, Rural) · District map · Photo mode.
