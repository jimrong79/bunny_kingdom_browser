# Hard Camp-planning experiment

`bots-normal-before-hard` freezes commit `52e2c97` and its complete policy helpers. Normal and Easy stay unchanged while the candidate is developed on `feat/hard-camp-planning`.

The candidate will compare using a Camp now against retaining it through plausible next-round territory acquisitions. It must account for Coins that could arrive without spending the Camp, future Camp destinations, contested territory, and remaining harvests. Future possibilities must be generated from the permitted view, never the actual hidden deck, seed, opponents' private observations, hands, or parchments. District history and Coin awards use the real rules in each hypothetical position.

## Evaluation plan

Use saved human games and a small, separate development set to inspect decisions. After freezing the candidate, compare fresh deals against the tagged Normal checkout, rotating the candidate through every seat. Start with 20 deals each for three-, four-, and five-player expansion games and 10 deals each for two-, three-, and four-player base games. Keep these results separate from development; do not tune on them and report them as untouched validation.

A higher overall win share and score margin, without a clear player-count regression, are the initial release criteria. Report the number of distinct deals and uncertainty across deals: seat rotations are related observations. Small gains do not prove stronger play against humans. Check Camp latency separately on an idle browser; aim for under one second at the 95th percentile. All matches must finish with legal actions, conserved cards, and consistent Coin and harvest ledgers. A weak or inconclusive candidate remains experimental instead of silently replacing Normal.

The comparison runner supports both games and isolated workers. For example, after implementing the candidate:

```sh
mkdir -p /tmp/bunny-normal-before-hard
git archive bots-normal-before-hard | tar -x -C /tmp/bunny-normal-before-hard
node scripts/compare-policies.js --baseline /tmp/bunny-normal-before-hard/src/bots.js --baseline-label bots-normal-before-hard --challenger src/bots-hard.js --expansion in_the_sky --players 3,4,5 --seeds 20 --prefix hard-camps-validation-v1 --workers 2 --output /tmp/hard-camps-sky.json
```

The runner records each candidate's Camp choices alongside the all-Normal control. It saves completed deals incrementally; `--start` selects a later numbered deal for a separate batch. Both policies receive only their permitted views. The benchmark's `--rulings low` / `high` convention resolves unsettled rules consistently; it does not change the browser's rule prompts.
