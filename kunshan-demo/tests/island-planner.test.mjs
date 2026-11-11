import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createIslandRoutePlanner} from '../dist/route-host.mjs';

const gameSource = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const lines = gameSource.split(/\r?\n/);
function gameFunction(name, context) {
  const start = lines.findIndex(line => line.startsWith(`function ${name}(`));
  assert.ok(start >= 0, `missing game function ${name}`);
  const end = lines.findIndex((line, index) => index > start && line === '}');
  assert.ok(end > start);
  return vm.runInContext(`(${lines.slice(start, end + 1).join('\n')})`, context);
}

test('the original coordinate-based ten-metre task boundary remains effective', () => {
  const state = {location: {lat: 40.00244, lng: 116.31827}};
  const context = vm.createContext({state, INTERACTION_RADIUS_METERS: 10});
  for (const name of ['distanceMeters', 'distanceToPoint', 'pointIsInRange']) context[name] = gameFunction(name, context);
  const origin = state.location;
  const north = metres => ({lat: origin.lat + metres / 6371000 * 180 / Math.PI, lng: origin.lng});
  assert.equal(context.pointIsInRange(north(9.9)), true);
  assert.equal(context.pointIsInRange(north(10.1)), false);
  assert.equal(context.pointIsInRange(state.location), true);
  state.location = null;
  assert.equal(context.pointIsInRange(north(0)), false);
});

test('opening personalized routing keeps the island, selected point and saved task progress', () => {
  const location = {lat: 40.00244, lng: 116.31827};
  const saved = {visitedPois: {'odyssey:poi-02': true}};
  const state = {data: {}, location, saved, islandId: 'odyssey', selectedPoiId: 'poi-02',
    movementKeys: new Set(['d']), joystick: {active: true}, game: {key: 'utility:profile'}};
  const events = [];
  const context = vm.createContext({state,
    closeGameplay: () => {state.game = null;}, closePanel() {},
    stopJoystick: () => {state.joystick.active = false;},
    CustomEvent: class {constructor(type) {this.type = type;}},
    document: {dispatchEvent: event => events.push(event.type)}});
  gameFunction('openPersonalizedRoute', context)();
  assert.equal(state.location, location);
  assert.equal(state.saved, saved);
  assert.equal(state.saved.visitedPois['odyssey:poi-02'], true);
  assert.equal(state.islandId, 'odyssey');
  assert.equal(state.selectedPoiId, 'poi-02');
  assert.equal(state.movementKeys.size, 0);
  assert.equal(state.joystick.active, false);
  assert.deepEqual(events, ['hahaisland:open-planner']);
});

test('map movement pauses under routing, My Island and tasks, then resumes on the map', () => {
  const state = {view: 'map', navigationOpen: true, myIslandOpen: false, movementKeys: new Set(['d']),
    joystick: {active: false, lastTime: 1000}};
  const moved = [];
  const context = vm.createContext({state, currentMovementSpeed: () => 6,
    moveVirtualLocation: (...args) => moved.push(args), window: {requestAnimationFrame: () => 1}});
  const tick = gameFunction('movementLoop', context);
  tick(1016);
  assert.equal(moved.length, 0);
  state.navigationOpen = false;
  state.myIslandOpen = true;
  tick(1032);
  assert.equal(moved.length, 0);
  state.myIslandOpen = false;
  state.game = {pointTask: true};
  tick(1048);
  assert.equal(moved.length, 0);
  state.game = null;
  tick(1064);
  assert.equal(moved.length, 1);
  assert.ok(moved[0][0] > 0);
  assert.equal(moved[0][1], -0);
});

function hostHarness() {
  const made = [], notifications = [], storage = new Map();
  class Node {
    constructor(tag) {this.tag = tag; this.children = []; this.events = new Map(); this.queries = new Map(); this.attributes = new Map(); this.isConnected = true;}
    append(node) {this.children.push(node);}
    querySelector(selector) {if (!this.queries.has(selector)) this.queries.set(selector, new Node(selector)); return this.queries.get(selector);}
    setAttribute(key, value) {this.attributes.set(key, value);}
    addEventListener(name, fn) {this.events.set(name, fn);}
    showModal() {this.open = true;}
    close() {this.open = false; this.events.get('close')?.();}
    focus() {this.focused = true;}
    getClientRects() {return [{}];}
  }
  const button = new Node('button');
  const doc = {body: new Node('body'), activeElement: button, events: new Map(),
    createElement(tag) {const node = new Node(tag); if (tag === 'iframe') node.contentWindow = {postMessage() {}}; made.push(node); return node;},
    querySelector: () => button, querySelectorAll: () => [button],
    addEventListener(name, fn) {this.events.set(name, fn);},
    dispatchEvent(event) {notifications.push(event.detail.open);}};
  const win = {location: {origin: 'http://127.0.0.1:4173'}, events: new Map(),
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    addEventListener(name, fn) {this.events.set(name, fn);}};
  const planner = createIslandRoutePlanner({doc, win});
  const message = (data, extra = {}) => win.events.get('message')({data, origin: win.location.origin,
    source: made.find(node => node.tag === 'iframe')?.contentWindow, ...extra});
  return {planner, made, notifications, storage, button, message};
}

test('planner switches retain the iframe and game storage, and foreign messages cannot close it', () => {
  const h = hostHarness();
  h.storage.set('hahaisland-blueprint-demo-v1', '{"visitedPois":{"odyssey:poi-02":true}}');
  h.planner.open();
  const firstFrame = h.made.find(node => node.tag === 'iframe');
  assert.equal(h.planner.dialog.open, true);
  h.message({type: 'hahaisland:route-close'}, {origin: 'https://other.example'});
  h.message({type: 'hahaisland:route-close'}, {source: {}});
  assert.equal(h.planner.dialog.open, true);
  h.message({type: 'hahaisland:route-close'});
  assert.equal(h.planner.dialog.open, false);
  assert.equal(h.button.focused, true);
  h.planner.open();
  assert.equal(h.made.filter(node => node.tag === 'iframe').length, 1);
  assert.equal(h.made.find(node => node.tag === 'iframe'), firstFrame);
  assert.deepEqual(h.notifications, [true, false, true]);
  assert.equal(h.storage.get('hahaisland-blueprint-demo-v1'), '{"visitedPois":{"odyssey:poi-02":true}}');
});

test('valid planner records are saved without granting task stamps, malformed messages are ignored', () => {
  const h = hostHarness(); h.planner.open();
  const route = {id: 'walk-1', length: 500, minutes: 8, coverage: .8, groups: [70, 60, null, 50]};
  const answers = [.2, .7, .4, .5];
  const selection = {type: 'hahaisland:route-selected', route, answers};
  h.message({...selection, route: {...route, minutes: Infinity}});
  h.message({...selection, answers: [0, 0, 0, 2]});
  assert.equal(h.storage.size, 0);
  h.message(selection);
  assert.deepEqual(JSON.parse(h.storage.get('hahaisland.lastRoute.v1')), {route, answers});
  h.storage.set('hahaisland.walks.v1', '{}');
  const finished = {type: 'hahaisland:walk-finished', route, answers, walkId: 'one', visit: 'partial', elapsedSeconds: 20};
  h.message(finished); h.message(finished);
  const walks = JSON.parse(h.storage.get('hahaisland.walks.v1'));
  assert.equal(walks.length, 1);
  assert.equal(walks[0].visit, 'partial');
  assert.equal(h.storage.has('hahaisland-blueprint-demo-v1'), false);
});
