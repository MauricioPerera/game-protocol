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

// --- Valores de FLUJO mal formados: antes degradaban EN SILENCIO ---
// `slice(1, -1)` se aplicaba a ciegas sin comprobar que el valor cerrara, asi que un
// bracket sin cerrar no fallaba: se PERDIAN datos sin aviso (`a: [1, 2` daba [1]).
ok(throws(() => parseYamlSubset('a: {k: 1')),
  'flow-map sin cerrar lanza error (antes: {k: ""})');

ok(throws(() => parseYamlSubset('a: [1, 2')),
  'flow-list sin cerrar lanza error (antes: [1] — perdia el 2)');

ok(throws(() => parseYamlSubset('a: {k: 1}}')),
  'cierre de mas en flujo lanza error');

ok(throws(() => parseYamlSubset('a: {k: [1, 2}')),
  'brackets cruzados en flujo lanzan error');

ok(throws(() => parseYamlSubset('a: {k: 1} basura')),
  'texto despues del cierre del flujo lanza error');

ok(throws(() => parseYamlSubset('a: [ "abc ]')),
  'comilla sin cerrar dentro de un flujo lanza error');

// hueco interno por coma de mas: el elemento vacio desaparecia del resultado.
ok(throws(() => parseYamlSubset('a: [x, , y]')),
  'hueco interno en flow-list lanza error');

ok(throws(() => parseYamlSubset('a: {x: 1, , y: 2}')),
  'hueco interno en flow-map lanza error');

// numero no finito: Number('1e999') = Infinity, y JSON.stringify(Infinity) = null, o sea
// el token se convertia en `null` dentro del artefacto generado, sin ningun aviso.
ok(throws(() => parseYamlSubset('a: 1e999')),
  'numero no finito lanza error (antes: null en el artefacto)');

ok(throws(() => parseYamlSubset('a: Infinity')),
  'Infinity literal lanza error');

// --- Literales no decimales: la implementacion contradecia su propia gramatica ---
// SPEC 1.2 define `number` como decimal, pero Number() acepta hex/binario/octal, asi que
// `0x1f` entraba como 31 y `0b101` como 5 sin que nada lo declarara.
ok(throws(() => parseYamlSubset('a: 0x1f')), 'hex lanza error (antes: 31)');
ok(throws(() => parseYamlSubset('a: 0X1F')), 'hex en mayusculas lanza error');
ok(throws(() => parseYamlSubset('a: 0b101')), 'binario lanza error (antes: 5)');
ok(throws(() => parseYamlSubset('a: 0o17')), 'octal lanza error (antes: 15)');
ok(throws(() => parseYamlSubset('a: [1, 0x10]')), 'literal no decimal dentro de un flujo lanza error');

// el mensaje ofrece las dos salidas: decimal, o comillas si se queria texto.
let hexMsg = '';
try { parseYamlSubset('a: 0x1f'); } catch (e) { hexMsg = e.message; }
ok(/decimal/.test(hexMsg) && /31/.test(hexMsg) && /entrecomill/.test(hexMsg),
  'el error de literal no decimal es accionable (decimal o comillas)', hexMsg);

// --- Lo que NO debe romperse: los decimales legitimos siguen siendo numeros ---
ok(parseYamlSubset('a: 1e3').a === 1000, 'notacion exponencial sigue siendo numero');
ok(parseYamlSubset('a: .5').a === 0.5, 'decimal sin cero inicial sigue siendo numero');
ok(parseYamlSubset('a: +5').a === 5, 'decimal con signo + sigue siendo numero');
ok(parseYamlSubset('a: -0.5').a === -0.5, 'decimal negativo sigue siendo numero');
// un texto con pinta de hex que Number() NO resuelve sigue siendo string, como antes.
ok(parseYamlSubset('a: 0xZZ').a === '0xZZ', 'texto no numerico con prefijo 0x sigue siendo string');
// entrecomillado es la via de escape documentada en el mensaje de error.
ok(parseYamlSubset("a: '0x1f'").a === '0x1f', 'un literal hex entrecomillado se acepta como texto');

// --- Lo que NO debe romperse con el endurecimiento anterior ---
// un "" explicito es un elemento legitimo; antes lo borraba un filter(v => v !== '').
ok(eq(parseYamlSubset('a: [x, "", y]').a, ['x', '', 'y']),
  'string vacio explicito se conserva en flow-list', parseYamlSubset('a: [x, "", y]').a);

ok(eq(parseYamlSubset('a: []').a, []) && eq(parseYamlSubset('a: {}').a, {}),
  'lista y mapa vacios siguen parseando');

ok(eq(parseYamlSubset('a: [1, 2, ]').a, [1, 2]),
  'coma final se sigue tolerando', parseYamlSubset('a: [1, 2, ]').a);

ok(eq(parseYamlSubset('a: { k: [1, 2], j: { z: 3 } }').a, { k: [1, 2], j: { z: 3 } }),
  'flujo anidado bien formado sigue parseando');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' tests del parser pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
