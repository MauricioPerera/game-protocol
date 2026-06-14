#!/usr/bin/env node
/**
 * game-lint.js — Linter del Protocolo GAME (core genérico + perfiles). Sin dependencias.
 * Uso:  node tools/game-lint.js [GAME.md]
 * El perfil de dominio se elige por el token `profile` del front-matter (default: monster-rpg).
 * Cruces con el motor (solid-sync / dead-token): opcionales, vía GAME_ENGINE=<ruta>.
 */
const fs = require('fs');
const path = require('path');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { lintGame } = require('./game-lint-core');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');
function loadProfile(id) {
  const p = path.join(PROFILES_DIR, id + '.js');
  if (!fs.existsSync(p)) return { profile: null, error: null };       // inexistente
  try { return { profile: require(p), error: null }; }
  catch (e) { return { profile: null, error: e.message }; }            // existe pero falla (sintaxis)
}

const args = process.argv.slice(2);
const agentMode = args.includes('--agent');
const file = args.find(a => !a.startsWith('--')) || 'GAME.md';
const root = path.dirname(path.resolve(file));

let text;
try { text = fs.readFileSync(file, 'utf8'); }
catch (e) { console.error('No se pudo leer ' + file); process.exit(2); }

// Tolera CRLF (checkouts en Windows con autocrlf) sin alterar el contrato.
text = text.replace(/\r\n/g, '\n');

const { fm, body } = splitFrontMatter(text);
let data = {}, parseError = null;
try { data = fm ? parseYamlSubset(fm) : {}; }
catch (e) { parseError = e.message; }

const profileId = data.profile || 'monster-rpg';
const { profile, error: profileError } = loadProfile(profileId);
const preFindings = [];
if (parseError) preFindings.push({ level: 'error', rule: 'parse-error', msg: parseError });
if (profileError) preFindings.push({ level: 'error', rule: 'profile-load-error', msg: 'el perfil ' + profileId + ' tiene un error: ' + profileError });
else if (!profile) preFindings.push({ level: 'error', rule: 'profile-known', msg: 'perfil desconocido: ' + profileId });

let engineSource = null;
if (process.env.GAME_ENGINE) {
  try { engineSource = fs.readFileSync(path.resolve(root, process.env.GAME_ENGINE), 'utf8'); }
  catch (e) { console.error('GAME_ENGINE no se pudo leer: ' + process.env.GAME_ENGINE); }
}

const findings = preFindings.concat(
  lintGame(data, body || '', { profile, engineSource, requireEngine: false, frontMatterPresent: !!fm })
);

const errors = findings.filter(f => f.level === 'error').length;
const warns = findings.filter(f => f.level === 'warn').length;

// Modo agente: enriquece cada hallazgo con una pista de arreglo accionable y un siguiente paso.
let outFindings = findings;
if (agentMode) {
  const hints = require('./rule-hints');
  outFindings = findings.map(f => Object.assign({}, f, hints[f.rule] ? { hint: hints[f.rule] } : {}));
}

const report = {
  file,
  profile: profileId,
  summary: { errors, warnings: warns, ok: errors === 0 },
  findings: outFindings,
};
if (agentMode) {
  report.agent = {
    contract: 'Edita el GAME.md aplicando cada `hint`, vuelve a correr este comando; objetivo: errors=0.',
    capabilities: 'node tools/game-manifest.js  (perfiles, tokens, referencias, salida)',
    next: errors === 0 ? 'Valido. Compila con: node tools/game-export.js ' + file : 'Corrige los errores (usa los `hint`) y re-valida.',
  };
}
console.log(JSON.stringify(report, null, 2));
process.exit(errors > 0 ? 1 : 0);
