import { goalProgress,skillGuide } from './systems/guidance.js';
import { T } from './locale.js';
export function createGuidance({G,CONTENT,COMBAT,PROGRESSION,MAPS,esc,saveGame,updateQuestTracker,togglePanel,skillsFor,skillElement}) {
  let selection=null,origin=null;
  const model=goal=>goalProgress(goal,{...CONTENT,maps:MAPS,player:G.player,storage:G.storage});
  const itemName=id=>T(CONTENT.items.find(i=>i.id===id)?.name||id,'items');
  const pinGoal=goal=>{
    if(goal!==null&&!model(goal).valid)return false;
    G.player.features.goal=goal?{kind:goal.kind,id:goal.id}:null;
    saveGame();updateQuestTracker();return true;
  };
  const openGuide=(kind,id)=>{
    if(kind==='skill'?!COMBAT.skills.some(s=>s.id===id):!model({kind,id}).valid)return false;
    const panel=document.getElementById('panel');
    if(panel?.dataset.kind!=='guide')origin=panel?{panel:panel.dataset.kind,scrollTop:panel.querySelector('.panel__body')?.scrollTop||0}:null;
    selection={kind,id};if(panel?.dataset.kind==='guide')panel.remove();togglePanel('guide');return true;
  };
  const closeGuide=()=>{
    document.getElementById('panel')?.remove();
    if(origin?.panel){togglePanel(origin.panel);const body=document.querySelector('#panel .panel__body');if(body)body.scrollTop=origin.scrollTop;}
    origin=null;
  };
  const goalTrackerHtml=()=>{
    const goal=G.player.features.goal;if(!goal)return '';
    const m=model(goal);if(!m.valid)return '';
    return `<button class="task-link" data-guide-kind="${goal.kind}" data-guide-id="${esc(goal.id)}">${T('Pinned goal','ui')} · ${esc(itemName(m.output))}<br>${m.missing.map(r=>`${esc(itemName(r.itemId))}: ${r.owned}/${r.required}`).join(' · ')}</button>`;
  };
  const guidePanelHtml=()=>{
    const controls=`<button class="btn" data-guide-back>${T('Back','ui')}</button><label>${T('Find item','ui')} <select data-guide-picker><option value="">—</option>${CONTENT.items.map(i=>`<option value="item:${i.id}">${esc(T(i.name,'items'))}</option>`).join('')}${CONTENT.recipes.map(r=>`<option value="recipe:${r.id}">${T('Recipe','ui')} · ${esc(itemName(r.out))}</option>`).join('')}</select></label><label>${T('Abilities','ui')} <select data-guide-skill><option value="">—</option>${skillsFor(G.player.combatClass).map(s=>`<option value="${s.id}">${esc(T(s.name,'skills'))}</option>`).join('')}</select></label>`;
    const selected=selection||G.player.features.goal;if(!selected)return controls;
    if(selected.kind==='skill'){
      const m=skillGuide(selected.id,{combat:COMBAT,progression:PROGRESSION,player:G.player});
      const s=COMBAT.skills.find(s=>s.id===selected.id);if(!m)return controls;
      m.element=skillElement(s);
      return controls+`<h3>${esc(T(s.name,'skills'))}</h3><p>${esc(T(s.desc||'','skills'))}</p><p>${esc(T(m.element,'ui'))} · ${m.cost||0} MP · ${(m.cooldown||0)/1000}s</p><p>${T('Required level','ui')}: ${m.requirements.reqLevel||1} · ${T('Job tier','ui')}: ${(m.requirements.reqTier||0)+1}</p><p>${T('Setup skills','ui')}: ${m.setupIds.map(id=>esc(T(COMBAT.skills.find(s=>s.id===id).name,'skills'))).join(', ')||'—'}</p><p>${T('Detonates','ui')}: ${esc(m.detonates||'—')}</p>`;
    }
    const m=model(selected);if(!m.valid)return controls;
    return controls+`<h3>${esc(itemName(m.output))}</h3><button class="btn" data-pin-kind="${selected.kind}" data-pin-id="${esc(selected.id)}">${T('Pin goal','ui')}</button><button class="btn" data-unpin>${T('Clear goal','ui')}</button><p>${m.cost}z</p>${m.missing.map(row=>{
      const sources=m.sources.filter(s=>s.itemId===row.itemId);
      return `<div class="q-card"><b>${esc(itemName(row.itemId))}</b> ${row.owned}/${row.required} · ${T('Storage','ui')}: ${row.stored}<br>${sources.map(s=>s.kind==='drop'?`${esc(T(CONTENT.monsters.find(m=>m.id===s.monsterId).name,'monsters'))} · ${Math.round(s.chance*100)}% · <button class="btn" data-guide-route="${s.mapId}" ${G.visited.has(s.mapId)?'':'disabled'}>${esc(T(MAPS[s.mapId].name,'maps'))}${G.visited.has(s.mapId)?'':' 🔒'}</button>`:s.kind==='recipe'?`<button class="btn" data-guide-kind="recipe" data-guide-id="${s.recipeId}">${T('Recipe','ui')}</button>`:T('Trader stock varies','ui')).join('<br>')||T('Source unknown','ui')}</div>`;
    }).join('')}<p>${T('Stored materials must be withdrawn. Locked routes must be explored first.','ui')}</p>`;
  };
  return {pinGoal,openGuide,closeGuide,guidePanelHtml,goalTrackerHtml};
}
