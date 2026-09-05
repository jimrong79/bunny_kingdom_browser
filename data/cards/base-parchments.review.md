# Original base-game parchments

**37 entries imported: 8 treasures and 29 missions, one copy each.** Combined with 100 territories and 45 building/Provisions cards, the inventory totals 182.

Status: **awaiting review**. [Original supplied text](parchments.txt) is preserved; the table below repeats it. [JSON](base-parchments.json) contains draft scoring specifications; [CSV](base-parchments.csv) includes both wording and specifications.

One copy per entry and the treasure/mission classification are recorded assumptions. Matching counts does not prove every scoring rule. No scoring engine has been implemented.

## Rules still needing clarification

- **Matriarch:** Does a tie for the most territories qualify? The supplied summary and checked rulebook do not specify this.
- **Liberal, Socialist:** Confirm target restrictions and choice order when a copy card can target another copy card, including a possible loop.
- **Treasure Hunter, Liberal, Socialist:** How do an owned Treasure Hunter and a copied Treasure Hunter combine?
- **Opportunist:** How are tied rankings and interactions between copied Opportunists handled after final scoring?

## Card review

In the supplied wording, carrot point rewards mean Golden Carrots (points); Carrot resources refer to production. These remain separate in the JSON.

| # | Card | Type | Supplied scoring text | Status |
| ---: | --- | --- | --- | --- |
| 1 | Royal Ring | treasure | 1 carrot | Draft from source |
| 2 | Royal Coat | treasure | 2 carrots | Draft from source |
| 3 | Royal Scepter | treasure | 3 carrots | Draft from source |
| 4 | Royal Chalice | treasure | 4 carrots | Draft from source |
| 5 | Royal Crown | treasure | 5 carrots | Draft from source |
| 6 | Royal Carrot | treasure | 6 carrots | Draft from source |
| 7 | Left Glove | treasure | 1 carrot alone; if you also have Right Glove, each glove is worth 4 → 8 total | Draft from source |
| 8 | Right Glove | treasure | same as Left Glove | Draft from source |
| 9 | Bureaucrat | mission | 1 carrot for each Parchment you own, including this one | Draft from source |
| 10 | Burgomaster | mission | 1 carrot per City | Draft from source |
| 11 | Diplomat | mission | 1 carrot per territory you control along the outside edge of the board | Draft from source |
| 12 | Explorer | mission | 3 carrots per corner territory you control | Draft from source |
| 13 | Carpenter | mission | 1 carrot per Wood resource you produce | Draft from source |
| 14 | Master Carpenter | mission | 2 carrots per Wood resource | Draft from source |
| 15 | Woodland King | mission | 20 carrots if you produce at least 7 Wood | Draft from source |
| 16 | Fisher | mission | 1 carrot per Fish resource you produce | Draft from source |
| 17 | Master Fisher | mission | 2 carrots per Fish resource | Draft from source |
| 18 | Fisher King | mission | 20 carrots if you produce at least 7 Fish | Draft from source |
| 19 | Farmer | mission | 1 carrot per Carrot resource you produce | Draft from source |
| 20 | Master Farmer | mission | 2 carrots per Carrot resource | Draft from source |
| 21 | Carrot King | mission | 15 carrots if you produce at least 5 Carrots | Draft from source |
| 22 | Merchant | mission | 3 carrots per Luxury Resource you produce | Draft from source |
| 23 | Master of the Mountains | mission | 2 carrots per Mountain territory you control | Draft from source |
| 24 | Carrotistador | mission | 4 carrots for every Fief containing at least 3 territories | Draft from source |
| 25 | Harecingetorix | mission | 1 carrot per Fief you control | Draft from source |
| 26 | Hun-ny King | mission | 12 carrots if you have at least 10 Fiefs | Draft from source |
| 27 | Bun-Shee | mission | 2 carrots per City in your Fiefs that produce no resources | Draft from source |
| 28 | PanPan the Barbarian | mission | 2 carrots per territory you control that has neither a City nor a resource | Draft from source |
| 29 | Colonist | mission | 3 carrots for each Camp card you played | Draft from source |
| 30 | King of Thieves | mission | 12 carrots if you have at least 9 Cities | Draft from source |
| 31 | Matriarch | mission | 12 carrots if you control the most territories | Needs clarification |
| 32 | Little Prince | mission | perform another harvest of all your Fiefs except your best Fief | Draft from source |
| 33 | Treasure Guardian | mission | 3 carrots for each Treasure Parchment you own | Draft from source |
| 34 | Treasure Hunter | mission | doubles the value of your Treasure Parchments | Needs clarification |
| 35 | Liberal | mission | copy one Parchment belonging to the player on your right | Needs clarification |
| 36 | Socialist | mission | copy one Parchment belonging to the player on your left | Needs clarification |
| 37 | Opportunist | mission | 10 carrots if you're in second place after final scoring | Needs clarification |

## Interpretation notes

- Count all production from controlled territories and farms, including repeated basic resources; do not substitute the distinct-type count used for fief wealth.
- Keep the basic resource selected for the fourth harvest when scoring parchments.
- Count each city once regardless of strength.
- Use actual connections, including Camps and Sky Tower pairs; they cannot be ignored for parchment scoring.
- Unresolved rule: a future scoring engine must require a verified resolution before relying on this field.
- **Right Glove:** The source abbreviates this as the same as Left Glove; the reciprocal pairing is made explicit using rulebook page 11.
- **Burgomaster:** Count cities, not their towers/strength (rulebook page 10).
- **Diplomat:** Count a controlled border territory once, including corners. Border and corner definitions here refer to the original rectangular board.
- **Explorer:** The original board corners are A1, A10, J1, and J10.
- **Merchant:** Count luxury-resource production, including farms; basic carrots and the field luxury resource remain distinct.
- **Bun-Shee:** Check resource production across the entire fief, then count its cities, regardless of city strength.
- **PanPan the Barbarian:** Check each territory separately. A city or resource elsewhere in the fief does not disqualify it. A Camp or Sky Tower is not a city (rulebook page 11).
- **Colonist:** The supplied text counts Camp cards played, not Camp tokens currently on the board. Keep card-play history separate from surviving camps; this is a transcription of the supplied summary.
- **King of Thieves:** Count cities, not towers/strength (rulebook page 10).
- **Matriarch:** The tie policy is deliberately unset pending a verified clarification.
- **Little Prince:** If multiple fiefs tie for highest harvest, exclude exactly one of them (rulebook page 11).
- **Treasure Guardian:** A copied treasure qualifies for this bonus (rulebook page 11).
- **Treasure Hunter:** Copied treasures qualify. This effect changes treasure values; it must not be counted as an unrelated fixed-point reward. Stacking with a copied Hunter remains open.
- **Liberal:** Copy the whole card. A copied treasure qualifies for Treasure Guardian and Treasure Hunter bonuses (rulebook page 11).
- **Socialist:** Copy the whole card. A copied treasure qualifies for Treasure Guardian and Treasure Hunter bonuses (rulebook page 11).
- **Opportunist:** The user confirmed 10 Golden Carrots for second place after final scoring. The tie policy and interactions between copied Opportunists remain unresolved.

General rules and noted special cases: [IELLO rulebook](https://iellogames.com/wp-content/uploads/2017/09/Bunny-Kingdom-Rules-EN-Light.pdf), pages 4-6 and 10-11. Remaining card text comes from the supplied file.
