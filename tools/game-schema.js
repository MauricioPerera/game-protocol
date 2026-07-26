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
const { describeSrc } = require('./profile-helpers');
const PROFILES_DIR = path.resolve(__dirname, '../profiles');
const OUT_DIR = path.resolve(__dirname, '../schemas');

function tokenType(name) {
  if (['version', 'name', 'description', 'profile'].includes(name)) return { type: 'string' };
  if (name === 'palettesCount') return { type: 'integer', minimum: 0 };
  if (/Pool$/.test(name) || name === 'rows') return { type: 'array' };
  return { type: 'object' };
}

// Traduce la familia `matches` del descriptor a la keyword `pattern` de JSON Schema —
// la unica familia del core que SI tiene equivalente nativo (bounds/refs/dims dependen de
// datos o de otras colecciones y siguen viviendo en x-references / game-lint.js).
//
// Detalle de fidelidad: el core SALTA los valores no-string (eso es trabajo de bounds), y
// `pattern` de JSON Schema se comporta igual — solo aplica si la instancia es un string.
// Por eso el nodo hoja NO declara `type: 'string'`... salvo cuando la entrada es
// `required`, que en el core sí exige "presente Y string": ahí el tipo se declara y el
// campo entra en `required`. Así el schema acepta exactamente lo mismo que el linter.
function applyMatches(p, properties) {
  const holderOf = (m) => {
    const token = properties[m.collection || m.singleton];
    if (!token) return null;
    token.type = 'object';
    if (m.singleton) {                       // el token ES el objeto
      token.properties = token.properties || {};
      return token;
    }
    // coleccion: las entradas son los VALORES del objeto
    if (!token.additionalProperties || typeof token.additionalProperties !== 'object')
      token.additionalProperties = { type: 'object', properties: {} };
    token.additionalProperties.properties = token.additionalProperties.properties || {};
    return token.additionalProperties;
  };
  for (const m of (p.matches || [])) {
    const holder = holderOf(m);
    if (!holder) continue;
    const leaf = m.required ? { type: 'string', pattern: m.pattern } : { pattern: m.pattern };
    const field = m.arrayField || m.field;
    holder.properties[field] = m.arrayField
      ? { type: 'array', items: m.itemField ? { type: 'object', properties: { [m.itemField]: leaf } } : leaf }
      : leaf;
    if (m.required && !m.arrayField) {
      holder.required = holder.required || [];
      if (!holder.required.includes(field)) holder.required.push(field);
    }
  }
}

function schemaFor(p) {
  const tokens = new Set(['version', 'name', 'description', 'profile', 'platform', 'palettesCount']);
  for (const d of (p.derive || [])) if ('from' in d) tokens.add(d.from);
  for (const r of (p.refs || [])) { const s = r.src; if (s.collection) tokens.add(s.collection); if (s.singleton) tokens.add(s.singleton); if (s.listMap) tokens.add(s.listMap); if (r.target && r.target.collection) tokens.add(r.target.collection); }
  for (const m of (p.matches || [])) tokens.add(m.collection || m.singleton);
  const properties = {};
  for (const t of tokens) properties[t] = tokenType(t);
  properties.profile = { const: p.id };
  applyMatches(p, properties);
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
  console.log('Exit codes: 0=OK, 2=input (flag desconocido)');
}
const KNOWN = new Set(['--help', '-h']);
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const unknown = args.filter(a => a.startsWith('-') && a.length > 1 && !KNOWN.has(a));
if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }
const arg = args.find(a => !a.startsWith('-'));
const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.js') || f.endsWith('.json'));
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
