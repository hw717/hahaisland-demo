import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, updateCell, undoWorld, redoWorld, validateWorld, serializeWorld, parseWorld, worldForSharing, analyzeWorld, colors } from '../dist/game-core.mjs';
import { renderWorldSvg, mountBuilder } from '../dist/builder.mjs';

test('all 36 coordinates are unique, empty, serializable and independent', () => {
  const a = createWorld(), b = createWorld();
  assert.equal(validateWorld(a), true);
  assert.equal(new Set(a.cells.map(c => `${c.x},${c.y}`)).size, 36);
  a.cells[0].layers.push({});
  assert.equal(b.cells[0].layers.length, 0);
  assert.equal(validateWorld(a), false);
  assert.deepEqual(parseWorld(serializeWorld(b)), b);
});

test('immutable edits, history, undo, redo and editing after undo', () => {
  const blank = createWorld();
  const a = updateCell(blank, 2, 3, { type: 'building', module: 'prism', window: 2, color: colors[1] });
  const b = updateCell(a, 2, 3, { rotation: 90 });
  assert.equal(blank.cells[20].layers.length, 0);
  assert.equal(a.cells[20].layers[0].rotation, 0);
  assert.deepEqual(undoWorld(b).cells, a.cells);
  assert.deepEqual(redoWorld(undoWorld(b)).cells, b.cells);
  const c = updateCell(undoWorld(b), 0, 0, { type: 'gray' });
  assert.equal(c.future.length, 0);
  assert.equal(c.events.length, 2);
  assert.equal(validateWorld(c), true);
});

test('two floors require support, third floors and invalid edits fail', () => {
  const blank = createWorld();
  assert.throws(() => updateCell(blank, 0, 0, { type: 'building' }, { floor: 1 }), RangeError);
  let world = updateCell(blank, 0, 0, { type: 'building' });
  world = updateCell(world, 0, 0, { type: 'gray', window: 4 }, { floor: 1 });
  assert.equal(world.cells[0].layers.length, 2);
  assert.throws(() => updateCell(world, 0, 0, { type: 'building' }, { floor: 2 }), RangeError);
  assert.throws(() => updateCell(world, 6, 0, { type: 'building' }), RangeError);
  assert.throws(() => updateCell(world, 0, 0, { color: 'red' }), TypeError);
  world = updateCell(world, 0, 0, { type: 'landscape', trees: 3 });
  assert.equal(world.cells[0].layers.length, 1);
  assert.equal(world.cells[0].layers[0].window, 0);
  world = updateCell(world, 0, 0, { type: 'empty' });
  assert.equal(world.cells[0].layers.length, 0);
});

test('malformed input and unsupported floating floors never validate', () => {
  assert.equal(validateWorld(null), false);
  assert.equal(validateWorld({ ...createWorld(), cells: Array(36) }), false);
  assert.deepEqual(parseWorld('{bad'), createWorld());
  const world = updateCell(createWorld(), 0, 0, { type: 'building' });
  world.cells[0].layers.push({ ...world.cells[0].layers[0], type: 'landscape' });
  assert.equal(validateWorld(world), false);
  assert.throws(() => serializeWorld(world), TypeError);
});

test('analysis derives bounded indicators from actual modules and changes', () => {
  const blank = createWorld();
  let green = blank, built = blank;
  for (let x = 0; x < 6; x++) {
    green = updateCell(green, x, 0, { type: 'landscape', trees: 3, color: colors[5] });
    built = updateCell(built, x, 0, { type: 'building' });
  }
  const g = analyzeWorld(green), b = analyzeWorld(built);
  assert.equal(g.counts.occupied, 6);
  assert.equal(g.counts.trees, 18);
  assert.equal(g.counts.empty, 30);
  assert.equal(g.counts.edits, 6);
  assert.ok(g.dimensions[2] > b.dimensions[2]);
  assert.ok(g.dimensions.every(n => Number.isFinite(n) && n >= 0 && n <= 1));
  assert.match(g.type, /^[IE][NS][FT][JP]$/);
  assert.equal(analyzeWorld(blank).counts.occupied, 0);
});

