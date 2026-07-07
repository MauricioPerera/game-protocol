#!/usr/bin/env node
/**
 * game-lint.js — Linter del Protocolo GAME (core genérico + perfiles). Sin dependencias.
 * Uso:  node tools/game-lint.js [GAME.md]
 * El perfil de dominio se elige por el token `profile` del front-matter (OBLIGATORIO desde 2.0.0).
 * Cruces con el motor (solid-sync / dead-token): opcionales, vía GAME_ENGINE=<ruta>.
 */
const fs = require('fs');
const path = require('path');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { lintGame } = require('./game-lint-core');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');
function loadProfile(id) {
  if (!/^[a-z0-9-]+$/.test(id))
    return { profile: null, error: 'Perfil inválido: "' + id + '" (solo minúsculas, números y guión)' };
  const p = path.join(PROFILES_DIR, id + '.js');
  if (!fs.existsSync(p)) return { profile: null, error: null };       // inexistente
  try { return { profile: require(p), error: null }; }
  catch (e) { return { profile: null, error: e.message }; }            // existe pero falla (sintaxis)
}

const args = process.argv.slice(2);

function usage() {
  console.log('Usage: node tools/game-lint.js [GAME.md] [--agent]');
  console.log('Options:');
  console.log('  --agent    Enrich findings with hints and next steps (for LLM agents)');
  console.log('  --help     Show this help message');
  console.log('Exit codes: 0=OK, 1=validacion (errores), 2=input/perfil/sintaxis');
}
const KNOWN = new Set(['--agent', '--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

const agentMode = args.includes('--agent');
const file = args.find(a => !a.startsWith('-')) || 'GAME.md';
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

// `profile` es OBLIGATORIO desde 2.0.0: el fallback monster-rpg (deprecado en 1.3.0
// como `profile-fallback`) fue removido. Sin token no se carga perfil y el core emite
// `required-fields` (error) sobre `profile`. Receta: MIGRATION.md (De 1.x -> 2.0.0).
const profileId = ('profile' in data) ? data.profile : null;
const { profile, error: profileError } = profileId != null
  ? loadProfile(String(profileId))
  : { profile: null, error: null };
const preFindings = [];
if (parseError) preFindings.push({ level: 'error', rule: 'parse-error', msg: parseError });
if (profileError) preFindings.push({ level: 'error', rule: 'profile-load-error', msg: 'el perfil ' + profileId + ' tiene un error: ' + profileError });
// `profile-known` ahora lo emite el core (lintGame) vía opts.profileId cuando el
// perfil no resuelve. Sólo pasamos profileId al core cuando NO hubo error de carga
// (sintaxis): si no, profile-load-error ya cubre el caso y pasar profileId duplicaría.
const coreProfileId = profileError ? null : profileId;

let engineSource = null;
if (process.env.GAME_ENGINE) {
  try { engineSource = fs.readFileSync(path.resolve(root, process.env.GAME_ENGINE), 'utf8'); }
  catch (e) { console.error('GAME_ENGINE no se pudo leer: ' + process.env.GAME_ENGINE); }
}

const findings = preFindings.concat(
  lintGame(data, body || '', { profile, profileId: coreProfileId, engineSource, requireEngine: false, frontMatterPresent: !!fm })
);

const errors = findings.filter(f => f.level === 'error').length;
const warns = findings.filter(f => f.level === 'warn').length;
const deprecated = findings.filter(f => f.level === 'deprecated').length;

// Modo agente: enriquece cada hallazgo con una pista de arreglo accionable y un siguiente paso.
// Toda regla lleva hint: si no tiene uno especifico en rule-hints.js, se entrega un fallback
// generico que orienta al agente hacia el descriptor del perfil (cumple el DoD: ningun
// hallazgo sin hint, para cualquier regla de cualquier perfil).
const FALLBACK_HINT = "Sin hint especifico: consulta `references` y `rules` del perfil en manifest.json (node tools/game-manifest.js) para entender el contrato de esta regla.";
const DEPRECATED_HINT = "Regla deprecada (no es error). Migra el GAME.md a la regla/token de reemplazo antes de `removedIn`; consulta MIGRATION.md y SPEC §7.1 para la política de deprecation.";
let outFindings = findings;
if (agentMode) {
  const hints = require('./rule-hints');
  outFindings = findings.map(f => Object.assign({}, f, {
    hint: f.level === 'deprecated' ? DEPRECATED_HINT : (hints[f.rule] || FALLBACK_HINT)
  }));
}

const report = {
  file,
  profile: profileId,
  summary: { errors, warnings: warns, deprecated, ok: errors === 0 },
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
