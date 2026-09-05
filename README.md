# Bunny Kingdom Browser

Browser implementation of the original Bunny Kingdom base game, starting with verification of the board, cards, and rules.

## Play locally

From this folder, run `python3 -m http.server 8000 --bind 127.0.0.1`, then open [localhost:8000](http://localhost:8000). No package installation is required. The first playable feature supports choosing 1–3 bots and dealing round one; drafting follows next.

Run engine tests with `npm test` (Node.js 22+).

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

Game implementation is in progress. Inventory coverage is complete; scoring definitions remain under review.
