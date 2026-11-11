import { readFile, stat, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
let checked = 0;
async function check(reference, from) {
  if (!reference || /^(?:https?:|data:|#|mailto:|javascript:)/i.test(reference)) return;
  const filename = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!filename) return;
  let resolved = path.resolve(path.dirname(from), filename);
  if (resolved !== path.resolve(root) && !resolved.startsWith(root)) { errors.push('Outside dist: ' + reference); return; }
  try {
    let info = await stat(resolved);
    if (info.isDirectory()) { resolved = path.join(resolved, 'index.html'); info = await stat(resolved); }
    if (!info.isFile() || !info.size) throw new Error('empty or not a file');
    checked++;
  } catch (error) { errors.push(path.relative(root, from) + ' → ' + reference + ': ' + error.message); }
}
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) { await walk(filename); continue; }
    if (!/\.(?:html|mjs|css)$/.test(entry.name) || filename.includes(path.sep + 'vendor' + path.sep)) continue;
    const source = await readFile(filename, 'utf8');
    if (/figma\.com\/api\/mcp\/asset\//.test(source)) errors.push('Temporary Figma URL: ' + filename);
    if (entry.name.endsWith('.html')) {
      for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) await check(match[1], filename);
    }
    if (entry.name.endsWith('.mjs')) {
      for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) await check(match[1], filename);
    }
    if (entry.name.endsWith('.css')) {
      for (const match of source.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) await check(match[1], filename);
    }
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'assets/figma/manifest.json'), 'utf8'));
for (const group of Object.values(manifest)) for (const reference of Object.values(group)) await check(reference, path.join(root, 'index.html'));
const redesignManifestPath = path.join(root, 'assets/redesign/manifest.json');
const redesignManifest = JSON.parse(await readFile(redesignManifestPath, 'utf8'));
for (const asset of redesignManifest.assets) {
  await check(asset.file, redesignManifestPath);
  const bytes = await readFile(path.resolve(path.dirname(redesignManifestPath), asset.file));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) errors.push('Redesign asset hash mismatch: ' + asset.file);
}
const mobileManifestPath = path.join(root, 'assets/new-figma/manifest.json');
const mobileManifest = JSON.parse(await readFile(mobileManifestPath, 'utf8'));
for (const asset of mobileManifest.assets) {
  await check(asset.file, mobileManifestPath);
  const bytes = await readFile(path.resolve(path.dirname(mobileManifestPath), asset.file));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) errors.push('New Figma asset hash mismatch: ' + asset.file);
}
for (const name of ['mobile.mjs', 'mobile-core.mjs', 'mobile.css', 'maps/city-buildings.geojson', 'index.html', 'app.js', 'app.css', 'maps/tsinghua-points.json', 'maps/odyssey-community.json', 'route-host.mjs', 'route-host.css', 'redesign.mjs', 'redesign.css', 'island-activities.mjs', 'island-play-core.mjs', 'island-activities.css', 'explore.html', 'route/index.html', 'route/worker.mjs', 'route/data/graph.json']) await check('./' + name, path.join(root, 'index.html'));
await walk(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Static references and local Figma assets verified: ' + checked + ' checks.');
