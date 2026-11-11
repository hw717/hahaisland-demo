import test from 'node:test';
import assert from 'node:assert/strict';
import {fitDesignViewport,SEA_PORTS,SEA_START,waterAt,newVoyage,advanceShip,nearbyPort,waterRoute,clearWaterLine,pointDistance,SEA_ZOOM,clampSeaZoom,followShipCamera} from '../dist/voyage-model.mjs';
test('every viewport preserves the 402 by 874 Figma canvas',()=>{for(const [w,h] of [[360,740],[390,844],[402,874],[1440,960]]){const r=fitDesignViewport(w,h);assert(Math.abs(r.width/r.height-402/874)<1e-9);assert(r.width<=w&&r.height<=h);}});
test('saved boats resume only on water and invalid saves return to the harbour',()=>{assert.deepEqual(newVoyage({x:0,y:0}),{...SEA_START,vx:0,vy:0});assert.equal(waterAt(newVoyage({x:582,y:475})),true);});
test('manual sailing moves continuously and releases without persistent drifting',()=>{let ship=newVoyage();for(let i=0;i<60;i++)ship=advanceShip(ship,{x:1,y:0},1/60);assert(ship.x>SEA_START.x+80);assert(waterAt(ship));for(let i=0;i<90;i++)ship=advanceShip(ship,{x:0,y:0},1/60);assert(Math.abs(ship.vx)<.01);});
test('manual movement cannot cross an island or leave the ocean boundary',()=>{let ship=newVoyage();for(let i=0;i<2000;i++){ship=advanceShip(ship,{x:-1,y:-1},1/60);assert(waterAt(ship));}});
test('every island has a reachable water route and only near boats may dock',()=>{assert.equal(nearbyPort(SEA_START),null);for(const port of SEA_PORTS){assert(waterAt(port.dock),port.name+' has a water dock');const route=waterRoute(SEA_START,port.dock);assert(route.length>0,port.name+' is reachable');let previous=SEA_START;for(const next of route){assert(clearWaterLine(previous,next),port.name+' route stays in water');previous=next;}assert(pointDistance(route.at(-1),port.dock)<1);assert.equal(nearbyPort(port.dock)?.id,port.id);}});
test('a moving boat can sail between every island without cutting across land',()=>{
 let ship=newVoyage();
 for(const port of SEA_PORTS){
  const route=waterRoute(ship,port.dock);assert(route.length,port.name+' route exists');
  for(let frame=0;frame<2400&&route.length;frame++){
   while(route.length&&pointDistance(ship,route[0])<9)route.shift();
   if(!route.length)break;
   const d=pointDistance(ship,route[0]);ship=advanceShip(ship,{x:(route[0].x-ship.x)/d,y:(route[0].y-ship.y)/d},1/60);
   assert(waterAt(ship));
  }
  assert.equal(nearbyPort(ship)?.id,port.id,port.name+' can be reached with continuous motion');
  ship.vx=ship.vy=0;
 }
});

test('only the five central islands and their inner waters remain reachable',()=>{
 assert.deepEqual(SEA_PORTS.map(p=>p.id),['art','healing','graffiti','nature','lighthouse']);
 for(const point of [{x:1265,y:280},{x:100,y:100},{x:582,y:650},{x:1000,y:400},{x:426,y:40}]){assert.equal(waterAt(point),false);assert.deepEqual(waterRoute(SEA_START,point),[]);}
 assert.deepEqual(newVoyage({x:1265,y:280}),{...SEA_START,vx:0,vy:0});
});
test('legacy overview zoom and repeated zoom-out cannot restore the overview',()=>{
 assert.equal(clampSeaZoom(.25),SEA_ZOOM.min);assert.equal(clampSeaZoom(0),SEA_ZOOM.min);assert.equal(clampSeaZoom(99),SEA_ZOOM.max);assert.equal(clampSeaZoom(NaN),SEA_ZOOM.normal);
 let zoom=SEA_ZOOM.max;for(let i=0;i<30;i++)zoom=clampSeaZoom(zoom/1.3);assert.equal(zoom,SEA_ZOOM.min);
});
test('the camera projects the entire boat into a clear part of the viewport everywhere',()=>{
 for(let x=350;x<=795;x+=17)for(let y=235;y<=525;y+=17){if(!waterAt({x,y}))continue;for(const zoom of [SEA_ZOOM.min,2,SEA_ZOOM.max])for(const anchor of [{x:201,y:510},{x:216.5,y:557}]){
  const view=followShipCamera({x,y},zoom,anchor),sx=x*view.zoom+view.translateX,sy=y*view.zoom+view.translateY;
  assert.equal(view.x,x);assert.equal(view.y,y);assert(Math.abs(sx-view.anchor.x)<1e-8);assert(Math.abs(sy-view.anchor.y)<1e-8);
  assert(sx-62.7*view.zoom/2>=23.99);assert(sx+62.7*view.zoom/2<=378.01);assert(sy-84.6*view.zoom>=209.99);assert(sy<=735);
 }}
});
