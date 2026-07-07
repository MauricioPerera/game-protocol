#!/usr/bin/env node
/**
 * game-manifest.js — Emite un manifiesto MAQUINA-LEGIBLE de las capacidades del Protocolo GAME.
 * Auto-derivado de los descriptores de perfil (profiles/*.js): un agente que llega en frio sabe
 * que perfiles existen, que tokens referencian a que, que reglas valida cada uno y que produce.
 * Uso:  node tools/game-manifest.js [salida.json]   (por defecto: manifest.json)
 */
const fs = require('fs');
const path = require('path');
const { describeSrc } = require('./profile-helpers');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');

const args = process.argv.slice(2);
function usage() {
  console.log('Usage: node tools/game-manifest.js [salida.json]');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('Exit codes: 0=OK, 2=input (flag desconocido)');
}
const KNOWN = new Set(['--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

function profileEntry(p) {
  return {
    specVersion: p.specVersion || null,
    sections: p.sections || [],
    required: p.required || ['version', 'name'],
    references: (p.refs || []).map(r => ({
      rule: r.rule, level: r.level, from: describeSrc(r.src),
      to: r.target.collection, allow: r.target.allow || undefined, optional: !!r.optional,
    })),
    rules: (p.rules || []).map(fn => fn.name).filter(Boolean),
    // Familias declarativas del core (bounds/dims): expuestas para que un agente sepa
    // que rangos y formas se validan sin leer el codigo del perfil.
    bounds: (p.bounds || []).map(b => ({
      rule: b.rule, level: b.level || 'error',
      target: (b.collection ? b.collection + '.*.' : b.singleton + '.') + b.field,
      gt: b.gt, min: b.min, max: b.max,
      integer: b.integer || undefined, required: b.required || undefined,
    })),
    dims: (p.dims || []).map(d => ({ rule: d.rule, level: d.level || 'error', collection: d.collection, shape: d.shape })),
    output: (p.derive || []).map(d => ({ key: d.key, source: ('fn' in d) ? 'derived' : ('value' in d) ? 'const' : ('token:' + d.from) })),
    tokens: p.tokens || undefined,
    // S2.1: reglas marcadas `fn.deprecated = {since, removedIn}` exponen su ciclo de vida.
    deprecatedRules: (p.rules || []).filter(fn => fn && fn.deprecated).map(fn => ({
      rule: fn.name || 'unknown', since: fn.deprecated.since, removedIn: fn.deprecated.removedIn,
    })),
  };
}

const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.js'));
const profiles = {};
for (const f of files) {
  try { const p = require(path.join(PROFILES_DIR, f)); if (p && p.id) profiles[p.id] = profileEntry(p); }
  catch (e) { console.error('perfil no cargado: ' + f + ' (' + e.message + ')'); }
}

const manifest = {
  protocol: 'GAME',
  spec: '0.1',
  description: 'Formato generico para declarar contenido de juego como datos (hibrido YAML+Markdown). El core es agnostico al genero; cada genero es un perfil.',
  hybridContract: 'Un GAME.md es a la vez contrato de datos (front-matter) y documentacion canonica (cuerpo Markdown). Linaje: design.md de Google.',
  dataVsLogic: 'El spec declara QUE (tokens, referencias, derivaciones). El motor implementa COMO (render, input, formulas). Un agente edita el dato y valida con el linter; el motor es codigo.',
  pipeline: ['lint (game-lint.js) → validar', 'export (game-export.js) → window.GAME', 'consumir con fallback embebido'],
  agentLoop: 'editar GAME.md → node tools/game-lint.js GAME.md --agent → corregir con los `hint` → repetir hasta 0 errores → export.',
  cli: {
    lint: 'node tools/game-lint.js [GAME.md] [--agent]',
    export: 'node tools/game-export.js [GAME.md] [salida.js]',
    schema: 'node tools/game-schema.js [profileId]',
    manifest: 'node tools/game-manifest.js',
    conformance: 'node test/conformance.js',
  },
  profileSelection: 'El front-matter declara `profile: <id>` — OBLIGATORIO desde 2.0.0. Sin el, lint falla con required-fields (error) y export sale con exit 2. (El fallback monster-rpg fue deprecado en 1.3.0 y removido en 2.0.0; ver MIGRATION.md.)',
  // S2.3: ciclo de vida del contrato. `supported` = versiones de spec con las que el
  // tooling actual es compatible; `doc` apunta al documento de migración entre versiones.
  migrations: {
    supported: ['0.1'],
    doc: 'MIGRATION.md',
  },
  profiles: profiles,
};

const out = args.find(a => !a.startsWith('-')) || path.resolve(__dirname, '..', 'manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log('Generado ' + path.relative(process.cwd(), out) + '  (perfiles: ' + Object.keys(profiles).join(', ') + ')');
