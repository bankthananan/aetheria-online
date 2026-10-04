const cloneBar=bar=>Array.from({length:9},(_,i)=>bar[i]?{...bar[i]}:null);
export const loadoutName=value=>[...String(value??'').trim()].slice(0,24).join('');
export function captureLoadout(player,name) {
  return {name:loadoutName(name),equipment:Object.fromEntries(Object.entries(player.equip).map(([slot,item])=>[slot,item?.uid||null])),hotbar:cloneBar(player.hotbar)};
}
// Preflight constructs a complete replacement without changing any owned object.
export function prepareLoadout(player,preset,{itemById,itemSlot,canUseItem,canUseSkill}) {
  const fail=reason=>({ok:false,reason});
  if(!preset?.equipment||!Array.isArray(preset.hotbar)||preset.hotbar.length!==9)return fail('Invalid loadout');
  const slots=Object.keys(player.equip),owned=[...player.inventory,...Object.values(player.equip).filter(Boolean)];
  if(Object.keys(preset.equipment).some(s=>!slots.includes(s)))return fail('Invalid equipment slot');
  const gear=owned.filter(e=>e.uid),byUid=new Map(gear.map(e=>[e.uid,e]));
  if(byUid.size!==gear.length)return fail('Duplicate equipment identity');
  const equipment={},chosen=new Set();
  for(const slot of slots){
    const uid=preset.equipment[slot];
    if(uid==null){equipment[slot]=null;continue;}
    const e=byUid.get(uid),def=e&&itemById[e.itemId];
    if(!e||!def)return fail('Equipment is missing or stored');
    if(chosen.has(uid)||itemSlot(def)!==slot||!canUseItem(player,def))return fail('Equipment is incompatible');
    equipment[slot]=e;chosen.add(uid);
  }
  for(const slot of preset.hotbar){
    if(!slot)continue;
    if(slot.type==='skill'){if(!canUseSkill(player,slot.id))return fail('Skill is unavailable');}
    else if(slot.type==='item'){
      if(!itemById[slot.itemId]||!player.inventory.some(e=>!e.uid&&e.itemId===slot.itemId&&e.qty>0))return fail('Consumable is missing');
    }else return fail('Invalid hotbar action');
  }
  return {ok:true,equipment,inventory:owned.filter(e=>!e.uid||!chosen.has(e.uid)),hotbar:cloneBar(preset.hotbar)};
}
