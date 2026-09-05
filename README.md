# Bunny Kingdom Browser

Browser implementation of the original Bunny Kingdom base game, starting with verification of the board, cards, and rules.

## Play locally

From this folder, run `python3 -m http.server 8000 --bind 127.0.0.1`, then open [localhost:8000](http://localhost:8000). No package installation is required. Games autosave in this browser; after a refresh, select **Resume**. A seed lets you reproduce a deal. Choose 1–3 bots, select and confirm cards, and pass hands through a complete Exploration phase. Territory claims, reserved buildings, secret parchments, Provisions, and two-player discards are implemented. Construction supports legal city/farm placement, Sky Tower pairs, and saving buildings. Camp prompts support placement, saving, and lower-priority interruption when a Camp is announced. Players assign Trading Post resources, confirm harvests, and continue through all four rounds. All 37 parchments have scoring handlers, including copy selection and treasure interactions. Select board territories to inspect buildings, resources, lava boundaries, and fiefs. Your secret parchments are available to inspect throughout play. Final scores show a per-card breakdown. Unverified tie/copy/stacking cases require an explicit, recorded ruling only if they occur.

Player panels show total production (including farms and assigned Trading Posts), public building trays, and parchment stacks. Hover, focus, or tap a territory to highlight its connected fief and see its harvest value. Each parchment has an original pictogram; use the [picture guide](review/parchments/index.html) to learn all 37. Gold shields identify treasures and their values.

Choose **Normal** for the stronger bots or **Easy** for the original strategy. Normal compares draft pairs, plans building placements, values remaining harvests and parchment combinations, and considers the next player's opportunities. Bots remember only hands they personally saw. Difficulty is saved; older games resume with Normal bots. See the [strategy checkpoints and benchmark](docs/bot-benchmark.md).

Confirmed picks animate every player's claims and card pickups; construction moves buildings from the tray onto the board. Select **Skip**, press **Esc**, or turn **Animations off** in the heading for faster play. Device reduced-motion settings are respected. Moves save before playback, so skipping or refreshing cannot repeat or lose an effect.

Run engine tests with `npm test` (Node.js 22+). See [play flow, bot strategy, rule limitations, and browser checks](docs/implementation.md).

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

All **37 parchment entries** have been imported from the supplied text, completing the recorded **182-card inventory**. The import preserves the source wording and adds draft scoring specifications. Opportunist awards 10 Golden Carrots for second place after final scoring, as confirmed by the user. Tie handling for Opportunist and Matriarch, and some copy-card interactions, still need clarification.

- [Readable parchment review and open questions](data/cards/base-parchments.review.md)
- [Reusable JSON](data/cards/base-parchments.json) and [spreadsheet export](data/cards/base-parchments.csv)
- [Original supplied text](data/cards/parchments.txt)

The browser game supports a complete four-round session. Inventory coverage is complete; the documented parchment edge cases still require rulings. This is local play against heuristic bots, with no external AI service or account required.
