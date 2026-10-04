export function skillGuide(skillId,{combat,progression,player}) {
  const s=combat.skills.find(s=>s.id===skillId);if(!s)return null;
  return {skillId,element:s.element||'neutral',requirements:progression.skillTree[skillId]||{},
    setupIds:s.detonate?combat.skills.filter(x=>x.classId===s.classId&&x.effect===s.detonate&&x.id!==s.id).map(x=>x.id):[],
    detonates:s.detonate||null,cooldown:s.cooldownMs,cost:s.mpCost,available:(player.skillLevels[skillId]||0)>0};
}
export function goalProgress(goal,{items,recipes=[],maps={},monsters=[],npcs=[],player,storage=[]}) {
  const item=items.find(i=>goal?.kind==='item'&&i.id===goal.id);
  const recipe=recipes.find(r=>goal?.kind==='recipe'&&r.id===goal.id);
  if(!item&&!recipe)return {valid:false,missing:[],sources:[]};
  const quantity=(bag,id)=>bag.filter(e=>e.itemId===id).reduce((n,e)=>n+(e.uid?1:e.qty||0),0);
  const missing=(recipe?recipe.mats:[{itemId:item.id,qty:1}]).map(m=>{
    const owned=quantity(player.inventory,m.itemId);
    return {itemId:m.itemId,required:m.qty,owned,needed:Math.max(0,m.qty-owned),stored:quantity(storage,m.itemId)};
  });
  const sources=[];
  for(const row of missing){
    for(const m of monsters){
      const drop=m.drops?.find(d=>d.itemId===row.itemId);if(!drop)continue;
      const places=Object.values(maps).filter(map=>map.spawns?.some(s=>s.monsterId===m.id));
      for(const map of places)sources.push({itemId:row.itemId,kind:'drop',monsterId:m.id,mapId:map.id,chance:drop.chance});
    }
    for(const r of recipes)if(r.out===row.itemId)sources.push({itemId:row.itemId,kind:'recipe',recipeId:r.id});
    for(const n of npcs)if(n.shopItems?.includes(row.itemId))sources.push({itemId:row.itemId,kind:'shop',npcId:n.id});
  }
  return {valid:true,missing,sources,cost:recipe?.cost||0,output:recipe?.out||item.id};
}
