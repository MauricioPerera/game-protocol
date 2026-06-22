/**
 * parser.js — Tests del parser yaml-min: los casos limite que antes corrompian en silencio
 * ahora deben (a) parsear correctamente, o (b) lanzar un error claro. Nunca devolver basura.
 * Uso: node test/parser.js
 */
const path = require('path');
const { parseYamlSubset, splitFrontMatter } = require(path.resolve(__dirname, '../tools/yaml-min'));

let pass = 0, fail = 0;
const ok = (cond, label, got) => { if (cond) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (got !== undefined ? '  got=' + JSON.stringify(got) : '')); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

// --- Antes daban basura, ahora deben parsear bien ---
ok(eq(parseYamlSubset('a: ["hola, mundo", "x"]').a, ['hola, mundo', 'x']),
  'coma en string de flow-list', parseYamlSubset('a: ["hola, mundo", "x"]').a);

ok(eq(parseYamlSubset('a: { d: "hola, mundo", e: 2 }').a, { d: 'hola, mundo', e: 2 }),
  'coma en string de flow-map', parseYamlSubset('a: { d: "hola, mundo", e: 2 }').a);

ok(parseYamlSubset('a: { time: "12:30" }').a.time === '12:30',
  'dos puntos en string de flow-map', parseYamlSubset('a: { time: "12:30" }').a);

ok(parseYamlSubset('a: 007').a === '007',
  'cero a la izquierda se mantiene string', parseYamlSubset('a: 007').a);

ok(parseYamlSubset('a: 0.5').a === 0.5 && parseYamlSubset('a: 42').a === 42,
  'numeros normales siguen siendo numeros');

ok(splitFrontMatter('---\r\nx: 1\r\n---\r\nbody').fm === 'x: 1',
  'CRLF en front-matter tolerado', splitFrontMatter('---\r\nx: 1\r\n---\r\nbody').fm);

// --- Antes corrompian en silencio, ahora deben LANZAR ---
ok(throws(() => parseYamlSubset('a:\n  - uno\n  - dos')),
  'secuencia de bloque ("- item") lanza error');

ok(throws(() => parseYamlSubset('foobar sin dos puntos')),
  'linea de front-matter sin ":" lanza error');

ok(throws(() => parseYamlSubset('a: { sin_dos_puntos }')),
  'par de flow sin ":" lanza error');

// --- Anidamiento y flujo siguen funcionando ---
ok(eq(parseYamlSubset('m:\n  k: { a: 1, b: [2, 3] }').m.k, { a: 1, b: [2, 3] }),
  'flujo anidado map+list');

// --- Edge cases nuevos (S3.3): antes corrompian en silencio o desbordaban la pila ---
// clave duplicada: antes sobrescribía silenciosamente, ahora lanza.
ok(throws(() => parseYamlSubset('a: 1\na: 2')),
  'clave duplicada lanza error');

// string sin cerrar: antes devolvía el string crudo ('"unclosed'), ahora lanza.
ok(throws(() => parseYamlSubset('a: "unclosed')),
  'string sin cerrar lanza error');

// indent TAB: antes el tab se tragaba (indentOf cuenta solo espacios), ahora lanza.
ok(throws(() => parseYamlSubset('a: 1\n\tb: 2')),
  'indent TAB lanza error');

// sobre-indentacion: antes saltaba la linea en silencio (i++; continue), ahora lanza.
ok(throws(() => parseYamlSubset('a: 1\n    b: 2')),
  'sobre-indentacion lanza error');

// anidamiento profundo: antes desbordaba la pila (RangeError opaco), ahora lanza error claro.
// Construye 70 niveles con indentacion que compone (+2 por nivel): a0 → a1 → … → a69 → leaf.
  let deep = '';
  for (let d = 0; d < 70; d++) deep += '  '.repeat(d) + 'a' + d + ':\n';
  deep += '  '.repeat(70) + 'leaf: 1';
  ok(throws(() => parseYamlSubset(deep)),
  'anidamiento profundo (>64) lanza error claro (no stack overflow)');

// el guard no falsea anidamientos legitimos (3 niveles sigue funcionando).
ok(eq(parseYamlSubset('a:\n  b:\n    c: 1').a.b.c, 1),
  'anidamiento 3 niveles sigue parseando');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' tests del parser pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
