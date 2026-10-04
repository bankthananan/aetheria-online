import { captureLoadout,prepareLoadout,loadoutName } from './systems/loadouts.js';
import { T } from './locale.js';
export function createEquipmentFeatures({G,itemById,itemSlot,canUseItem,canUseSkill,recompute,saveGame,renderHotbar,esc}) {
  const valid=i=>i===0||i===1;
  const saveLoadout=(index,name)=>{
    if(!valid(index)||!loadoutName(name))return false;
    G.player.features.loadouts[index]=captureLoadout(G.player,name);saveGame();return true;
  };
  const renameLoadout=(index,name)=>{
    if(!valid(index)||!G.player.features.loadouts[index]||!loadoutName(name))return false;
    G.player.features.loadouts[index].name=loadoutName(name);saveGame();return true;
  };
  const applyLoadout=index=>{
    if(!valid(index))return {ok:false,reason:'Invalid loadout'};
    if(G.mapId!=='town_awakening'||G.player.hp<=0||G.jobChoiceOpen||G.rift.active)return {ok:false,reason:'Switch loadouts in town'};
    const p=G.player,result=prepareLoadout(p,p.features.loadouts[index],{itemById,itemSlot,canUseItem,canUseSkill});
    if(!result.ok)return result;
    const {hp,mp,stamina}=p;
    Object.assign(p,{equip:result.equipment,inventory:result.inventory,hotbar:result.hotbar});
    recompute(p,false);p.hp=Math.min(hp,p.maxHp);p.mp=Math.min(mp,p.maxMp);p.stamina=stamina;
    renderHotbar();saveGame();return {ok:true};
  };
  const setItemProtection=(uid,value)=>{
    const e=[...G.player.inventory,...Object.values(G.player.equip),...G.storage].find(e=>e?.uid===Number(uid));
    if(!e)return false;e.protected=value===true;saveGame();return true;
  };
  const loadoutPanelHtml=()=>`<h3>${T('Loadouts','ui')}</h3><p>${T('Switch loadouts in town','ui')}</p>${[0,1].map(i=>{
    const p=G.player.features.loadouts[i];
    return `<div class="q-card"><input aria-label="${T('Loadout name','ui')} ${i+1}" data-loadout-name="${i}" maxlength="48" value="${esc(p?.name||'Set '+(i+1))}"><button class="btn" data-loadout-save="${i}">${T(p?'Overwrite':'Save','ui')}</button><button class="btn" data-loadout-rename="${i}" ${p?'':'disabled'}>${T('Rename','ui')}</button><button class="btn" data-loadout-apply="${i}" ${p?'':'disabled'}>${T('Apply','ui')}</button></div>`;
  }).join('')}`;
  return {saveLoadout,renameLoadout,applyLoadout,setItemProtection,loadoutPanelHtml};
}
