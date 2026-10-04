import assert from 'node:assert/strict';
import { computeViewport,screenToWorld } from './viewport.js';
for(const [width,height] of [[360,800],[390,844],[412,915],[844,390],[768,1024],[1366,768],[320,200]]){
  const v=computeViewport({width,height,touch:width<1000,insets:{top:12,right:9,bottom:20,left:7}});
  assert.ok(v.rect.x>=7&&v.rect.y>=12);
  assert.ok(v.rect.x+v.rect.width<=width-9+.001);
  assert.ok(v.rect.y+v.rect.height<=height-20+.001);
  const p=screenToWorld({x:v.rect.x+v.rect.width/2,y:v.rect.y+v.rect.height/2},v.rect,v.logical,{x:100,y:200});
  assert.ok(Math.abs(p.x-100-v.logical.width/2)<1e-6);
  assert.ok(Math.abs(p.y-200-v.logical.height/2)<1e-6);
}
console.log('Adaptive viewport passed.');
