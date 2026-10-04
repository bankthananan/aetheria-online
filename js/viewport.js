import { DESIGN } from './design.js';
export function computeViewport({width,height,touch=false,insets={}}) {
  const left=Math.max(0,insets.left||0),top=Math.max(0,insets.top||0);
  const w=Math.max(1,width-left-(insets.right||0)),h=Math.max(1,height-top-(insets.bottom||0));
  const mode=touch?(width<height?'portrait':'landscape'):'desktop';
  const head=touch?Math.min(mode==='portrait'?84:56,h*.25):0;
  const foot=mode==='portrait'?Math.min(220,h*.4):0;
  const availableH=Math.max(1,h-head-foot);
  const scale=touch?DESIGN.tuning.presentation.touchScale:Math.min(1,w/832,availableH/576);
  const logical=touch?{width:Math.max(1,Math.floor(w/scale)),height:Math.max(1,Math.floor(availableH/scale))}:{width:832,height:576};
  const rw=logical.width*scale,rh=logical.height*scale;
  return {mode,logical,scale,rect:{x:left+(w-rw)/2,y:top+head+(availableH-rh)/2,width:rw,height:rh}};
}
export function screenToWorld(point,rect,logical,camera) {
  return {x:(point.x-rect.x)*logical.width/rect.width+camera.x,y:(point.y-rect.y)*logical.height/rect.height+camera.y};
}
