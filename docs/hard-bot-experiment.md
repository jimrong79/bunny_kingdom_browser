# Experimental Hard: Camp timing

`bots-normal-before-hard` freezes commit `52e2c97` and its complete policy helpers. The original Camp experiment kept Normal and Easy unchanged. The September 12 revision also corrects luxury reserve valuation shared by Normal and Hard; Easy remains unchanged. See the [luxury placement review](luxury-placement-review.md) for this separate correction and its validation. The Camp results below describe the original frozen policy, not the revised combination.

The candidate compares using a Camp now against retaining it through plausible next-round territory acquisitions. It accounts for Coins that could arrive without spending the Camp, future Camp destinations, contested territory, and remaining harvests. Possibilities are generated from the permitted view, never the actual hidden deck, seed, opponents' private observations, hands, or parchments. District history and Coin awards use the real rules in each hypothetical position.

**Hard (test)** is available in setup for playtesting. Normal remains the recommended default: measured Camp gains are small and mixed. Original saves recorded `botDifficulty: "hard"` and `botStrategyVersion: "hard-camps-v1"`. The frozen policy checkpoint is `bots-hard-camps-candidate-v1` (`f06f094`); the menu and save integration were added afterward without changing its decisions. Current Hard decisions use `hard-camps-luxury-v2`, including when an older game resumes.

## Candidate scope

`src/bots-hard.js` inherits Normal's draft, building, Rainbow, market, Chimney, and copy decisions. Only isolated Camp timing differs. It compares saving with Normal's best current placement using six deterministic, shared next-round territory forecasts. Public connectivity influences estimated competition for those territories. Each forecast uses the real territory-claim and District rules, including simultaneous picks, Camp captures, and permanent District history. A saved Camp is reconsidered on the resulting board together with reserved buildings.

The final evaluation blends the forecast with Normal's existing estimate and requires a meaningful advantage before changing its decision. Multiple pending own Camps retain Normal's joint planning, and round four retains Normal because no later construction phase remains. Forecasts approximate territory allocation; they do not simulate complete drafts, new non-territory cards, or every future opponent building and Camp. This is bounded planning, not a proof of optimal play.

The first development version also compared alternative locations for immediate placement. A base-game development setback came from changing F10 to J1 on a small forecast advantage. The next version limits changes to timing: it keeps Normal's preferred current location. The reviewed human B4 position still prefers taking its Coin immediately; the model does not assume that every Coin-only Camp should be delayed.

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

## Results

Validation used the frozen `f06f094` policy and the prefix `hard-camps-validation-v1`. No strategy changes were made during validation. There were **330 candidate games and 90 all-Normal control games**, with each candidate seat compared to that seat in the matching control. Seat rotations share a deal; the same numbered seeds were also used across player counts, so aggregate results are descriptive rather than independent statistical trials.

| Game | Players | Deals | Candidate games | Normal win rate | Hard win rate | Mean margin change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Base | 2 | 10 | 20 | 50.0% | 50.0% | −0.15 |
| Base | 3 | 10 | 30 | 33.3% | 30.0% | −0.73 |
| Base | 4 | 10 | 40 | 25.0% | 27.5% | +1.20 |
| In the Sky | 3 | 20 | 60 | 33.3% | 36.7% | +1.40 |
| In the Sky | 4 | 20 | 80 | 25.0% | 26.3% | +0.05 |
| In the Sky | 5 | 20 | 100 | 20.0% | 21.0% | −0.18 |

Margin is the player's final score minus the strongest opponent's score. The last column compares that margin against the same seed and seat in the Normal control. Shared wins count proportionally.

Across the 330 comparisons, the candidate had **94 winning seats versus 90** for the controls, and **+0.28 points** of mean margin improvement. Excluding every pair in which either game needed an explicit ruling leaves 324 comparisons, three additional wins, and +0.15 points of mean margin improvement. These results do not establish a consistently stronger difficulty, so the selector explicitly labels it as a test and Normal remains the recommended default.

The original development version (`d1e697d`) used 42 candidate and 12 control games. Its outcomes were inspected before narrowing the algorithm to timing. Those games are reported separately and are not part of the validation figures above. All **474 development and validation games** completed with legal actions, conserved cards, and consistent harvest and Coin ledgers.

[Batch summaries, timings, and per-deal standard errors](benchmarks/hard-camps-summary.json) · [Every matched result and Camp choice](benchmarks/hard-camps-games.csv)

## Decision and browser checks

The reviewed human game `1788942890664` still selects B4: the model prefers securing its Coin over the estimated benefit of waiting. In the largest four-player validation setback (`hard-camps-validation-v1-11`, seat 1), Hard instead saved the round-one Camp that Normal placed at H10. Both options projected a one-point first Harvest; placing earned a Coin. The candidate's final score was 183 versus 241 in the control. Later drafts and placements diverged, so the 58-point difference is a whole-game outcome, not the isolated value of H10. Coin-only Camps can be useful, and delaying them is not a blanket improvement.

All 126 engine tests passed, including natural District creation, opportunity loss to rivals, permanent District history after Camp capture, simultaneous-pick Coin awards, final-round and multi-Camp behavior, immutable views, and hidden-information independence. Browser checks passed in both source and packaged sites for difficulty selection, saved strategy versions, resume, legacy saves, and mobile setup. A complete four-player game selected Hard through the actual menu, invoked its Camp policy, and finished construction, markets, copies, scoring, and resume. Its complete exported state also matched replay and independent scoring, supplying the browser test's known Trading Post inputs because historical human choices are not logged. All 111 audited bot decisions passed hidden-information checks.

Five saved Camp positions were also evaluated in Chromium after the bulk benchmarks finished. In the packaged site, Hard's median decision was about 249 ms and its slowest was 2.11 seconds; Normal's corresponding figures were 221 ms and 1.85 seconds. This small set does not establish a general latency percentile or confirm the one-second target. Large reserved-building inventories can still pause the browser during construction planning.
