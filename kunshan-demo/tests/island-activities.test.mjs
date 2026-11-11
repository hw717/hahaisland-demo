import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {activityReady,advancePattern,isCircuitStep,isCircuitComplete,isBudgetValid} from '../dist/island-play-core.mjs';

test('plant and sorting activities require the correct answers for every item',()=>{
  assert.equal(activityReady('green:garden',{traits:{0:'针状叶',1:'扇形叶',2:'圆形叶'}}),false);
  assert.equal(activityReady('green:garden',{traits:{0:'扇形叶',1:'针状叶',2:'圆形叶'}}),true);
  assert.equal(activityReady('green:eye',{sorted:{0:'回收',1:'回收',2:'堆肥'}}),false);
  assert.equal(activityReady('green:eye',{sorted:{0:'回收',1:'回收',2:'堆肥',3:'堆肥'}}),true);
  assert.equal(activityReady('green:pier',{sorted:{0:'回收',1:'回收',2:'其他',3:'回收',4:'回收'}}),false);
  assert.equal(activityReady('green:pier',{sorted:{0:'回收',1:'回收',2:'其他',3:'回收',4:'其他'}}),true);
});
test('animal records need three distinct matches, a meaningful note, and all firefly rounds',()=>{
  assert.equal(activityReady('animals:star',{pairs:[0,0,0]}),false);
  assert.equal(activityReady('animals:star',{pairs:[2,0,1]}),true);
  assert.equal(activityReady('animals:home',{friend:'猫猫',story:'  '}),false);
  assert.equal(activityReady('animals:home',{friend:'猫猫',story:'窗边的光很温柔'}),true);
  assert.equal(activityReady('animals:pier',{round:2}),false);
  assert.equal(activityReady('animals:pier',{round:3}),true);
  assert.deepEqual(advancePattern([0,2,1],[0],1),{input:[],correct:false,complete:false});
  assert.deepEqual(advancePattern([0,2,1],[0,2],1),{input:[0,2,1],correct:true,complete:true});
});
test('future proposal and lab enforce content and a ten-unit space budget',()=>{
  const idea='让校园有一座连接教学楼和图书馆的空中花园';
  assert.equal(activityReady('scifi:portal',{idea,features:['自然','自然']}),false);
  assert.equal(activityReady('scifi:portal',{idea,features:['自然','安静']}),true);
  assert.equal(isBudgetValid([4,3,3]),true);
  for(const budget of [[6,6,6],[0,5,5],[4.1,2.9,3],[4,6],['4',3,3]]) assert.equal(isBudgetValid(budget),false);
  assert.equal(activityReady('scifi:lab',{budget:[4,3,3]}),false);
  assert.equal(activityReady('scifi:lab',{budget:[4,3,3],scheme:'庭院'}),true);
});
test('circuit paths cannot jump, cross obstacles, loop or omit energy stations',()=>{
  assert.equal(isCircuitStep([0],5),false);
  assert.equal(isCircuitStep([3],4),false);
  assert.equal(isCircuitStep([0,1],0),false);
  assert.equal(isCircuitComplete([0,4,8,12,13,14,15]),false);
  assert.equal(isCircuitComplete([0,1,2,6,7,11,15]),true);
  assert.equal(activityReady('scifi:pool',{path:[0,1,2,6,7,11,15]}),true);
});
const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const lines=source.split(/\r?\n/);
function fn(name,ctx){const start=lines.findIndex(line=>line.startsWith(`function ${name}(`));const end=lines.findIndex((line,index)=>index>start&&line==='}');assert.ok(start>=0&&end>start);return vm.runInContext(`(${lines.slice(start,end+1).join('\n')})`,ctx);}
const islands=JSON.parse(await readFile(new URL('../dist/maps/islands.json',import.meta.url),'utf8')).islands;
test('all five additional islands expose three activities; unlocks use actual saved progress',()=>{
  const state={saved:{completed:{}}};const ctx=vm.createContext({state});
  for(const name of ['islandActivities','activityStatus','completedActivityCount'])ctx[name]=fn(name,ctx);
  for(const id of ['healing','graffiti','green','animals','scifi'])assert.equal(ctx.islandActivities(islands.find(island=>island.id===id)).length,3);
  const green=islands.find(island=>island.id==='green');assert.equal(ctx.completedActivityCount(green),0);
  const animals=islands.find(island=>island.id==='animals'), pier=animals.hotspots.find(spot=>spot.id==='pier');
  assert.equal(ctx.activityStatus(animals,pier),'locked');state.saved.completed['animals:star']=true;
  assert.equal(ctx.activityStatus(animals,pier),'available');state.saved.completed['animals:pier']=true;
  assert.equal(ctx.activityStatus(animals,pier),'completed');
  assert.ok(ctx.islandActivities(islands.find(island=>island.id==='art')).every(spot=>spot.id!=='moon'));
});
test('completion validates game rules, grants a single stamp and preserves real POI progress',()=>{
  const island=islands.find(island=>island.id==='scifi'),spot=island.hotspots.find(item=>item.id==='portal');
  const saved={completed:{},activityRecords:{},visitedPois:{'odyssey:poi-02':true}};
  const state={saved,view:'home',game:{key:'scifi:portal',data:{idea:'短',features:[]}}};let writes=0;
  const ctx=vm.createContext({state,activityExtensions:new Map([['scifi:portal',{ready:data=>activityReady('scifi:portal',data)}]]),
    currentIsland:()=>island,currentSpot:()=>spot,persistSavedState:()=>{writes++;},
    clearPlayTimer(){},hydrateCompletedSpots(){},buildWorldNodes(){},buildThemeDock(){},refreshExplorationProgress(){},setPlayProgress(){},setPlayFooter(){},showToast(){},
    document:{body:{classList:{contains:()=>true}},dispatchEvent(){}},CustomEvent:class{constructor(type){this.type=type;}},
    els:{playModeBadge:{},playGuideText:{},playWorkspace:{},startActivity:{}}});
  const finish=fn('finishGameplay',ctx);finish('unfinished');assert.equal(writes,0);assert.equal(saved.completed['scifi:portal'],undefined);
  state.game.data={idea:'让每栋教学楼都有一座可以看见夕阳的空中花园',features:['自然','开放']};
  finish('我的未来提案');finish('重复点击');assert.equal(writes,1);assert.equal(saved.completed['scifi:portal'],true);
  assert.equal(saved.activityRecords['scifi:portal'].summary,'我的未来提案');assert.equal(saved.visitedPois['odyssey:poi-02'],true);
});
