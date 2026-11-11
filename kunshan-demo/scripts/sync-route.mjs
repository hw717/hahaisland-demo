import {cp,mkdir,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'route-demo');
const target=path.join(root,'dist','route');
await mkdir(target,{recursive:true});
// The standalone route source is the only authority. This mechanical copy also
// includes JSON, historical photos, offline basemap geometry and vendor license.
for(const entry of await readdir(source,{withFileTypes:true})){
  await cp(path.join(source,entry.name),path.join(target,entry.name),{recursive:entry.isDirectory(),force:true});
}
const meta=JSON.parse(await readFile(path.join(target,'data','meta.json'),'utf8'));
console.log(`Synced route-demo → dist/route (${meta.nodes} nodes, ${meta.edges} edges, ${meta.photos} photos)`);
