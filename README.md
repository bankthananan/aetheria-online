# Another World Online

A browser-based 2D isekai RPG with Base/Job progression, multi-tier class promotions, Ragnarok-style skill trees, five level-phased story chapters, guild bounties, loot rarity, equipment refinement, and a connected overworld.

## Play

**[Launch Another World Online](https://bankthananan.github.io/another-world-online/)**

Move with WASD or click the ground. Use `F` for Hunt mode, `E` to interact, and `C` / `I` / `K` / `Q` / `M` for the character, inventory, skills, quest, and world panels.

## Run locally

```bash
python3 -m http.server 8777
```

Then open `http://localhost:8777/`.

See [ISEKAI_README.md](ISEKAI_README.md) for the full feature and architecture guide.

## Test

```bash
npm test
node js/balance.test.js
node js/art.test.js
```
