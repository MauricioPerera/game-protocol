#!/usr/bin/env node
/**
 * build-standalone.js — Genera <archivo>-standalone.html inanizando cada <script src="local">.
 * Robusto (resuelve por nombre relativo, no por regex de formato del cuerpo del script).
 * Uso:  node tools/build-standalone.js examples/adventure.html [...mas html]
 */
const fs = require('fs');
const path = require('path');

const inputs = process.argv.slice(2);
if (!inputs.length) { console.error('uso: node tools/build-standalone.js <archivo.html> [...]'); process.exit(2); }

for (const inFile of inputs) {
  const dir = path.dirname(inFile);
  let html = fs.readFileSync(inFile, 'utf8');
  let inlined = 0, missing = [];
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    if (/^https?:\/\//.test(src)) return m;                 // CDN: se deja como esta
    const p = path.join(dir, src);
    if (!fs.existsSync(p)) { missing.push(src); return m; }
    inlined++;
    return '<script>\n' + fs.readFileSync(p, 'utf8').replace(/<\/script>/g, '<\\/script>') + '\n</script>';
  });
  const out = inFile.replace(/\.html$/, '-standalone.html');
  fs.writeFileSync(out, html);
  console.log('Generado ' + path.relative(process.cwd(), out) + '  (inlined: ' + inlined + (missing.length ? ', externos sin inlinar: ' + missing.join(',') : '') + ')');
}
