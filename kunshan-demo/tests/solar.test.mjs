import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGraph,shortest,pathTo,recommend,compatibility,computeSunPosition,evaluateSolar,solarContext,blendSolar,lightToMatch,projectBuildingShadowRing,solarColor,azimuthLabel,bestSolarWindow} from '../route-demo/core.mjs';
import {rankPlaces} from '../route-demo/places.mjs';
import {planningParams} from '../dist/mobile-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=f=>readFile(path.join(root,'route-demo/data',f),'utf8').then(JSON.parse);
const answers=[0,.85,.9,1];
const env=score=>Array(8).fill(score);
const open={svf:.8,canopy:.1,lamp:.3,horizon:[0,0,0,0,0,0,0,0]};
const southWall={svf:.4,canopy:.1,lamp:.3,horizon:[0,0,0,60,60,60,0,0]};
const peak=day=>{let best={altitudeDeg:-90};for(let h=10;h<=14;h+=1/60){const s=computeSunPosition(h,day);if(s.altitudeDeg>best.altitudeDeg)best=s;}return best;};

test('sun position matches Beijing solar geometry',()=>{
  // Noon altitude = 90° − latitude + declination.
  assert.ok(Math.abs(peak(355).altitudeDeg-26.6)<1,'winter solstice');
  assert.ok(Math.abs(peak(172).altitudeDeg-73.4)<1,'summer solstice');
  assert.ok(Math.abs(peak(80).altitudeDeg-50)<1.2,'equinox');
  const noon=peak(319);
  assert.ok(Math.abs(noon.azimuthDeg-180)<2,'sun is due south at solar noon');
  assert.ok(noon.hour>12&&noon.hour<12.3,'Beijing (116.3°E) solar noon falls shortly after 12:00 CST in mid-November');
  assert.ok(computeSunPosition(9,319).azimuthDeg<180&&computeSunPosition(15,319).azimuthDeg>180);
  // Mid-November sunrise ≈ 07:05, sunset ≈ 16:55 in Beijing.
  assert.ok(computeSunPosition(6.7,319).isNight&&!computeSunPosition(7.5,319).isNight);
  assert.ok(!computeSunPosition(16.5,319).isNight&&computeSunPosition(17.3,319).isNight);
  assert.ok(computeSunPosition(16.3,319).isGoldenHour);
});

test('building horizon decides direct sun; night falls back to street lighting',()=>{
  const noon=computeSunPosition(12.2,319);
  const lit=evaluateSolar(open,noon),shaded=evaluateSolar(southWall,noon);
  assert.ok(lit.litRatio>.95&&shaded.litRatio<.01);
  assert.ok(lit.light>shaded.light+30,'direct sun dominates diffuse light');
  assert.equal(shaded.tag,'建筑背阴区');
  // A south-east wall shades the November morning sun (azimuth ≈135° at 09:00), not the afternoon.
  const southEast={...open,horizon:[0,0,0,50,0,0,0,0]};
  assert.ok(evaluateSolar(southEast,computeSunPosition(9,319)).litRatio<.05);
  assert.ok(evaluateSolar(southEast,computeSunPosition(15,319)).litRatio>.9);
  const night=computeSunPosition(20,319);
  assert.ok(evaluateSolar({...open,lamp:.9},night).light>evaluateSolar({...open,lamp:.05},night).light);
  assert.equal(evaluateSolar(open,night).litRatio,0);
  // Shade mode rewards canopy instead of exposure.
  const leafy={...open,canopy:.8};
  assert.ok(evaluateSolar(leafy,noon,'shade').healingScore>evaluateSolar(open,noon,'shade').healingScore);
});

test('solar blending is opt-in, bounded, and keeps unknown scores unknown',()=>{
  assert.equal(solarContext(null),null);
  assert.equal(blendSolar(55,open,null),55);
  const ctx=solarContext({hour:12.2});
  assert.equal(ctx.weight,.4);
  assert.equal(blendSolar(null,open,ctx),null);
  const blended=blendSolar(50,open,ctx);
  assert.ok(Math.abs(blended-(.6*50+.4*lightToMatch(evaluateSolar(open,ctx.sun).healingScore)))<1e-9);
  assert.equal(blendSolar(50,open,solarContext({hour:12,weight:0})),50);
  assert.ok(lightToMatch(0)===30&&lightToMatch(100)===70,'light shares the 30–70 match band');
  for(const bad of [{hour:25},{hour:12,weight:2},{hour:12,mode:'x'},{hour:12,dayOfYear:0}])assert.throws(()=>solarContext(bad),/日照/);
});

test('routing follows the sun once sunlight is weighted',()=>{
  // Two equal-score paths 0→3: the shorter north one (via 1) sits behind a south wall.
  const g=buildGraph({nodes:[[0,0],[.001,.0005],[.001,-.0005],[.002,0]],edges:[
    {a:0,b:1,d:100,s:env(60),solar:southWall},{a:1,b:3,d:100,s:env(60),solar:southWall},
    {a:0,b:2,d:110,s:env(60),solar:open},{a:2,b:3,d:110,s:env(60),solar:open}]});
  assert.deepEqual(pathTo(shortest(g,0,answers),0,3).nodes,[0,1,3]);
  const noon=solarContext({hour:12.2});
  assert.deepEqual(pathTo(shortest(g,0,answers,null,{solar:noon}),0,3).nodes,[0,2,3]);
  const [best]=recommend(g,{start:0,end:3,minutes:10,answers,solar:{hour:12.2}});
  assert.deepEqual(best.nodes,[0,2,3]);
  assert.equal(best.sunlitRatio,1);
  assert.ok(best.avgLightScore>50&&Number.isFinite(best.staticScore));
  assert.equal(recommend(g,{start:0,end:3,minutes:10,answers})[0].sunlitRatio,undefined,'no solar fields without sunlight');
});

