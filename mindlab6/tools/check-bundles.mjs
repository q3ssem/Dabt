import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function inventory(target) {
  const folder = path.join(root, target);
  if (!fs.existsSync(folder)) throw new Error('Missing output directory: ' + target);
  const files = [];
  const visit = d => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const filename = path.join(d, entry.name);
      if (entry.isDirectory()) visit(filename);
      else files.push({ name: path.relative(folder, filename), size: fs.statSync(filename).size });
    }
  };
  visit(folder);
  return files;
}
const prod = inventory('dist'), lab = inventory('dist-lab');
const prodJs = prod.filter(f => f.name.endsWith('.js'));
const labJs = lab.filter(f => f.name.endsWith('.js'));
if (!prodJs.length || !labJs.length) throw new Error('Missing JS from one or both builds');
const prodBytes = prodJs.reduce((sum, f) => sum + f.size, 0);
const labBytes = labJs.reduce((sum, f) => sum + f.size, 0);
if (prodBytes > 100_000) throw new Error('Home page unexpectedly loads heavy engine code: ' + prodBytes);
if (labBytes <= prodBytes * 5) throw new Error('Lab build did not load the full graphics adapters separately');
const forbidden = /createGraphicsDevice|DEVICETYPE_WEBGPU|PixiJS|pixi\.js|playcanvas/i;
for (const file of prodJs) {
  const content = fs.readFileSync(path.join(root, 'dist', file.name), 'utf8');
  if (forbidden.test(content)) throw new Error('A renderer leaked into production JS: ' + file.name);
}
if (prod.some(f => f.name.startsWith('research/')) || lab.some(f => f.name.startsWith('research/'))) {
  throw new Error('Research workspace leaked into output');
}
console.log(JSON.stringify({
  result: 'BUNDLE_BOUNDARY_PASS',
  homeJavaScriptBytes: prodBytes,
  labJavaScriptBytes: labBytes,
  homeFiles: prod.length,
  labFiles: lab.length,
  note: 'Gzip/network timings and iPhone FPS not yet benchmarked',
}));
