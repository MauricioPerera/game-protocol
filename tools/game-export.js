#!/usr/bin/env node
/**
 * game-export.js — Compila GAME.md -> game-data.generated.js (global window.GAME). Sin dependencias.
 * Uso:  node tools/game-export.js [GAME.md] [salida.js]
 * El perfil de dominio se elige por el token `profile` del front-matter (OBLIGATORIO desde 2.0.0).
 * GAME.md es la FUENTE DE VERDAD; la salida se regenera, nunca se edita a mano.
 */
const fs = require('fs');
const path = require('path');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { buildGame } = require('./game-build-core');
const { validateProfile } = require('./profile-helpers');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');
function loadProfile(id) {
  if (!/^[a-z0-9-]+$/.test(id))
    throw new Error('Perfil inválido: "' + id + '" (solo minúsculas, números y guión)');
  const pjs = path.join(PROFILES_DIR, id + '.js');
  const pjson = path.join(PROFILES_DIR, id + '.json');
  let prof;
  if (fs.existsSync(pjs)) prof = require(pjs);         // si falla (sintaxis), lanza -> el llamador lo reporta
  // Perfil puro-datos (SPEC §11): JSON.parse, sin ejecutar codigo (SPEC §10).
  else if (fs.existsSync(pjson)) prof = JSON.parse(fs.readFileSync(pjson, 'utf8'));
  else return null;                                    // inexistente
  const shapeErr = validateProfile(prof);              // contrato del descriptor (SPEC §6.1)
  if (shapeErr) throw new Error(shapeErr);
  return prof;
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

let text;
try { text = fs.readFileSync(file, 'utf8'); }
catch (e) { console.error('No se pudo leer ' + file); process.exit(2); }
text = text.replace(/\r\n/g, '\n');
const { fm } = splitFrontMatter(text);
if (!fm) { console.error('GAME.md sin front-matter YAML.'); process.exit(2); }

let data;
try { data = parseYamlSubset(fm); }
catch (e) { console.error('Error de parseo: ' + e.message); process.exit(2); }
// `profile` OBLIGATORIO desde 2.0.0 (fallback monster-rpg removido; deprecado en 1.3.0).
if (!('profile' in data)) {
  console.error('Falta `profile` en el front-matter (obligatorio desde 2.0.0). Declara `profile: <id>`; receta en MIGRATION.md (De 1.x -> 2.0.0).');
  process.exit(2);
}
const profileId = data.profile;
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
