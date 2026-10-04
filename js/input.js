// Each pointer owns one role; a second thumb cannot steal movement ownership.
export function createInputController({move,action,blocked}) {
  const pointers=new Map();let moving=null,disposed=false;
  const clear=()=>{pointers.clear();moving=null;move(0,0);};
  return {
    pointerDown(id,role,x,y) {
      if(disposed||blocked()||pointers.has(id))return;
      if(role==='move'&&moving!==null)return;
      pointers.set(id,{role,x,y});
      if(role==='move'){moving=id;move(0,0);}else action(role);
    },
    pointerMove(id,x,y) {
      if(disposed)return;
      if(blocked()){clear();return;}
      const p=pointers.get(id);if(!p||moving!==id)return;
      const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
      if(d<5)move(0,0);else {const r=Math.max(45,d);move(dx/r,dy/r);}
    },
    pointerUp(id){pointers.delete(id);if(moving===id){moving=null;move(0,0);}},
    clear,
    dispose(){clear();disposed=true;},
  };
}
