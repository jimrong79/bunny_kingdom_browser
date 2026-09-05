# Original board data

The supplied `reference/map/IMG_3156.jpeg` is clear enough to transcribe. All 100 spaces, the 18 printed starting cities, and eight lava-blocked shared edges have been extracted. No additional photo is currently needed.

**Status: user verified.** The user reviewed the extraction and confirmed that the data looks correct. The confirmation is recorded in the JSON's `verification` metadata. Automated checks also establish structural consistency.

## Review the extraction

Open [`../../review/map/index.html`](../../review/map/index.html) in a browser. It works directly from a local file; no server or package installation is required.

- Compare the reconstructed board with the original photo, shown upright.
- Select a territory to see its type, base resource, starting city, and map neighbors.
- Select one of the eight lava entries to highlight the two affected territories.
- Enable **Enlarge selection in photo** for a close-up. Photo alignment is approximate because the photographed board is not perfectly flat or square to the camera.
- Turn off **Show lava markings** to inspect the actual printed lava without the added red overlay.
- Report any correction by coordinate or edge pair.

The photograph remains an external, local-only reference file. The review HTML does not embed a copy of it. Keep the project folder structure intact for the photo to load.

## Files

| File | Purpose |
| --- | --- |
| `original-board.json` | Canonical map data for reuse by the game and future map tools. |
| `original-board.cells.csv` | Spreadsheet export of all 100 spaces, including adjacent lava-blocked neighbors. |
| `original-board.lava.csv` | One row per blocked shared edge. |
| `original-board.review.txt` | Compact coordinate grid, counts, city list, lava list, and interpretation notes. |
| `../../review/map/index.html` | Interactive visual comparison with the supplied photograph. |

## Cell fields

Coordinates run **A1–J10**, with A at the top and 1 at the left. Records are ordered by row and then numeric column.

| Field | Meaning |
| --- | --- |
| `coordinate` | Unique coordinate, for example `A1`. |
| `row` | Row letter A–J. |
| `column` | Column number 1–10. |
| `terrain` | Printed space category: `forest`, `plains`, `field`, `sea`, `mountain`, or `city`. |
| `baseResource` | `wood`, `carrots`, `fish`, or JSON `null` for no resource. CSV uses an empty field for `null`. |
| `startingCityStrength` | `1` for a printed neutral city; `0` otherwise. |
| `lavaBlockedNeighbors` | CSV-only convenience field derived from the lava list. Multiple coordinates are separated with semicolons. |

Here, `city` preserves the printed city-space category. It has no printed resource and starts with a neutral strength-1 city. This label must not be used to replace a territory's original category when a player constructs a city during play. No unshown underlying terrain is inferred.

## Lava and connectivity

`blockedConnections` contains `{ "from": "B1", "to": "B2", "reason": "lava" }` entries. Each pair is **undirected** and blocks one shared orthogonal edge. Do not store both directions as separate records.

The eight extracted pairs are:

```text
B1 — B2
B6 — C6
C2 — D2
C8 — C9
D5 — D6
F2 — F3
I7 — J7
I8 — J8
```

The last two entries describe a continuous printed flow crossing two grid edges. The crease between rows E and F is a physical fold, not a blocked edge. Rivers, coastlines, decorative paths, and rocks are not lava boundaries.

These are map-level edges. Actual fief connectivity still depends on ownership, alternative paths, and any Sky Towers in play.

## Corrections and regeneration

Edit `original-board.json`, then regenerate the spreadsheet, summary, and visual review from the project root:

```sh
python3 scripts/build_map_review.py
```

Check consistency and whether the generated files match the JSON:

```sh
python3 scripts/build_map_review.py --check
```

The generator uses only Python's standard library. It validates coordinates, resource/type consistency, starting cities, duplicate edges, orthogonal adjacency, mountain endpoints, and the source photo's SHA-256 when the photo is present.

The current extraction is `user_verified`. If the map is changed, set `verification.status` back to `awaiting_user_review` and remove the previous review metadata until the user confirms the revised data. Record the reviewer, confirmation, and recording time when marking it `user_verified`; regeneration alone does not establish human verification.
