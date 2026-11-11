import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createWorld,updateCell,parseWorld,validateWorld} from '../dist/game-core.mjs';

// Exercise the shipped UI functions without importing its browser bootstrap.
// No duplicate implementation: these declarations are read from space.mjs.
const source=await readFile(new URL('../dist/space.mjs',import.meta.url),'utf8');
const lines=source.split(/\r?\n/);
function declaration(name){
  const start=lines.findIndex(line=>line.startsWith(`function ${name}(`)||line.startsWith(`async function ${name}(`));
  assert.ok(start>=0,`${name} must exist in the shipped application`);
  if(lines[start].endsWith('}'))return lines[start];
  const finish=lines.findIndex((line,i)=>i>start&&line==='}');
  assert.ok(finish>start);return lines.slice(start,finish+1).join('\n');
}
function fn(name,context){return vm.runInContext(`(${declaration(name)})`,context);}
function draftHarness(credentials,storage=new Map()){
  const state={credentials,mode:credentials?'coop':'solo',hasScopedDraft:false,roomDraftHydrated:false,world:createWorld(),profile:{nickname:'old global profile',avatar:'female'}};
  const context=vm.createContext({state,createWorld,parseWorld,validateWorld,read:(key,fallback)=>storage.has(key)?storage.get(key):fallback,write:(key,value)=>{storage.set(key,structuredClone(value));return true;}});
  for(const name of ['roomDraftKey','loadDraft','saveDraft','hydrateRoomDraft'])context[name]=fn(name,context);
  return {state,storage,context};
}
const credsA={id:'room-1',playerId:'a',token:'a-session'},credsB={id:'room-1',playerId:'b',token:'b-session'};
const worldA=updateCell(createWorld(),0,0,{type:'building'});
const worldB=updateCell(updateCell(createWorld(),1,1,{type:'landscape'}),2,2,{type:'gray'});

test('two cooperative players and solo drafts use separate keys and reload their own undo history',()=>{
  const storage=new Map(),a=draftHarness(credsA,storage),b=draftHarness(credsB,storage),solo=draftHarness(null,storage);
  a.context.saveDraft(worldA);b.context.saveDraft(worldB);solo.context.saveDraft(createWorld());
  assert.equal(storage.size,3);
  assert.notEqual(a.context.roomDraftKey(credsA),a.context.roomDraftKey(credsB));
  assert.notEqual(a.context.roomDraftKey(credsA),a.context.roomDraftKey({...credsA,id:'room-2'}));
  assert.deepEqual(a.context.loadDraft(credsA).world,worldA);
  assert.deepEqual(b.context.loadDraft(credsB).world,worldB);
  assert.equal(a.context.loadDraft(credsA).world.history.length,1);
  assert.equal(b.context.loadDraft(credsB).world.history.length,2);
  assert.deepEqual(solo.context.loadDraft(null).world,createWorld());
});

test('absent cooperative draft never reads the shared solo draft and hydrates only its own server world once',()=>{
  const storage=new Map([['hahaisland.draft.v1',worldB]]),h=draftHarness(credsA,storage);
  const initial=h.context.loadDraft(credsA);
  assert.equal(initial.scopedValid,false);assert.deepEqual(initial.world,createWorld());
  const room={worlds:{a:worldA,b:worldB},players:[{id:'a',nickname:'Player A',avatar:'male'},{id:'b',nickname:'Player B',avatar:'female'}]};
  h.context.hydrateRoomDraft(room);
  assert.deepEqual(h.state.world,worldA);
  assert.equal(h.state.profile.nickname,'Player A');
  assert.deepEqual(storage.get(h.context.roomDraftKey(credsA)),worldA);
  const edited=updateCell(h.state.world,3,3,{type:'building'});h.context.saveDraft(edited);
  h.context.hydrateRoomDraft({...room,worlds:{a:createWorld(),b:worldB}});
  assert.equal(h.state.world,edited,'later polls must not replace local state or undo');
  assert.equal(h.state.world.history.length,2);
});

test('valid scoped drafts and edits made before the first server response retain their full undo state',()=>{
  const h=draftHarness(credsA);
  h.context.saveDraft(worldA);
  const reference=h.state.world;
  h.context.hydrateRoomDraft({worlds:{a:worldB},players:[{id:'a',nickname:'Player A',avatar:'male'}]});
  assert.equal(h.state.world,reference);
  assert.equal(h.state.world.history.length,1);
  const peerOnly=draftHarness(credsA);
  peerOnly.context.hydrateRoomDraft({worlds:{b:worldB},players:[]});
  assert.deepEqual(peerOnly.state.world,createWorld(),'missing own server world must not fall back to a peer');
});

async function pollScenario(previous,next){
  const calls={go:[],render:0};
  const context=vm.createContext({state:{credentials:credsA,view:'lobby',mode:'coop',room:previous},pollBusy:false,builderCleanup:null,api:async()=>({room:next}),go:view=>calls.go.push(view),render:()=>calls.render++,hydrateRoomDraft(){},participants:()=>[],sessionStorage:{removeItem(){}},toast(){},$:()=>null});
  await fn('pollRoom',context)();return calls;
}
test('returning from cooperative building keeps lobby exit reachable without breaking automatic start or recovery',async()=>{
  const player={id:'a',ready:true,online:true,finished:false},building={status:'building',version:2,players:[player]};
  assert.deepEqual((await pollScenario(building,structuredClone(building))).go,[]);
  assert.deepEqual((await pollScenario({...building,status:'waiting',version:1},building)).go,['build']);
  assert.deepEqual((await pollScenario(null,building)).go,['build']);
  assert.deepEqual((await pollScenario(null,{...building,players:[{...player,finished:true}]})).go,[]);
  assert.equal((await pollScenario({...building,players:[{...player,online:false}]},building)).render,1,'online changes render even when room version stays equal');
});

test('valid JSON nonarrays in walk storage are treated as empty records',()=>{
  const line=lines.find(line=>line.startsWith('const readArray='));
  for(const stored of [{},'corrupt',null,42]){
    const normalize=vm.runInNewContext(line.replace('const readArray=','globalThis.normalize=')+'\nnormalize',{read:()=>stored});
    assert.equal(normalize('walks').length,0);
  }
});

test('archive IDs work on LAN HTTP without secure-context crypto.randomUUID',()=>{
  const line=lines.find(line=>line.startsWith('const localId='));
  const makeId=vm.runInNewContext(line.replace('const localId=','globalThis.makeId=')+'\nmakeId',{crypto:undefined});
  const ids=Array.from({length:20},()=>makeId());
  assert.equal(new Set(ids).size,20);assert.ok(ids.every(id=>id.startsWith('space-')));
});
