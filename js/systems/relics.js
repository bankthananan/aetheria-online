// js/systems/relics.js - Dedicated Relic & Legendary Artifact equipment system.
// Manages passive modifiers, combat procs, lethal damage interception, and blood shield absorption.

export const RELIC_DEFINITIONS = {
  phoenix_feather: {
    id: 'phoenix_feather',
    perk: 'lethal_revive',
    cooldownMs: 180000,
    reviveHpPct: 0.40,
    burstRadiusTiles: 3,
    burstAtkMult: 1.20,
  },
  midas_touch: {
    id: 'midas_touch',
    perk: 'gilded_strike',
    minZeny: 15,
    maxZeny: 35,
    killZenyMult: 1.30,
  },
  storm_conduit: {
    id: 'storm_conduit',
    perk: 'chain_lightning',
    procChance: 0.25,
    maxChainTargets: 3,
    chainRadiusTiles: 4,
    chainDmgMult: 0.85,
  },
  thornmail_carapace: {
    id: 'thornmail_carapace',
    perk: 'thorns',
    reflectPct: 0.35,
    hpPct: 12,
  },
  frostbite_pendant: {
    id: 'frostbite_pendant',
    perk: 'glacial_touch',
    procChance: 0.20,
    slowDurationMs: 2500,
    slowMult: 0.50,
  },
  vampiric_grail: {
    id: 'vampiric_grail',
    perk: 'blood_pact',
    lifestealPct: 6,
    maxShieldHpPct: 0.15,
  },
  crown_of_the_ascendant: {
    id: 'crown_of_the_ascendant',
    perk: 'ascendant_might',
    spireDmgPct: 15,
    allResPct: 10,
  },
  abyssal_compass: {
    id: 'abyssal_compass',
    perk: 'spire_navigation',
    fleePct: 15,
    moveSpdPct: 10,
  },
};

