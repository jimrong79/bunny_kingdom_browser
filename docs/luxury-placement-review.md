# Luxury placement timing

The reviewed four-player expansion game placed Diamond on B6 in round one. That fief had no city and earned zero harvest points. The bot had one Coin, so Diamond added one projected Trade point, plus 1.8 points from its forecast of future Coins. Its reserve evaluation omitted both. That imbalance encouraged an irreversible early placement over retaining the card and its location options.

The shared Normal/Hard evaluation now includes a reserved luxury's eventual Trade value, discounted by the existing estimate of finding legal terrain. It uses the same Coin and unique-resource forecast as a placed luxury. It adds no Coins or production to the game state, grants no extra credit for a resource already produced, and gives no waiting value after the final construction deadline. The existing harvest, building-combination, parchment, and location search still decides whether placement is worthwhile. This is a targeted correction to Trade forecasting, not a rule that every cityless farm must wait.

At the reviewed decision, the old heuristic rated keeping Diamond at **42.20** and placing it at **43.13**. With the missing 2.8-point Trade estimate restored, keeping it rates **45.00**, so both Normal and Hard save it. These values are search estimates, not awarded scores.

In the actual game, a City 1 was added at A6 in round two, making the Diamond contribute one extra harvest point in each remaining round. Waiting in round one would have preserved that same round-two placement and payout, along with the option to use a better mountain. A counterfactual replay moved only Diamond’s placement to round two, after the A6 city, and independently reproduced all four harvests and every final score. The correction does not rely on knowing those later cards. The regression fixture contains only public terrain/ownership and the acting player's own cards.

## Checkpoints and scope

- `bots-before-luxury-timing` freezes the merged pre-correction policy at `4653c2c`; `bots-luxury-timing-v1` freezes the correction at `6ac196b`. The prior Hard Camp checkpoint `bots-hard-camps-candidate-v1` remains available.
- Normal decisions use `normal-luxury-timing-v1`; Hard uses `hard-camps-luxury-v2`. The next bot decision updates an older save's version, so exports identify the policy currently in use. This does not claim earlier moves in a resumed game were made by that version.
- Normal and Hard share the valuation used in drafting and construction. Hard retains its experimental Camp forecasts. Easy and the scoring engine are unchanged.
- The base game has no Trade, so its evaluation is unchanged by this correction.
- PR #5 incorporates current `main`, preserving responsive boards, Chimney inspection, and return-to-building controls.

## Validation

`tests/bot-luxury-timing.test.js` covers the reviewed Diamond decision, larger Coin balances, productive placement, later relocation options while still reserved, city/farm combinations, the final-round Trade deadline, Cloud/plains restrictions, unplaceable cards, known discards, duplicate resources, unchanged actual production, and hidden-information independence.

The browser difficulty check verifies policy routing and version stamps for new and resumed games. The reviewed position was also loaded through the actual browser: Normal and Hard both built City 2 at J2, retained Diamond, and supported returning to construction. Construction undo checks cover the merge conflict with the new harvest confirmation controls.

Matched comparisons use a frozen copy of the complete pre-correction source tree. Each candidate rotates through every seat against old-policy opponents and is compared with the same seat in an all-old-policy control. The runner validates legal construction, card conservation, harvest totals, and Coin ledgers. Related seat rotations do not constitute independent deals; small batches are regression checks rather than proof of a stronger difficulty.

```sh
mkdir -p /tmp/bunny-bots-before-luxury
git archive bots-before-luxury-timing | tar -x -C /tmp/bunny-bots-before-luxury
node --test tests/*.test.js
node scripts/compare-policies.js --baseline /tmp/bunny-bots-before-luxury/src/bots.js --challenger src/bots.js --expansion in_the_sky --players 3,4,5 --seeds 3 --prefix luxury-timing-validation-v1 --workers 2 --output /tmp/luxury-sky.json
node scripts/compare-policies.js --baseline /tmp/bunny-bots-before-luxury/src/bots.js --challenger src/bots.js --expansion base --players 2,3,4 --seeds 2 --prefix luxury-timing-validation-v1 --workers 1 --output /tmp/luxury-base.json
node scripts/compare-policies.js --baseline /tmp/bunny-bots-before-luxury/src/bots-hard.js --challenger src/bots-hard.js --expansion in_the_sky --players 4,5 --seeds 1 --prefix luxury-hard-smoke-v1 --workers 2 --output /tmp/luxury-hard.json
```

## Results for this correction

All **145 engine tests**, source/package difficulty browser checks, reviewed-position browser checks, and construction undo browser checks passed. The full saved game independently replayed without placement, Coin, harvest, or final-score differences. The delayed-Diamond counterfactual also passed with unchanged harvests and final scores.

The matched batch completed **63 candidate games and 17 control games**. All 80 finished with legal actions, conserved cards, and consistent harvest and Coin ledgers; none needed an unresolved-scoring convention. No policy changes were made during the batch.

| Policy | Game | Players | Deals | Candidate games | Winning seats: old → new | Mean margin change |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Normal | Base | 2 | 2 | 4 | 2 → 2 | +0.00 |
| Normal | Base | 3 | 2 | 6 | 2 → 2 | +0.00 |
| Normal | Base | 4 | 2 | 8 | 2 → 2 | +0.00 |
| Normal | In the Sky | 3 | 3 | 9 | 3 → 4 | +4.11 |
| Normal | In the Sky | 4 | 3 | 12 | 3 → 3 | +5.83 |
| Normal | In the Sky | 5 | 3 | 15 | 3 → 3 | +11.33 |
| Hard | In the Sky | 4 | 1 | 4 | 1 → 1 | +1.50 |
| Hard | In the Sky | 5 | 1 | 5 | 1 → 1 | −6.60 |

Margin is the acting player's final score minus the strongest opponent's score. Normal's 36 expansion comparisons gained one winning seat and **+7.69** points of average margin, while its own average score fell 1.69 points. Individual margin changes ranged from −73 to +80. All 18 base-game comparisons had identical score vectors to their controls. Hard's nine comparisons retained two winning seats with **−3.00** points of mean margin change. Its Camp forecast algorithm was unchanged, but its construction and draft evaluation inherit the luxury correction.

These are small regression batches, with only three deals per Normal expansion player count and one per Hard player count. They support the specific Diamond correction and do not establish a reliably stronger overall difficulty or guarantee no individual game regression. Hard remains experimental. The original Camp benchmark in `hard-bot-experiment.md` is historical evidence for its frozen policy, not a claim about this new combination.

The summary includes decision timings, but concurrent workers and diverging game positions prevent a clean latency comparison. In this batch, three-player Normal draft p95 was about 3.01 seconds for the candidate and 2.20 seconds for the control. Retaining buildings can increase later placement-search work; the search depth and width remain bounded. Browser checks establish correct behavior, not a general responsiveness percentile.

[Batch summary and timings](benchmarks/luxury-timing-summary.json) · [Every matched result](benchmarks/luxury-timing-games.csv)
