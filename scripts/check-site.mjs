import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = resolve(root, 'web');
for (const file of ['index.html', 'style.css', 'app.js']) {
  if (!existsSync(resolve(web, file))) throw new Error(`Missing source: ${file}`);
}
execFileSync(process.execPath, ['--check', resolve(web, 'app.js')], { stdio: 'inherit' });
const html = readFileSync(resolve(web, 'index.html'), 'utf8');
const css = readFileSync(resolve(web, 'style.css'), 'utf8');
if (!/<html\b[^>]*lang=["']ko["']/i.test(html)) throw new Error('Korean language declaration missing');
const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1]);
refs.push(...[...css.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)].map(m => m[1]));
let checked = 0;
for (const ref of refs) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(ref)) continue;
  const path = resolve(web, ref.split(/[?#]/)[0].replace(/^\//, ''));
  if (relative(web, path).startsWith('..')) throw new Error(`Reference escapes web root: ${ref}`);
  if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Missing local asset: ${ref}`);
  checked++;
}
console.log(`Source checks passed: JavaScript syntax, Korean document, ${checked} local asset references.`);
