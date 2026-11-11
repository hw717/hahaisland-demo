import { createServer as createHttpServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';

const DEFAULT_STATIC_ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const MAX_BODY_BYTES = 200 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

function cleanText(value, name, limit) {
  if (typeof value !== 'string') throw new HttpError(400, `${name}必须是文字`);
  const text = value.trim();
  if (!text || [...text].length > limit || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new HttpError(400, `${name}需为 1–${limit} 个字符，不能包含控制字符`);
  }
  return text;
}

function avatarOf(value) {
  if (!['male', 'female'].includes(value)) throw new HttpError(400, '请选择有效角色');
  return value;
}

function safeJson(value, depth = 0, budget = { count: 0 }) {
  if (++budget.count > 40000 || depth > 32) throw new HttpError(400, '世界数据过于复杂');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new HttpError(400, '世界数据包含无效数值');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 10000) throw new HttpError(400, '世界数据中的文字过长');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 20000) throw new HttpError(400, '世界数据中的列表过长');
    for (const item of value) safeJson(item, depth + 1, budget);
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new HttpError(400, '世界数据必须使用普通 JSON 数据');
  }
  const keys = Object.keys(value);
  if (keys.length > 1000) throw new HttpError(400, '世界数据字段过多');
  for (const key of keys) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || key.length > 200) {
      throw new HttpError(400, '世界数据包含不允许的字段');
    }
    safeJson(value[key], depth + 1, budget);
  }
}

async function bodyOf(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, '请使用 application/json 提交数据');
  }
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    req.resume();
    throw new HttpError(413, '提交数据不能超过 200 KB');
  }
  const chunks = [];
  let bytes = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) tooLarge = true;
    if (!tooLarge) chunks.push(chunk);
  }
  if (tooLarge) throw new HttpError(413, '提交数据不能超过 200 KB');
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON 数据格式不正确'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, '请求内容必须是 JSON 对象');
  }
  return data;
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return; // CLI and non-browser LAN clients may omit Origin.
  let parsed;
  try { parsed = new URL(origin); }
  catch { throw new HttpError(403, '请求来源无效，请从本服务页面操作'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== req.headers.host) {
    throw new HttpError(403, '不接受其他网站提交的房间操作');
  }
}

