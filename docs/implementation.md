# Browser implementation

Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root and open `http://localhost:8000`. The application is static HTML, CSS, JavaScript modules, and the existing JSON catalogs. There is no build step or external AI service.

For the playable expansion, see [In the Sky rules, controls, bots, and validation](in-the-sky-rules.md). The flow below describes the original mode.

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

Player panels show production counts for Wood, Fish, and Carrots, plus acquired luxury resources. These count repeated production from natural terrain and farms; the fief readout separately shows distinct resource types for harvest scoring. Unassigned Trading Posts are marked. Building buttons open each player's public tray; parchment stacks reveal only your own cards until final scoring. Hovering, keyboard-focusing, or tapping a territory highlights its fief using actual lava and Sky Tower connectivity. Tapping pins the inspection while other hovered fiefs can be previewed.

All 37 parchments have original vector pictograms shared across hands, inventory, and scoring. Treasure cards use numbered gold shields; gloves also show the paired value and left/right marker. Missions use resource tools, crowns, border/corner maps, Camp cards, treasure motifs, and directional copy arrows. The [picture guide](../review/parchments/index.html) pairs all illustrations with the supplied full card summaries.

Turn playback uses the public recap and newly placed board buildings. Rabbits hop to claims, building cards enter trays, and anonymous card backs enter parchment stacks. Construction animates placement, including both Sky Tower endpoints and Camp priority. Phone playback brings off-screen territories into view and uses the visible player badge when the player's panel is off screen. The engine settles and autosaves before animation starts. Playback changes presentation only; input is paused until it finishes or is skipped. **Skip**, **Esc**, the saved **Animations** toggle, and device reduced-motion preferences support faster or motion-free play. Refreshing resumes the settled state without replaying effects.

## Construction undo

**Undo last action** works backward through the human player's current construction decisions. It returns placed buildings to the tray, removes both Sky Tower endpoints together, and restores a moved Rainbow to its preceding location. An older Rainbow can undo a move made this round; its earlier placement stays locked. Territory cards and printed buildings are never removed by construction undo.

Camp placement, saving, and announcements include any bot responses that they trigger. Undo restores the earlier priority queue, affected bot placements and readiness, Coins, permanent District marks, and activity log. Bots that acted before the decision remain unchanged. Repeating the decision therefore cannot mint extra Coins or skip a lower-priority Camp.

The journal contains only changes to public construction data and lives in `ui.constructionUndo`, outside the game object passed to bots. It survives autosave/resume. Failed actions roll back atomically. Undo validates the saved action's round, player, game seed, phase, and resulting position before restoring anything. **Done building** clears the journal; later phases and rounds reject it. Older saves have no retrospective undo history and start recording with the next action.

Run `python3 tests/browser_construction_undo.py --url http://localhost:8000/` with Playwright installed to check placements, repeat undo, save/resume, confirmation locks, mobile controls, Rainbow Coins and links, and Camp priority with bot responses. The synthetic fixtures retain the full physical card inventory. `tests/construction-undo.test.js` also checks all building categories, both Sky Tower endpoints, prior District history, previous-round protection, stale actions, and failed transactions.

## Confirmed scoring and the remaining ruling

User confirmations on 2026-09-08 define the special cases:

- Matriarch requires a sole territory lead; ties score zero.
- Copying a copy repeats its direction from the copying player's seat. Choices are independent of the neighbor's choices. The UI and bots enumerate finite paths to non-copy cards; repeated physical cards are excluded, and no available finite target means zero points.
- Treasure Hunter multipliers are additive: one effect gives 2T, two give 3T, and three give 4T, including copies.
- All Opportunist effects use one shared checkpoint after Trade and all other parchment scores. Bonuses are applied together, with no recheck after standings change.

Only qualification when tied for second at the Opportunist checkpoint remains unresolved. That case requests an explicit recorded award, which applies consistently to the player's Opportunist effects. Historical completed games retain their saved scoring and recorded rulings.

Bots choose their complete copy paths before the human confirms theirs. Their choices are heuristic; final scoring waits for every choice and uses the completed set.

## Bot behavior and information

**Normal** is the default strategy. **Easy** uses the original drafting/building strategy with expansion legality updates; both difficulties share complete copy-path evaluation. The original policy remains available at the `bots-v1-baseline` checkpoint. Difficulty is saved in `game.botDifficulty`; saves without that field use Normal. Old saves without observed-hand history accumulate it from their next confirmed pick.

Normal evaluates legal harvest gains across the remaining rounds and estimates future expansion and parchment progress. Strength-3 cities respect the mountain restriction; luxury farms benefit from additional harvests, while unavailable late terrain sharply reduces their value. Drafting evaluates every unordered pair (up to 66), including combined territory connections and territory/building combinations. Two-player games compare play/discard assignments using the next player's public opportunities. Public board evaluation of rivals excludes their unknown parchment objectives.

Construction searches up to three placements ahead, retaining four promising alternatives at each depth, including alternatives that temporarily gain little but unlock a later combination. Equivalent slots are grouped by fief, terrain, and natural production, and Sky Tower endpoints preserve terrain needed by reserved buildings. Draft estimates use a shallower two-placement search. Trading Posts maximize the current harvest; round-four comparisons add parchment points exactly once. Copy choices consider the whole effective parchment collection, including changes to an existing glove and treasure multipliers.

