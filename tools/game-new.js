#!/usr/bin/env node
/**
 * game-new.js — Crea un GAME.md LIMPIO para empezar un juego desde cero. Sin dependencias.
 * Uso:  node tools/game-new.js <perfil> [salida.GAME.md] [--name "Mi Juego"] [--force]
 *
 * Por que existe: los `examples/*.GAME.md` son EJEMPLOS del protocolo, no la base de un
 * proyecto nuevo. Sin un generador, el unico GAME.md del repo era un ejemplo completo, y
 * tanto humanos como agentes lo copiaban y heredaban su contenido (species, tiles, mapas)
 * creyendo que era el punto de partida. Este CLI cierra ese hueco: emite el ESQUELETO
 * minimo de un perfil — 0 errores de lint, cero contenido de juego prestado.
 *
 * El esqueleto deja `warn` a proposito (goal-missing, win-text...): son la lista de tareas
 * del autor. Se ven con `node tools/game-lint.js <archivo> --agent`, que ademas trae el
 * `hint` de como resolver cada una.
 */
const fs = require('fs');
const path = require('path');
const { validateProfile } = require('./profile-helpers');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');
const SEEDS_FILE = path.join(__dirname, 'game-new-seeds.json');

function listProfiles() {
  return [...new Set(fs.readdirSync(PROFILES_DIR)
    .filter(f => f.endsWith('.js') || f.endsWith('.json'))
    .map(f => f.replace(/\.(js|json)$/, '')))].sort();
}

function loadProfile(id) {
  if (!/^[a-z0-9-]+$/.test(id))
    throw new Error('Perfil invalido: "' + id + '" (solo minusculas, numeros y guion)');
  const pjs = path.join(PROFILES_DIR, id + '.js');
  const pjson = path.join(PROFILES_DIR, id + '.json');
  let prof;
  if (fs.existsSync(pjs)) prof = require(pjs);
  else if (fs.existsSync(pjson)) prof = JSON.parse(fs.readFileSync(pjson, 'utf8'));
  else return null;
  const shapeErr = validateProfile(prof);
  if (shapeErr) throw new Error(shapeErr);
  return prof;
}

// ---- Emisor del subconjunto YAML (el inverso de yaml-min, SPEC §1.2) ----
// Mapas anidados como bloque (2 espacios); listas SIEMPRE en flujo (el subset no admite
// secuencias de bloque `- item`); objetos dentro de listas como flow map.
function needsQuote(s) {
  return s === '' || /^\s|\s$/.test(s) || /[,:#\[\]{}'"]/.test(s) ||
         s === 'true' || s === 'false' || (!isNaN(Number(s)) && s.trim() !== '');
}
function quote(s) {
  const hasSingle = s.includes("'"), hasDouble = s.includes('"');
  if (hasSingle && hasDouble)
    throw new Error('valor con comillas simples Y dobles no es representable en el subset YAML: ' + s);
  return hasSingle ? '"' + s + '"' : "'" + s + "'";
}
function emitScalar(v) {
  if (v === null || v === undefined) return "''";
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  return needsQuote(s) ? quote(s) : s;
}
function emitFlow(v) {
  if (Array.isArray(v)) return '[' + v.map(emitFlow).join(', ') + ']';
  if (v && typeof v === 'object')
    return '{ ' + entriesOf(v).map(([k, x]) => emitKey(k) + ': ' + emitFlow(x)).join(', ') + ' }';
  // En contexto de flujo la coma y el `:` son separadores: todo string va SIEMPRE
  // entre comillas, aunque hoy no las necesite. Asi el documento sigue parseando igual
  // si el autor edita el contenido de una fila (SPEC §1.1).
  if (typeof v === 'string') return quote(v);
  return emitScalar(v);
}
function emitKey(k) {
  return needsQuote(String(k)) ? quote(String(k)) : String(k);
}
// Las claves de servicio de las semillas ($comment, $why) nunca llegan al GAME.md.
function entriesOf(obj) {
  return Object.entries(obj).filter(([k]) => !k.startsWith('$'));
}
function emitBlock(obj, indent) {
  const pad = ' '.repeat(indent);
  let out = '';
  for (const [k, v] of entriesOf(obj)) {
    if (Array.isArray(v)) out += pad + emitKey(k) + ': ' + emitFlow(v) + '\n';
    else if (v && typeof v === 'object') {
      // Un objeto vacio va en flujo (`k: {}`): como bloque no tendria hijos y la linea
      // siguiente rompería el parser.
      const inner = emitBlock(v, indent + 2);
      out += inner ? pad + emitKey(k) + ':\n' + inner : pad + emitKey(k) + ': {}\n';
    } else out += pad + emitKey(k) + ': ' + emitScalar(v) + '\n';
  }
  return out;
}

// ---- CLI ----
const args = process.argv.slice(2);
function usage() {
  console.log('Usage: node tools/game-new.js <perfil> [salida.GAME.md] [--name "Mi Juego"] [--force]');
  console.log('Crea un GAME.md limpio (0 errores de lint) para empezar un juego desde cero.');
  console.log('Options:');
  console.log('  --name <t> Titulo del juego (por defecto: "Nuevo Juego")');
  console.log('  --force    Sobrescribe la salida si ya existe');
  console.log('  --list     Lista los perfiles disponibles y termina');
  console.log('  --help     Show this help message');
  console.log('Exit codes: 0=OK, 2=input/perfil/sintaxis');
}
const KNOWN = new Set(['--help', '-h', '--force', '--list', '--name']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

if (args.includes('--list')) {
  console.log(listProfiles().join('\n'));
  process.exit(0);
}

// --name consume el argumento siguiente; el resto de posicionales son perfil y salida.
const positional = [];
let name = 'Nuevo Juego';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name') {
    if (args[i + 1] == null) { console.error('Error: --name necesita un valor'); process.exit(2); }
    name = args[++i];
  } else if (!args[i].startsWith('-')) positional.push(args[i]);
}

