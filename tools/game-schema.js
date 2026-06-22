#!/usr/bin/env node
/**
 * game-schema.js — Emite un JSON Schema (draft-07) del front-matter de cada perfil.
 * Auto-derivado de los descriptores: required, tokens (de `derive`/`refs`), enum de secciones,
 * y el grafo de referencias como `x-references` (no expresable en JSON Schema nativo, es
 * dependiente de datos). Permite a cualquier agente/herramienta validar la ESTRUCTURA sin ejecutar.
 * Uso:  node tools/game-schema.js [profileId]    (sin arg: genera schemas/<id>.schema.json para todos)
 */
const fs = require('fs');
const path = require('path');
const PROFILES_DIR = path.resolve(__dirname, '../profiles');
const OUT_DIR = path.resolve(__dirname, '../schemas');

function tokenType(name) {
  if (['version', 'name', 'description', 'profile'].includes(name)) return { type: 'string' };
  if (name === 'palettesCount') return { type: 'integer', minimum: 0 };
  if (/Pool$/.test(name) || name === 'rows') return { type: 'array' };
  return { type: 'object' };
}
function describeSrc(s) {
  if (s.collection && s.field) return s.collection + '.*.' + s.field;
  if (s.collection && s.arrayField) return s.collection + '.*.' + s.arrayField + '[]' + (s.itemField ? ('.' + s.itemField) : '');
  if (s.listMap) return s.listMap + '.*[]';
  if (s.singleton && s.field) return s.singleton + '.' + s.field;
  if (s.singleton && s.mapField) return s.singleton + '.' + s.mapField + '.*';
  return JSON.stringify(s);
}

function schemaFor(p) {
  const tokens = new Set(['version', 'name', 'description', 'profile', 'platform', 'palettesCount']);
  for (const d of (p.derive || [])) if ('from' in d) tokens.add(d.from);
  for (const r of (p.refs || [])) { const s = r.src; if (s.collection) tokens.add(s.collection); if (s.singleton) tokens.add(s.singleton); if (s.listMap) tokens.add(s.listMap); if (r.target && r.target.collection) tokens.add(r.target.collection); }
  const properties = {};
  for (const t of tokens) properties[t] = tokenType(t);
  properties.profile = { const: p.id };
  const required = Array.from(new Set((p.required || ['version', 'name']).concat(['profile'])));
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://game-protocol/schemas/' + p.id + '.schema.json',
    title: 'GAME.md front-matter — perfil ' + p.id,
    type: 'object',
    required: required,
    properties: properties,
    additionalProperties: true,
    'x-sections': p.sections || [],
    'x-references': (p.refs || []).map(r => ({ rule: r.rule, from: describeSrc(r.src), to: r.target.collection, allow: r.target.allow || undefined })),
    'x-outputKeys': (p.derive || []).map(d => d.key),
    'x-note': 'Las referencias cruzadas (x-references) dependen de datos y se validan con game-lint.js, no con este schema.',
  };
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const args = process.argv.slice(2);
function usage() {
  console.log('Usage: node tools/game-schema.js [profileId]');
  console.log('Options:');
  console.log('  --help     Show this help message');
}
const KNOWN = new Set(['--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(1); }
const arg = args.find(a => !a.startsWith('-'));
const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.js'));
let n = 0;
for (const f of files) {
  let p; try { p = require(path.join(PROFILES_DIR, f)); } catch (e) { continue; }
  if (!p || !p.id) continue;
  if (arg && p.id !== arg) continue;
  const out = path.join(OUT_DIR, p.id + '.schema.json');
  fs.writeFileSync(out, JSON.stringify(schemaFor(p), null, 2) + '\n');
  n++;
}
console.log('Generados ' + n + ' schema(s) en ' + path.relative(process.cwd(), OUT_DIR) + '/');
