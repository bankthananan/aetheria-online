# Design Specification: Pokémon-Style Dynamic Catch Rate Taming System

## 1. Context & Motivation
Previously, taming required monsters to be strictly below 30% HP (`target.hp / target.maxHp <= 0.30`). To prevent players from accidentally one-shotting tameable creatures, an artificial "subdue" damage clamp was added that prevented creatures from taking lethal damage and blocked basic attacks below 30% HP. This created game-breaking friction where players who owned the pet or carried leftover bait could not defeat wild monsters.

The user requested:
> *"change from hp below 30% to chance like pokemon with pokeball something like that"*

We replace the hard 30% HP barrier with a smooth, probabilistic Pokémon-style catch formula where players can throw bait at **any HP level**, with success probability scaling dynamically with missing HP, player LUK, and status afflictions.

---

## 2. Core Mechanics

### 2.1 Any-HP Taming (No Hard Gate)
- Players can use bait on a targeted live monster at **any health percentage** (from 100% full health down to 1 HP).
- No rejection based on `hpRatio > 0.30`.

### 2.2 Dynamic Catch Rate Formula
Let $R = \frac{\text{hp}}{\text{maxHp}} \in (0, 1]$ (current HP ratio).
Let $\text{missingHpFactor} = 1 - R \in [0, 1)$.

$$\text{CatchChance} = \text{clamp}\left(\text{BaseChance} + (0.55 \times \text{missingHpFactor}) + \text{LukBonus} + \text{StatusBonus}, \; 0.10, \; 0.95\right)$$

Where:
- **$\text{BaseChance} = 0.25$:** 25% chance even at 100% full health (lucky / critical capture).
- **Missing HP Scaling ($0.55 \times (1 - R)$):**
  - 100% HP: $+0\%$ (Total: ~25%)
  - 75% HP: $+13.75\%$ (Total: ~38.8%)
  - 50% HP: $+27.5\%$ (Total: ~52.5%)
  - 25% HP: $+41.25\%$ (Total: ~66.3%)
  - 10% HP: $+49.5\%$ (Total: ~74.5%)
  - 1% HP: $+54.5\%$ (Total: ~79.5%)
- **$\text{LukBonus} = (\text{player.stats.luk} || 0) \times 0.005$:** $+0.5\%$ catch rate per LUK stat point (+10% at 20 LUK, +20% at 40 LUK).
- **$\text{StatusBonus} = 0.15$:** $+15\%$ catch rate bonus if the target is afflicted with any status effect (`stun`, `slow`, `burn`, `freeze`, `poison`, `entangle`, `sunder`), matching Pokémon's status condition capture multipliers.
- **$\text{ClampRange} = [0.10, 0.95]$:** Minimum 10% floor, maximum 95% ceiling.

---

## 3. Feedback & Combat Flow

### 3.1 Catch Success
- Monster is pacified and awarded to `G.pets.owned[petId]`.
- Bait is consumed.
- Floating text: `TAMED!` in gold/magic font.
- Toast: `🐾 Gotcha! Successfully tamed [Companion Name]!`
- Audio SFX: `'quest'` celebratory chime.
- Follower emits heart (`♥`) emote.

### 3.2 Catch Failure (Breakout)
- Monster breaks free from the bait.
- Bait is consumed.
- Floating text: `BROKE FREE!` in danger/red font.
- Toast: `💨 The creature broke free from the bait! Weaken it for a higher catch rate!`
- Audio SFX: `'miss'`.
- Monster is provoked and attacks the player.

### 3.3 Combat Cleanliness
- No artificial damage floor or forced immortal subdue state in `damageMonster`.
- No basic attack blocking in `playerBasicAttack`.
- Standard monsters take full combat damage normally.

---

## 4. Verification Plan
1. **Unit Tests (`js/pets.test.js`):**
   - Verify `attemptTame` works on healthy monsters (100% HP, 80% HP) with calculated probability.
   - Verify scaling: catch chance at 10% HP > catch chance at 50% HP > catch chance at 100% HP.
   - Verify LUK bonus and status condition bonus (+15%).
2. **Integration Tests (`js/pets-integration.test.js` & `js/pets-subdue.test.js`):**
   - Update tests to reflect dynamic catch rate instead of hard 30% rejection.
   - Verify bait consumption on failure and success.
3. **Regression Tests:**
   - `npm test` across all 117 suites.
