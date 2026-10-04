# Aetheria Online

A browser-based 2D isekai RPG with Base/Job progression, multi-tier class promotions, Ragnarok-style skill trees, five level-phased story chapters, guild bounties, loot rarity, equipment refinement, and a connected overworld.

## Play

**[Launch Aetheria Online](https://bankthananan.github.io/aetheria-online/)**

Move with WASD or click the ground. Use `F` for Hunt mode, `E` to interact, and `C` / `I` / `K` / `Q` / `M` for the character, inventory, skills, quest, and world panels.

## Run locally

```bash
python3 -m http.server 8777
```

Then open `http://localhost:8777/`.

See [docs/ISEKAI_README.md](docs/ISEKAI_README.md) for the full feature and architecture guide.

## Test

```bash
npm test                              # every suite (auto-discovered)
node script/run-tests.mjs loot        # only suites whose path contains "loot"
npm run test:list                     # show discovered suites
```
