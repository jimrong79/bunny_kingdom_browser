# In the Sky: expansion plan and table layout

Branch: `feat/in-the-sky`, starting from `4625daf` / `bots-v3-camp-defense`. Keep the PR in draft while the expansion is incomplete. The first commit adds only this plan and an isolated [layout preview](../review/in-the-sky/index.html). The base-game entry point, rules, and saved games are untouched.

## Current implementation

The main entry point now offers the playable expansion. Map/card data, setup, two-board interaction, expansion mechanics, endgame scoring, bots, and save/resume have been implemented in separate commits. See [rules and validation](in-the-sky-rules.md) for the remaining cloud-corner and District-timing review. The isolated layout preview below remains the original illustrative prototype.

## Try the layout

With the usual server running, open **http://localhost:8000/review/in-the-sky/**. Use the buttons to compare the cloud above the New World with the cloud at its upper-right. Switch between three, four, and five players to compare hand sizes and player panels. Hover or tap blue territories to highlight a sample fief across both boards, or hover a territory card to locate its board square.

This is a view-only prototype. The New World uses the verified map; the cloud's contents, row labels, rabbit placements, inventory, scores, and connection are illustrative. They must not become expansion data. The preview never accesses local storage.

Recommended desktop layout:

- Full browser width with modest outside padding, replacing the current 1,640px cap.
- A compact player strip across the top, including room for player five and coin totals.
- Recent actions on the far left; the larger New World in the center-left; the cloud raised at the center-right; inspection and turn controls on the far right.
- One hand across the bottom. Keep land and cloud cards together within territory cards, distinguished by board badges and coordinates.
- Comparable territory sizes on both boards. Preserve the cloud silhouette and orientation. A vertical arrangement uses more screen height and therefore makes both boards smaller when the hand must remain visible.
- Matching endpoint markers remain visible. Draw connection lines and highlight the entire connected fief when inspecting it; avoid permanent crossing lines.

Target one-view layouts at 1920×1080, 1440×900 and 1366×768. On smaller screens, allow an overview plus enlargement and scrolling rather than shrinking every label beyond readability. The prototype's mobile overview is exploratory, not a completed mobile gameplay design. At very wide aspect ratios, useful board size is still constrained by height; use extra width for readable details rather than stretching territories.

## Verified expansion scope

The [publisher's English rulebook](https://iellogames.com/wp-content/uploads/2019/04/BK_extension_Rules_EN_light.pdf), pages 2–7, establishes:

- 31 cloud territories across five rows; 50 added cards, for 232 combined cards.
- Expansion hands of 12, 15, 12 and 10 for two through five players; three players choose three cards. Two-player reserves contain 12 cards.
- Rainbows, Chimneys, Carrotadels, Wondrous Resources, District coins and end-game Trade scoring, plus changes to some base parchments.

The PDF is a source, not a complete verified card database. Do not infer all new parchment text, placement restrictions, or exact map contents from the overview illustrations.

## Received data and remaining review

1. The user supplied a clear cloud-board photo at `data/maps/cloud.jpeg`. Its real territory contents and geometry still need a normalized extraction and review; the layout preview remains illustrative.
2. The ten parchment summaries are in `data/cards/parchments-in-the-sky.txt`. On 2026-09-08, the user confirmed Merchant's Signet and Cape of Dawn as the two Treasures; the remaining eight are Missions.
3. The user confirmed three Carrotadels, two Chimneys, two Luxury farms and two Tax Collectors. The unnamed Luxury farms are cloud-only (wool-like artwork) and Plain-only (bird-like artwork). Plain means the existing `plains` terrain, not a carrot-producing Field. Descriptive labels and classification details are recorded in [the card confirmations](../data/cards/in-the-sky-confirmations.md).

Preserve the uploaded source files. Resource labels are descriptive, not printed names. Review any remaining card restrictions and order-sensitive District coin cases before implementing them.

Normalize into separate expansion JSON and human-readable map/card review tables, with source references and unresolved items. Verify the 50-card inventory before creating the combined deck. Explicitly review cloud adjacency and which cells count as edges or corners; the current letter/number arithmetic is specific to the base map.

## Incremental implementation and PR checkpoints

1. **Layout preview and plan:** review both arrangements before changing the game screen.
2. **Expansion data:** verified map, adjacency, card catalog and inventory tests; no guessed rules.
3. **Game configuration:** Base / Base + In the Sky setup, five-player support, configurable dealing and pick counts, board-qualified IDs, explicit compatibility for base saves.
4. **Two-board play:** rendering, drafting, construction, cross-board inspection, placement and animations. Keep board orientation stable; no accidental adjacency between boards.
5. **Expansion mechanics and scoring:** implement and test each mechanic separately. Track coin-awarding events, temporary harvest access and actual resource production separately. Review order-sensitive cases against the rulebook and supplied card text.
6. **Bots and regression checks:** legal expansion play first, then strategy. Replace base-only assumptions in draft pair enumeration, camp exposure, remaining picks, frontier adjacency and placement search. Compare with frozen base Normal, and retain all base-game checks.

Commit and push each completed slice. Keep `main` playable until the expansion's complete four-round flow, scoring, save/resume, rules tests and base regressions pass. The initial draft PR is a review of the design, not a claim that the expansion is playable.
