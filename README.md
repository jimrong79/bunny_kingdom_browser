# Bunny Kingdom Browser

Browser implementation of the original Bunny Kingdom base game, starting with verification of the board, cards, and rules.

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

The game has not been implemented yet. The first completed step is the original-board transcription and its review tools.
