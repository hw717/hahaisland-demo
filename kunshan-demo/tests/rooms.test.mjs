import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { createServer } from '../server.mjs';

async function fixture(t, options = {}) {
  const server = createServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(endpoint, { method = 'GET', body, token, headers = {}, rawBody } = {}) {
    const res = await fetch(`${base}${endpoint}`, {
      method, headers: {
        ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers,
      }, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  async function create(capacity = 4) {
    const result = await call('/api/rooms', { method: 'POST', body: { name: '共创小岛', nickname: '房主', avatar: 'female', capacity, theme: 'forest' } });
    assert.equal(result.status, 201);
    return result.data;
  }
  return { server, base, call, create };
}

test('真实房间创建、八人容量及公开响应不泄漏令牌', async t => {
  const { call, create } = await fixture(t);
  const host = await create(8);
  const roomId = host.room.id;
  assert.equal(host.room.players.length, 1);
  assert.equal(host.room.players[0].host, true);
  assert.equal(host.room.players[0].ready, true);
  assert.ok(host.token);
  for (let index = 1; index < 8; index++) {
    const result = await call(`/api/rooms/${roomId}/join`, { method: 'POST', body: { nickname: `玩家 ${index}`, avatar: 'male' } });
    assert.equal(result.status, 200);
    assert.equal(result.data.room.count, index + 1);
  }
  const full = await call(`/api/rooms/${roomId}/join`, { method: 'POST', body: { nickname: '第九人', avatar: 'male' } });
  assert.equal(full.status, 409);
  const list = await call('/api/rooms');
  assert.equal(list.data.rooms[0].count, 8);
  assert.equal(list.data.rooms[0].hostId, host.playerId);
  const state = await call(`/api/rooms/${roomId}`);
  assert.equal(state.data.room.players.length, 8);
  assert.equal(JSON.stringify(state.data).includes(host.token), false);
  assert.equal(JSON.stringify(state.data).includes('"token"'), false);
});

test('只有房主可开局，等待全部准备，并禁止已开局房间再加入', async t => {
  const { call, create } = await fixture(t);
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}`;
  const guest = (await call(`${endpoint}/join`, { method: 'POST', body: { nickname: '访客', avatar: 'male' } })).data;
  assert.equal((await call(`${endpoint}/start`, { method: 'POST', token: guest.token })).status, 403);
  assert.equal((await call(`${endpoint}/start`, { method: 'POST', token: host.token })).status, 409);
  assert.equal((await call(`${endpoint}/ready`, { method: 'POST', token: guest.token, body: { ready: true } })).status, 200);
  const started = await call(`${endpoint}/start`, { method: 'POST', token: host.token });
  assert.equal(started.status, 200);
  assert.equal(started.data.room.status, 'building');
  assert.equal((await call(`${endpoint}/join`, { method: 'POST', body: { nickname: '晚到', avatar: 'male' } })).status, 409);
});

test('世界写入需要成员身份，数据可往返且拒绝危险及非有限数据', async t => {
  const { call, create } = await fixture(t);
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}`;
  const body = { world: { cells: [{ x: 1, y: 2, type: 'tree', color: '#aacccc' }], seed: 42 } };
  assert.equal((await call(`${endpoint}/world`, { method: 'PATCH', body })).status, 401);
  assert.equal((await call(`${endpoint}/world`, { method: 'PATCH', body, token: 'x'.repeat(43) })).status, 401);
  const saved = await call(`${endpoint}/world`, { method: 'PATCH', body, token: host.token });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data.room.world, body.world);
  assert.deepEqual(saved.data.room.worlds[host.playerId], body.world);
  assert.equal(saved.data.room.version, 2);
  for (const rawBody of ['{"world":{"__proto__":{"polluted":true}}}', '{"world":{"nested":{"constructor":{}}}}', '{"world":{"x":1e999}}']) {
    assert.equal((await call(`${endpoint}/world`, { method: 'PATCH', token: host.token, rawBody })).status, 400);
  }
  const tooLarge = { world: { value: 'x'.repeat(205000) } };
  assert.equal((await call(`${endpoint}/world`, { method: 'PATCH', token: host.token, body: tooLarge })).status, 413);
  assert.deepEqual((await call(endpoint)).data.room.world, body.world);
  assert.equal({}.polluted, undefined);
});

test('成员世界分别保存，全部完成后房间结算，离开移除本人世界', async t => {
  const { call, create } = await fixture(t);
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}`;
  const guest = (await call(`${endpoint}/join`, { method: 'POST', body: { nickname: '邻居', avatar: 'male' } })).data;
  assert.equal((await call(`${endpoint}/finish`, { method: 'POST', token: host.token })).status, 409);
  await call(`${endpoint}/ready`, { method: 'POST', token: guest.token, body: { ready: true } });
  await call(`${endpoint}/start`, { method: 'POST', token: host.token });
  const hostWorld = { cells: [{ x: 1, y: 1, type: 'tree' }] };
  const guestWorld = { cells: [{ x: 2, y: 2, type: 'home' }] };
  await call(`${endpoint}/world`, { method: 'PATCH', token: host.token, body: { world: hostWorld } });
  await call(`${endpoint}/world`, { method: 'PATCH', token: guest.token, body: { world: guestWorld } });
  const worlds = (await call(endpoint)).data.room.worlds;
  assert.deepEqual(worlds, { [host.playerId]: hostWorld, [guest.playerId]: guestWorld });
  const firstDone = await call(`${endpoint}/finish`, { method: 'POST', token: host.token });
  assert.equal(firstDone.data.room.status, 'building');
  assert.equal(firstDone.data.room.players.find(p => p.id === host.playerId).finished, true);
  const lastDone = await call(`${endpoint}/finish`, { method: 'POST', token: guest.token, body: { world: { ...guestWorld, updated: true } } });
  assert.equal(lastDone.data.room.status, 'finished');
  assert.equal(lastDone.data.room.worlds[guest.playerId].updated, true);
  const left = await call(`${endpoint}/leave`, { method: 'POST', token: host.token });
  assert.equal(left.data.room.worlds[host.playerId], undefined);
  assert.equal(left.data.room.worlds[guest.playerId].updated, true);
});

test('并行加入不会突破房间人数上限', async t => {
  const { call, create } = await fixture(t);
  const host = await create(4);
  const results = await Promise.all(Array.from({ length: 9 }, (_, index) => call(`/api/rooms/${host.room.id}/join`, {
    method: 'POST', body: { nickname: `并发玩家 ${index}`, avatar: 'female' },
  })));
  assert.equal(results.filter(result => result.status === 200).length, 3);
  assert.equal(results.filter(result => result.status === 409).length, 6);
  assert.equal((await call(`/api/rooms/${host.room.id}`)).data.room.count, 4);
});

test('房主离开后转移权限，离开令牌失效，最后玩家离开删除房间', async t => {
  const { call, create } = await fixture(t);
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}`;
  const guest = (await call(`${endpoint}/join`, { method: 'POST', body: { nickname: '下一位房主', avatar: 'male' } })).data;
  const left = await call(`${endpoint}/leave`, { method: 'POST', token: host.token });
  assert.equal(left.status, 200);
  assert.equal(left.data.room.hostId, guest.playerId);
  assert.equal(left.data.room.players[0].host, true);
  assert.equal(left.data.room.players[0].ready, true);
  assert.equal((await call(`${endpoint}/world`, { method: 'PATCH', token: host.token, body: { world: {} } })).status, 401);
  assert.equal((await call(`${endpoint}/leave`, { method: 'POST', token: guest.token })).data.room, null);
  assert.equal((await call(endpoint)).status, 404);
  assert.deepEqual((await call('/api/rooms')).data.rooms, []);
});

