# Browser implementation

Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root and open `http://localhost:8000`. The application is static HTML, CSS, JavaScript modules, and the existing JSON catalogs. There is no build step or external AI service.

## Play flow

1. Start a seeded or random game against 1–3 bots. The original board, 18 neutral cities, eight lava edges, and all 182 cards are used.
2. Draft two cards per pick with three or four players. With two players, add a reserve card, play one card, and discard another face-down. Confirmed picks resolve together, then hands pass left in rounds 1/3 and right in rounds 2/4.
3. Territory cards claim spaces immediately and override Camps. Building cards reserve pieces. Parchments stay secret. Provisions draws and plays its two cards immediately, including chained Provisions.
4. Camp holders receive optional offers in ascending priority. Saving a Camp retains it. Announcing a saved Camp during Construction offers lower-priority holders a chance to act before selecting a target.
5. Place cities, farms, and paired Sky Towers on legal territories, or save buildings. Each player confirms completion. Bots use the same placement validation. Because players construct on their own territory, their normal placements are applied individually within the shared phase; the game waits for everyone's confirmation.
6. Select each Trading Post's basic resource and confirm. Harvests are calculated automatically from the actual fiefs. Inspect the per-fief breakdown, then advance the round. Final Trading Post choices remain fixed for parchment scoring.
7. After four harvests, reveal every parchment. Choose copy targets, resolve any actual rule questions, review each card's points, and confirm the winner. Tied final scores share victory.

Games autosave, including unconfirmed selections. Refreshing returns to the setup screen with a Resume button. The save stays in this browser and origin; changing ports or browsers creates a separate save location. Starting a new game replaces the previous save.

Draft controls show both selected cards; two-player games offer a Play/Discard swap. Building prompts show the required endpoints and highlight legal locations. On small screens, use the bottom links to switch between the board and your current choices. The board opens enlarged on phones: scroll sideways, or select **Fit board** to see all 100 territories at once. This view preference is saved with the game.

The table places an illustrated, overlapping hand below the board. Hover or keyboard focus lifts a card and shows its full text above the hand; territory previews highlight their coordinates. Short laptop screens use compact card faces so the board and hand remain visible together. Phones use a horizontally scrolling hand. The layout was informed by [IELLO's public BGA screenshots](https://iello.fr/bunny-kingdom-sur-board-game-arena/); the vector terrain, rabbits, and building pieces are original code in `src/art.js`. Cities show strength, Camps show priority, and Sky Towers show their pair number. Luxury farms have gold rims. Bot 3 uses green, including when older saves are resumed.

The hand groups territories on the left, buildings and Provisions in the middle, and parchments on the right. Territories sort by row A–J and then column 1–10; other categories group together and sort naturally by name. Sorting applies to the display copy, so selections keep their Play/Discard roles when the hand is redrawn.

The **Last turn** panel sits to the left of the board and groups the most recently confirmed Exploration pick by player. It includes territory claims, replaced Camps, reserved buildings, and all effects from Provisions, including chains. Parchments and face-down discards remain anonymous. Coordinates open territory inspection. The round/pick label identifies the recap through later phases; the next confirmed pick replaces it. Recaps autosave. Older saves begin recording one on their next pick. On phones the panel appears below the board.

## Rules still requiring a ruling

The user-supplied catalog defines every card, but four corner-case groups remain unverified. The engine does not silently choose their answers:

- Matriarch when its holder ties for the most territories.
- A copy card targeting another copy card. The user must identify the final copied card under their ruling; recursive copy loops are not automatically resolved.
- Multiple Treasure Hunter effects applying to one player's treasures. The screen requests the total multiplier.
- Tied rankings or multiple effective Opportunists. The screen requests the applicable awards after other scoring is known.

Only a case that occurs in the current game prompts for input. Rulings are stored in `scoringDecisions` and listed on the score screen. They can be revised before confirming the final score, and remain visible in the saved result. Changing an earlier ruling also reopens any dependent rank ruling. They are user decisions, not verified publisher rules. A single Opportunist with an untied ranking checks second place after the other final scores, then awards its 10 points once.

Copy choices are completed before final scoring. The first version lets bots choose their copy targets before the human confirms theirs; copy-choice ordering remains part of the catalog's open questions. Bot choices are heuristic, not a claim of optimal simultaneous strategy.

## Bot behavior and information

Bots value harvest potential, resource variety, city strength, connectivity through real lava/Sky Tower rules, and their own parchment objectives. They compare legal building placements, save redundant buildings, choose Camp locations, optimize their Trading Post combinations, and choose copy targets.

The controller supplies `publicView(state, playerId)`. Rival hands, unrevealed parchments, discarded cards, all reserve contents, and deck contents are removed from that view. At final scoring all parchments become visible. These are local browser opponents, not a network security boundary against someone inspecting their own browser's developer tools.

## Code map

| Module | Responsibility |
| --- | --- |
| `src/game.js` | Deck construction, deterministic shuffle/deals, drafting, immediate effects, visibility |
| `src/fiefs.js` | Ownership connectivity, lava, Sky Tower pairs, resource production |
| `src/construction.js` | City/farm/Sky Tower placement and completion barrier |
| `src/camps.js` | Priority offers and Camp placement/saving |
| `src/harvest.js` | Trading Posts, harvest ledger, round progression |
| `src/scoring.js` | Parchments, copy resolution, explicit ruling requests, final totals |
| `src/bots.js` | Heuristic choices from each bot's permitted view |
| `src/storage.js` | Save/load and basic save-integrity checks |
| `src/app.js`, `src/scoring-ui.js`, `src/card-text.js` | Browser controls, board/card inspection, score review |

## Validation

`npm test` runs the Node.js engine tests. They cover player-count dealing, card conservation, hidden information, draft validation, immediate effects, placement restrictions, Camps, lava/Sky Tower connectivity, four-round progression, Trading Posts, scoring combinations, explicit ruling requirements, and saves.

Optional real-browser checks require Python Playwright and Chromium:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser_smoke.py
python3 tests/browser_controls.py
python3 tests/browser_table.py
```

Keep the local server running while executing that script. It completes games at every player count through the actual controls, places human buildings and Camps, selects Trading Post resources and copy targets, verifies totals and card conservation, and checks refresh/resume and mobile overflow. Use `--screenshots /tmp/bunny-browser-checks` to capture review images. Explicit rulings selected by the test are test inputs, not assertions about the unresolved official rules.

The separate control checks exercise keyboard card selection, Play/Discard swaps, Sky Tower endpoint guidance, required Trading Post choices, and mobile board navigation and placement.

The table checks cover every card position in overlapping hands, complete-text previews, territory highlights, desktop/laptop viewport fit, artwork coverage, and updating the fourth player's color in older saves. Pass `--screenshots /tmp/bunny-table-checks` to save layout images.

The existing `build_map_review.py`, `build_card_review.py`, and `build_parchment_review.py` checks still validate the source catalogs and their exports separately from engine behavior.
