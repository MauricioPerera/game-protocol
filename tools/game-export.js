#!/usr/bin/env node
/**
 * game-export.js — Compila GAME.md -> game-data.generated.js (global window.GAME). Sin dependencias.
 * Uso:  node tools/game-export.js [GAME.md] [salida.js]
 * El perfil de dominio se elige por el token `profile` del front-matter (default: monster-rpg).
 * GAME.md es la FUENTE DE VERDAD; la salida se regenera, nunca se edita a mano.
 */
const fs = require('fs');
const path = require('path');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { buildGame } = require('./game-build-core');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');
function loadProfile(id) {
  if (!/^[a-z0-9-]+$/.test(id))
    throw new Error('Perfil inválido: "' + id + '" (solo minúsculas, números y guión)');
  const p = path.join(PROFILES_DIR, id + '.js');
  if (!fs.existsSync(p)) return null;        // inexistente
  return require(p);                          // si falla (sintaxis), lanza -> el llamador lo reporta
}

const args = process.argv.slice(2);
function usage() {
  console.log('Usage: node tools/game-export.js [GAME.md] [salida.js]');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('Exit codes: 0=OK, 2=input/perfil/sintaxis (no se exporta en otro caso)');
}
const KNOWN = new Set(['--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

const positional = args.filter(a => !a.startsWith('-'));
const file = positional[0] || path.join(__dirname, '..', 'GAME.md');
const outFile = positional[1] || path.join(__dirname, '..', 'game-data.generated.js');

let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const { fm } = splitFrontMatter(text);
if (!fm) { console.error('GAME.md sin front-matter YAML.'); process.exit(2); }

let data;
try { data = parseYamlSubset(fm); }
catch (e) { console.error('Error de parseo: ' + e.message); process.exit(2); }
const profileId = data.profile || 'monster-rpg';
let profile;
try { profile = loadProfile(profileId); }
catch (e) { console.error('El perfil ' + profileId + ' tiene un error: ' + e.message); process.exit(2); }
if (!profile) { console.error('Perfil desconocido: ' + profileId); process.exit(2); }

const GAME = buildGame(data, profile);

const header = '// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.\n' +
  '// Regenerar con:  node tools/game-export.js\n' +
  '// profile: ' + profileId + '\n';
const out = header + 'window.GAME = ' + JSON.stringify(GAME, null, 2) + ';\n';
fs.writeFileSync(outFile, out);
console.log('Generado ' + path.relative(process.cwd(), outFile) +
  '  (profile:' + profileId + ' claves:' + Object.keys(GAME).length + ')');
