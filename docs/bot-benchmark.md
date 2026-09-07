# Bot strength checkpoints

`bots-v1-baseline` tags commit `a747c2e`, the playable checkpoint before stronger strategy. `src/bots-baseline.js` preserves that bot unchanged for reproducible comparisons and an Easy difficulty.

Run `node scripts/benchmark-bots.js --seeds 20 --players 2,3,4 --output /tmp/bot-results.json` with Node.js 22+. Each game seats one current bot against the old bots, rotating the challenger through every seat for each seeded deal. Report win shares (split when tied), score margins against the strongest rival, scores, and decision latency. Use different `--prefix` values for development and held-out evaluation deals.

The benchmark uses the real dealing, placement, Camp priority, harvest, and final-scoring engine, and checks physical-card conservation after each game. Bots receive only their permitted player views. Unknown tie and copy cases use an explicit benchmark convention: `--rulings low` selects the smallest offered award; `--rulings high` selects the largest. Copy-of-copy resolutions use the first card by sorted ID. Reports count games needing rulings. These conventions do not alter the browser's rules or its explicit ruling prompts.


## Normal bot results

The strategy at `e6e2aa8` was frozen before this evaluation. Development used the separate `development-v2` seed prefix. The held-out evaluation ran 620 games: 100 deals × 2 seats, 60 deals × 3 seats, and 60 deals × 4 seats. Each table contained one Normal bot and the remaining Easy bots.

| Players | Games | Normal win rate | Mean lead over strongest rival | Games without extra rulings | Win rate without extra rulings |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2 | 200 | 99.0% | +67.53 | 193 | 99.0% |
| 3 | 180 | 86.4% | +35.43 | 157 | 84.7% |
| 4 | 240 | 77.1% | +18.70 | 209 | 77.8% |

Shared wins count proportionally: a two-way tie contributes half a win. For context, equally strong players would average 50%, 33.3%, and 25% respectively across the seat rotations. These results measure strength against the preserved original bot. Rotations of a deal are related games, not independent random samples.

The reported scoring convention is the explicit `low` benchmark convention described above. Results excluding all games that required extra rulings are also shown. The browser continues to ask for those rulings when needed.

[Summary and decision timings](benchmarks/bots-v2-summary.json) · [Every game, seat, score, and ruling count](benchmarks/bots-v2-games.csv)

Normal's mean draft decisions took approximately 30 ms, 59 ms, and 32 ms in the Node benchmark; the corresponding 95th percentiles were 86 ms, 174 ms, and 102 ms. These are measurements on the development machine with the three evaluation runs executing concurrently; browser and device performance varies.

Reproduce the evaluation at the `bots-v2-strategic` checkpoint:

```sh
node scripts/benchmark-bots.js --seeds 100 --players 2 --prefix held-out-v2 --output /tmp/bots-2.json
node scripts/benchmark-bots.js --seeds 60 --players 3 --prefix held-out-v2 --output /tmp/bots-3.json
node scripts/benchmark-bots.js --seeds 60 --players 4 --prefix held-out-v2 --output /tmp/bots-4.json
```

Validation also passed 38 engine/strategy tests, complete browser games at every player count, Easy/Normal policy routing and save/resume, older saves, mobile setup, and turn animation/privacy checks.

## Camp protection checkpoint

`bots-v2-before-camp-defense` freezes commit `5886555`, including all of Normal's evaluation and placement helpers. Keep the entire checkout when comparing policies; copying only `bots.js` would still load changing helper modules.

Normal now discounts draft choices that pass away the territory card for one of its camps. It compares the selected cards' projected position with the position after capture, including remaining harvests, split fiefs, resource variety, its own parchment objectives, and replanned building placements. It can still prefer a more valuable pair or a Sky Tower that repairs the connection. In two-player games, either playing or discarding the matching card protects the camp.

For three or four players, a passed card is certain to be played by someone else when the remaining hand cannot return. Earlier picks use the fraction of the hand played before it returns as a neutral exposure estimate. Two-player exposure counts only the recipient's played card, since discarding also protects the camp. These are heuristics, not predictions of opponents' preferences. For multiple camps, their combined loss is weighted by exposure; this approximates the possible combinations of captures before a returning hand. The next recipient represents the unknown eventual captor. No opponent's secret objectives, unseen cards, or deck order are consulted.

The J2 report supplied during development was checked locally: round 4 pick 1 remains Carrotistador + F10, while pick 4 changes from Sky Tower + A4 to J2 + A4. The committed tests use small constructed positions, including a J2 bridge, without publishing the private game export.

Compare the current policy against the frozen Normal bot, rotating every seat on each deal:

```sh
mkdir -p /tmp/bunny-bots-v2
git archive bots-v2-before-camp-defense | tar -x -C /tmp/bunny-bots-v2
node scripts/compare-bots.js --baseline /tmp/bunny-bots-v2/src/bots.js --baseline-label bots-v2-before-camp-defense --players 2,3,4 --seeds 20 --prefix camp-defense-held-out-v1 --output /tmp/camp-comparison.json
```

Each deal first runs with all seats using the frozen policy. Each candidate then plays the same deal in one seat against frozen opponents. The report compares its margin against the best opponent with that same seat's control margin. The deterministic control game is reused across seats; controls therefore are not additional independent samples. Review player counts separately, plus matches needing no extra rulings and draft latency. A negative paired margin warrants investigation, and legal-move/card-conservation failures block release. A positive sample does not guarantee that every game improves.

### Camp protection results

The released strategy is `fdd3323`, preserved by `bots-v3-camp-defense`. Evaluation used 20 deals per player count with the prefix above. Two-player results initially had unchanged wins and a -1.00 mean margin change; after inspecting the largest setbacks, another 20 deals used `--players 2 --seeds 20 --prefix camp-defense-confirm-2p-v1`. No strategy changes or parameter tuning occurred between batches. The table includes both two-player batches.

| Players | Deals | Candidate games | Candidate win rate | Control win rate | Mean margin change | Mean change without extra rulings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 40 | 80 | 53.75% | 50.00% | +0.68 | +1.12 (69 games) |
| 3 | 20 | 60 | 38.33% | 33.33% | +2.53 | +2.70 (56 games) |
| 4 | 20 | 80 | 30.00% | 25.00% | +1.10 | +0.54 (65 games) |

These are modest gains against the previous Normal policy. They do not establish a guaranteed increase against human players. Evaluation and confirmation ran 220 candidate games plus 80 control games; development added 45 candidate and 15 control games with `camp-defense-development`. All 360 games passed legal-move and card-conservation checks. All 59 Node tests passed, along with browser difficulty routing, saves/resume, and the exact saved J2 decisions in Chromium.

Mean candidate draft time was approximately 39 ms, 100 ms, and 52 ms for two, three, and four players. Three-player p95 increased from 240 ms to 339 ms; four-player p95 increased from 141 ms to 167 ms. Two-player p95 was 114–122 ms across the two batches. The extra search is restricted to contenders passing an owned camp. These measurements ran concurrently on the development machine; control timings sample seat 0, while candidate timings sample all rotated seats.

[All batch summaries and timings](benchmarks/bots-camp-defense-summary.json) · [Every candidate/control score comparison](benchmarks/bots-camp-defense-games.csv)
