# Luxury placement timing

The reviewed four-player expansion game placed Diamond on B6 in round one. That fief had no city and earned zero harvest points. The bot had one Coin, so Diamond added one projected Trade point, plus 1.8 points from its forecast of future Coins. Its reserve evaluation omitted both. That imbalance encouraged an irreversible early placement over retaining the card and its location options.

The shared Normal/Hard evaluation now includes a reserved luxury's eventual Trade value, discounted by the existing estimate of finding legal terrain. It uses the same Coin and unique-resource forecast as a placed luxury. It adds no Coins or production to the game state, grants no extra credit for a resource already produced, and gives no waiting value after the final construction deadline. The existing harvest, building-combination, parchment, and location search still decides whether placement is worthwhile. This is a targeted correction to Trade forecasting, not a rule that every cityless farm must wait.

At the reviewed decision, the old heuristic rated keeping Diamond at **42.20** and placing it at **43.13**. With the missing 2.8-point Trade estimate restored, keeping it rates **45.00**, so both Normal and Hard save it. These values are search estimates, not awarded scores.

In the actual game, a City 1 was added at A6 in round two, making the Diamond contribute one extra harvest point in each remaining round. Waiting in round one would have preserved that same round-two placement and payout, along with the option to use a better mountain. The correction does not rely on knowing those later cards. The regression fixture contains only public terrain/ownership and the acting player's own cards.

## Checkpoints and scope

- `bots-before-luxury-timing` freezes the merged pre-correction policy at `4653c2c`; the prior Hard Camp checkpoint `bots-hard-camps-candidate-v1` remains available.
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
```
