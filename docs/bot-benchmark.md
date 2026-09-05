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
