import { DailiesSystem } from './systems/dailies.js';
import { MASTERY_RANKS } from './systems/mastery.js';
import { T } from './locale.js';

export function createExpansion({G,DESIGN,CONTENT,MAPS,zone,gainXp,saveGame,loadMap,makeMonster,recompute,esc}) {
  const cfg=DESIGN.tuning.expansion;
  const dailyPool=()=>[...new Set((MAPS.whispering_woods.spawns||[]).map(s=>s.monsterId))].slice(0,6).map(id=>({id:`hunt_${id}`,type:'hunt',targetId:id,required:cfg.dailyKills}));
  const refreshDailies=(force=false)=>{
    if(force)G.dailies.lastRollDate=null;
    const pool=dailyPool();
    const refreshed=DailiesSystem.checkAndRefreshDailies(G.dailies,pool);
    G.dailies.activeDailies=G.dailies.activeDailies.filter(d=>pool.some(p=>p.id===d.id)).map(d=>{
      const definition=pool.find(p=>p.id===d.id),progress=Math.min(d.progress,definition.required);
      return {...definition,progress,completed:progress>=definition.required};
    });
    return refreshed;
  };
  const claimDaily=id=>{
    refreshDailies();const task=G.dailies.activeDailies.find(d=>d.id===id);
    if(!task||task.progress<task.required||G.dailies.claimedDailies[id])return false;
    G.dailies.claimedDailies[id]=true;G.player.zeny+=cfg.dailyZeny;gainXp(cfg.dailyXp);saveGame();return true;
  };
  const claimMastery=(zoneId,rank)=>{
    const def=MASTERY_RANKS.find(r=>r.rank===rank);
    if(!MAPS[zoneId]||!def||(G.mastery.zonePoints[zoneId]||0)<def.reqPoints||G.mastery.claimedRanks[zoneId]?.[rank])return false;
    (G.mastery.claimedRanks[zoneId]||={})[rank]=true;recompute(G.player);saveGame();return true;
  };
  const setZoneDifficulty=(mapId,tier)=>{
    const key=String(tier).toLowerCase();if(!MAPS[mapId]||!['normal','hard','nightmare'].includes(key))return false;
    G.zoneDifficulty[mapId]=key;saveGame();return true;
  };
  const masteryTravel=mapId=>{
    if(G.mapId!=='town_awakening'||!MAPS[mapId]||!G.visited.has(mapId)||!G.mastery.claimedRanks[mapId]?.gold)return false;
    loadMap(mapId);saveGame();return true;
  };
  const enterSubdungeon=id=>{
    const d=[zone.GOBLIN_CAVE,zone.ELDER_HOLLOW].find(d=>d.id===id);if(!d||G.mapId!=='whispering_woods')return false;
    const portal=G.portals.find(p=>p.toMap===id);
    if(!portal||Math.hypot(G.player.x/32-.5-portal.x,G.player.y/32-.5-portal.y)>2)return false;
    loadMap(id,portal.toX,portal.toY);return true;
  };
  const exitSubdungeon=()=>{
    const parent=G.dungeonState.parentPortal;if(!G.dungeonState.currentDungeonId||!parent||!MAPS[parent.mapId])return false;
    loadMap(parent.mapId,parent.x,parent.y);return true;
  };
  const spawnZoneRare=rare=>{
    if(!rare||G.monsters.some(m=>m.zoneRareId===rare.id&&m.alive))return false;
    const def=CONTENT.monsters.find(m=>m.id===rare.triggerMob);if(!def)return false;
    const tiles=G.spawnTiles||[];if(!tiles.length)return false;
    const tile=tiles.reduce((a,b)=>Math.hypot(b.col-rare.location.x,b.row-rare.location.y)<Math.hypot(a.col-rare.location.x,a.row-rare.location.y)?b:a);
    const m=makeMonster({...def,name:rare.name},tile.col*32+16,tile.row*32+16,def.level);
    m.zoneRareId=rare.id;m.hp=m.maxHp=Math.round(m.maxHp*cfg.rareHp);m.atk=m.atkBase=Math.round(m.atk*cfg.rareAtk);G.monsters.push(m);return true;
  };
  // claim rules shared by the Adventures window and the HUD reward badge
  const dailyClaimable=d=>!G.dailies.claimedDailies[d.id]&&d.progress>=d.required;
  const masteryClaimable=(r,mapId=G.mapId)=>!(G.mastery.claimedRanks[mapId]||{})[r.rank]&&r.reqPoints<=(G.mastery.zonePoints[mapId]||0);
  const pendingAdventureClaims=()=>(G.dailies?.activeDailies||[]).filter(dailyClaimable).length+(G.mastery?MASTERY_RANKS.filter(r=>masteryClaimable(r)).length:0);
  const adventurePanelHtml=()=>{
    refreshDailies();
    const pts=G.mastery.zonePoints[G.mapId]||0, claimed=G.mastery.claimedRanks[G.mapId]||{};
    const dailies=G.dailies.activeDailies.map(d=>{
      const done=G.dailies.claimedDailies[d.id], ready=dailyClaimable(d)||done;
      return `<div class="ro-box adv-row"><div class="adv-row__main"><b>${T('Defeat','ui')} ${esc(T(CONTENT.monsters.find(m=>m.id===d.targetId)?.name||d.targetId,'monsters'))}</b>
        <div class="ro-meter"><i style="width:${Math.min(100,100*d.progress/d.required)}%"></i></div>
        <span class="ro-muted">${d.progress}/${d.required} · ${cfg.dailyZeny}z · ${cfg.dailyXp} XP</span></div>
        ${!ready&&!done?`<button class="btn btn--ghost" data-task="hunt" data-task-id="${esc(d.targetId)}">➤ ${T('Hunt','ui')}</button>`:''}<button class="btn" data-daily-claim="${esc(d.id)}" ${!ready||done?'disabled':''}>${T(done?'Claimed':'Claim','ui')}</button></div>`;
    }).join('');
    const ranks=MASTERY_RANKS.map(r=>{
      const got=claimed[r.rank], need=Math.max(0,r.reqPoints-pts);
      return `<div class="ro-box adv-rank${got?' is-claimed':''}"><b>${T(r.title,'ui')}</b><span class="ro-muted">${r.reqPoints} ${T('pts','ui')}</span>
        <span>${T(r.label,'ui')}</span>
        ${got?`<span class="adv-rank__state">✓ ${T('Claimed','ui')}</span>`:!masteryClaimable(r)?`<span class="ro-muted">${T('{n} more pts','ui').replace('{n}',need)}</span>`:`<button class="btn" data-mastery-claim="${r.rank}">${T('Claim','ui')}</button>`}</div>`;
    }).join('');
    const travel=G.mapId==='town_awakening'?Object.keys(G.mastery.claimedRanks).filter(id=>G.mastery.claimedRanks[id]?.gold&&MAPS[id]&&G.visited.has(id)).map(id=>`<button class="btn" data-mastery-travel="${esc(id)}">${T('Free travel','ui')} · ${esc(T(MAPS[id].name,'maps'))}</button>`).join(''):'';
    const inWoods=G.mapId==='whispering_woods';
    return `<section class="adventure-content">
    <h3>${T('Daily challenges','ui')}</h3><div class="adv-list">${dailies}</div>
    <h3>${T('Zone Mastery & Exploration','ui')}</h3>
    <div class="adv-zone"><span><b>${esc(T(G.map.name,'maps'))}</b> · ${pts} ${T('pts','ui')}</span>
      <label class="adv-diff">${T('Zone difficulty','ui')} <select data-zone-difficulty aria-label="${T('Difficulty','ui')}">${['normal','hard','nightmare'].map(t=>`<option value="${t}" ${(G.zoneDifficulty[G.mapId]||'normal')===t?'selected':''}>${T(t[0].toUpperCase()+t.slice(1),'ui')}</option>`).join('')}</select></label></div>
    <div class="adv-ranks">${ranks}</div>
    <p class="ro-muted">${T('Zone difficulty applies to new spawns.','ui')}</p>${travel?`<div class="adv-actions">${travel}</div>`:''}
    <h3>${T('Dungeons','ui')}</h3>
    <div class="adv-actions">${[zone.GOBLIN_CAVE,zone.ELDER_HOLLOW].map(d=>{
      const lv=(d.spawns||[]).flatMap(x=>x.levelRange||[]),boss=CONTENT.monsters.find(m=>m.id===d.boss?.monsterId);
      return `<button class="btn adv-dungeon" data-dungeon-enter="${d.id}" ${inWoods?'':'disabled'}><b>${esc(T(d.name,'maps'))}${G.dungeonState.clearedDungeons[d.id]?' ✓':''}</b>${lv.length?`<small>Lv ${Math.min(...lv)}–${Math.max(...lv)}</small>`:''}${boss?`<small>${T('Boss','ui')}: ${esc(T(boss.name,'monsters'))}</small>`:''}</button>`;}).join('')}
    ${G.dungeonState.currentDungeonId?`<button class="btn" data-dungeon-exit>${T('Return to entrance','ui')}</button>`:''}</div>
    ${inWoods?'':`<p class="ro-muted">${T('Use the marked entrance in Whispering Woods.','ui')}</p>`}</section>`;
  };
  return {pendingAdventureClaims,refreshDailies,claimDaily,claimMastery,setZoneDifficulty,masteryTravel,enterSubdungeon,exitSubdungeon,spawnZoneRare,adventurePanelHtml};
}
