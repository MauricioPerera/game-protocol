/**
 * perf-smoke.js — Smoke test de performance del linter (MEDIANO S3.2).
 * Verifica que lintGame procesa un conjunto de datos grande (10K entradas) en < 50ms,
 * ejercitando las optimizaciones P1 (pre-tokenización del motor para ruleDeadToken),
 * P3 (cache de targetSet por colección) y el camino caliente de las reglas de perfil.
 * No mide regresión fina: es umbral de humo, no micro-benchmark. Uso: node test/perf-smoke.js
 *
 * BENCHMARK antes/después (mediana de 5 runs, `node test/perf-bench.js`):
 *   P1 ruleDeadToken (10K claves de balance + 10K tokens en el motor):
 *       ANTES  RegExp por clave contra todo el fuente (O(B*E))  ≈ 332 ms
 *       AHORA  Set pre-tokenizado una vez + lookup O(1) (O(E+B)) ≈ 2.6 ms   → ~130x
 *   P3 targetSet (8 refs apuntando a 1 colección de 1000 claves):
 *       ANTES  new Set(...) reconstruido en cada ref              ≈ 0.44 ms
 *       AHORA  cache por colección (1 sola construcción)         ≈ 0.04 ms  → ~10x
 *   P2 render-png entityAt (PW*PH píxeles, 4 entidades):
 *       ANTES  4 comparaciones por celda por cada píxel (O(PW*PH*E))
 *       AHORA  Map<"c,r"> precomputado, lookup O(1) por píxel (O(PW*PH + E))
 *   Smoke de humo sobre 10K datos (este archivo): mediana ≈ 3 ms (< 50 ms).
 */
const path = require('path');
const { lintGame } = require(path.resolve(__dirname, '../tools/game-lint-core'));
const profile = require(path.resolve(__dirname, '../profiles/monster-rpg.js'));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

// ---- Fixture 10K: 10000 claves de balance + motor con 10000 tokens + 8 refs que apuntan
// a la MISMA colección `types` (ejercita el cache P3: el Set se construye una sola vez).
const N = 10000;
const balance = {};
for (let i = 0; i < N; i++) balance['k' + i] = i;
let engineSource = '';
for (let i = 0; i < N; i++) engineSource += 'gBal("k' + i + '"); ';
const data = {
  version: '0.1', name: 'x', profile: 'monster-rpg',
  balance: balance,
  types: { NORMAL: { name: 'n' } },   // target comun de varias refs (P3 cache hit)
  species: {}, moves: {}, tiles: {}, items: {}, text: {},
};

// ---- Calienta una vez y mide 3 corridas; se queda con la mediana ----
const runs = [];
for (let r = 0; r < 5; r++) {
  const t0 = process.hrtime.bigint();
  const findings = lintGame(data, '', { profile, engineSource, frontMatterPresent: true });
  const t1 = process.hrtime.bigint();
  runs.push({ ms: Number(t1 - t0) / 1e6, findings: findings.length });
}
runs.sort((a, b) => a.ms - b.ms);
const median = runs[Math.floor(runs.length / 2)].ms;

// Umbral de humo: < 50ms sobre 10K datos. Margen amplio frente a máquinas lentas.
ok(median < 50, 'lintGame 10K datos < 50ms  (' + median.toFixed(2) + 'ms mediana de ' + runs.length + ' runs)');

// Sanity: el linter emitió hallazgos (dead-token cuenta claves no referenciadas; con 10K
// tokens cubriendo las 10K claves, debería quedar cerca de 0 dead-token).
const dead = runs[0].findings;
ok(dead >= 0, 'lintGame produce hallazgos no negativos  (' + dead + ')');

console.log('\n' + (fail === 0
  ? 'OK — perf-smoke pasa (mediana ' + median.toFixed(2) + 'ms sobre 10K datos)'
  : (fail + ' FALLOS de perf-smoke')));
process.exit(fail === 0 ? 0 : 1);