function requestPath(req) {
  const raw = (req.url || '/').split('?')[0];
  let decoded;
  try { decoded = decodeURIComponent(raw); }
  catch { throw new HttpError(400, '网址编码不正确'); }
  if (!decoded.startsWith('/') || /[\\:\u0000]/u.test(decoded)
      || decoded.split('/').some(segment => segment.startsWith('.'))) {
    throw new HttpError(403, '不允许访问该路径');
  }
  return decoded;
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function createServer({
  staticRoot = DEFAULT_STATIC_ROOT, roomTtlMs = 2 * 60 * 60 * 1000,
  playerOnlineMs = 20000, now = () => Date.now(),
} = {}) {
  const root = path.resolve(staticRoot);
  const rooms = new Map();

  function cleanup() {
    const threshold = now() - roomTtlMs;
    for (const [id, room] of rooms) if (room.updatedAt <= threshold) rooms.delete(id);
  }

  function summary(room) {
    return {
      id: room.id, name: room.name, capacity: room.capacity,
      count: room.players.length, theme: room.theme, status: room.status, hostId: room.hostId,
    };
  }

  function snapshot(room) {
    const timestamp = now();
    return {
      ...summary(room), version: room.version, world: room.world, worlds: room.worlds,
      players: room.players.map(({ id, nickname, avatar, ready, finished, lastSeenAt }) => ({
        id, nickname, avatar, ready, finished, host: id === room.hostId,
        online: timestamp - lastSeenAt < playerOnlineMs,
      })),
    };
  }

  function touch(room) { room.updatedAt = now(); room.version++; }

  function authenticate(req, room) {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '');
    const player = match && room.players.find(item => item.token === match[1]);
    if (!player) throw new HttpError(401, '房间身份已失效，请重新加入');
    player.lastSeenAt = now();
    return player;
  }

  function addPlayer(room, body, host = false) {
    const player = {
      id: randomUUID(), token: randomBytes(32).toString('base64url'),
      nickname: cleanText(body.nickname, '昵称', 24), avatar: avatarOf(body.avatar), ready: host, finished: false,
      lastSeenAt: now(),
    };
    room.players.push(player);
    if (host) room.hostId = player.id;
    return player;
  }

  async function api(req, res, pathname) {
    cleanup();
    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') checkOrigin(req);

    if (pathname === '/api/rooms') {
      if (method === 'GET') return json(res, 200, { rooms: [...rooms.values()].map(summary) });
      if (method !== 'POST') throw new HttpError(405, '该接口不支持此操作');
      if (rooms.size >= 200) throw new HttpError(503, '当前房间较多，请稍后创建');
      const body = await bodyOf(req);
      if (rooms.size >= 200) throw new HttpError(503, '当前房间较多，请稍后创建');
      if (![4, 8].includes(body.capacity)) throw new HttpError(400, '房间人数请选择 4 人或 8 人');
      const room = {
        id: randomBytes(6).toString('hex'), name: cleanText(body.name, '房间名', 40),
        capacity: body.capacity, theme: cleanText(body.theme, '岛屿主题', 40),
        status: 'waiting', players: [], world: { cells: [] }, worlds: {}, version: 1, updatedAt: now(),
      };
      const player = addPlayer(room, body, true);
      rooms.set(room.id, room);
      return json(res, 201, { room: snapshot(room), token: player.token, playerId: player.id });
    }

    const route = /^\/api\/rooms\/([a-f0-9]{12})(?:\/(join|ready|start|world|leave|finish))?$/.exec(pathname);
    if (!route) throw new HttpError(404, '没有找到该接口');
    const room = rooms.get(route[1]);
    if (!room) throw new HttpError(404, '房间不存在或已过期');
    const action = route[2];
    if (!action && method === 'GET') {
      // Only a valid member polling with its token keeps a room alive.
      if (req.headers.authorization) {
        authenticate(req, room);
        room.updatedAt = now();
      }
      return json(res, 200, { room: snapshot(room) });
    }
    if (action === 'join' && method === 'POST') {
      if (room.status !== 'waiting') throw new HttpError(409, '房间已开始，请选择其他房间');
      if (room.players.length >= room.capacity) throw new HttpError(409, '房间已满');
      const body = await bodyOf(req);
      // Re-check after reading the body: other requests can join/start/leave meanwhile.
      if (rooms.get(room.id) !== room) throw new HttpError(404, '房间不存在或已过期');
      if (room.status !== 'waiting') throw new HttpError(409, '房间已开始，请选择其他房间');
      if (room.players.length >= room.capacity) throw new HttpError(409, '房间已满');
      const player = addPlayer(room, body);
      touch(room);
      return json(res, 200, { room: snapshot(room), token: player.token, playerId: player.id });
    }
    if (!action || !((action === 'world' && method === 'PATCH') || (action !== 'world' && method === 'POST'))) {
      throw new HttpError(405, '该接口不支持此操作');
    }
    const player = authenticate(req, room);
    if (action === 'ready') {
      const body = await bodyOf(req);
      authenticate(req, room);
      if (typeof body.ready !== 'boolean') throw new HttpError(400, '准备状态必须是布尔值');
      if (room.status !== 'waiting') throw new HttpError(409, '房间已开始');
      player.ready = body.ready;
      touch(room);
      return json(res, 200, { room: snapshot(room) });
    }
    if (action === 'start') {
      if (player.id !== room.hostId) throw new HttpError(403, '只有房主可以开始共创');
      if (room.status !== 'waiting') throw new HttpError(409, '房间已开始');
      if (room.players.some(item => now() - item.lastSeenAt >= playerOnlineMs)) {
        throw new HttpError(409, '仍有玩家离线，请等待重新连接后再开始');
      }
      if (!room.players.every(item => item.ready)) throw new HttpError(409, '请等待所有玩家准备');
      room.status = 'building';
      touch(room);
      return json(res, 200, { room: snapshot(room) });
    }
    if (action === 'world') {
      const body = await bodyOf(req);
      authenticate(req, room);
      if (!body.world || typeof body.world !== 'object' || Array.isArray(body.world)) {
        throw new HttpError(400, '世界数据必须是 JSON 对象');
      }
      safeJson(body.world);
      room.world = body.world;
      room.worlds[player.id] = body.world;
      touch(room);
      return json(res, 200, { room: snapshot(room) });
    }
    if (action === 'finish') {
      if (room.status === 'waiting') throw new HttpError(409, '请先开始共创');
      const hasBody = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'];
      const body = hasBody ? await bodyOf(req) : {};
      authenticate(req, room);
      if (body.world !== undefined) {
        if (!body.world || typeof body.world !== 'object' || Array.isArray(body.world)) {
          throw new HttpError(400, '世界数据必须是 JSON 对象');
        }
        safeJson(body.world);
        room.world = body.world;
        room.worlds[player.id] = body.world;
      }
      player.finished = true;
      if (room.players.every(item => item.finished)) room.status = 'finished';
      touch(room);
      return json(res, 200, { room: snapshot(room) });
    }
    if (action === 'leave') {
      room.players = room.players.filter(item => item !== player);
      delete room.worlds[player.id];
      if (!room.players.length) {
        rooms.delete(room.id);
        return json(res, 200, { left: true, room: null });
      }
      if (player.id === room.hostId) {
        room.hostId = room.players[0].id;
        room.players[0].ready = true;
      }
      if (room.status === 'building' && room.players.every(item => item.finished)) room.status = 'finished';
      touch(room);
      return json(res, 200, { left: true, room: snapshot(room) });
    }
    throw new HttpError(404, '没有找到该接口');
  }

  async function serveStatic(req, res, pathname) {
    if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, '静态文件只支持读取');
    let filename = path.resolve(root, `.${pathname}`);
    if (!within(root, filename)) throw new HttpError(403, '不允许访问该路径');
    try {
      const info = await stat(filename);
      if (info.isDirectory()) filename = path.join(filename, 'index.html');
      const [actualRoot, actualFile] = await Promise.all([realpath(root), realpath(filename)]);
      if (!within(actualRoot, actualFile)) throw new HttpError(403, '不允许访问该路径');
      const file = await stat(actualFile);
      if (!file.isFile()) throw new HttpError(404, '文件不存在');
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(actualFile).toLowerCase()] || 'application/octet-stream',
        'Content-Length': file.size, 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(actualFile);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (['ENOENT', 'ENOTDIR', 'EINVAL'].includes(error.code)) throw new HttpError(404, '文件不存在');
      throw error;
    }
  }

  const server = createHttpServer((req, res) => {
    (async () => {
      const pathname = requestPath(req);
      if (pathname === '/api' || pathname.startsWith('/api/')) await api(req, res, pathname);
      else await serveStatic(req, res, pathname);
    })().catch(error => {
      if (res.headersSent) { res.destroy(); return; }
      json(res, error instanceof HttpError ? error.status : 500, {
        error: error instanceof HttpError ? error.message : '服务暂时出现问题，请稍后重试',
      });
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  const timer = setInterval(cleanup, Math.max(25, Math.min(roomTtlMs, 60000)));
  timer.unref();
  server.on('close', () => clearInterval(timer));
  return server;
}

export async function startServer({ port = 4173, host = '127.0.0.1', ...options } = {}) {
  const server = createServer(options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolve(); });
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const port = Number(option('--port') ?? 4173);
  const host = option('--host') ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('端口应为 0–65535 的整数');
    process.exitCode = 1;
  } else {
    try {
      const server = await startServer({ port, host });
      console.log(`HahaIsland 已启动：http://${host}:${server.address().port}`);
      if (host === '0.0.0.0') console.log('同一局域网的朋友可通过本机局域网 IP 和端口加入。');
    } catch (error) { console.error(`启动失败：${error.message}`); process.exitCode = 1; }
  }
}
