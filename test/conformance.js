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
// Los perfiles pueden ser .js (codigo) o .json (puro-datos, SPEC §11).
const loadProfile = id => fs.existsSync(REPO + '/profiles/' + id + '.js')
  ? require(REPO + '/profiles/' + id + '.js')
  : require(REPO + '/profiles/' + id + '.json');
const errs = f => f.filter(x => x.level === 'error');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); } };

// ---- VALIDO: ejemplos por perfil → 0 errores ----
const examples = ['GAME.md', 'platformer.GAME.md', 'crafting.GAME.md', 'papers-please.GAME.md', 'voxel.GAME.md', 'adventure.GAME.md', 'dungeon.GAME.md', 'roguelike.GAME.md', 'tower-defense.GAME.md', 'advance-wars-extracted.GAME.md', 'quiz.GAME.md', 'neon-swarm.GAME.md', 'sudoku.GAME.md', 'senku.GAME.md'];
for (const e of examples) {
  const t = fs.readFileSync(REPO + '/examples/' + e, 'utf8').replace(/\r\n/g, '\n');
  const { fm, body } = splitFrontMatter(t); const data = fm ? parseYamlSubset(fm) : {};
  // `profile` es obligatorio desde 2.0.0 (sin fallback): un ejemplo sin token falla aqui.
  const pid = data.profile;
  if (!pid) { ok(false, 'valido  ' + e + '  declara profile (obligatorio desde 2.0.0)'); continue; }
  const er = errs(lintGame(data, body, { profile: loadProfile(pid), frontMatterPresent: !!fm }));
  ok(er.length === 0, 'valido  ' + e + '  [' + pid + ']  (0 errores)', er.slice(0, 3).map(x => x.rule + ': ' + x.msg).join(' | '));
}

// ---- INVALIDO: cada caso debe disparar la regla esperada ----
// hasRule cuenta presencia de la regla a cualquier nivel (algunas reglas son warn-only:
// type-symmetry, dead-token, entity-text, goal-missing, win-text, entrant-doc-field,
// prefab-empty, tileart-ref en dungeon/roguelike, dmgtype-symmetry, wave-monotonic en
// tower-defense, encounter-zone y palette-size en monster-rpg). No exige que sea la
// ÚNICA disparada.
const lintData = (data, pid, opts) => lintGame(data, '', Object.assign({ profile: loadProfile(pid), frontMatterPresent: true }, opts || {}));
const hasRule = (f, rule) => f.some(x => x.rule === rule);
// Base front-matter válido (evita required-fields / version-migration).
const B = pid => ({ version: '0.1', name: 'x', profile: pid });
const M8 = () => Array.from({ length: 8 }, () => Array(8).fill(0)); // tileArt 8x8 válido
const GEN = { seed: 1, roomW: 5, roomH: 5, maxDepth: 1 }; // generator roguelike válido
// Base tower-defense válida: armors + un dmgType con su armor, para que las reglas de
// bounds aisladas no arrastren findings de broken-ref (tower-dmgtype-valid / dmgtype-armor-valid).
const TD = (o) => Object.assign({ version: '0.1', name: 'x', profile: 'tower-defense',
  armors: ['LIGHT'], dmgTypes: { PHYSICAL: { LIGHT: 1.0 } } }, o);

