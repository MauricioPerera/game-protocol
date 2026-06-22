/**
 * all-examples.js — Verifica TODOS los examples/*.GAME.md: lint 0 errores + export sin drift.
 * Es el espejo local del job `validate` de CI: itera cada ejemplo, compila y compara contra
 * el .generated.js commiteado. Así no hace falta tocar CI cada vez que se añade un ejemplo.
 * Uso: node test/all-examples.js
 *
 * Normaliza CRLF→LF antes de comparar para ser indiferente al autocrlf del checkout
 * (el contrato real del repo es LF; el index de git es LF).
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..');
const TMP = path.join(require('os').tmpdir(), 'game-protocol-gen.js');

const examplesDir = path.join(REPO, 'examples');
// examples/GAME.md -> game-data.generated.js  (caso especial); X.GAME.md -> X.generated.js
const mdFiles = fs.readdirSync(examplesDir).filter(f => f === 'GAME.md' || f.endsWith('.GAME.md'));

function generatedFor(mdFile) {
  if (mdFile === 'GAME.md') return 'game-data.generated.js';
  return mdFile.replace(/\.GAME\.md$/, '.generated.js');
}

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); }
};

for (const md of mdFiles) {
  const mdPath = path.join(examplesDir, md);
  const genFile = generatedFor(md);
  const genPath = path.join(examplesDir, genFile);

  // 1) lint 0 errores
  let lintErr = null;
  try { execFileSync(process.execPath, [path.join(REPO, 'tools/game-lint.js'), mdPath], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { lintErr = (e.stderr ? e.stderr.toString().trim() : e.message); }
  ok(!lintErr, 'lint   ' + md + '  (0 errores)', lintErr);

  // 2) export + sin drift
  let exportErr = null;
  try { execFileSync(process.execPath, [path.join(REPO, 'tools/game-export.js'), mdPath, TMP], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { exportErr = (e.stderr ? e.stderr.toString().trim() : e.message); }
  if (exportErr) { ok(false, 'export ' + md, exportErr); continue; }

  const got = fs.readFileSync(TMP, 'utf8').replace(/\r\n/g, '\n');
  let want = null;
  try { want = fs.readFileSync(genPath, 'utf8').replace(/\r\n/g, '\n'); }
  catch (e) { ok(false, 'drift  ' + md + '  (falta ' + genFile + ')'); continue; }
  ok(got === want, 'drift  ' + md + '  == ' + genFile,
     got !== want ? 'Regenera con: node tools/game-export.js examples/' + md + ' examples/' + genFile : '');
}

console.log('');
if (fail === 0) console.log('OK — ' + pass + ' chequeos de ejemplos pasan (' + mdFiles.length + ' archivos)');
else { console.log('FAIL — ' + fail + ' de ' + (pass + fail) + ' chequeos fallaron'); process.exit(1); }