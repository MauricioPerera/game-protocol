#!/usr/bin/env node
/**
 * game-manifest.js — Emite un manifiesto MAQUINA-LEGIBLE de las capacidades del Protocolo GAME.
 * Auto-derivado de los descriptores de perfil (profiles/*.js): un agente que llega en frio sabe
 * que perfiles existen, que tokens referencian a que, que reglas valida cada uno y que produce.
 * Uso:  node tools/game-manifest.js [salida.json]   (por defecto: manifest.json)
 */
const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.resolve(__dirname, '../profiles');

function describeSrc(s) {
  if (s.collection && s.field) return s.collection + '.*.' + s.field;
  if (s.collection && s.arrayField) return s.collection + '.*.' + s.arrayField + '[]' + (s.itemField ? ('.' + s.itemField) : '');
  if (s.listMap) return s.listMap + '.*[]';
  if (s.singleton && s.field) return s.singleton + '.' + s.field;
  if (s.singleton && s.mapField) return s.singleton + '.' + s.mapField + '.*';
  return JSON.stringify(s);
}

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
    output: (p.derive || []).map(d => ({ key: d.key, source: ('fn' in d) ? 'derived' : ('value' in d) ? 'const' : ('token:' + d.from) })),
    tokens: p.tokens || undefined,
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
  profileSelection: 'El front-matter declara `profile: <id>`. Sin el, se asume monster-rpg.',
  profiles: profiles,
};

const out = process.argv[2] || path.resolve(__dirname, '..', 'manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log('Generado ' + path.relative(process.cwd(), out) + '  (perfiles: ' + Object.keys(profiles).join(', ') + ')');
