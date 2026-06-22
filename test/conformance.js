/**
 * conformance.js — Suite de conformidad del Protocolo GAME.
 * VALIDO:   cada ejemplo por perfil debe linter con 0 errores.
 * INVALIDO: cada caso debe disparar una regla concreta (prueba que el contrato detecta el fallo).
 *           Cobertura: ≥1 caso inválido por REGLA emitida por perfil (no 1 por perfil).
 * Sirve a humanos y a agentes/implementaciones alternativas como referencia ejecutable.
 * Uso: node test/conformance.js
 */
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const { splitFrontMatter, parseYamlSubset } = require(REPO + '/tools/yaml-min');
const { lintGame } = require(REPO + '/tools/game-lint-core');
const loadProfile = id => require(REPO + '/profiles/' + id + '.js');
const errs = f => f.filter(x => x.level === 'error');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); } };

// ---- VALIDO: ejemplos por perfil → 0 errores ----
const examples = ['GAME.md', 'platformer.GAME.md', 'crafting.GAME.md', 'papers-please.GAME.md', 'voxel.GAME.md', 'adventure.GAME.md', 'dungeon.GAME.md', 'roguelike.GAME.md'];
for (const e of examples) {
  const t = fs.readFileSync(REPO + '/examples/' + e, 'utf8').replace(/\r\n/g, '\n');
  const { fm, body } = splitFrontMatter(t); const data = fm ? parseYamlSubset(fm) : {};
  const pid = data.profile || 'monster-rpg';
  const er = errs(lintGame(data, body, { profile: loadProfile(pid), frontMatterPresent: !!fm }));
  ok(er.length === 0, 'valido  ' + e + '  [' + pid + ']  (0 errores)', er.slice(0, 3).map(x => x.rule + ': ' + x.msg).join(' | '));
}

// ---- INVALIDO: cada caso debe disparar la regla esperada ----
// hasRule cuenta presencia de la regla a cualquier nivel (algunas reglas son warn-only:
// type-symmetry, dead-token, entity-text, goal-missing, win-text, entrant-doc-field,
// prefab-empty, tileart-ref en dungeon/roguelike). No exige que sea la ÚNICA disparada.
const lintData = (data, pid, opts) => lintGame(data, '', Object.assign({ profile: loadProfile(pid), frontMatterPresent: true }, opts || {}));
const hasRule = (f, rule) => f.some(x => x.rule === rule);
// Base front-matter válido (evita required-fields / version-compatible).
const B = pid => ({ version: '0.1', name: 'x', profile: pid });
const M8 = () => Array.from({ length: 8 }, () => Array(8).fill(0)); // tileArt 8x8 válido
const GEN = { seed: 1, roomW: 5, roomH: 5, maxDepth: 1 }; // generator roguelike válido

