import test from 'node:test';
import assert from 'node:assert/strict';
import {toEngineAnswers,toVisualAnswers,planningParams,taskInRange,validActiveWalk} from '../dist/mobile-core.mjs';
import {match,nearestNode} from '../route-demo/core.mjs';
test('Figma slider endpoints select the intended environmental axes',()=>{
 const env=[90,10,80,20,70,30,60,40];
 assert.deepEqual(toEngineAnswers([1,1,1,1]),[0,0,0,1]);
 assert.deepEqual(match(env,toEngineAnswers([1,1,1,1])).map(v=>v.score),[90,80,70,40]);
 assert.deepEqual(match(env,toEngineAnswers([0,0,0,0])).map(v=>v.score),[10,20,30,60]);
 assert.deepEqual(toVisualAnswers(toEngineAnswers([.1,.4,.8,.75])),[.09999999999999998,.4,.8,.75]);
 assert.throws(()=>toEngineAnswers([0,1,2,0]));
});
test('mobile planner preserves destination, ordered stops and time constraints',()=>{
 const graph={nodes:[[116.3,40],[116.301,40],[116.302,40]]};
 const state={start:graph.nodes[0],end:graph.nodes[2],mode:'destination',minutes:30,values:[1,0,0,1],stops:[{node:1}],stayMinutes:5};
 const params=planningParams(graph,nearestNode,state);
 assert.equal(params.start,0);assert.equal(params.end,2);assert.deepEqual(params.waypoints,[1]);assert.equal(params.stayMinutes,5);assert.deepEqual(params.answers,[0,1,1,1]);
 assert.throws(()=>planningParams(graph,nearestNode,{...state,end:null}));assert.throws(()=>planningParams(graph,nearestNode,{...state,minutes:0}));assert.throws(()=>planningParams(graph,nearestNode,{...state,start:[0,0]}));assert.throws(()=>planningParams(graph,nearestNode,{...state,stops:[{node:1},{node:1},{node:1}]}));
});
test('exploration keeps a genuine ten metre boundary',()=>{
 const point={lng:116.31827,lat:40.00244};const north=m=>[point.lng,point.lat+m/6371000*180/Math.PI];
 assert.equal(taskInRange(north(9.9),point),true);assert.equal(taskInRange(north(10.1),point),false);assert.equal(taskInRange(null,point),false);
});
test('only compatible and valid walks may resume after refresh',()=>{
 const graph={nodes:[[0,0],[1,1]],edges:[{a:0,b:1}]};const walk={context:{mode:'loop',minutes:30,revision:0,start:[0,0]},id:'walk',startedAt:1,sourceSha256:'current',route:{nodes:[0,1],edges:[0],length:100,minutes:2},answers:[0,1,1,1]};
 assert.equal(validActiveWalk(walk,graph,'current'),true);assert.equal(validActiveWalk(walk,graph,'updated'),false);assert.equal(validActiveWalk({...walk,route:{nodes:[0,99],edges:[0]}},graph,'current'),false);
});