const invalid = [
  // ---- adventure ----
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

  // ---- crafting ----
  { p: 'crafting', rule: 'recipe-output', data: { ...B('crafting'), items: {}, recipes: { R: { output: 'NOPE', inputs: {} } } } },
  { p: 'crafting', rule: 'recipe-station', data: { ...B('crafting'), items: { x: {} }, stations: {}, recipes: { R: { output: 'x', station: 'NOPE', inputs: {} } } } },
  { p: 'crafting', rule: 'recipe-inputs', data: { ...B('crafting'), items: { x: {} }, materials: {}, recipes: { R: { output: 'x', inputs: { NOPE: 1 } } } } },
  { p: 'crafting', rule: 'material-bounds', data: { ...B('crafting'), materials: { M: { stack: -1 } } } },

  // ---- dungeon ----
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

  // ---- monster-rpg ----
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
  // Huecos cerrados tras el stress-test kaiju-island (6 reglas nuevas + 4 extensiones):
  { p: 'monster-rpg', rule: 'move-bounds', data: { ...B('monster-rpg'), moves: { M: { type: 'NORMAL', power: -50 } } } },
  { p: 'monster-rpg', rule: 'move-bounds', data: { ...B('monster-rpg'), moves: { M: { type: 'NORMAL', power: 5, chance: 1.5 } } } },
  { p: 'monster-rpg', rule: 'species-bounds', data: { ...B('monster-rpg'), species: { S: { maxhp: 0 } } } },
  { p: 'monster-rpg', rule: 'species-bounds', data: { ...B('monster-rpg'), species: { A: { evolvesInto: 'B' }, B: {} } } },
  { p: 'monster-rpg', rule: 'encounter-zone', data: { ...B('monster-rpg'), encounters: { volcan: [] } } },   // warn
  { p: 'monster-rpg', rule: 'tile-id-range', data: { ...B('monster-rpg'), tiles: { 99: { name: 'x' } } } },
  { p: 'monster-rpg', rule: 'sprite-4bpp', data: { ...B('monster-rpg'), sprites: { S: (() => { const m = Array.from({ length: 16 }, () => Array(16).fill(0)); m[0][0] = 99; return m; })() } } },
  // Forma compacta hex del arte: caracter no-hex o dimensiones malas deben fallar igual.
  { p: 'monster-rpg', rule: 'sprite-dims', data: { ...B('monster-rpg'), sprites: { S: Array(16).fill('000000000000000z') } } },
  { p: 'monster-rpg', rule: 'sprite-dims', data: { ...B('monster-rpg'), sprites: { S: Array(16).fill('0000') } } },
  { p: 'monster-rpg', rule: 'tileart-dims', data: { ...B('monster-rpg'), palettesCount: 8, tiles: { 20: {} }, tileArt: { 20: Array(8).fill('1121103z') } } },
  { p: 'monster-rpg', rule: 'tileart-dims', data: { ...B('monster-rpg'), palettesCount: 8, tiles: { 20: {} }, tileArt: { 20: Array(8).fill('11') } } },
  { p: 'monster-rpg', rule: 'palette-size', data: { ...B('monster-rpg'), palettes: { 0: Array.from({ length: 20 }, () => [1, 1, 1]) } } },   // warn
  { p: 'monster-rpg', rule: 'trainer-bounds', data: { ...B('monster-rpg'), trainers: { T: { prize: 5, team: [] } } } },
  { p: 'monster-rpg', rule: 'player-ref', data: { ...B('monster-rpg'), items: { TONIC: { effect: 'heal', amount: 1 } }, player: { inventory: { TONIC: -3 } } } },
  { p: 'monster-rpg', rule: 'overworld-ref', data: { ...B('monster-rpg'), platform: { cols: 8, rows: 8 }, overworld: { area: { npcs: [{ col: 0, row: 999, dialogue: 'x' }] } } } },

  // ---- core: version-migration (S2.3) — GAME.md 0.1 lintero contra tooling 0.2 → warn ----
  // El tooling simula specVersion 0.2 (perfil sintético shallow-copy con specVersion subida);
  // el archivo declara 0.1 → warn version-migration (consulta MIGRATION.md), 0 errores.
  { p: 'monster-rpg', rule: 'version-migration',
    data: { ...B('monster-rpg') },
    opts: { profile: Object.assign({}, loadProfile('monster-rpg'), { specVersion: '0.2' }) } },

  // ---- papers-please ----
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

  // ---- platformer ----
  { p: 'platformer', rule: 'enemy-ref', data: { ...B('platformer'), enemies: {}, levels: { 1: { enemies: ['NOPE'] } } } },
  { p: 'platformer', rule: 'tileset-ref', data: { ...B('platformer'), tilesets: {}, levels: { 1: { tileset: 'NOPE' } } } },
  { p: 'platformer', rule: 'spawn-ref', data: { ...B('platformer'), levels: {}, player: { spawnLevel: 'NOPE' } } },
  { p: 'platformer', rule: 'enemy-bounds', data: { ...B('platformer'), enemies: { E: { hp: -1 } } } },
  { p: 'platformer', rule: 'physics-bounds', data: { ...B('platformer'), physics: { gravity: -1 } } },
  { p: 'platformer', rule: 'level-goal', data: { ...B('platformer'), levels: { 1: { goal: { x: 'a' } } } } },

  // ---- roguelike ----
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

  // ---- tower-defense ----
  // broken-ref family
  { p: 'tower-defense', rule: 'tower-dmgtype-valid', data: TD({ towers: { T: { cost: 10, range: 1, damage: 1, rate: 1, dmgType: 'NOPE' } } }) },
  { p: 'tower-defense', rule: 'wave-enemy-valid', data: TD({ waves: { 1: { spawns: [{ enemy: 'NOPE', count: 1, gap: 0 }] } } }) },
  { p: 'tower-defense', rule: 'tower-sprite-ref', data: TD({ towers: { T: { cost: 10, range: 1, damage: 1, rate: 1, dmgType: 'PHYSICAL', sprite: 'NOPE' } }, sprites: {} }) },
  { p: 'tower-defense', rule: 'enemy-sprite-ref', data: TD({ enemies: { E: { hp: 1, speed: 1, armor: 'LIGHT', bounty: 1, sprite: 'NOPE' } }, sprites: {} }) },
  // tower bounds
  { p: 'tower-defense', rule: 'tower-cost-valid', data: TD({ towers: { T: { cost: -5, range: 1, damage: 1, rate: 1, dmgType: 'PHYSICAL' } } }) },
  { p: 'tower-defense', rule: 'tower-range', data: TD({ towers: { T: { cost: 1, range: 0, damage: 1, rate: 1, dmgType: 'PHYSICAL' } } }) },
  { p: 'tower-defense', rule: 'tower-damage', data: TD({ towers: { T: { cost: 1, range: 1, damage: -1, rate: 1, dmgType: 'PHYSICAL' } } }) },
  { p: 'tower-defense', rule: 'tower-rate', data: TD({ towers: { T: { cost: 1, range: 1, damage: 1, rate: 0, dmgType: 'PHYSICAL' } } }) },
  // enemies
  { p: 'tower-defense', rule: 'enemy-bounds', data: TD({ enemies: { E: { hp: -1, speed: 1, armor: 'LIGHT', bounty: 1 } } }) },
  { p: 'tower-defense', rule: 'enemy-armor-valid', data: TD({ enemies: { E: { hp: 1, speed: 1, armor: 'NOPE', bounty: 1 } } }) },
  // waves
  { p: 'tower-defense', rule: 'wave-valid', data: TD({ enemies: { E: { hp: 1, speed: 1, armor: 'LIGHT', bounty: 1 } }, waves: { 1: { spawns: [{ enemy: 'E', count: 0, gap: 0 }] } } }) },
  { p: 'tower-defense', rule: 'wave-monotonic', data: TD({ enemies: { E: { hp: 10, speed: 1, armor: 'LIGHT', bounty: 1 } }, waves: { 1: { spawns: [{ enemy: 'E', count: 10, gap: 0 }] }, 2: { spawns: [{ enemy: 'E', count: 1, gap: 0 }] } } }) },
  // economy
  { p: 'tower-defense', rule: 'economy-balance', data: TD({ economy: { startGold: -5, startLives: 20 }, balance: { sellRatio: 0.5, interestRate: 0 } }) },
  // dmg chart
  { p: 'tower-defense', rule: 'dmgtype-armor-valid', data: { version: '0.1', name: 'x', profile: 'tower-defense', armors: ['LIGHT'], dmgTypes: { PHYSICAL: { NOPE: 1.0 } } } },
  { p: 'tower-defense', rule: 'dmgtype-mult', data: { version: '0.1', name: 'x', profile: 'tower-defense', armors: ['LIGHT'], dmgTypes: { PHYSICAL: { LIGHT: -1 } } } },
  { p: 'tower-defense', rule: 'dmgtype-symmetry', data: { version: '0.1', name: 'x', profile: 'tower-defense', armors: ['LIGHT', 'MEDIUM'], dmgTypes: { PHYSICAL: { LIGHT: 1.0, MEDIUM: 1.0 } } } },
  // maps
  { p: 'tower-defense', rule: 'map-legend-ref', data: TD({ maps: { m: { rows: ['..'], legend: { X: { tile: 999, pal: 0 } } } } }) },
  { p: 'tower-defense', rule: 'path-contiguous', data: TD({ platform: { rows: 3, cols: 3 }, maps: { m: { rows: ['...', '...', '...'], path: [{ col: 0, row: 0 }, { col: 2, row: 0 }] } } }) },
  // sprites / tileArt (shared with other tile-based profiles)
  { p: 'tower-defense', rule: 'sprite-dims', data: TD({ sprites: { S: [[0]] } }) },
  { p: 'tower-defense', rule: 'tileart-dims', data: TD({ tileArt: { 20: [[0]] } }) },

  // ---- advance-wars ----
  { p: 'advance-wars', rule: 'palette-color-range', data: { ...B('advance-wars'), palettes: { 0: [[999, 0, 0]] } } },
  { p: 'advance-wars', rule: 'unit-palette-ref', data: { ...B('advance-wars'), palettes: { 0: [[1, 1, 1]] }, units: { A: { palette: 5, width: 1, height: 1, tileData: [[0]] } } } },
  { p: 'advance-wars', rule: 'unit-dims', data: { ...B('advance-wars'), palettes: { 0: [[1, 1, 1]] }, units: { A: { palette: 0, width: 8, height: 8, tileData: [[0]] } } } },
  { p: 'advance-wars', rule: 'unit-tiledata-range', data: { ...B('advance-wars'), palettes: { 0: [[1, 1, 1]] }, units: { A: { palette: 0, width: 1, height: 1, tileData: [[99]] } } } },

  // ---- quiz (perfil puro-datos: profiles/quiz.json, sin funciones) ----
  { p: 'quiz', rule: 'question-category-ref', data: { ...B('quiz'), categories: {}, questions: { Q: { category: 'NOPE', difficulty: 'easy', points: 1 } } } },
  { p: 'quiz', rule: 'round-question-ref', data: { ...B('quiz'), questions: {}, rounds: { 1: { questions: ['NOPE'] } } } },
  { p: 'quiz', rule: 'question-points', data: { ...B('quiz'), categories: { C: {} }, questions: { Q: { category: 'C', difficulty: 'easy' } } } },
  { p: 'quiz', rule: 'question-time', data: { ...B('quiz'), categories: { C: {} }, questions: { Q: { category: 'C', difficulty: 'easy', points: 1, seconds: 3 } } } },
  { p: 'quiz', rule: 'question-difficulty', data: { ...B('quiz'), categories: { C: {} }, questions: { Q: { category: 'C', difficulty: 'imposible', points: 1 } } } },
  { p: 'quiz', rule: 'round-reward', data: { ...B('quiz'), rounds: { 1: { questions: [], reward: -5 } } } },

  // ---- peg-solitaire (perfil puro-datos: profiles/peg-solitaire.json; el layout lo valida pegCheck en game3d-logic) ----
  { p: 'peg-solitaire', rule: 'player-start-ref', data: { ...B('peg-solitaire'), boards: {}, player: { start: 'NOPE' } } },
  { p: 'peg-solitaire', rule: 'board-goal', data: { ...B('peg-solitaire'), boards: { X: { layout: ['oo.'], goal: 'sideways', difficulty: 'easy' } } } },
  { p: 'peg-solitaire', rule: 'board-difficulty', data: { ...B('peg-solitaire'), boards: { X: { layout: ['oo.'], goal: 'clear', difficulty: 'imposible' } } } },

  // ---- sudoku (perfil puro-datos: profiles/sudoku.json; grid/solution los valida sudokuCheck en game3d-logic) ----
  { p: 'sudoku', rule: 'player-start-ref', data: { ...B('sudoku'), puzzles: {}, player: { start: 'NOPE' } } },
  { p: 'sudoku', rule: 'puzzle-difficulty', data: { ...B('sudoku'), puzzles: { P: { grid: 'x', solution: 'y', difficulty: 'imposible' } } } },
  { p: 'sudoku', rule: 'sudoku-balance', data: { ...B('sudoku'), balance: { lives: -1 } } },

  // ---- shooter (perfil puro-datos: profiles/shooter.json, sin funciones) ----
  { p: 'shooter', rule: 'ship-weapon-ref', data: { ...B('shooter'), weapons: {}, ships: { V: { speed: 1, hp: 1, weapon: 'NOPE' } } } },
  { p: 'shooter', rule: 'enemy-weapon-ref', data: { ...B('shooter'), weapons: {}, enemies: { D: { hp: 1, speed: 1, behavior: 'chaser', weapon: 'NOPE' } } } },
  { p: 'shooter', rule: 'wave-enemy-ref', data: { ...B('shooter'), enemies: {}, waves: { 1: { spawns: [{ enemy: 'NOPE', count: 1, gap: 1 }] } } } },
  { p: 'shooter', rule: 'player-ship-ref', data: { ...B('shooter'), ships: {}, player: { ship: 'NOPE' } } },
  { p: 'shooter', rule: 'ship-bounds', data: { ...B('shooter'), weapons: { W: { damage: 1, rate: 1, bulletSpeed: 1 } }, ships: { V: { speed: 0, hp: 1, weapon: 'W' } } } },
  { p: 'shooter', rule: 'weapon-bounds', data: { ...B('shooter'), weapons: { W: { damage: 0, rate: 1, bulletSpeed: 1 } } } },
  { p: 'shooter', rule: 'enemy-bounds', data: { ...B('shooter'), enemies: { D: { hp: 0, speed: 1, behavior: 'chaser' } } } },
  { p: 'shooter', rule: 'enemy-behavior', data: { ...B('shooter'), enemies: { D: { hp: 1, speed: 1, behavior: 'zigzag' } } } },
  { p: 'shooter', rule: 'powerup-effect', data: { ...B('shooter'), powerups: { P: { effect: 'nuke' } } } },
  { p: 'shooter', rule: 'powerup-amount', data: { ...B('shooter'), powerups: { P: { effect: 'heal', amount: 0 } } } },
  { p: 'shooter', rule: 'powerup-duration', data: { ...B('shooter'), powerups: { P: { effect: 'rapid', duration: 0 } } } },
  { p: 'shooter', rule: 'arena-bounds', data: { ...B('shooter'), arena: { width: 0, height: 5 } } },
  { p: 'shooter', rule: 'balance-bounds', data: { ...B('shooter'), balance: { powerupChance: 2 } } },

  // ---- voxel ----
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

// ---- Nivel `deprecated` (S2.1): regla marcada deprecated → finding level=deprecated con
// since/removedIn, 0 errores (no rompe el gate). Regla sintética con .deprecated = {since,removedIn}.
(function () {
  const ruleDeprecated = function ruleOldX() {};           // no-op: la regla sigue aplicando, pero aquí sin datos que disparar
  ruleDeprecated.deprecated = { since: '0.1', removedIn: '1.0' };
  const prof = { id: 't', specVersion: '0.1', sections: [], required: ['version', 'name', 'profile'], refs: [], rules: [ruleDeprecated] };
  const f = lintGame({ version: '0.1', name: 'x', profile: 't' }, '', { profile: prof, frontMatterPresent: true });
  const dep = f.find(x => x.level === 'deprecated' && x.rule === 'ruleOldX');
  ok(!!dep && dep.since === '0.1' && dep.removedIn === '1.0',
     'deprecated  regla marcada → finding level=deprecated con since/removedIn', JSON.stringify(f));
  ok(f.filter(x => x.level === 'error').length === 0,
     'deprecated  no breaking lint (0 errores)', JSON.stringify(f));
})();

// ---- FAMILIAS declarativas bounds/dims del core: tabla en el descriptor, sin funciones ----
(function () {
  const prof = { id: 't2', specVersion: '0.1', sections: [], required: ['version', 'name', 'profile'], refs: [],
    bounds: [{ rule: 'hp-range', collection: 'units', field: 'hp', gt: 0, required: true },
             { rule: 'speed-range', singleton: 'physics', field: 'speed', min: 1, max: 9, integer: true }],
    dims: [{ rule: 'grid-dims', collection: 'grids', shape: [2, 2] }],
    enums: [{ rule: 'kind-enum', collection: 'units', field: 'kind', values: ['melee', 'ranged'] }],
    rules: [], derive: [] };
  const L = d => lintGame(Object.assign({ version: '0.1', name: 'x', profile: 't2' }, d), '', { profile: prof, frontMatterPresent: true });
  ok(hasRule(L({ units: { A: { hp: -1 } } }), 'hp-range'), 'familia bounds  hp -1 → hp-range');
  ok(hasRule(L({ units: { A: {} } }), 'hp-range'), 'familia bounds  hp requerido ausente → hp-range');
  ok(hasRule(L({ physics: { speed: 2.5 } }), 'speed-range'), 'familia bounds  integer violado → speed-range');
  ok(hasRule(L({ physics: { speed: 99 } }), 'speed-range'), 'familia bounds  max violado → speed-range');
  ok(hasRule(L({ grids: { g: [[1]] } }), 'grid-dims'), 'familia dims  1x1 vs shape 2x2 → grid-dims');
  ok(hasRule(L({ units: { A: { hp: 5, kind: 'magic' } } }), 'kind-enum'), 'familia enums  valor fuera del set → kind-enum');
  ok(L({ units: { A: { hp: 5, kind: 'melee' } }, physics: { speed: 3 }, grids: { g: [[1, 2], [3, 4]] } })
       .filter(x => x.level === 'error').length === 0, 'familias  datos validos → 0 errores');
})();

console.log('\n— Cobertura inválidos por perfil —');
const order = ['advance-wars', 'adventure', 'crafting', 'dungeon', 'monster-rpg', 'papers-please', 'peg-solitaire', 'platformer', 'quiz', 'roguelike', 'shooter', 'sudoku', 'tower-defense', 'voxel'];
for (const p of order) console.log('  ' + p.padEnd(16) + (byProfile[p] || 0) + ' casos');
console.log('  TOTAL invalidos: ' + invalid.length + '  (validos: ' + examples.length + ')');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' casos de conformidad pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);