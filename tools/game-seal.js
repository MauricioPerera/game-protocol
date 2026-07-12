#!/usr/bin/env node
/**
 * game-seal.js — Sella los DATOS de un GAME.md (análogo de tests_sha256 en KDD).
 * Calcula el sha256 (hex lowercase) del JSON CANÓNICO de los tokens del front-matter
 * (claves de objeto ordenadas recursivamente, arrays en su orden, UTF-8) EXCLUYENDO la
 * clave `dataSha256` — el sello mismo. El cuerpo Markdown NO entra al hash: el sello cubre
 * DATOS, no prosa. Imprime UNA línea en stdout (el hash) y sale 0.
 *
 * Uso:  node tools/game-seal.js <GAME.md>
 *   Copia el hash como `dataSha256: '<hash>'` en el front-matter para sellar el archivo.
 *   game-lint.js verifica el sello (regla `data-seal`): si no coincide, error y exit 1.
 *
 * Exit codes (SPEC §3.1): 0 = OK (hash impreso); 2 = input (archivo ilegible o sin
 * front-matter, front-matter no parseable, flag desconocido). Nunca emite 1.
 */
const fs = require('fs');
const crypto = require('crypto');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { canonicalDataJson } = require('./game-lint-core');

const args = process.argv.slice(2);

function usage() {
  console.log('Usage: node tools/game-seal.js <GAME.md>');
  console.log('Imprime el sha256 hex del JSON canonico de los tokens (excluye dataSha256).');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('Exit codes: 0=OK (hash en stdout), 2=input (archivo/front-matter/flag)');
}
const KNOWN = new Set(['--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

const file = args.find(a => !a.startsWith('-'));
if (!file) { console.error('Error: falta el argumento <GAME.md>'); usage(); process.exit(2); }

let text;
try { text = fs.readFileSync(file, 'utf8'); }
catch (e) { console.error('No se pudo leer ' + file); process.exit(2); }

// Tolera CRLF (checkouts Windows con autocrlf) sin alterar el hash.
text = text.replace(/\r\n/g, '\n');

const { fm } = splitFrontMatter(text);
if (fm == null) { console.error('Sin front-matter (--- ... ---) en ' + file + ': no hay datos para sellar'); process.exit(2); }

let data;
try { data = parseYamlSubset(fm); }
catch (e) { console.error('Front-matter no parseable en ' + file + ': ' + e.message); process.exit(2); }

const canonical = canonicalDataJson(data);
const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
console.log(hash);
process.exit(0);