const profileId = positional[0];
if (!profileId) {
  console.error('Error: falta el perfil. Perfiles disponibles:\n  ' + listProfiles().join('\n  '));
  usage();
  process.exit(2);
}

let profile;
try { profile = loadProfile(String(profileId)); }
catch (e) { console.error('El perfil ' + profileId + ' tiene un error: ' + e.message); process.exit(2); }
if (!profile) {
  console.error('Perfil desconocido: ' + profileId + '. Disponibles:\n  ' + listProfiles().join('\n  '));
  process.exit(2);
}

const outFile = positional[1] || 'GAME.md';
if (fs.existsSync(outFile) && !args.includes('--force')) {
  console.error('Ya existe ' + outFile + ' (usa --force para sobrescribir).');
  process.exit(2);
}

// ---- Composicion del documento ----
let seeds = {};
try { seeds = JSON.parse(fs.readFileSync(SEEDS_FILE, 'utf8')); }
catch (e) { console.error('No se pudo leer ' + SEEDS_FILE + ': ' + e.message); process.exit(2); }
const seed = seeds[profile.id] || {};

const tokens = Object.assign({
  version: profile.specVersion || '0.1',
  name: name,
  description: 'TODO: una frase que describa el juego.',
  profile: profile.id,
}, JSON.parse(JSON.stringify(seed)));

// Los comandos del cuerpo se muestran con una ruta corta: si la salida es absoluta, el
// documento quedaria con la ruta completa de la maquina que lo genero.
const shownPath = path.isAbsolute(outFile) ? path.basename(outFile) : outFile;

const sections = (profile.sections || ['Overview', "Do's and Don'ts"]);
const body = sections.map(s => {
  if (s === "Do's and Don'ts")
    return '## ' + s + '\n\n' +
      '- **Do:** edita los tokens del front-matter; son la fuente unica de verdad.\n' +
      '- **Don\'t:** edites el `.generated.js` a mano — se regenera y perderias el cambio.\n' +
      '- **Don\'t:** copies contenido de `examples/` esperando que sea tu juego: son\n' +
      '  ejemplos del protocolo, no una plantilla de proyecto.\n';
  return '## ' + s + '\n\nTODO: documenta ' + s + '.\n';
}).join('\n');

const doc =
  '---\n' +
  emitBlock(tokens, 0) +
  '---\n' +
  '\n# ' + name + '\n\n' +
  '> Esqueleto generado por `node tools/game-new.js ' + profile.id + '`.\n' +
  '> Los tokens de arriba son el minimo para pasar el gate: reemplazalos por tu contenido.\n' +
  '>\n' +
  '> Siguiente paso:\n' +
  '>\n' +
  '> ```\n' +
  '> node tools/game-lint.js ' + shownPath + ' --agent   # los `warn` son tu lista de tareas\n' +
  '> node tools/game-export.js ' + shownPath + ' juego.generated.js\n' +
  '> ```\n' +
  '>\n' +
  '> Los tokens que el perfil `' + profile.id + '` valida y deriva estan en `manifest.json`\n' +
  '> (`profiles.' + profile.id + '`), o con `node tools/game-schema.js ' + profile.id + '`.\n' +
  '\n' + body;

fs.writeFileSync(outFile, doc);
console.log('Generado ' + outFile + '  (profile:' + profile.id + ')');
console.log('Siguiente: node tools/game-lint.js ' + outFile + ' --agent');
