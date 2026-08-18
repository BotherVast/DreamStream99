import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public');
const output = path.join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const htmlPath = path.join(output, 'index.html');
const html = (await readFile(htmlPath, 'utf8'))
  .replaceAll('="/', '="./')
  .replaceAll("='/", "='./");
await writeFile(htmlPath, html);

const configFiles = ['config.js', 'assets-config.js'];
for (const filename of configFiles) {
  const target = path.join(output, filename);
  const contents = (await readFile(target, 'utf8'))
    .replaceAll("'/assets/", "'./assets/")
    .replaceAll('"/assets/', '"./assets/');
  await writeFile(target, contents);
}

// The deploy artifact is always the backend-free Pages demo, even when the
// source tree is served by the retained local Socket.IO prototype.
const runtimePath = path.join(output, 'runtime-config.js');
await writeFile(runtimePath, `${await readFile(runtimePath, 'utf8')}
window.WT_RUNTIME.mode = 'demo';
window.WT_RUNTIME.apiUrl = null;
window.WT_RUNTIME.websocketUrl = null;
`);

const cssDirectory = path.join(output, 'css');
for (const filename of await readdir(cssDirectory)) {
  if (!filename.endsWith('.css')) continue;
  const cssPath = path.join(cssDirectory, filename);
  const css = (await readFile(cssPath, 'utf8'))
    .replaceAll("url('/assets/", "url('../assets/")
    .replaceAll('url("/assets/', 'url("../assets/');
  await writeFile(cssPath, css);
}

await writeFile(path.join(output, '.nojekyll'), '');
await cp(htmlPath, path.join(output, '404.html'));

console.log(`Built GitHub Pages site in ${path.relative(root, output)}/`);
