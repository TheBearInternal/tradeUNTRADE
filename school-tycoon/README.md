# School Tycoon 🏫

A mobile school-management tycoon game (think Zoo Tycoon / RollerCoaster Tycoon, but you build and run a school).
Built with Expo SDK 50 / React Native, runs in **Expo Go** — no native build needed.

## Run it

```bash
cd school-tycoon
npm install
npx expo start        # scan the QR code with Expo Go (Android / iOS)
npm test              # 97 engine tests (node:test, no device needed)
```

## What's in the game

- **Build your campus** on a grid: 27 room types across Elementary → Middle → High School tiers.
  Rooms only work when hallways connect them to the Front Office, and distance to restrooms and the
  cafeteria affects lateness and happiness, so layout is the puzzle.
- **Design every room** in an isometric, Sims-style interior editor. Rooms come furnished with free
  starter items; 70+ furniture items (bought with in-game cash) raise learning, comfort and hygiene,
  with diminishing returns.
- **Run the school:** hire teachers (rookie/veteran/expert), janitors, nurses, counselors; set tuition;
  manage happiness, learning, cleanliness, reputation and a 0–5 star rating.
- **Events with decisions:** inspections, flu outbreaks, sports day, science fair, donor challenges,
  snow days, concerts, broken plumbing, teacher raises.
- **Replay value:** 8 scenarios with bronze/silver/gold medals, a sandbox mode, weekly goals,
  achievements, and level-gated unlocks.
- **Monetization (stubbed via `MockStore`):** 🍎 Apples premium currency (also earnable free) for
  cosmetics (wall/floor themes, mascots, uniforms, building and furniture skins) and **early unlocks**
  so players can skip the grind. Stat furniture costs in-game cash; tier-ups, rating and reputation are
  never for sale. Includes age screen, parental gate, two-step purchase confirmation and Restore Purchases.

## Code map

| Path | What |
|---|---|
| `DESIGN.md`, `DESIGN_V2.md` | Game design from the agent design debates (with rulings) |
| `ENGINE_API.md` | Engine contract the UI codes against |
| `src/engine/` | Pure, deterministic JS simulation (reducer + selectors + data config). No React. |
| `src/engine/config/` | All content as data: rooms, items, layouts, staff, tiers, events, scenarios, cosmetics, products, balance |
| `src/platform/` | AsyncStorage saves (with backup slot), `StoreService` interface + `MockStore` |
| `src/ui/` | React Native UI: map, HUD, panels, isometric room editor (`editor/`), modals |
| `test/` | Engine tests |

## Going live with real payments

Replace `src/platform/store/MockStore.js` with an implementation of the `StoreService` interface
backed by RevenueCat or `react-native-iap` (requires an EAS dev build, not Expo Go). The engine's
receipt ledger is already idempotent (keyed by transaction id) and the UI persists before calling
`finishTransaction`. Server-side receipt validation should be added before launch.

## Roadmap (agreed, not built yet)

University tier · Legacy / New-School+ perks · Yearbook pass (permanent, cosmetics only) ·
scenario-pack IAPs · district map with multiple schools · photo mode.