const invalid = [
  // ---- adventure (15) ----
  { p: 'adventure', rule: 'palette-color-range', data: { ...B('adventure'), palettes: { 0: [[999, 0, 0]] } } },
  { p: 'adventure', rule: 'tileart-ref', data: { ...B('adventure'), tileArt: { 5: M8() } } },          // id 5 < 16 → error
  { p: 'adventure', rule: 'tileart-dims', data: { ...B('adventure'), tileArt: { 20: [[0]] } } },
  { p: 'adventure', rule: 'scene-rows', data: { ...B('adventure'), scene: { rows: [] } } },
  { p: 'adventure', rule: 'scene-dims', data: { ...B('adventure'), scene: { rows: ['..', '...'] } } },
  { p: 'adventure', rule: 'scene-legend-ref', data: { ...B('adventure'), scene: { rows: ['..'], legend: { X: { tile: 999, pal: 0 } } } } },
  { p: 'adventure', rule: 'entity-bounds', data: { ...B('adventure'), scene: { rows: ['..'] }, entities: { npcs: [{ col: 5, row: 0 }] } } },
  { p: 'adventure', rule: 'entity-tile', data: { ...B('adventure'), scene: { rows: ['..'] }, tiles: { 1: {} }, entities: { npcs: [{ col: 0, row: 0, tile: 999 }] } } },
  { p: 'adventure', rule: 'entity-text', data: { ...B('adventure'), scene: { rows: ['..'] }, entities: { npcs: [{ col: 0, row: 0, dialogue: 'NOPE' }] } } },
  { p: 'adventure', rule: 'entity-item', data: { ...B('adventure'), scene: { rows: ['..'] }, entities: { pickups: [{ col: 0, row: 0 }] } } },
  { p: 'adventure', rule: 'goal-lock', data: { ...B('adventure'), scene: { rows: ['....', '....', '....', '....'] }, entities: { goal: { col: 2, row: 2, tile: 19, pal: 0, locked: 'KEY' } } } },
  { p: 'adventure', rule: 'goal-missing', data: { ...B('adventure'), scene: { rows: ['..'] } } },
  { p: 'adventure', rule: 'player-start', data: { ...B('adventure'), scene: { rows: ['..'] }, player: { start: { col: 5, row: 0 } } } },
  { p: 'adventure', rule: 'text-valid', data: { ...B('adventure'), text: { x: '  ' } } },
  { p: 'adventure', rule: 'win-text', data: B('adventure') },

  // ---- crafting (4) ----
  { p: 'crafting', rule: 'recipe-output', data: { ...B('crafting'), items: {}, recipes: { R: { output: 'NOPE', inputs: {} } } } },
  { p: 'crafting', rule: 'recipe-station', data: { ...B('crafting'), items: { x: {} }, stations: {}, recipes: { R: { output: 'x', station: 'NOPE', inputs: {} } } } },
  { p: 'crafting', rule: 'recipe-inputs', data: { ...B('crafting'), items: { x: {} }, materials: {}, recipes: { R: { output: 'x', inputs: { NOPE: 1 } } } } },
  { p: 'crafting', rule: 'material-bounds', data: { ...B('crafting'), materials: { M: { stack: -1 } } } },

  // ---- dungeon (17) ----
  { p: 'dungeon', rule: 'palette-color-range', data: { ...B('dungeon'), palettes: { 0: [[999, 0, 0]] } } },
  { p: 'dungeon', rule: 'tileart-ref', data: { ...B('dungeon'), tileArt: { 99: [[0]] } } },
  { p: 'dungeon', rule: 'tileart-dims', data: { ...B('dungeon'), tileArt: { 99: [[0]] } } },
  { p: 'dungeon', rule: 'scene-rows', data: { ...B('dungeon'), scenes: { a: { rows: [] } } } },
  { p: 'dungeon', rule: 'scene-dims', data: { ...B('dungeon'), scenes: { a: { rows: ['..', '...'] } } } },
  { p: 'dungeon', rule: 'scene-legend-ref', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], legend: { X: { tile: 999, pal: 0 } } } } } },
  { p: 'dungeon', rule: 'entity-bounds', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], npcs: [{ col: 5, row: 0 }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'entity-tile', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], npcs: [{ col: 0, row: 0, tile: 999 }] } }, tiles: { 1: {} }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'entity-text', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], npcs: [{ col: 0, row: 0, dialogue: 'NOPE' }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'entity-item', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], pickups: [{ col: 0, row: 0 }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'enemy-hp', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], enemies: [{ col: 0, row: 0, hp: -1 }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'warp-ref', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], warps: [{ col: 0, row: 0, to: 'NOPE' }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'warp-lock', data: { ...B('dungeon'), scenes: { a: { rows: ['..'], warps: [{ col: 0, row: 0, to: 'a', locked: 'KEY' }] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'player-start', data: { ...B('dungeon'), scenes: { a: { rows: ['..'] } }, player: { start: { scene: 'NOPE' } } } },
  { p: 'dungeon', rule: 'goal-missing', data: { ...B('dungeon'), scenes: { a: { rows: ['..'] } }, player: { start: { scene: 'a' } } } },
  { p: 'dungeon', rule: 'text-valid', data: { ...B('dungeon'), text: { x: '  ' } } },
  { p: 'dungeon', rule: 'win-text', data: B('dungeon') },

  // ---- monster-rpg (24) ----
  { p: 'monster-rpg', rule: 'move-type-valid', data: { ...B('monster-rpg'), types: {}, moves: { M: { type: 'NOPE' } } } },
  { p: 'monster-rpg', rule: 'species-type-valid', data: { ...B('monster-rpg'), types: {}, species: { S: { type: 'NOPE' } } } },
  { p: 'monster-rpg', rule: 'moves-exist', data: { ...B('monster-rpg'), moves: {}, species: { S: { moves: ['NOPE'] } } } },
  { p: 'monster-rpg', rule: 'broken-ref', data: { ...B('monster-rpg'), species: { S: { evolvesInto: 'NOPE' } } } },
  { p: 'monster-rpg', rule: 'trainer-team-valid', data: { ...B('monster-rpg'), species: {}, trainers: { T: { team: ['NOPE'] } } } },
  { p: 'monster-rpg', rule: 'encounter-ref', data: { ...B('monster-rpg'), species: {}, encounters: { area: ['NOPE'] } } },
  { p: 'monster-rpg', rule: 'sprite-ref', data: { ...B('monster-rpg'), sprites: {}, species: { S: { sprite: 'NOPE' } } } },
  { p: 'monster-rpg', rule: 'player-ref', data: { ...B('monster-rpg'), species: {}, player: { starter: 'NOPE' } } },
  { p: 'monster-rpg', rule: 'palette-range', data: { ...B('monster-rpg'), palettesCount: 1, tiles: { 1: { name: 'x', pal: 5 } } } },
  { p: 'monster-rpg', rule: 'palette-color-range', data: { ...B('monster-rpg'), palettes: { 0: [[999, 0, 0]] } } },
  { p: 'monster-rpg', rule: 'solid-sync', data: { ...B('monster-rpg'), tiles: { 1: { name: 'w', solid: true } } }, opts: { engineSource: 'const SOLID_TILES = new Set([2]);' } },
  { p: 'monster-rpg', rule: 'type-symmetry', data: { ...B('monster-rpg'), types: { FIRE: { WATER: 2 } } } },
  { p: 'monster-rpg', rule: 'trainer-bounds', data: { ...B('monster-rpg'), trainers: { T: { prize: -5 } } } },
  { p: 'monster-rpg', rule: 'sprite-dims', data: { ...B('monster-rpg'), sprites: { S: [[0]] } } },
  { p: 'monster-rpg', rule: 'item-effect-valid', data: { ...B('monster-rpg'), items: { P: { effect: 'nope' } } } },
  { p: 'monster-rpg', rule: 'map-dims', data: { ...B('monster-rpg'), platform: { rows: 2, cols: 2 }, maps: { m: { rows: ['AAA', 'AA'] } } } },
  { p: 'monster-rpg', rule: 'map-legend-ref', data: { ...B('monster-rpg'), tiles: {}, maps: { m: { legend: { X: { tile: 999, pal: 0 } } } } } },
  { p: 'monster-rpg', rule: 'map-meta', data: { ...B('monster-rpg'), platform: { rows: 2, cols: 2 }, maps: { m: { rows: ['..', '..'], entry: { col: 5, row: 0 } } } } },
  { p: 'monster-rpg', rule: 'overworld-ref', data: { ...B('monster-rpg'), overworld: { area: { npcs: [{ col: 'x', row: 0 }] } } } },
  { p: 'monster-rpg', rule: 'tileart-ref', data: { ...B('monster-rpg'), tileArt: { 5: M8() } } },   // id 5 < 16 → error
  { p: 'monster-rpg', rule: 'tileart-dims', data: { ...B('monster-rpg'), tileArt: { 20: [[0]] } } },
  { p: 'monster-rpg', rule: 'sfx-valid', data: { ...B('monster-rpg'), sfx: { x: { freq: -1, dur: 1 } } } },
  { p: 'monster-rpg', rule: 'economy-bounds', data: { ...B('monster-rpg'), economy: { prices: { P: -5 } } } },
  { p: 'monster-rpg', rule: 'dead-token', data: { ...B('monster-rpg'), balance: { unused: 1 } }, opts: { engineSource: 'const x = 1;' } },

  // ---- papers-please (10) ----
  { p: 'papers-please', rule: 'day-entrant-ref', data: { ...B('papers-please'), entrants: {}, days: { 1: { entrants: ['NOPE'] } } } },
  { p: 'papers-please', rule: 'day-rule-ref', data: { ...B('papers-please'), rules: {}, days: { 1: { rules: ['NOPE'] } } } },
  { p: 'papers-please', rule: 'rule-doc-ref', data: { ...B('papers-please'), documents: {}, rules: { R: { type: 'require-document', document: 'NOPE' } } } },
  { p: 'papers-please', rule: 'rule-country-ref', data: { ...B('papers-please'), countries: {}, rules: { R: { type: 'ban-country', country: 'NOPE' } } } },
  { p: 'papers-please', rule: 'rule-docs-ref', data: { ...B('papers-please'), documents: {}, rules: { R: { type: 'require-document', documents: ['NOPE'] } } } },
  { p: 'papers-please', rule: 'rule-type-valid', data: { ...B('papers-please'), rules: { R: { type: 'teleport' } } } },
  { p: 'papers-please', rule: 'entrant-decision', data: { ...B('papers-please'), entrants: { E: { decision: 'maybe' } } } },
  { p: 'papers-please', rule: 'entrant-doc-ref', data: { ...B('papers-please'), documents: {}, entrants: { E: { docs: { NOPE: {} } } } } },
  { p: 'papers-please', rule: 'entrant-doc-field', data: { ...B('papers-please'), documents: { PASS: { fields: ['name'] } }, entrants: { E: { docs: { PASS: { name: 'x', extra: 'y' } } } } } },
  { p: 'papers-please', rule: 'economy-bounds', data: { ...B('papers-please'), economy: { salary: -5 } } },

  // ---- platformer (6) ----
  { p: 'platformer', rule: 'enemy-ref', data: { ...B('platformer'), enemies: {}, levels: { 1: { enemies: ['NOPE'] } } } },
  { p: 'platformer', rule: 'tileset-ref', data: { ...B('platformer'), tilesets: {}, levels: { 1: { tileset: 'NOPE' } } } },
  { p: 'platformer', rule: 'spawn-ref', data: { ...B('platformer'), levels: {}, player: { spawnLevel: 'NOPE' } } },
  { p: 'platformer', rule: 'enemy-bounds', data: { ...B('platformer'), enemies: { E: { hp: -1 } } } },
  { p: 'platformer', rule: 'physics-bounds', data: { ...B('platformer'), physics: { gravity: -1 } } },
  { p: 'platformer', rule: 'level-goal', data: { ...B('platformer'), levels: { 1: { goal: { x: 'a' } } } } },

  // ---- roguelike (15) ----
  { p: 'roguelike', rule: 'palette-color-range', data: { ...B('roguelike'), palettes: { 0: [[999, 0, 0]] } } },
  { p: 'roguelike', rule: 'tileart-ref', data: { ...B('roguelike'), tileArt: { 99: [[0]] } } },
  { p: 'roguelike', rule: 'tileart-dims', data: { ...B('roguelike'), tileArt: { 99: [[0]] } } },
  { p: 'roguelike', rule: 'generator-missing', data: B('roguelike') },
  { p: 'roguelike', rule: 'generator-field', data: { ...B('roguelike'), generator: { seed: 1 } } },
  { p: 'roguelike', rule: 'generator-size', data: { ...B('roguelike'), generator: { seed: 1, roomW: 3, roomH: 5, maxDepth: 1 } } },
  { p: 'roguelike', rule: 'generator-tile', data: { ...B('roguelike'), tiles: {}, generator: { ...GEN, floor: 999 } } },
  { p: 'roguelike', rule: 'enemypool-tile', data: { ...B('roguelike'), tiles: {}, generator: { ...GEN }, enemyPool: [{ tile: 999 }] } },
  { p: 'roguelike', rule: 'itempool-tile', data: { ...B('roguelike'), tiles: {}, generator: { ...GEN }, itemPool: [{ tile: 999, kind: 'heal', amount: 1 }] } },
  { p: 'roguelike', rule: 'itempool-kind', data: { ...B('roguelike'), generator: { ...GEN }, itemPool: [{ kind: 'nope' }] } },
  { p: 'roguelike', rule: 'itempool-amount', data: { ...B('roguelike'), generator: { ...GEN }, itemPool: [{ name: 'x', kind: 'heal' }] } },
  { p: 'roguelike', rule: 'itempool-power', data: { ...B('roguelike'), generator: { ...GEN }, itemPool: [{ name: 'x', kind: 'weapon' }] } },
  { p: 'roguelike', rule: 'player-tile', data: { ...B('roguelike'), tiles: {}, generator: { ...GEN }, player: { tile: 999 } } },
  { p: 'roguelike', rule: 'player-hp', data: { ...B('roguelike'), generator: { ...GEN }, player: { hp: -1 } } },
  { p: 'roguelike', rule: 'text-valid', data: { ...B('roguelike'), text: { x: '  ' } } },

  // ---- voxel (8) ----
  { p: 'voxel', rule: 'material-color', data: { ...B('voxel'), materials: { M: { color: [999, 0, 0] } } } },
  { p: 'voxel', rule: 'prefab-fill-ref', data: { ...B('voxel'), materials: {}, prefabs: { P: { size: [1, 1, 1], fill: 'NOPE' } } } },
  { p: 'voxel', rule: 'prefab-cell-ref', data: { ...B('voxel'), materials: {}, prefabs: { P: { size: [1, 1, 1], cells: [{ x: 0, y: 0, z: 0, m: 'NOPE' }] } } } },
  { p: 'voxel', rule: 'structure-prefab-ref', data: { ...B('voxel'), prefabs: {}, structures: { s: { place: [{ prefab: 'NOPE', at: [0, 0, 0] }] } } } },
  { p: 'voxel', rule: 'prefab-size', data: { ...B('voxel'), prefabs: { P: { size: [0, 1, 1] } } } },
  { p: 'voxel', rule: 'prefab-empty', data: { ...B('voxel'), prefabs: { P: { size: [1, 1, 1] } } } },
  { p: 'voxel', rule: 'prefab-cell', data: { ...B('voxel'), prefabs: { P: { size: [1, 1, 1], cells: [{ x: 5, y: 0, z: 0, m: 'M' }] } } } },
  { p: 'voxel', rule: 'structure-at', data: { ...B('voxel'), structures: { s: { place: [{ prefab: 'P', at: [0.5, 0, 0] }] } } } },
];

// ---- Runner + cobertura por perfil ----
const byProfile = {};
for (const c of invalid) {
  const f = lintData(c.data, c.p, c.opts);
  byProfile[c.p] = (byProfile[c.p] || 0) + 1;
  ok(hasRule(f, c.rule), 'invalido ' + c.p + ' → dispara ' + c.rule, 'reglas vistas: ' + [...new Set(f.map(x => x.rule))].join(', '));
}

console.log('\n— Cobertura inválidos por perfil —');
const order = ['adventure', 'crafting', 'dungeon', 'monster-rpg', 'papers-please', 'platformer', 'roguelike', 'voxel'];
for (const p of order) console.log('  ' + p.padEnd(16) + (byProfile[p] || 0) + ' casos');
console.log('  TOTAL invalidos: ' + invalid.length + '  (validos: ' + examples.length + ')');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' casos de conformidad pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);