export function createRelicSystem({
  now = () => performance.now(),
  dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  TS = 32,
  rnd = Math.random,
} = {}) {
  let nextReviveAt = 0;

  function getEquippedRelicId(player) {
    if (!player || !player.equip || !player.equip.relic) return null;
    const relic = player.equip.relic;
    return relic.itemId || relic.id || null;
  }

  function getEquippedRelic(player) {
    const id = getEquippedRelicId(player);
    if (!id) return null;
    return RELIC_DEFINITIONS[id] || null;
  }

  const RELIC_PASSIVE_DEFAULTS = { fleePct: 0, moveSpdPct: 0, allResPct: 0, spireDmgPct: 0 };

  function getPassiveModifiers(player) {
    const mods = Object.assign(Object.create(RELIC_PASSIVE_DEFAULTS), { hpPct: 0, defPct: 0, lifesteal: 0 });
    const relic = getEquippedRelic(player);
    if (!relic) return mods;

    if (relic.id === 'thornmail_carapace') {
      mods.hpPct = relic.hpPct || 12;
    } else if (relic.id === 'vampiric_grail') {
      mods.lifesteal = relic.lifestealPct || 6;
    } else if (relic.id === 'crown_of_the_ascendant') {
      mods.spireDmgPct = relic.spireDmgPct || 15;
      mods.allResPct = relic.allResPct || 10;
    } else if (relic.id === 'abyssal_compass') {
      mods.fleePct = relic.fleePct || 15;
      mods.moveSpdPct = relic.moveSpdPct || 10;
    }
    return mods;
  }

  function onHit(player, target, damage, isCrit, context = {}) {
    const relic = getEquippedRelic(player);
    const result = { chainTargets: [], zenyAwarded: 0, healed: 0, shieldGenerated: 0 };
    if (!relic || !player) return result;

    // 1. Hand of Midas: critical hit bonus zeny
    if (relic.id === 'midas_touch' && isCrit) {
      const bonus = Math.floor(relic.minZeny + rnd() * (relic.maxZeny - relic.minZeny + 1));
      player.zeny = (player.zeny || 0) + bonus;
      result.zenyAwarded = bonus;
      if (context.floatText) {
        context.floatText(player.x || 0, (player.y || 0) - 14, `+${bonus}z`, '#facc15');
      }
    }

    // 2. Storm Conduit: Chain Lightning zap
    if (relic.id === 'storm_conduit' && rnd() < relic.procChance) {
      const originX = (target && target.x !== undefined) ? target.x : (player.x || 0);
      const originY = (target && target.y !== undefined) ? target.y : (player.y || 0);
      const maxDist = relic.chainRadiusTiles * TS;
      const baseDmg = player.weaponAtk || player.atk || damage || 10;
      const chainDmg = Math.max(1, Math.round(baseDmg * relic.chainDmgMult));

      const candidates = (context.monsters || [])
        .filter(m => m && m !== target && m.alive !== false && (m.hp === undefined || m.hp > 0))
        .map(m => ({ monster: m, d: dist(originX, originY, m.x, m.y) }))
        .filter(entry => entry.d <= maxDist)
        .sort((a, b) => a.d - b.d)
        .slice(0, relic.maxChainTargets);

      for (const entry of candidates) {
        const m = entry.monster;
        if (m.hp !== undefined) {
          m.hp = Math.max(0, m.hp - chainDmg);
          if (m.hp === 0) m.alive = false;
        }
        result.chainTargets.push(m);
        if (context.spawnZap) {
          context.spawnZap(target || player, m);
        }
        if (context.floatText) {
          context.floatText(m.x, m.y - 10, `${chainDmg}`, '#fef08a');
        }
      }
    }

    // 3. Frostbite Pendant: 20% slow/freeze
    if (relic.id === 'frostbite_pendant' && target && rnd() < relic.procChance) {
      const duration = relic.slowDurationMs || 2500;
      target.slowUntil = now() + duration;
      target.slowMult = relic.slowMult || 0.50;
      if (context.floatText && target.x !== undefined) {
        context.floatText(target.x, target.y - 12, 'FROZEN!', '#93c5fd');
      }
    }

    // 4. Chalice of the Undying: 6% lifesteal + Blood Shield overflow
    if (relic.id === 'vampiric_grail') {
      const healAmount = Math.max(1, Math.round(damage * (relic.lifestealPct / 100)));
      const maxHp = player.maxHp || 100;
      const currentHp = player.hp || 0;
      const needed = maxHp - currentHp;

      if (needed > 0) {
        const hpGained = Math.min(needed, healAmount);
        player.hp = Math.min(maxHp, currentHp + hpGained);
        result.healed = hpGained;
        const overflow = healAmount - hpGained;
        if (overflow > 0) {
          const maxShield = Math.round(maxHp * (relic.maxShieldHpPct || 0.15));
          const currentShield = player.bloodShield || 0;
          const shieldGained = Math.min(overflow, Math.max(0, maxShield - currentShield));
          player.bloodShield = currentShield + shieldGained;
          result.shieldGenerated = shieldGained;
        }
      } else {
        // At max HP: entire heal overflows to shield
        const maxShield = Math.round(maxHp * (relic.maxShieldHpPct || 0.15));
        const currentShield = player.bloodShield || 0;
        const shieldGained = Math.min(healAmount, Math.max(0, maxShield - currentShield));
        player.bloodShield = currentShield + shieldGained;
        result.shieldGenerated = shieldGained;
      }
    }

    return result;
  }

  function onTakeDamage(player, attacker, damage, context = {}) {
    const result = { absorbed: 0, reflectedDamage: 0 };
    if (!player) return result;

    // 1. Blood Shield absorption
    if (player.bloodShield && player.bloodShield > 0) {
      const absorbed = Math.min(player.bloodShield, damage);
      player.bloodShield -= absorbed;
      result.absorbed = absorbed;
      if (context.floatText && absorbed > 0) {
        context.floatText(player.x || 0, (player.y || 0) - 16, `-${absorbed} SHIELD`, '#ef4444');
      }
    }

    // 2. Bramble Carapace thorns reflection on melee hits
    const relic = getEquippedRelic(player);
    if (relic && relic.id === 'thornmail_carapace' && context.isMelee && attacker) {
      const reflected = Math.max(1, Math.round(damage * relic.reflectPct));
      if (attacker.hp !== undefined) {
        attacker.hp = Math.max(0, attacker.hp - reflected);
        if (attacker.hp === 0) attacker.alive = false;
      }
      result.reflectedDamage = reflected;
      if (context.floatText) {
        const ax = attacker.x !== undefined ? attacker.x : (player.x || 0);
        const ay = attacker.y !== undefined ? attacker.y : (player.y || 0);
        context.floatText(ax, ay - 12, `${reflected} THORNS!`, '#86efac');
      }
    }

    return result;
  }

  function onLethalDamage(player, rawDamage, context = {}) {
    const relic = getEquippedRelic(player);
    if (!relic || relic.id !== 'phoenix_feather' || !player) return false;

    const t = now();
    if (t < nextReviveAt) {
      return false; // Still on cooldown
    }

    // Trigger Rebirth
    nextReviveAt = t + (relic.cooldownMs || 180000);
    const maxHp = player.maxHp || 100;
    player.hp = Math.round(maxHp * (relic.reviveHpPct || 0.40));

    // Radial fire burst
    const burstDist = (relic.burstRadiusTiles || 3) * TS;
    const burstDmg = Math.max(1, Math.round((player.atk || 50) * (relic.burstAtkMult || 1.20)));

    if (context.monsters) {
      for (const m of context.monsters) {
        if (!m || m === player || m.alive === false) continue;
        if (dist(player.x, player.y, m.x, m.y) <= burstDist) {
          if (m.hp !== undefined) {
            m.hp = Math.max(0, m.hp - burstDmg);
            if (m.hp === 0) m.alive = false;
          }
          if (context.floatText) {
            context.floatText(m.x, m.y - 10, `${burstDmg} FIRE!`, '#ea580c');
          }
        }
      }
    }

    if (context.floatText) {
      context.floatText(player.x, player.y - 20, 'PHOENIX REBIRTH!', '#f97316');
    }
    if (context.spawnRing) {
      context.spawnRing(player.x, player.y, burstDist, '#f97316');
    }
    if (context.playSfx) {
      context.playSfx('revive');
    }

    return true;
  }

  function onKill(player, monster, context = {}) {
    const relic = getEquippedRelic(player);
    if (relic && relic.id === 'midas_touch') {
      return { zenyMult: relic.killZenyMult || 1.30 };
    }
    return { zenyMult: 1.0 };
  }

  return {
    getEquippedRelic,
    getPassiveModifiers,
    onHit,
    onTakeDamage,
    onLethalDamage,
    onKill,
  };
}
