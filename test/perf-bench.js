/**
 * perf-bench.js — Micro-benchmark antes/después de las optimizaciones S3.2 (P1, P3).
 * NO es parte de `npm test` (es sólo para documentar el salto de performance en el DoD).
 * Reproduce el camino ANTES (regex por clave / Set reconstruido por ref) y el AHORA
 * (Set pre-tokenizado / cache por colección) sobre los mismos 10K datos.
 * Uso: node test/perf-bench.js
 */
const N = 10000;
const balance = {};
for (let i = 0; i < N; i++) balance['k' + i] = i;
let engineSource = '';
for (let i = 0; i < N; i++) engineSource += 'gBal("k' + i + '"); ';

function median(arr) { arr.sort((a, b) => a - b); return arr[Math.floor(arr.length / 2)]; }
function ms(fn, runs) {
  const out = [];
  for (let r = 0; r < runs; r++) {
    const t0 = process.hrtime.bigint(); fn(); const t1 = process.hrtime.bigint();
    out.push(Number(t1 - t0) / 1e6);
  }
  return median(out);
}

// ---- P1: ruleDeadToken ----
// ANTES: una RegExp por cada clave de balance contra todo el fuente (O(B*E)).
const beforeDead = () => {
  for (const k of Object.keys(balance)) {
    const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    new RegExp("gBal\\(['\"]" + e + "['\"]|\\." + e + "\\b|\\[['\"]" + e + "['\"]\\]").test(engineSource);
  }
};
// AHORA: pre-tokenizar el motor una vez (O(E)) + lookup O(1) por clave (O(B)).
const afterDead = () => {
  const set = new Set();
  const strRe = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m; while ((m = strRe.exec(engineSource))) set.add(m[1] !== undefined ? m[1] : m[2]);
  const propRe = /\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = propRe.exec(engineSource))) set.add(m[1]);
  for (const k of Object.keys(balance)) set.has(k);
};

// ---- P3: targetSet por colección ----
// 8 refs apuntando a la misma colección `types` con 1000 claves (el Set cuesta de construir).
const types = {};
for (let i = 0; i < 1000; i++) types['t' + i] = { name: 'n' };
const data = { types: types };
const refs = [];
for (let i = 0; i < 8; i++) refs.push({ target: { collection: 'types', allow: [] } });
// ANTES: new Set(...) reconstruido en cada ref (O(refs * keys)).
const beforeSet = () => {
  for (const r of refs) { const keys = Object.keys(data[r.target.collection] || {}); new Set(keys.concat(r.target.allow || [])); }
};
// AHORA: cache por colección (O(keys) una sola vez).
const afterSet = () => {
  const cache = new Map();
  for (const r of refs) {
    const col = r.target.collection;
    if (!cache.has(col)) { const keys = Object.keys(data[col] || {}); cache.set(col, new Set(keys.concat(r.target.allow || []))); }
  }
};

const RUNS = 5;
const b1 = ms(beforeDead, RUNS), a1 = ms(afterDead, RUNS);
const b3 = ms(beforeSet, RUNS), a3 = ms(afterSet, RUNS);
console.log('P1 ruleDeadToken (10K claves + 10K tokens):');
console.log('  ANTES regex x clave: ' + b1.toFixed(3) + 'ms');
console.log('  AHORA Set pre-tok:  ' + a1.toFixed(3) + 'ms   speedup ' + (b1 / a1).toFixed(1) + 'x');
console.log('P3 targetSet (8 refs a 1 coleccion, 1000 claves):');
console.log('  ANTES rebuild x ref: ' + b3.toFixed(4) + 'ms');
console.log('  AHORA cache x col:   ' + a3.toFixed(4) + 'ms   speedup ' + (b3 / a3).toFixed(1) + 'x');