Each player privately records the IDs of cards in hands they actually saw before passing. Normal uses seen territories to estimate future connections and can recognize previously seen two-player territories that must have been discarded after a completed round. Observation history is excluded from rival views and autosaves with the owning player. The bot does not consult the deal seed, hidden deck, rival hands, or rival observation histories. Forecasts of future resources and unresolved parchment awards are decision estimates; they never change scoring rules or resolve the user's pending rule questions.

These are bounded heuristic searches, not full-game rollouts or trained agents. Strength is compared against the original bot with seeded, seat-rotated games; see [benchmark methods and checkpoints](bot-benchmark.md).

The controller supplies `publicView(state, playerId)`. Rival hands, unrevealed parchments, discarded cards, all reserve contents, and deck contents are removed from that view. At final scoring all parchments become visible. These are local browser opponents, not a network security boundary against someone inspecting their own browser's developer tools.

## Code map

| Module | Responsibility |
| --- | --- |
| `src/construction-undo.js` | Reversible construction decisions, Camp response rollback, current-round locks |
| `src/game.js` | Deck construction, deterministic shuffle/deals, drafting, immediate effects, visibility |
| `src/fiefs.js` | Ownership connectivity, lava, Sky Tower pairs, resource production |
| `src/construction.js` | City/farm/Sky Tower placement and completion barrier |
| `src/camps.js` | Priority offers and Camp placement/saving |
| `src/harvest.js` | Trading Posts, harvest ledger, round progression |
| `src/scoring.js` | Parchments, copy resolution, explicit ruling requests, final totals |
| `src/bots.js`, `src/bots-baseline.js` | Normal and Easy decisions from each bot's permitted view |
| `src/bot-evaluation.js`, `src/bot-planning.js` | Harvest/goal forecasts and bounded construction search |
| `src/bot-memory.js` | Private observed hands and known territory availability |
| `src/storage.js` | Save/load and basic save-integrity checks |
| `src/app.js`, `src/scoring-ui.js`, `src/card-text.js` | Browser controls, board/card inspection, score review |
| `src/kingdom-ui.js`, `src/interaction.css` | Production, public/private inventories, colored fief inspection |
| `src/art.js`, `src/parchment-art.js` | Original terrain, pieces, resources, and parchment illustrations |
| `src/turn-animation.js`, `src/turn-animation.css` | Public event timeline and cancellable visual playback |
| `src/sound.js` | Synthesized effects, saved sound preference, and audio lifecycle |
| `src/results-ui.js`, `src/results.css` | Final standings, winner badges, and results presentation |

## Validation

`npm test` runs the Node.js engine tests. They cover player-count dealing, card conservation, hidden information, draft validation, immediate effects, placement restrictions, Camps, lava/Sky Tower connectivity, four-round progression, Trading Posts, scoring combinations, explicit ruling requirements, and saves.

Optional real-browser checks require Python Playwright and Chromium:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser_smoke.py
python3 tests/browser_controls.py
python3 tests/browser_table.py
python3 tests/browser_interactions.py
python3 tests/browser_chimney_inspection.py
python3 tests/browser_animations.py
python3 tests/browser_audio.py
python3 tests/browser_results.py
python3 tests/browser_bot_difficulty.py
```

Keep the local server running while executing that script. It completes games at every player count through the actual controls, places human buildings and Camps, selects Trading Post resources and copy targets, verifies totals and card conservation, and checks refresh/resume and mobile overflow. Use `--screenshots /tmp/bunny-browser-checks` to capture review images. Explicit rulings selected by the test are test inputs, not assertions about the unresolved official rules.

The separate control checks exercise keyboard card selection, Play/Discard swaps, Sky Tower endpoint guidance, required Trading Post choices, and mobile board navigation and placement.

The table checks cover every card position in overlapping hands, complete-text previews, territory highlights, desktop/laptop viewport fit, artwork coverage, and updating the fourth player's color in older saves. Pass `--screenshots /tmp/bunny-table-checks` to save layout images.

Interaction checks cover repeated resource production, Trading Posts, luxury farms, lava/Sky fief highlighting, and inventory privacy. Animation checks use real motion to exercise all players, Provisions, hidden card backs, counter updates, input locking, skipping, refreshing mid-flight, saved preferences, building placement, mobile panning, and reduced motion. The other browser suites request reduced motion so long playthroughs need not wait for playback.

Audio checks measure native Web Audio output and verify silent loading/resuming, persistent mute, muting during animation, skip cancellation, reduced-motion feedback, scoring cues, hidden-tab silence, and continued play when Web Audio is unavailable.

Results checks cover ranked totals, player colors, tied winners, score details, board review, saved results, mobile layout, and starting another game. Full browser games also verify that the results screen agrees with final scoring at every player count.

For recorded matches, `scripts/audit-game.js` reconstructs draft selections and placement history, checks every final field, independently calculates scoring, and checks bot decisions for dependence on hidden information. See [local game history and audit limitations](../data/game_history/README.md).

Bot checks exercise paired connections, mountain/city combinations, constrained building slots, final Trading Post tradeoffs, glove-copy interactions, opponent-aware discards, private observations, and invariance to hidden cards or the game seed. The difficulty browser check verifies both policies' actual decisions, saved settings, old-save compatibility, and mobile setup.

The existing `build_map_review.py`, `build_card_review.py`, and `build_parchment_review.py` checks still validate the source catalogs and their exports separately from engine behavior.
