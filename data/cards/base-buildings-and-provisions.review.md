# Base-game buildings and Provisions

Generated from [the canonical JSON](base-buildings-and-provisions.json). Counts, camp priorities, and luxury-terrain assignments were confirmed by the user on 2026-09-05. General rules use the official rulebook.

**42 building cards + 3 Provisions = 45 cards in this catalog.** The full deck is 100 territories + these 45 cards + 37 parchments = 182. [Parchment entries and scoring questions](base-parchments.review.md) are maintained separately.

The 18 starting strength-1 cities are on the map. Together with the 9/9/3 city cards, they account for all 27/9/3 city figures.

Card names below are descriptive labels. **Carrot powder is tentative**; it identifies one distinct luxury resource placed on a field, separate from basic carrots. Steel preserves the user's supplied name.

| Card | Copies | Effect | Terrain restriction |
| --- | ---: | --- | --- |
| City 1 | 9 | Strength 1 | any |
| City 2 | 9 | Strength 2 | any |
| City 3 | 3 | Strength 3 | mountain |
| Wood Farm | 1 | Wood | any |
| Fish Farm | 1 | Fish | any |
| Carrots Farm | 1 | Carrots | any |
| Trading Post | 2 | Choose wood/fish/carrots each round | any |
| Pearl Farm | 1 | Pearl | sea |
| Mushroom Farm | 1 | Mushroom | forest |
| Carrot powder Farm (name tentative) | 1 | Carrot powder | field |
| Diamond Farm | 1 | Diamond | mountain |
| Copper Farm | 1 | Copper | mountain |
| Gold Farm | 1 | Gold | mountain |
| Steel Farm | 1 | Steel | mountain |
| Camp 1 | 1 | Priority 1 | any |
| Camp 2 | 1 | Priority 2 | any |
| Camp 3 | 1 | Priority 3 | any |
| Camp 4 | 1 | Priority 4 | any |
| Camp 5 | 1 | Priority 5 | any |
| Camp 6 | 1 | Priority 6 | any |
| Sky Tower | 3 | 2 tokens; connects 2 separate fiefs | any |
| Provisions | 3 | Immediately draw and play 2 cards | n/a |

Any terrain still requires the appropriate ownership and an empty building slot. Camps require no rabbit and no building; Sky Towers require two eligible territories in separate fiefs.

## Rule notes

- Playing a building card during Exploration reserves its matching piece(s); actual placement happens during Construction.
- Construction is optional. An unplaced building can be kept for a future round.
- Buildings require a controlled territory with no existing building, except Camps, which require a territory with neither a rabbit nor a building.
- There is at most one building (city or token) per territory. A city cannot upgrade or replace an existing city.
- A territory keeps its printed terrain and natural resource when a building is placed.
- A farm adds its resource to the territory. Fief wealth counts distinct resource types; resource-counting parchments count production including farms.
- A Trading Post produces one chosen basic resource each round. Its round-four choice also applies to final parchment scoring.
- Each Sky Tower card supplies a matching pair of tokens. Place them on two of your territories in different fiefs; the pair connects those territories as adjacent. Each token occupies a building slot.
- To place a Camp, announce its priority without announcing the target. Holders of lower-numbered Camps may place theirs first, starting with the lowest. After they place or pass, the announcing player may place or keep their Camp for a future round.
- The matching territory card removes a Camp. If played by its owner, their rabbit stays; if played by an opponent, the opponent replaces the rabbit and takes control. The building slot becomes available.
- Provisions immediately draws and plays two cards from the deck, then is discarded. Those cards do not enter the passing draft hand; their normal effects apply, including Construction timing for buildings and secrecy for parchments.

## Remaining items

- Confirm the printed name of the field luxury resource currently called Carrot powder. It is a distinct luxury resource, not basic carrots.
- All 37 parchment entries are recorded in base-parchments.json. Scoring clarifications and review remain; see base-parchments.review.md.

Rules source: [IELLO base-game rulebook](https://iellogames.com/wp-content/uploads/2017/09/Bunny-Kingdom-Rules-EN-Light.pdf), pages 2-4, 6-7, and 10. This catalog is reference data; browser gameplay and engine tests are maintained separately in src/ and tests/.
