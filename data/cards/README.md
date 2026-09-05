# Original base-game card data

- [Readable building and Provisions table](base-buildings-and-provisions.review.md)
- [Spreadsheet export](base-buildings-and-provisions.csv)
- [Canonical JSON](base-buildings-and-provisions.json)

This catalog contains **42 building cards and 3 Provisions cards**, grouped into definitions with a `copies` count. Create that many separate card instances when constructing a deck. In particular, each Sky Tower card provides its own pair of tokens; pairs from different card instances must not be mixed.

The city-card split, camp priorities, and luxury farm placement requirements were confirmed by the user on 2026-09-05. General rules are sourced to the official base-game rulebook in the JSON. The field luxury resource's display name, currently **Carrot powder**, remains tentative. **Steel** preserves the user's terminology. Names are descriptive labels, not verified transcriptions of every printed title.

The 100 territory cards can be generated from `data/maps/original-board.json`. The **37 parchment entries** are imported separately, bringing the recorded inventory to **182 cards**. This is reference data, not an implementation of gameplay.

## Parchments

- [Readable review and scoring questions](base-parchments.review.md)
- [Canonical JSON](base-parchments.json) and [CSV export](base-parchments.csv)
- [Original user-supplied summaries](parchments.txt)

The original file remains unmodified. Each JSON entry preserves its line number and text; the source file's SHA-256 detects later edits that need reconciliation. Each of the 37 distinct entries is treated as one card. Eight entries are classified as treasures and 29 as missions; those classifications and the normalized scoring specifications await review.

`scoringSpec` is a draft description, not executable scoring code. `scoringStatus`, `openItemRefs`, and the top-level `openItems` record unresolved details. A `null` rule field is unknown, never an instruction to choose a default. General rules and special-case notes cite the official rulebook separately from the supplied card summaries.

The user confirmed Opportunist's wording as 10 Golden Carrots for second place after final scoring. The remaining questions concern Opportunist ties/copy interactions, Matriarch ties, copy-card targets and ordering, and multiple Treasure Hunter effects. The source's Golden Carrot point rewards remain distinct from basic Carrot resource production.

## Data conventions

- `id` is a stable identifier; `name` is a display label.
- `copies` counts cards, not physical tokens or initial board pieces.
- `category` is `city`, `farm`, `camp`, `sky_tower`, or `provisions`.
- `resolutionPhase` describes playing the card. A building's separate `placement.phase` describes putting its piece(s) on the board.
- `placement.allowedTerrains: null` means no terrain restriction. Ownership and the empty-building-slot requirement still apply. An empty array would allow no terrain and is invalid.
- `effect` describes strength, resource production, camp priority, a Sky Tower connection, or drawing and playing cards.
- `luxury_field` is the stable ID for the field luxury resource. It is distinct from `carrots`; resolving its name must not create an extra resource or card.
- `buildingRules` and `ruleNotes` hold shared constraints and timing. Read them with the per-card records.
- `sources`, `verification`, and `openItems` preserve provenance and outstanding work.

## Corrections and validation

Edit the JSON, then regenerate both review exports:

```sh
python3 scripts/build_card_review.py
```

Check card totals, resource mappings, terrain restrictions, camp priorities, city pieces against the existing map, and export freshness:

```sh
python3 scripts/build_card_review.py --check
```

The script uses Python's standard library. Its fixed inventory checks protect the confirmed original base game. A future expansion or custom deck should have a separate catalog and validation rules. Changes to confirmed mechanical details require updating their provenance as well as the checks; generation alone does not establish user verification.

For parchment edits, reconcile `base-parchments.json` with the source and its provenance, then regenerate or check:

```sh
python3 scripts/build_parchment_review.py
python3 scripts/build_parchment_review.py --check
```

This validates exact source-text preservation, unique entries, resource/card references, open-item links, totals against the map/building catalog, and export freshness. It does not establish that every scoring interpretation matches the printed game.