test('限制身份输入并拒绝跨站浏览器写入，无通配 CORS', async t => {
  const { call, create, base } = await fixture(t);
  const result = await call('/api/rooms', { method: 'POST', headers: { Origin: 'https://unrelated.example' }, body: {} });
  assert.equal(result.status, 403);
  assert.equal(result.headers.get('access-control-allow-origin'), null);
  const same = await call('/api/rooms', { method: 'POST', headers: { Origin: base }, body: { name: '小岛', nickname: '房主', avatar: 'male', capacity: 4, theme: 'forest' } });
  assert.equal(same.status, 201);
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}/join`;
  assert.equal((await call(endpoint, { method: 'POST', body: { nickname: 'a'.repeat(25), avatar: 'male' } })).status, 400);
  assert.equal((await call(endpoint, { method: 'POST', body: { nickname: '访客', avatar: 'unknown' } })).status, 400);
  assert.equal((await call('/api/rooms', { method: 'POST', body: { name: '小岛', nickname: '房主', avatar: 'male', capacity: 12, theme: 'forest' } })).status, 400);
});

test('静态文件正常提供、HEAD 无正文，拒绝原始及编码路径穿越和隐藏文件', async t => {
  const { base, server } = await fixture(t);
  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  await index.text();
  const head = await fetch(`${base}/`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const app = await fetch(`${base}/app.js`);
  assert.equal(app.status, 200);
  assert.match(app.headers.get('content-type'), /javascript/);
  await app.text();
  const module = await fetch(`${base}/game-core.mjs`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /javascript/);
  await module.text();
  const map = await fetch(`${base}/maps/islands.json`);
  assert.equal(map.status, 200);
  assert.match(map.headers.get('content-type'), /application\/json/);
  assert.ok(await map.json());
  for (const target of ['/../server.mjs', '/%2e%2e/server.mjs', '/.git/config', '/%2eopenai/config.json', '/foo%5c..%5cserver.mjs', '/app.js%3A%3A$DATA', '/%00', '/%ZZ']) {
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port: server.address().port, path: target }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
      req.end();
    });
    assert.ok([400, 403].includes(status), `${target}: ${status}`);
  }
});

test('无活动的房间到期清理', async t => {
  const { create, call } = await fixture(t, { roomTtlMs: 30 });
  const host = await create();
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.deepEqual((await call('/api/rooms')).data.rooms, []);
  assert.equal((await call(`/api/rooms/${host.room.id}`)).status, 404);
});

test('成员心跳独立，离线保留位置及令牌，重新连接后才能一起开局', async t => {
  let timestamp = 1000;
  const { create, call } = await fixture(t, { now: () => timestamp, playerOnlineMs: 20000 });
  const host = await create();
  const endpoint = `/api/rooms/${host.room.id}`;
  const guest = (await call(`${endpoint}/join`, { method: 'POST', body: { nickname: '临时离开', avatar: 'male' } })).data;
  await call(`${endpoint}/ready`, { method: 'POST', token: guest.token, body: { ready: true } });
  assert.equal(guest.room.players.every(player => player.online), true);
  timestamp += 20001;
  const heartbeat = await call(endpoint, { token: host.token });
  assert.equal(heartbeat.data.room.players.find(player => player.id === host.playerId).online, true);
  assert.equal(heartbeat.data.room.players.find(player => player.id === guest.playerId).online, false);
  assert.equal(heartbeat.data.room.count, 2);
  assert.equal(JSON.stringify(heartbeat.data).includes('lastSeenAt'), false);
  assert.equal(JSON.stringify(heartbeat.data).includes(guest.token), false);
  assert.equal((await call(`${endpoint}/start`, { method: 'POST', token: host.token })).status, 409);
  const reconnected = await call(endpoint, { token: guest.token });
  assert.equal(reconnected.data.room.players.find(player => player.id === guest.playerId).online, true);
  assert.equal(reconnected.data.room.players.find(player => player.id === guest.playerId).ready, true);
  assert.equal((await call(`${endpoint}/start`, { method: 'POST', token: host.token })).status, 200);
  timestamp += 20001;
  const mutation = await call(`${endpoint}/world`, { method: 'PATCH', token: guest.token, body: { world: { cells: [] } } });
  assert.equal(mutation.data.room.players.find(player => player.id === guest.playerId).online, true);
  assert.equal(mutation.data.room.players.find(player => player.id === host.playerId).online, false);
});