test('renderer derives curved windows, tree counts, colors and upper floors from state', () => {
  for (const module of ['cube','cylinder','cone','prism','cross']) {
    const plain=updateCell(createWorld(),0,0,{module});
    const glass=updateCell(plain,0,0,{window:3,color:colors[2]});
    assert.notEqual(renderWorldSvg(plain),renderWorldSvg(glass));
    assert.match(renderWorldSvg(glass),/#b7dfe0/);
    const choices=Array.from({length:6},(_,window)=>renderWorldSvg(updateCell(plain,0,0,{window})));
    assert.equal(new Set(choices).size,6,`${module} has six visually distinct window treatments`);
  }
  let world=updateCell(createWorld(),1,1,{type:'landscape',trees:4});
  assert.equal((renderWorldSvg(world).match(/fill="#a0ceb1"/g)||[]).length,4);
  world=updateCell(world,2,2,{type:'building'});
  world=updateCell(world,2,2,{type:'gray'},{floor:1});
  assert.match(renderWorldSvg(world),/translate\(0 -59\)/);
  assert.ok(!renderWorldSvg(world,{label:'<script>'}).includes('<script>'));
});

test('builder editing, save, live participants, undo and finish share one actual world', () => {
  const listeners=new Map();
  const keys=new Map();
  const element=()=>({innerHTML:'',className:'',children:[],addEventListener:(name,fn)=>listeners.set(name,fn),querySelector:selector=>selector==='button'?{focus(){}}:null,replaceChildren(child){this.children=[child];},append(child){this.children.push(child);},remove(){}});
  const previous=globalThis.document;
  globalThis.document={createElement:element,addEventListener:(name,fn)=>keys.set(name,fn),removeEventListener(){}};
  const container=element(),changes=[],finished=[];
  let cleanup;
  try {
    cleanup=mountBuilder(container,{nickname:'测试玩家',mode:'coop',capacity:4,world:createWorld(),players:[{id:'self',nickname:'测试玩家'}],onChange:world=>changes.push(world),onFinish:world=>finished.push(world)});
    const root=container.children[0];
    const action=name=>listeners.get('click')({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:name},disabled:false}:null}});
    const cell=(x,y)=>listeners.get('click')({target:{closest:selector=>selector==='[data-cell]'?{dataset:{cell:`${x},${y}`}}:null}});
    action('finish');assert.equal(finished.length,0);
    action('place-building');cell(0,0);assert.equal(changes.length,1);
    action('building');action('module-cylinder');action('next');action('detail-3');
    const pending=root.innerHTML;
    cleanup.updatePlayers([{id:'self',nickname:'测试玩家'},{id:'peer',nickname:'伙伴',world:createWorld()}]);
    assert.equal(root.innerHTML,pending,'live participant updates preserve active editor');
    action('next');action('color-2');action('rotate-right');action('next');
    assert.deepEqual(cleanup.getWorld().cells[0].layers[0],{type:'building',module:'cylinder',window:3,trees:0,color:colors[2],rotation:90});
    action('undo');assert.equal(cleanup.getWorld().cells[0].layers[0].module,'cube');
    action('redo');assert.equal(cleanup.getWorld().cells[0].layers[0].module,'cylinder');
    action('finish');assert.equal(finished.length,1);
    assert.equal(finished[0].cells[0].layers[0].window,3);
    assert.match(root.innerHTML,/2 \/ 4 在线/);
    action('colors');action('next');
    assert.doesNotMatch(root.innerHTML,/class="b-editor"/,'valid no-op confirmation closes the editor');
    keys.get('keydown')({key:'Escape',target:{matches:()=>false,closest:()=>null}});
    const beforeDouble=changes.length;
    cell(1,1);cell(1,1);
    assert.match(root.innerHTML,/class="b-editor"/,'double-click timing survives SVG replacement');
    assert.equal(changes.length,beforeDouble,'selection double-click does not edit the world');
  } finally {cleanup?.();globalThis.document=previous;}
});

test('sharing preserves current work and clues below room request limit, without local history', () => {
  const world=updateCell(createWorld(),2,2,{type:'building',window:4});
  world.events=Array.from({length:1000},()=>({x:2,y:2,floor:0,fields:['type','module','window','trees','color','rotation']}));
  const shared=worldForSharing(world);
  assert.equal(validateWorld(shared),true);
  assert.equal(shared.history.length,0);
  assert.equal(world.history.length,1);
  assert.deepEqual(shared.cells,world.cells);
  assert.deepEqual(shared.events,world.events);
  assert.ok(Buffer.byteLength(JSON.stringify({world:shared}))<200*1024);
  shared.cells[14].layers[0].window=1;
  assert.equal(world.cells[14].layers[0].window,4);
});

test('peer observation identifies players by ID even when nicknames are equal', () => {
  const listeners=new Map();
  const element=()=>({innerHTML:'',className:'',children:[],addEventListener:(name,fn)=>listeners.set(name,fn),querySelector:selector=>selector==='button'?{focus(){}}:null,replaceChildren(child){this.children=[child];},append(child){this.children.push(child);},remove(){}});
  const previous=globalThis.document;
  globalThis.document={createElement:element,addEventListener(){},removeEventListener(){}};
  const container=element();let cleanup;
  try {
    const people=[{id:'self',nickname:'同名玩家',world:updateCell(createWorld(),0,0,{color:colors[5]})},{id:'different-person',nickname:'同名玩家',world:updateCell(createWorld(),0,0,{color:colors[2]})}];
    cleanup=mountBuilder(container,{playerId:'self',nickname:'同名玩家',mode:'coop',world:createWorld(),players:people});
    const root=container.children[0];
    assert.match(root.innerHTML,/1 位伙伴的空间/);
    listeners.get('click')({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'observe'},disabled:false}:null}});
    assert.match(root.children[0].innerHTML,/data-action="peer-1"/);
    assert.doesNotMatch(root.children[0].innerHTML,/data-action="peer-0"/);
    listeners.get('click')({target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'peer-1'},disabled:false}:null}});
    cleanup.updatePlayers(people);
    assert.ok(root.innerHTML.includes(colors[2]),'refresh continues observing selected peer by ID');
    assert.ok(!root.innerHTML.includes(colors[5]),'same-name self world is not substituted');
  } finally {cleanup?.();globalThis.document=previous;}
});
