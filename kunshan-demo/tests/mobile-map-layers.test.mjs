import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapMatchingAnswers,roadMatchBuckets,availableStreetPhotos,streetPointMatch} from '../dist/mobile-map-layers.mjs';

test('map matching uses Figma axes and freezes the active walking preference',()=>{
 assert.deepEqual(mapMatchingAnswers([1,0,0,1]),[0,1,1,1]);
 const walk={answers:[.2,.3,.4,.5]};const out=mapMatchingAnswers([1,1,1,1],walk);
 assert.deepEqual(out,walk.answers);assert.notEqual(out,walk.answers);
});
test('road colours preserve zero scores and missing scores as distinct buckets',()=>{
 const graph={nodes:[[116.3,40],[116.301,40]],edges:[{a:0,b:1,s:[90,10,80,20,70,30,60,40]},{a:0,b:1,s:Array(8).fill(0)},{a:0,b:1,s:[90,10,null,20,70,30,60,40]}]};
 const left=roadMatchBuckets(graph,[0,0,0,0]),right=roadMatchBuckets(graph,[1,1,1,1]);
 assert.equal(left[75].length,1);assert.equal(right[25].length,1);assert.equal(left[0].length,1);assert.equal(left[101].length,1);
 assert.deepEqual(left[75][0],[[40,116.3],[40,116.301]]);
});
test('actual road overlay changes with preference and includes every edge',async()=>{
 const graph=JSON.parse(await readFile(new URL('../route-demo/data/graph.json',import.meta.url),'utf8'));
 const a=roadMatchBuckets(graph,mapMatchingAnswers([0,0,0,0])),b=roadMatchBuckets(graph,mapMatchingAnswers([1,1,1,1]));
 assert.equal(a.reduce((n,v)=>n+v.length,0),graph.edges.length);
 assert.notDeepEqual(a.map(v=>v.length),b.map(v=>v.length));
});
test('street layer exposes real photos and uses the same four-dimensional match',async()=>{
 const points=JSON.parse(await readFile(new URL('../route-demo/data/points.json',import.meta.url),'utf8'));
 const photos=availableStreetPhotos(points);assert.equal(photos.length,100);assert(photos.every(p=>p.image&&p.xy.length===2));
 assert.deepEqual(availableStreetPhotos([{image:'../outside.jpg',xy:[1,2]},{image:'test.jpg',xy:[null,2]}]),[]);
 const match=streetPointMatch({env:[90,10,80,20,70,30,60,40]},[0,0,0,0]);assert.equal(match.score,75);assert.deepEqual(match.groups,[90,80,70,60]);
 const solarPt={env:[90,10,80,20,70,30,60,40],solar:{svf:.8,canopy:.15,lamp:.4,horizon:[0,0,0,0,0,0,0,0]}};
 const solarMatch=streetPointMatch(solarPt,[0,0,0,0],{hour:12.2,dayOfYear:319,mode:'warm',weight:.4});
 assert.ok(solarMatch.light&&solarMatch.light.healingScore>70&&solarMatch.staticScore===75&&Number.isFinite(solarMatch.score)&&solarMatch.bestWindow);
 const g={nodes:[[116.3,40],[116.301,40]],edges:[{a:0,b:1,s:[60,60,60,60,60,60,60,60],solar:solarPt.solar}]};
 const pureSolar=roadMatchBuckets(g,[0,0,0,0],{hour:12.2,dayOfYear:319,mode:'warm',weight:.4},'solar');
 assert.equal(pureSolar.reduce((n,v)=>n+v.length,0),1);
 assert.equal(pureSolar[101].length,0);
});
