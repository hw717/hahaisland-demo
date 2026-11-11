import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGraph,shortest,pathTo,describe,recommend,nearestNode,match,compatibility,matchColor,ROUTING_VERSION} from '../route-demo/core.mjs';
import {rankPlaces} from '../route-demo/places.mjs';
import {connectIslandBridge,routeSummary} from '../route-demo/bridge.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await readFile(path.join(root,'route-demo/data/graph.json'),'utf8'));
const realGraph=buildGraph(data);
const places=JSON.parse(await readFile(path.join(root,'route-demo/data/places.json'),'utf8')).places;
const answers=[0,.85,.9,1];
const env=score=>Array(8).fill(score);
function graph(nodes,edges){return buildGraph({nodes,edges:edges.map(e=>({d:100,s:env(60),oneway:'no',...e}))});}

function assertPath(g,route,{start,end,budget,waypoints=[]}){
  assert.equal(route.nodes[0],start);
  assert.equal(route.nodes.at(-1),end);
  assert.equal(route.edges.length+1,route.nodes.length);
  let length=0;
  route.edges.forEach((ei,i)=>{
    assert.ok(g.adj[route.nodes[i]].some(([n,e])=>n===route.nodes[i+1]&&e===ei),`edge ${ei} must join consecutive nodes in its allowed direction`);
    length+=g.edges[ei].d;
  });
  assert.ok(Math.abs(length-route.length)<1e-6);
  assert.ok(route.minutes<=budget+1e-8,`${route.minutes} exceeds ${budget}`);
  let cursor=0;
  for(const stop of waypoints){cursor=route.nodes.indexOf(stop,cursor);assert.ok(cursor>=0,'selected waypoint order must be preserved');}
  assert.ok(route.coverage>=0&&route.coverage<=1);
  for(const score of route.groups)assert.ok(score===null||(Number.isFinite(score)&&score>=0&&score<=100));
}

test('directed paths respect forward, reverse and numeric/boolean oneway flags',()=>{
  const g=graph([[0,0],[.001,0],[.002,0],[.003,0]],[{a:0,b:1,oneway:'yes'},{a:2,b:1,oneway:'-1'},{a:2,b:3,oneway:true}]);
  assert.deepEqual(pathTo(shortest(g,0,answers),0,3),{nodes:[0,1,2,3],edges:[0,1,2]});
  assert.equal(pathTo(shortest(g,3,answers),3,0),null);
  assert.throws(()=>graph([[0,0]],[{a:0,b:2}]),/无效/);
  assert.throws(()=>graph([[0,0],[1,0]],[{a:0,b:1,d:-1}]),/无效/);
});

test('preference-weighted shortest paths change when the user changes their answers',()=>{
  const left=[100,0,100,0,100,0,100,0],right=[0,100,0,100,0,100,0,100];
  const g=graph([[0,0],[.001,.001],[.001,-.001],[.002,0]],[{a:0,b:1,s:left},{a:1,b:3,s:left},{a:0,b:2,d:120,s:right},{a:2,b:3,d:120,s:right}]);
  assert.deepEqual(pathTo(shortest(g,0,[0,0,0,0]),0,3).nodes,[0,1,3]);
  assert.deepEqual(pathTo(shortest(g,0,[1,1,1,1]),0,3).nodes,[0,2,3]);
  assert.deepEqual(pathTo(shortest(g,0,[1,1,1,1],null,{strength:0}),0,3).nodes,[0,1,3]);
});

test('unknown scores stay null/grey and do not become neutral or zero observations',()=>{
  assert.equal(compatibility(null,answers),null);
  assert.equal(matchColor(null),'#a4a9ad');
  const g=graph([[0,0],[.001,0],[.002,0]],[{a:0,b:1,s:null},{a:1,b:2,s:env(80)}]);
  const r=describe(g,{nodes:[0,1,2],edges:[0,1]},answers);
  assert.deepEqual(r.groups,[80,80,80,80]);assert.equal(r.coverage,.5);
  const missing=describe(g,{nodes:[0,1],edges:[0]},answers);
  assert.deepEqual(missing.groups,[null,null,null,null]);assert.equal(missing.score,null);assert.equal(missing.coverage,0);
  g.edges[0].s=[null,null,50,50,50,50,50,50];
  const partial=describe(g,{nodes:[0,1],edges:[0]},answers);
  assert.deepEqual(partial.groups,[null,50,50,50]);assert.equal(partial.coverage,0);
  assert.equal(match(env(40),[null,null,null,null])[0].score,40);
  assert.throws(()=>match(env(40),[0,0,0,2]),/无效/);
});

test('destination and ordered waypoints count stays within the requested budget',()=>{
  const g=graph([[0,0],[.001,0],[.002,0],[.003,0]],[{a:0,b:1},{a:1,b:2},{a:2,b:3}]);
  const direct=recommend(g,{start:0,end:3,minutes:5,answers});
  assert.ok(direct.length);direct.forEach(r=>assertPath(g,r,{start:0,end:3,budget:5}));
  const stopping=recommend(g,{start:0,end:3,waypoints:[1,2],stayMinutes:.5,minutes:5,answers});
  assert.ok(stopping.length);
  stopping.forEach(r=>{assertPath(g,r,{start:0,end:3,budget:5,waypoints:[1,2]});assert.equal(r.stayMinutes,1);assert.equal(r.walkingMinutes,4);assert.equal(r.minutes,5);});
  assert.deepEqual(recommend(g,{start:0,end:3,waypoints:[1,2],stayMinutes:1,minutes:5,answers}),[]);
  const isolated=graph([[0,0],[.001,0]],[]);
  assert.deepEqual(recommend(isolated,{start:0,end:1,minutes:5,answers}),[]);
  assert.throws(()=>recommend(g,{start:-1,answers}),/起点无效/);
  assert.throws(()=>recommend(g,{start:0,minutes:4,answers}),/5–120/);
});

