#!/usr/bin/env node
/**
 * ci-sync.js — Gatea que el CI corra EXACTAMENTE las mismas suites que `npm test`.
 *
 * Por que existe: el job `tests` de .github/workflows/ci.yml enumera cada suite en su
 * propio step (util: en un fallo se ve de un vistazo cual reviento). Esa enumeracion se
 * habia desincronizado en silencio de la cadena `npm test` — el CI corria 11 suites y
 * `npm test` 14, asi que `perf-smoke`, `mutation-manual` y `data-seal` (el sellado de datos,
 * la feature estrella de 2.19.0) NO estaban gateadas en CI. El repo ya tiene el principio:
 * "no enumerar lo que crece; enlazar a la fuente canonica" (v2.8.1). Aca la enumeracion es
 * deliberada, asi que la protege un test en vez de un enlace.
 *
 * Toda suite de test/ debe estar en package.json `test` Y en ci.yml. Si agregas una suite,
 * agregala en los dos sitios o este gate falla.
 *
 * Uso: node test/ci-sync.js
 */
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(REPO, p), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); }
};

// Suites invocadas por `npm test` (cadena de `node test/X.js && ...`).
const pkg = JSON.parse(read('package.json'));
const inNpm = [...(pkg.scripts.test || '').matchAll(/node\s+test\/([\w-]+)\.js/g)].map(m => m[1]);

// Suites invocadas por el job `tests` del CI.
const ci = read('.github/workflows/ci.yml');
const inCi = [...ci.matchAll(/run:\s*node\s+test\/([\w-]+)\.js/g)].map(m => m[1]);

// Suites que existen en disco. `perf-bench` queda fuera a proposito: es la medicion larga
// (`npm run bench`), no un gate.
const OPT_OUT = new Set(['perf-bench']);
const onDisk = fs.readdirSync(path.join(REPO, 'test'))
  .filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''))
  .filter(f => !OPT_OUT.has(f));

ok(inNpm.length > 0, 'package.json  `npm test` invoca suites (' + inNpm.length + ')');
ok(inCi.length > 0, 'ci.yml  el job tests invoca suites (' + inCi.length + ')');

const missingInCi = inNpm.filter(s => !inCi.includes(s));
ok(missingInCi.length === 0, 'ci.yml  corre todas las suites de `npm test`',
   'faltan en el CI: ' + missingInCi.join(', '));

const missingInNpm = inCi.filter(s => !inNpm.includes(s));
ok(missingInNpm.length === 0, 'package.json  `npm test` corre todas las suites del CI',
   'faltan en npm test: ' + missingInNpm.join(', '));

const orphans = onDisk.filter(s => !inNpm.includes(s));
ok(orphans.length === 0, 'test/  ninguna suite en disco queda sin correr',
   'huerfanas (agregalas a package.json y ci.yml, o a OPT_OUT si no son un gate): ' + orphans.join(', '));

const ghosts = inNpm.filter(s => !fs.existsSync(path.join(REPO, 'test', s + '.js')));
ok(ghosts.length === 0, '`npm test`  no invoca suites inexistentes', 'no existen: ' + ghosts.join(', '));

console.log('\n' + (fail === 0
  ? ('OK — ' + pass + ' chequeos de sincronizacion pasan (' + inNpm.length + ' suites gateadas)')
  : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
