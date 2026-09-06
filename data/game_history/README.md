# Local game history and audits

Put downloaded game JSON files here. Match exports and generated reports remain
local and are ignored by Git.

To audit a completed three/four-player match with the current bot policy:

```sh
node scripts/audit-game.js data/game_history/bunny-kingdom-SEED.json --output data/game_history/bunny-kingdom-SEED.audit.json
```

The auditor reconstructs dealing and selected cards from the seed, each player's
observed hands, and the activity log. It replays legal placements and checks the
complete final state, all 182 cards, every harvest, and every parchment row.
Harvests and parchment points are also calculated with separate formulas and a
separate board traversal. Bot decisions are reproduced through permitted views,
then compared after hidden cards, hidden memories, and the seed are changed.

Limits: the current policy must match the one used to play the game. Earlier
Trading Post choices are not stored separately, so bot choices are reconstructed
and checked against the recorded harvests and final board. Games with human
Trading Posts, manual copy chains, stacked Treasure Hunters, or multiple
Opportunists need additional review; the auditor stops rather than certifying
those unsupported cases. Other explicitly saved tie rulings are honored.
