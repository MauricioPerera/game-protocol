/**
 * build-standalone.js — Tests del inliner build-standalone (T7).
 * Fixture HTML + script local + CDN → el standalone inlinea el local (inlined==1),
 * elimina el <script src="local"> y deja los CDN intactos.
 * Uso: node test/build-standalone.js
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..');
const TOOL = path.join(REPO, 'tools/build-standalone.js');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

// ---- Fixture ----
const TMP = path.join(os.tmpdir(), 'game-protocol-build-standalone-test');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const html = `<!doctype html>
<html><head>
<script src="local.js"></script>
<script src="https://cdn.example.com/lib.js"></script>
<script type="module">
import { foo } from './local.mjs';
foo();
</script>
</head><body><p>hi</p></body></html>
`;
const localJs = `// marker-local-xyz
window.MARK = 42;
`;
const localMjs = `// marker-module-abc
export function foo() { return 7; }
export const bar = 1;
`;
fs.writeFileSync(path.join(TMP, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(TMP, 'local.js'), localJs, 'utf8');
fs.writeFileSync(path.join(TMP, 'local.mjs'), localMjs, 'utf8');

// ---- Run ----
let stdout = '', stderr = '', code = 0;
try {
  stdout = execFileSync(process.execPath, [TOOL, path.join(TMP, 'index.html')],
    { encoding: 'utf8' }).replace(/\r\n/g, '\n');
} catch (e) {
  code = e.status; stdout = (e.stdout || '').toString().replace(/\r\n/g, '\n');
  stderr = (e.stderr || '').toString().replace(/\r\n/g, '\n');
}
ok(code === 0, 'standalone  exit 0', 'exit=' + code + ' stderr=' + stderr);
ok(/inlined:\s*2/.test(stdout), 'standalone  reporta "inlined: 2" (script clasico + modulo)', JSON.stringify(stdout));

// ---- Lee el standalone generado ----
const out = path.join(TMP, 'index-standalone.html');
ok(fs.existsSync(out), 'standalone  index-standalone.html generado');
if (fs.existsSync(out)) {
  const s = fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
  // El script local fue inlinado: su contenido aparece dentro de <script> y el src="local.js" ya no.
  ok(/marker-local-xyz/.test(s), 'standalone  contenido de local.js inlinado');
  ok(!/<script src="local\.js"><\/script>/.test(s), 'standalone  <script src="local.js"> eliminado');
  // El CDN se deja intacto.
  ok(/<script src="https:\/\/cdn\.example\.com\/lib\.js"><\/script>/.test(s),
     'standalone  CDN intacto (no se inlinan http(s)://)');
  // El body se preserva.
  ok(/<p>hi<\/p>/.test(s), 'standalone  body preservado');
  // El import relativo del modulo fue inlinado sin `export ` y sin el import.
  ok(/marker-module-abc/.test(s) && !/from '\.\/local\.mjs'/.test(s), 'standalone  modulo relativo inlinado (import eliminado)');
  ok(/function foo\(\)/.test(s) && !/export function foo/.test(s), 'standalone  prefijos `export ` retirados en el inlinado');
}

// Limpieza
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos de build-standalone pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);