test('place ranking uses reverse direction for the remaining trip and labels over-budget places',()=>{
  const g=graph([[0,0],[.001,0],[.002,0]],[{a:0,b:1,oneway:'yes'},{a:1,b:2,oneway:'yes'}]);
  const p={id:'park',name:'公园',node:1,env:env(70)};
  assert.deepEqual(rankPlaces(g,[p],{start:0,minutes:5,answers,stayMinutes:0}),[],'one-way location cannot loop back');
  const forward=rankPlaces(g,[p],{start:0,end:2,minutes:5,answers,stayMinutes:5});
  assert.equal(forward.length,1);assert.equal(forward[0].fitsBudget,false);assert.equal(forward[0].requiredMinutes,10);
});

test('actual dataset provides continuous closed loops for every preset start and duration',()=>{
  assert.equal(realGraph.nodes.length,17191);assert.equal(realGraph.edges.length,19880);
  for(const xy of [[116.313,39.983],[116.326,39.9916],[116.2983,39.9961]]){
    const {id:start,distance}=nearestNode(realGraph,xy);assert.ok(distance<180);
    for(const minutes of [15,30,60]){
      const routes=recommend(realGraph,{start,minutes,answers});
      assert.ok(routes.length,`no loop from ${start} in ${minutes} min`);
      routes.forEach(r=>{assertPath(realGraph,r,{start,end:start,budget:minutes});assert.ok(r.minutes>=minutes*.65);assert.ok(r.repeat<=.35);});
    }
  }
});

test('actual destination and selected place routes keep endpoints, stays and waypoint order',()=>{
  const start=nearestNode(realGraph,[116.313,39.983]).id;
  const end=nearestNode(realGraph,[116.31865,39.9829]).id;
  const destination=recommend(realGraph,{start,end,minutes:30,answers});
  assert.ok(destination.length);destination.forEach(r=>assertPath(realGraph,r,{start,end,budget:30}));
  const ranked=rankPlaces(realGraph,places,{start,end:null,minutes:60,answers,stayMinutes:5});
  const first=ranked.find(p=>p.fitsBudget);assert.ok(first);
  const withStop=recommend(realGraph,{start,waypoints:[first.node],stayMinutes:5,minutes:60,answers});
  assert.ok(withStop.length);withStop.forEach(r=>{assertPath(realGraph,r,{start,end:start,budget:60,waypoints:[first.node]});assert.equal(r.stayMinutes,5);});
});

test('bridge accepts only the same-origin parent and nickname never changes preferences',()=>{
  let receive;const sent=[],opened=[];
  const parent={postMessage:(message,origin)=>sent.push({message,origin})};
  const win={parent,location:{origin:'https://island.example'},addEventListener:(_,fn)=>receive=fn,removeEventListener:()=>{}};
  const bridge=connectIslandBridge(win,{onOpen:value=>opened.push(value)});
  receive({source:parent,origin:'https://evil.example',data:{type:'hahaisland:route-open',nickname:'untrusted'}});
  receive({source:{},origin:'https://island.example',data:{type:'hahaisland:route-open',nickname:'untrusted'}});
  assert.equal(opened.length,0);
  receive({source:parent,origin:'https://island.example',data:{type:'hahaisland:route-open',nickname:'  岛民  ',answers:[1,1,1,1],mbti:'INTJ'}});
  assert.deepEqual(opened,[{nickname:'岛民'}]);
  bridge.emit('hahaisland:route-selected',{route:routeSummary({id:'r',length:100,minutes:2,groups:[50,60,70,80],coverage:.8}),answers});
  assert.equal(sent[0].origin,'https://island.example');assert.equal(sent[0].message.route.length,100);
  const standalone={location:{origin:'https://island.example'},addEventListener:()=>{},removeEventListener:()=>{}};standalone.parent=standalone;
  assert.equal(connectIslandBridge(standalone).embedded,false);
});

test('deployed route is synchronized with source, with local references and all photos present',async()=>{
  async function walk(relative=''){
    for(const item of await readdir(path.join(root,'route-demo',relative),{withFileTypes:true})){
      const rel=path.join(relative,item.name);
      if(item.isDirectory()){await walk(rel);continue;}
      assert.deepEqual(await readFile(path.join(root,'route-demo',rel)),await readFile(path.join(root,'dist/route',rel)),`source/deploy mismatch: ${rel}`);
    }
  }
  await walk();
  const meta=JSON.parse(await readFile(path.join(root,'dist/route/data/meta.json'),'utf8'));
  assert.equal(meta.routingVersion,ROUTING_VERSION);
  const html=await readFile(path.join(root,'dist/route/index.html'),'utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    if(/^(?:data:|https?:|#)/.test(url)||url==='./')continue;
    await stat(path.resolve(root,'dist/route',url));
  }
  const points=JSON.parse(await readFile(path.join(root,'dist/route/data/points.json'),'utf8'));
  for(const point of points.filter(p=>p.image))await stat(path.join(root,'dist/route/images',point.image));
  for(const item of await readdir(path.join(root,'dist/route'))){
    if(!item.endsWith('.mjs'))continue;
    const module=await readFile(path.join(root,'dist/route',item),'utf8');
    for(const [,url] of module.matchAll(/(?:from\s*|new Worker\()'([^']+\.mjs)'/g))await stat(path.resolve(root,'dist/route',url));
  }
});
