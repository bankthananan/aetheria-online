// Adventurer's Guild: repeatable randomized bounties, ranking ladder, and turn-ins.
// Moved from game.js.

import { CONTENT } from '../content.js';
import { MAPS } from '../maps.js';
import { AUDIO } from '../audio.js';
import { T, currentLang } from '../locale.js';

export function createGuild({
  G,
  DIFFICULTY,
  nextUid,
  monById,
  monsterMapName,
  monsterLevelRange,
  itemById,
  itemDropSource,
  itemQty,
  removeItem,
  gainXp,
  toast,
  logMsg,
  updateQuestTracker,
  refreshPanel,
  finishTaskGuide,
  refreshTaskGuideAction,
  saveGame,
  rerollShop,
  ZONE_ORDER,
  zoneGuardian,
  GUILD_RANKS,
  GUILD_HARD_AT = 4,
  GUILD_ELITE_AT = 10,
  GUILD_DIFF_PTS = { easy: 1, normal: 2, hard: 4, elite: 8 },
  GUILD_TIER_PTS = [3, 10, 22, 40, 65],
  DIFF_PTS_MULT = { easy: 1, normal: 2, hard: 3, elite: 4.5 },
  monsterTier = lvl => Math.min(4, Math.floor((lvl - 1) / 15)),
  guildPointsNeed = i => 15 + i * 12,
  GUILD_MAX_ACTIVE = 3,
}) {
  const GUILD_DIFF_WEIGHTS = [['easy', 30], ['normal', 40], ['hard', 22], ['elite', 8]];

  function pickWeighted(pairs) {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of pairs) {
      r -= w;
      if (r <= 0) return k;
    }
    return pairs[0][0];
  }

  // bounty difficulties available at the current guild rank
  function guildAllowedDiffs() {
    const i = G.guildRankIdx || 0;
    return GUILD_DIFF_WEIGHTS.filter(([k]) => k === 'easy' || k === 'normal' || (k === 'hard' && i >= GUILD_HARD_AT) || (k === 'elite' && i >= GUILD_ELITE_AT));
  }

  function addGuildPoints(n) {
    G.guildPoints = (G.guildPoints || 0) + n;
    while (G.guildRankIdx < GUILD_RANKS.length - 1 && G.guildPoints >= guildPointsNeed(G.guildRankIdx)) {
      G.guildPoints -= guildPointsNeed(G.guildRankIdx);
      G.guildRankIdx++;
      AUDIO.playSfx('levelup');
      toast(`🏅 Guild rank up — you are now Rank ${GUILD_RANKS[G.guildRankIdx]}!`, 'good');
      logMsg(`Guild rank ${GUILD_RANKS[G.guildRankIdx]} earned. Better bounties, rewards, stock & drops.`, 'good');
      refreshGuildBoard(); // a new rank may unlock harder bounties
      rerollShop();
      toast('🛒 New featured stock at the trader!', 'good');
    }
  }

  function unlockedMonsterIds() {
    const ids = new Set();
    for (let i = 0; i < ZONE_ORDER.length; i++) {
      if (i > 0 && !G.guardiansSlain.has(zoneGuardian(ZONE_ORDER[i - 1]))) break;
      for (const sp of MAPS[ZONE_ORDER[i]].spawns) {
        const d = monById[sp.monsterId];
        if (d && d.sizeTiles < 2) ids.add(d.id);
      }
    }
    return ids;
  }

  function genGuildQuest() {
    const diff = pickWeighted(guildAllowedDiffs()), mult = DIFFICULTY[diff].mult;
    const rankMult = 1 + (G.guildRankIdx || 0) * 0.05; // higher rank → the guild pays better
    const unlocked = unlockedMonsterIds();
    const pool = CONTENT.monsters.filter(m => unlocked.has(m.id));
    const m = pool[Math.floor(Math.random() * pool.length)];
    const count = Math.round((5 + Math.floor(Math.random() * 11)) * (0.7 + mult * 0.3));
    const pts = Math.round(GUILD_TIER_PTS[monsterTier(m.level)] * DIFF_PTS_MULT[diff]); // region tier × difficulty
    const uid = nextUid ? nextUid() : Math.floor(Math.random() * 1e9);
    const base = {
      id: 'g' + uid,
      progress: 0,
      difficulty: diff,
      pts,
      sourceMonsterId: m.id,
      reward: { exp: Math.floor(m.exp * count * 0.6 * mult * rankMult), zeny: Math.floor(m.level * count * 8 * mult * rankMult) },
    };
    const mapName = monsterMapName[m.id]; // where to hunt (or where the material drops)
    // 40% of bounties are DELIVERIES: bring N of a material the band's monsters drop (pays ×1.3)
    const mats = m.drops.map(d => d.itemId).filter(id => itemById[id]?.type === 'material');
    if (mats.length && Math.random() < 0.4) {
      const itemId = mats[Math.floor(Math.random() * mats.length)];
      const dCount = Math.max(3, Math.round(count * 0.8));
      return {
        ...base,
        kind: 'deliver',
        target: itemId,
        targetName: itemById[itemId].name,
        count: dCount,
        dropFrom: m.name,
        mapName,
        reward: { exp: Math.floor(base.reward.exp * 1.3), zeny: Math.floor(base.reward.zeny * 1.3) },
      };
    }
    return { ...base, kind: 'kill', target: m.id, targetName: m.name, count, mapName };
  }

  // shared payout for kill-completion and delivery turn-in
  function finishGuild(g) {
    gainXp(g.reward.exp);
    G.player.zeny += g.reward.zeny;
    const pts = g.pts ?? (GUILD_DIFF_PTS[g.difficulty] || 2); // legacy bounties lack .pts
    const toastMsg = currentLang === 'th'
      ? `✔ ส่งเควสกิลด์สำเร็จ! +${g.reward.exp} XP, +${g.reward.zeny} Zeny, +${pts} คะแนนกิลด์`
      : `✔ Guild bounty done! +${g.reward.exp} xp, +${g.reward.zeny}z, +${pts} guild pts`;
    toast(toastMsg, 'good');
    const logMsgText = currentLang === 'th'
      ? `เควสกิลด์สำเร็จ: ${g.kind === 'deliver' ? `ส่งมอบ ${T(g.targetName, 'items')} ${g.count} ชิ้น` : `กำจัด ${T(g.targetName, 'monsters')} ${g.count} ตัว`}.`
      : `Guild bounty complete: ${g.kind === 'deliver' ? `delivered ${g.count} ${g.targetName}` : `${g.count} ${g.targetName} felled`}.`;
    logMsg(logMsgText, 'good');
    G.activeGuilds = G.activeGuilds.filter(x => x !== g);
    addGuildPoints(pts);
    updateQuestTracker();
  }

  // claim a finished bounty IN PERSON at the guild hall (kill: needs done; deliver: hands over the goods)
  function claimGuild(id) {
    const g = id ? G.activeGuilds.find(x => x.id === id)
      : G.activeGuilds.find(x => x.kind === 'deliver' ? itemQty(x.target) >= x.count : x.done);
    if (!g) return;
    if (g.kind === 'deliver') {
      if (itemQty(g.target) < g.count) {
        const msg = currentLang === 'th'
          ? `ต้องการ ${T(g.targetName, 'items')} จำนวน ${g.count} ชิ้น (ปัจจุบันมี ${itemQty(g.target)} ชิ้น)`
          : `Need ${g.count}× ${g.targetName} (have ${itemQty(g.target)}).`;
        toast(msg, 'sys');
        return;
      }
      removeItem(g.target, g.count);
    } else if (!g.done) {
      const msg = currentLang === 'th'
        ? `ยังล่าไม่ครบ: ${g.progress}/${g.count} ${T(g.targetName, 'monsters')}`
        : `Still hunting: ${g.progress}/${g.count} ${g.targetName}.`;
      toast(msg, 'sys');
      return;
    }
    finishGuild(g);
  }

  const guildTurnIn = claimGuild; // legacy alias (tests, old callers)

  function refreshGuildBoard() {
    G.guildBoard = [genGuildQuest(), genGuildQuest(), genGuildQuest()];
    return G.guildBoard;
  }

  function rerollGuildBoard() {
    refreshGuildBoard();
    toast(T('Guild board refreshed. Accepted bounties were not changed.', 'ui'), 'good');
    updateQuestTracker();
    saveGame();
    return true;
  }

  // location hint for a bounty (kill: where the mob lives · deliver: which mob drops it + where)
  // — falls back to a live lookup for legacy saves that predate the stored fields
  function bountyWhere(g) {
    if (g.kind === 'deliver') {
      const from = g.dropFrom, map = g.mapName || itemDropSource(g.target)?.map;
      if (!from && !map) {
        const s = itemDropSource(g.target);
        return s ? `📍 ${T(s.mon, 'monsters')} · ${T(s.map, 'maps')}` : '';
      }
      return `📍 ${from ? T(from, 'monsters') + ' · ' : ''}${map ? T(map, 'maps') : '??'}`;
    }
    const map = g.mapName || monsterMapName[g.target];
    return map ? `📍 ${T(map, 'maps')}` : '';
  }

  // The recommended level comes from the target monster's real map spawn band,
  // including the material source for delivery bounties. Stored source ids keep
  // new delivery rolls exact; name/drop lookups preserve old saves.
  function bountyMonsterId(g) {
    if (g.sourceMonsterId && monById[g.sourceMonsterId]) return g.sourceMonsterId;
    if (g.kind === 'kill' && monById[g.target]) return g.target;
    const namedSource = g.dropFrom && CONTENT.monsters.find(monster => monster.name === g.dropFrom);
    return namedSource?.id || itemDropSource(g.target)?.monsterId || null;
  }

  function bountyLevelRange(g) {
    const monsterId = bountyMonsterId(g);
    if (!monsterId) return [1, 1];
    const level = monById[monsterId]?.level || 1;
    return [...(monsterLevelRange[monsterId] || [level, level])];
  }

  function bountyLevelHtml(g, compact = false) {
    const [min, max] = bountyLevelRange(g);
    const dangerous = G.player.level < min;
    const recommendation = T('Recommended Lv {level}+', 'ui').replace('{level}', min);
    const targetBand = T('Target Lv {min}–{max}', 'ui').replace('{min}', min).replace('{max}', max);
    if (compact) return `<span class="bounty-level${dangerous ? ' bounty-level--danger' : ''}">${dangerous ? '⚠ ' : ''}${recommendation} · ${targetBand}</span>`;
    const warning = dangerous ? ` · ${T('Too strong for your current level', 'ui')}` : '';
    return `<span class="bounty-level${dangerous ? ' bounty-level--danger' : ''}">${dangerous ? '⚠ ' : ''}${recommendation} · ${targetBand}${warning}</span>`;
  }

  function acceptGuild(id) {
    if (G.activeGuilds.length >= GUILD_MAX_ACTIVE) {
      const msg = currentLang === 'th'
        ? `กิลด์อนุญาตให้รับภารกิจพร้อมกันได้สูงสุด ${GUILD_MAX_ACTIVE} งานเท่านั้น`
        : `The guild allows ${GUILD_MAX_ACTIVE} open bounties at once.`;
      toast(msg, 'sys');
      return;
    }
    const idx = G.guildBoard.findIndex(q => q.id === id);
    if (idx < 0) return;
    const g = G.guildBoard[idx];
    G.activeGuilds.push(g);
    G.guildBoard[idx] = genGuildQuest();
    const msg = currentLang === 'th'
      ? `รับภารกิจกิลด์แล้ว: ${g.kind === 'deliver' ? `ส่งของ ${T(g.targetName, 'items')} จำนวน ${g.count} ชิ้น` : `กำจัด ${T(g.targetName, 'monsters')} จำนวน ${g.count} ตัว`} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE})`
      : `Guild task accepted: ${g.kind === 'deliver' ? `deliver ${g.count} ${g.targetName}` : `cull ${g.count} ${g.targetName}`} (${G.activeGuilds.length}/${GUILD_MAX_ACTIVE}).`;
    toast(msg, 'good');
    updateQuestTracker();
  }

  let pendingGuildRevoke = null;
  const guildRevokeArmed = id => pendingGuildRevoke?.id === id;

  function guildRevokeButton(g) {
    const armed = guildRevokeArmed(g.id);
    const label = armed ? T('Confirm Revoke', 'ui') : T('Revoke', 'ui');
    const title = armed ? T('Click again to confirm bounty revoke', 'ui') : T('Revoke bounty', 'ui');
    return `<button class="btn btn--danger${armed ? ' btn--confirm' : ''}" data-guildrevoke="${g.id}" title="${title}">${armed ? '⚠' : '✕'} ${label}</button>`;
  }

  function requestGuildRevoke(id) {
    const g = G.activeGuilds.find(bounty => bounty.id === id);
    if (!g) return false;
    if (guildRevokeArmed(id)) {
      pendingGuildRevoke = null;
      return revokeGuild(id);
    }
    pendingGuildRevoke = { id };
    const name = T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters');
    toast(T('Revoke armed: click Confirm Revoke to abandon {name}. Delivery items stay in your bag.', 'ui').replace('{name}', name), 'sys');
    refreshPanel('quest');
    refreshPanel('guild');
    return false;
  }

  function revokeGuild(id) {
    const idx = G.activeGuilds.findIndex(g => g.id === id);
    if (idx < 0) return false;
    const [g] = G.activeGuilds.splice(idx, 1);
    if (pendingGuildRevoke?.id === id) pendingGuildRevoke = null;
    if (G.taskGuide?.source === 'guild' && G.taskGuide.taskId === g.id) finishTaskGuide();
    const targetName = T(g.targetName, g.kind === 'deliver' ? 'items' : 'monsters');
    const msg = T('Guild bounty revoked: {name}. No rewards were granted.', 'ui').replace('{name}', targetName);
    toast(msg, 'sys');
    logMsg(msg, 'sys');
    updateQuestTracker();
    saveGame();
    return true;
  }

  function guildKill(monId) {
    // every accepted kill-bounty on this monster advances together; payout waits for the guild hall
    for (const g of G.activeGuilds) {
      if (g.kind === 'deliver' || g.target !== monId || g.done) continue;
      if (++g.progress >= g.count) {
        g.done = true;
        const msg = currentLang === 'th'
          ? `✔ ล่ามอนสเตอร์สำเร็จ: ${T(g.targetName, 'monsters')} — กลับไปรายงานผู้อาวุโสมาโรเพื่อรับรางวัล!`
          : `✔ Bounty complete: ${g.targetName} — report to Elder Maro to claim.`;
        toast(msg, 'good');
      }
    }
    const guided = G.taskGuide?.source === 'guild' && G.activeGuilds.find(g => g.id === G.taskGuide.taskId);
    if (guided) {
      const ready = guided.kind === 'deliver' ? itemQty(guided.target) >= guided.count : guided.done;
      if (ready) refreshTaskGuideAction();
    }
    updateQuestTracker();
  }

  return {
    GUILD_DIFF_WEIGHTS,
    pickWeighted,
    guildAllowedDiffs,
    addGuildPoints,
    unlockedMonsterIds,
    genGuildQuest,
    finishGuild,
    claimGuild,
    guildTurnIn,
    refreshGuildBoard,
    rerollGuildBoard,
    bountyWhere,
    bountyMonsterId,
    bountyLevelRange,
    bountyLevelHtml,
    acceptGuild,
    guildRevokeArmed,
    guildRevokeButton,
    requestGuildRevoke,
    revokeGuild,
    guildKill,
  };
}