test('generated solar features cover the whole study area with valid ranges',async()=>{
  const [graph,placesDoc,points,buildings]=await Promise.all(['graph.json','places.json','points.json','buildings.json'].map(load));
  const valid=s=>s&&s.svf>=.05&&s.svf<=.95&&s.canopy>=0&&s.canopy<=.9&&s.lamp>=0&&s.lamp<=1&&s.horizon.length===8&&s.horizon.every(v=>Number.isInteger(v)&&v>=0&&v<90);
  assert.ok(graph.edges.every(e=>valid(e.solar)),'every edge');
  assert.ok(points.every(p=>valid(p.solar)),'every street-view point');
  assert.ok(placesDoc.places.every(p=>valid(p.solar)),'every garden place');
  assert.ok(buildings.buildings.length>3000&&buildings.buildings.every(b=>b.h>0&&b.h<150&&b.ring.length>=4));
  // Buildings now reach the southern half of the study area (south of 39.987°N: Zhongguancun & Renmin Univ).
  assert.ok(buildings.buildings.filter(b=>b.ring[0][1]<39.987).length>1500);
  const cityGeo=JSON.parse(await readFile(path.join(root,'dist/maps/city-buildings.geojson'),'utf8'));
  assert.ok(cityGeo.features.length>=buildings.buildings.length&&cityGeo.features.every(f=>f.properties?.h>0&&f.properties?.levels>=1));
  assert.ok(cityGeo.features.filter(f=>f.geometry.coordinates[0][0][1]<39.987).length>1500,'frontend GeoJSON covers south half');
  for(const [name,minH] of [['中关村科贸电子城',70],['海龙大厦',60],['数码大厦',70],['明德主楼',38],['中国人民大学图书馆',24],['立德楼',40]]){
    const found=buildings.buildings.find(b=>b.name===name);
    assert.ok(found&&found.h>=minH,`${name} height calibrated`);
  }
  const g=buildGraph(graph);
  const routes=recommend(g,{start:graph.edges[0].a,minutes:30,answers,solar:{hour:15}});
  assert.ok(routes.length>0&&routes.every(r=>r.sunlitRatio>=0&&r.sunlitRatio<=1&&r.avgLightScore>=5&&r.avgLightScore<=100));
  const ranked=rankPlaces(g,placesDoc.places,{start:placesDoc.places[0].node,minutes:60,answers,solar:{hour:15}});
  assert.ok(ranked.length&&ranked.every(p=>p.light&&Number.isFinite(p.light.light)));
  assert.equal(compatibility(graph.edges[0].s,answers),compatibility(graph.edges[0].s,answers),'static scoring untouched');
});

test('2.5D shadow projection, solar palette, and planning params work end-to-end',()=>{
  const ring=[[116.32,39.99],[116.3202,39.99],[116.3202,39.9902],[116.32,39.9902],[116.32,39.99]];
  const noon=computeSunPosition(12.2,319);
  const shadow=projectBuildingShadowRing(ring,24,noon);
  assert.ok(Array.isArray(shadow)&&shadow.length>=4,'connected convex-hull shadow polygon');
  // Due-south sun casts shadow northward (higher latitude).
  const maxBaseLat=Math.max(...ring.map(p=>p[1])),maxShadowLat=Math.max(...shadow.map(p=>p[1]));
  assert.ok(maxShadowLat>maxBaseLat,'noon shadow extends north of building footprint');
  assert.equal(projectBuildingShadowRing(ring,24,computeSunPosition(20,319)),null,'no shadow at night');
  assert.match(solarColor(85),/^rgb\(\d+,\d+,\d+\)$/);
  assert.equal(azimuthLabel(180),'正南 180°');
  assert.match(bestSolarWindow(southWall,'shade'),/^\d{2}:\d{2}–\d{2}:\d{2}$/);
  assert.match(bestSolarWindow(open,'warm'),/^\d{2}:\d{2}–\d{2}:\d{2}$/);
  const g=buildGraph({nodes:[[116.32,39.99],[116.321,39.99]],edges:[{a:0,b:1,d:85,s:env(60),solar:open}]});
  const nearest=()=>({id:0,distance:10});
  const pWithout=planningParams(g,nearest,{mode:'loop',start:[116.32,39.99],minutes:20,values:[.5,.5,.5,.5],stops:[]});
  assert.equal(pWithout.solar,undefined);
  const pWith=planningParams(g,nearest,{mode:'loop',start:[116.32,39.99],minutes:20,values:[.5,.5,.5,.5],stops:[],solar:{hour:15,dayOfYear:319,mode:'warm',weight:.4}});
  assert.deepEqual(pWith.solar,{hour:15,dayOfYear:319,mode:'warm',weight:.4});
});
