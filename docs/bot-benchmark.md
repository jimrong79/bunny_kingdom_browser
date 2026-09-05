# Bot strength checkpoints

`bots-v1-baseline` tags commit `a747c2e`, the playable checkpoint before stronger strategy. `src/bots-baseline.js` preserves that bot unchanged for reproducible comparisons and an Easy difficulty.

Run `node scripts/benchmark-bots.js --seeds 20 --players 2,3,4 --output /tmp/bot-results.json` with Node.js 22+. Each game seats one current bot against the old bots, rotating the challenger through every seat for each seeded deal. Report win shares (split when tied), score margins against the strongest rival, scores, and decision latency. Use different `--prefix` values for development and held-out evaluation deals.

The benchmark uses the real dealing, placement, Camp priority, harvest, and final-scoring engine, and checks physical-card conservation after each game. Bots receive only their permitted player views. Unknown tie and copy cases use an explicit benchmark convention: `--rulings low` selects the smallest offered award; `--rulings high` selects the largest. Copy-of-copy resolutions use the first card by sorted ID. Reports count games needing rulings. These conventions do not alter the browser's rules or its explicit ruling prompts.
