# In the Sky implementation and rule review

The expansion is playable on `feat/in-the-sky`. Select **Bunny Kingdom + In the Sky** on the start screen. The original mode remains available; five players require the expansion.

## Data and coordinates

The combined deck contains 232 cards: the original 182 plus 31 cloud territory cards (including two Rainbows), seven building cards, ten parchments, and two Tax Collectors. The cloud starts with twelve Wondrous farms, two fixed Rainbow endpoints, and cities at C2-3 (strength 3), C2-4 (1), C2-6 (2), and C4-5 (1). Starting pieces do not create extra building cards.

Cloud coordinates use `C<row>-<position>`, with rows top to bottom and positions left to right. The five rows contain 5, 6, 7, 6, and 7 territories. Explicit neighbors include shared partial sides between staggered rows. The engine never infers a connection between boards from coordinates or screen position. The [map review](../review/cloud/index.html) displays every cell and its recorded neighbors. The original photo stays local at `data/maps/cloud.jpeg`.

The [expansion catalog](../data/cards/in-the-sky.json) preserves all supplied parchment summaries and their line numbers. Resource names describe the artwork. The user confirmed that Cloud wool is a Great Cloud-only Luxury farm, Bird is a Plain-only Luxury farm, and Merchant's Signet and Cape of Dawn are Treasures. Wondrous and Luxury are distinct resource classes.

## Implemented rules

| Mechanic | Behavior |
| --- | --- |
| Dealing | Two players: 12-card hand and 12-card reserve, play one/discard one. Three: 15 cards, choose three. Four: 12, choose two. Five: 10, choose two. Four rounds in every mode. |
| Carrotadel | Effective fief strength is the greater of 5 and ordinary city strength. Additional Carrotadels do not stack. Each still counts as a City for parchments. |
| Rainbow | Claim its fixed cloud territory and reserve its ground token. Place on owned, unbuilt New World territory in a different fief. Move the ground endpoint during Construction; it cannot return to inventory. Relocation awards no coins. |
| Chimney | Great Cloud only. During harvest choices, select a basic resource actually present in its fief, including a connected New World part. Each own fief containing New World territory gains access for that harvest. It neither creates production nor duplicates a resource already present. |
| District | Fief containing at least two Rabbits. A new District awards one Coin. Expanding, merging, splitting, or relocating an existing District does not award another. Coins are retained in an event ledger. |
| Tax Collector | Immediately adds two to Coin value. |
| Trade | Endgame Coin value multiplied by produced Unique resource types (Luxury and Wondrous). Basics and Chimney access do not count. Trade is included before final rank bonuses. |
| Parchments | All ten effects are implemented, including Nibblonacci's Treasure-count sequence, strict cloud row majorities, and Cloud Independence recalculated without Rainbow or Sky Tower links. Governors count current Districts. |

Trading Posts are selected before confirming Chimneys. Changing a Trading Post invalidates a Chimney choice if that basic resource is no longer present. Chimneys with no available basic resource require no selection. Harvest breakdowns distinguish shared access from production.

Explorer counts four corners on each board: A1, A10, J1, J10 and C1-1, C1-5, C5-1, C5-7. C3-1 and C3-7 do not count. This user confirmation (2026-09-08) also applies to previews, copied Explorer effects, and older unfinished saves.

## Details awaiting confirmation

- **District timing within a pick:** the current implementation compares the board before and after all selected cards and Provisions effects resolve together, following the base game's simultaneous play step. Selecting the same cards in a different click order therefore cannot manufacture a Coin. The expansion rulebook does not explicitly discuss cases where resolving individual territories sequentially would create an intermediate District. This is a documented interpretation awaiting confirmation, not a claimed publisher clarification.
- The original game's existing copy-chain, stacked Treasure Hunter, and Opportunist interaction questions still use recorded final-scoring rulings when applicable. Matriarch ties are resolved: the user confirmed on 2026-09-08 that only a sole territory leader earns its 12 points; tied leaders earn zero, including copied Matriarch effects.

Primary source: [IELLO's expansion rulebook](https://iellogames.com/wp-content/uploads/2019/04/BK_extension_Rules_EN_light.pdf), particularly setup on page 2, dealing and board geometry on page 3, Carrotadels on page 4, buildings on page 5, Coins on page 6, and Trade on page 7. Farm restrictions, Treasure classifications, and parchment summaries also use the user's supplied information.

## Bots and browser flow

Normal bots evaluate current Trade, future harvests, Carrotadel floors, cloud placement availability, District creation, public opposing opportunities, and owned parchment effects. Three-card search compares combinations from the ten highest individually valued candidates. Two-card search retains all pairs. Construction plans legal placements and then considers Rainbow relocation; market choices account for Chimneys. Rainbows receive no reserve-only value bonus: the token can be moved after placement, so saving it must not create an artificial advantage over taking a useful connection now. Placement remains optional when connections harm parchment scoring or have no estimated benefit. These remain local heuristic bots and receive only the player's permitted view.

Desktop play shows the two boards together, public player panels across the top, recent actions at left, controls at right, and the hand below. Hover or focus a fief to highlight both boards and draw its connection lines. Use **Enlarge board** for a closer look, especially on phones. Coin awards appear in the recap and playback. Final standings separate harvest, parchment, and Trade points. Saves and exports retain expansion state and coin events.

## Validation

Run `npm test` with Node.js 22 or newer. The expansion checks cover inventory, source preservation, geometry, 2–5-player deals, legal placements, resource classes, District events, Rainbow movement, Chimneys, all new scoring types, complete games, hidden-information invariance, and animation accounting.

With the local server and Python Playwright/Chromium available:

```sh
python3 tests/browser_expansion.py
python3 tests/browser_sky_controls.py
```

The first suite completes four-round games at every expansion player count, including a Normal three-player game, scoring, refresh/resume, and mobile results. The second exercises human farm restrictions, Carrotadel placement, Rainbow placement and movement, connected-fief inspection, required Chimney selection, and viewport overflow. Browser tests supply explicit test rulings for unresolved cases; they do not verify those rulings as official rules.

The historical reconstruction script `scripts/audit-game.js` remains limited to its documented base-game cases. It is not an expansion match auditor.
