// Browser boundary fixture; assertions exercise the real game module.
export async function createRuntime({ classId = 'reborn_blade', mapId = 'town_awakening' } = {}) {
  let time = 1000, brokenStorage = false;
  const listeners = new WeakMap();
  const eventful = target => Object.assign(target, {
    addEventListener(type, fn) { const all = listeners.get(this) || {}; (all[type] ||= new Set()).add(fn); listeners.set(this, all); },
    removeEventListener(type, fn) { listeners.get(this)?.[type]?.delete(fn); },
    dispatchEvent(e) { for (const fn of listeners.get(this)?.[e.type] || []) fn(e); },
  });
  const ctx = () => new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k] || (()=>{})});
  const makeEl = () => {
    const classes = new Set();
    return eventful({style:{setProperty(){}},dataset:{},children:[],innerHTML:'',textContent:'',
      classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle(x,on){const yes=on??!classes.has(x);yes?classes.add(x):classes.delete(x);return yes;}},
      appendChild(c){this.children.push(c);c.parentNode=this;return c;},get firstChild(){return this.children[0];},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);},setAttribute(){},getAttribute(){return null;},focus(){},click(){this.onclick?.({preventDefault(){}});},
      querySelector(){return makeEl();},querySelectorAll(){return [];},getContext:ctx,toDataURL:()=>'',getBoundingClientRect:()=>({left:0,top:0,width:832,height:576}),setPointerCapture(){},releasePointerCapture(){},
    });
  };
  const elements = Object.fromEntries(['root','hud','overlays','fx-layer','game-canvas','touch-controls'].map(id=>[id,makeEl()]));
  globalThis.window = globalThis; eventful(globalThis);
  globalThis.performance = {now:()=>time};
  globalThis.document = eventful({head:makeEl(),body:makeEl(),hidden:false,visibilityState:'visible',createElement:makeEl,
    querySelector:s=>s==='#panel'?null:(elements[s.replace(/^#/,'')] ||= makeEl()),querySelectorAll:()=>[],getElementById:id=>elements[id] || null});
  const store = {};
  globalThis.localStorage = {getItem:k=>store[k]??null,setItem(k,v){if(brokenStorage)throw Error('Storage full');store[k]=String(v);},removeItem:k=>delete store[k]};
  const param = {value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},gain:{...param},frequency:{...param},Q:{...param}});
  globalThis.AudioContext=class {constructor(){this.currentTime=0;this.destination={};this.state='running';}createOscillator(){return node();}createGain(){return node();}createBiquadFilter(){return node();}createBuffer(_n,size){return {getChannelData:()=>new Float32Array(size)};}createBufferSource(){return node();}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}};
  globalThis.Image=class {}; globalThis.requestAnimationFrame=()=>1; globalThis.setTimeout=()=>0; globalThis.clearTimeout=()=>{};
  globalThis.innerWidth=1366;globalThis.innerHeight=768;
  await import('../game.js');
  const A=window.__AWO;
  A.G.player=A.makePlayer(classId,'Regression'); A.G.running=true; A.loadMap(mapId);
  return {A,advance:ms=>{time+=ms;},failWrites:v=>{brokenStorage=v;},readSave:()=>JSON.parse(store.awo_save_v1),
    dispatch:(target,type,event={})=>target.dispatchEvent({type,preventDefault(){},...event}),element:id=>elements[id]};
}
