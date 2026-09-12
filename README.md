# Bunny Kingdom Browser

Browser implementation of Bunny Kingdom and the In the Sky expansion, with local AI opponents.

## Play online

[Play Bunny Kingdom in your browser](https://jimrong79.github.io/bunny_kingdom_browser/). Choose the base game or **Bunny Kingdom + In the Sky**, enter your name, and select your bot opponents. No installation or account is required, and the developer's computer does not need to be running.

Games autosave in the browser on the device where you play. Saves from localhost remain there; they do not automatically move to the online site or another device. Finished games can still be downloaded as JSON.

The **Royal atlas** landing page combines a decorative map made from the game's existing pieces with setup, saved-game resume, and sound controls. Its layout adapts to desktop and mobile screens. The board and cards retain their established design when you start or resume play.

Use **Rules & support** in the header at any time for BoardGameGeek listings, IELLO's game pages, and official English rulebooks for both games. Enjoying the game? Support the tabletop creators—designer Richard Garfield, illustrator Paul Mafayon, and publisher IELLO—by buying a physical copy. This browser version is an unofficial fan project.

### Publishing updates

[GitHub Actions](https://github.com/jimrong79/bunny_kingdom_browser/actions) tests and publishes each push to `main`. Develop changes on a feature branch and open a pull request; merging it into `main` updates the live game after the checks pass. Pull requests run the checks without publishing. Keep `main` allowed in the repository's `github-pages` deployment environment.

The workflow runs `python3 scripts/build_site.py`, which packages only `index.html`, the JavaScript/CSS, the five game-data JSON files, and the in-game parchment picture guide in `_site/`. Reference photos, saved matches, audit reports, and other review tools are excluded. To preview that package locally, run `python3 -m http.server 8001 --bind 127.0.0.1 --directory _site` after building it.

### Website visitor statistics

The live site's counter is configured for [jimrong79.goatcounter.com](https://jimrong79.goatcounter.com/). Sign in there to view the dashboard after this configuration is deployed.

Visitor analytics use [GoatCounter](https://www.goatcounter.com/), which offers free hosting for reasonable public usage. Create a GoatCounter site for the game's public URL, then put its public `https://YOUR-SITE.goatcounter.com/count` endpoint in `GOATCOUNTER_ENDPOINT` in [src/analytics.js](src/analytics.js). No password or API key is needed. An empty endpoint disables analytics.

Counting runs only at `https://jimrong79.github.io/bunny_kingdom_browser/`; local games and copies hosted elsewhere do not load the analytics script. The dashboard shows page visits, estimated visitors, referring sites, and browser/device statistics. Counts start after configuration and deployment; GitHub's **Insights → Traffic** measures repository traffic separately. Ad blockers can prevent counting. If analytics is blocked or unavailable, the game still works.

Only page visits are counted, not game starts, moves, or completions. Our integration uses a fixed page path/title and the referring site's origin. It does not read player names, seeds, scores, cards, or saved matches. GoatCounter also collects basic browser/device information and can process URL campaign parameters; the game does not put player details in its URL. **Rules & support** includes a visitor-statistics notice on the live site.

To exclude your own browser, open [the game with `#toggle-goatcounter`](https://jimrong79.github.io/bunny_kingdom_browser/#toggle-goatcounter), reload if necessary, and follow GoatCounter's popup. This preference is specific to that browser; visiting it again toggles counting back on. See [GoatCounter's instructions](https://www.goatcounter.com/help/skip-dev). The dashboard is at your GoatCounter site address; keep its public-dashboard option disabled if you want the statistics private.

## Play locally

From this folder, run `python3 -m http.server 8000 --bind 127.0.0.1`, then open [localhost:8000](http://localhost:8000). No package installation is required. Games autosave in this browser; after a refresh, select **Resume**. A seed lets you reproduce a deal. Choose 1–3 bots, select and confirm cards, and pass hands through a complete Exploration phase. Territory claims, reserved buildings, secret parchments, Provisions, and two-player discards are implemented. Construction supports legal city/farm placement, Sky Tower pairs, and saving buildings. Camp prompts support placement, saving, and lower-priority interruption when a Camp is announced. Players assign Trading Post resources, confirm harvests, and continue through all four rounds. All 37 parchments have scoring handlers, including copy selection and treasure interactions. Select board territories to inspect buildings, resources, lava boundaries, and fiefs. Your secret parchments are available to inspect throughout play. Final scores show a per-card breakdown. Only a tie for second at the Opportunist checkpoint still requires an explicit, recorded ruling.

**Undo last action** lets you correct placements during the current Construction phase, including Camps, paired Sky Towers, and Rainbow moves. Repeat it to work backward through your actions. Cards, Coins, and District history are restored together; Camp undo also rewinds subsequent bot responses to preserve priority. After **Done building**, use **Back to building** on the harvest resource screen to return with your undo history intact. Going back restores resource choices from before Done building. This survives refresh; **Confirm & harvest** locks the round. Buildings from previous rounds cannot be removed. Older saves can return to building, but placement history discarded by an older version cannot be recovered.

Player panels show total production (including farms and assigned Trading Posts), public building trays, and parchment stacks. Hover, focus, or tap a territory to highlight its connected fief and see its harvest value. Each parchment has an original pictogram; use the [picture guide](review/parchments/index.html) to learn all 37. Gold shields identify treasures and their values.

Choose **Normal** for the stronger bots or **Easy** for the original strategy. Normal compares draft pairs, plans building placements, values remaining harvests and parchment combinations, and considers the next player's opportunities. Bots remember only hands they personally saw. Difficulty is saved; older games resume with Normal bots. See the [strategy checkpoints and benchmark](docs/bot-benchmark.md).

**Hard (test)** is an experimental alternative that compares placing a Camp now with saving it for plausible future territory outcomes. Its other decisions reuse Normal. Initial comparisons show small, mixed gains, so Normal remains the recommended default. Hard saves include the strategy version `hard-camps-v1`; see the [experiment, checkpoints, and results](docs/hard-bot-experiment.md).

Confirmed picks animate every player's claims and card pickups; construction moves buildings from the tray onto the board. Select **Skip**, press **Esc**, or turn **Animations off** in the heading for faster play. Device reduced-motion settings are respected. Moves save before playback, so skipping or refreshing cannot repeat or lose an effect.

Quiet sound effects accompany card selection, rabbit claims, building placement, and scoring. Use **Sound on/off** on the start screen, in the heading, or during animation playback; the preference stays saved across games. With animations off, each move gets a single short cue. Effects are synthesized locally, start after interaction, and fall silent when the tab is hidden.

Confirming the final score opens a results screen with each player's colored rabbit, ranked point total, and harvest/parchment breakdown. Gold badges mark winners, including ties. Review the board or full scoring details, or select **Play again**. Reopening a completed save returns to the results screen.

Use **Download game** on the results screen to export the full match as JSON for review. Put exports in [`reference/games/`](reference/games/), which stays local. The seed reproduces the deal; the export also captures the actual moves and final position.

Run engine tests with `npm test` (Node.js 22+). See [play flow, bot strategy, rule limitations, and browser checks](docs/implementation.md).

## In the Sky

Choose **Bunny Kingdom + In the Sky** when starting a game. Play against 1–4 bots using both boards and all 232 cards. The expansion includes Carrotadels, Rainbows, Chimneys, District Coins, Trade, and all ten new parchments. Player panels show Coins and current Trade; the final results separate Trade from harvests and parchments.

On desktop, compact player panels leave more room for both boards and the hand. New World and Cloud territories share a scale that adjusts when you move between monitors. Very short windows scroll vertically to preserve board readability; **Enlarge board** provides a closer, scrollable view.

Explorer scores four corners per board. Districts remember every territory that has belonged to one, including after Rainbow movement or Camp capture. Copy chains use the copying player’s seat, Treasure Hunters stack additively, and all Opportunists share one final checkpoint. Only Opportunist qualification when tied for second remains under review. See [implemented rules, known questions, bot behavior, and validation](docs/in-the-sky-rules.md) and the [cloud map review](review/cloud/index.html).

## Local workspace

- Windows: `C:\Users\jimro\workspaces\bunny_kingdom_browser`
- WSL: `/mnt/c/Users/jimro/workspaces/bunny_kingdom_browser`
- Git remote: `https://github.com/jimrong79/bunny_kingdom_browser.git`

## Map reference

Put board photos in [`reference/map/`](reference/map/). A full-board photo should show the coordinate labels, terrain, starting cities, and lava boundaries. Add close-ups wherever a boundary is unclear.

Raw files in that folder are ignored by Git and remain local by default. The folder's README is not ignored. Saving a file locally does not automatically upload it to GitHub.

## Extracted original board

The supplied board photo has been transcribed into **100 spaces, 18 starting cities, and eight lava-blocked edges**. The user reviewed the extraction and confirmed that the data looks correct.

- [Open the visual comparison](review/map/index.html): select a territory or lava edge and compare it with the original photo. Open this HTML file in your browser; no server is required.
- [Reusable JSON](data/maps/original-board.json)
- [Spreadsheet of spaces](data/maps/original-board.cells.csv) and [lava edges](data/maps/original-board.lava.csv)
- [Readable text summary](data/maps/original-board.review.txt)
- [Data format and correction instructions](data/maps/README.md)

## Buildings and Provisions

The building inventory is recorded as **21 cities, 12 farms, 6 camps, and 3 Sky Towers**, plus **3 Provisions**. The user's confirmed city quantities, camp priorities, and luxury-terrain assignments are included. The field luxury resource's name is tentative; its placement requirement is confirmed.

- [Readable card review](data/cards/base-buildings-and-provisions.review.md)
- [Reusable JSON](data/cards/base-buildings-and-provisions.json) and [spreadsheet export](data/cards/base-buildings-and-provisions.csv)
- [Data conventions and validation](data/cards/README.md)

## Parchments

All **37 parchment entries** have been imported from the supplied text, completing the recorded **182-card inventory**. The import preserves the source wording and adds draft scoring specifications. Opportunist awards 10 Golden Carrots for second place after final scoring, as confirmed by the user. Only Opportunist qualification when tied for second still needs clarification.

- [Readable parchment review and open questions](data/cards/base-parchments.review.md)
- [Reusable JSON](data/cards/base-parchments.json) and [spreadsheet export](data/cards/base-parchments.csv)
- [Original supplied text](data/cards/parchments.txt)

The browser game supports a complete four-round session. Inventory coverage is complete; the remaining Opportunist tie case requires a ruling when it occurs. This is local play against heuristic bots, with no external AI service or account required.
