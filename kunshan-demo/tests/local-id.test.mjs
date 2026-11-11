import test from 'node:test';
import assert from 'node:assert/strict';
import {newLocalId} from '../route-demo/id.mjs';

test('local record IDs work on HTTPS, LAN HTTP and without Web Crypto', () => {
  assert.equal(newLocalId({randomUUID: () => 'secure-id'}), 'secure-id');
  const id = newLocalId({getRandomValues: bytes => {bytes.fill(255); return bytes;}});
  assert.equal(id, 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  const first = newLocalId(null), second = newLocalId(null);
  assert.match(first, /^local-/);
  assert.notEqual(first, second);
});
