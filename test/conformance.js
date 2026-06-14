/**
 * conformance.js — Suite de conformidad del Protocolo GAME.
 * VALIDO:   cada ejemplo por perfil debe linter con 0 errores.
 * INVALIDO: cada caso debe disparar una regla concreta (prueba que el contrato detecta el fallo).
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
const lintData = (data, pid) => lintGame(data, '', { profile: loadProfile(pid), frontMatterPresent: true });
const hasRule = (f, rule) => f.some(x => x.rule === rule && x.level === 'error');
const invalid = [
  { p: 'monster-rpg', rule: 'moves-exist', data: { version: '0.1', name: 'x', profile: 'monster-rpg', palettesCount: 1, types: { FIRE: {} }, species: { A: { type: 'FIRE', moves: ['NOPE'] } } } },
  { p: 'platformer', rule: 'enemy-ref', data: { version: '0.1', name: 'x', profile: 'platformer', levels: { '1': { enemies: ['NOPE'] } } } },
  { p: 'crafting', rule: 'recipe-output', data: { version: '0.1', name: 'x', profile: 'crafting', materials: {}, items: {}, stations: {}, recipes: { R: { output: 'NOPE', inputs: {} } } } },
  { p: 'papers-please', rule: 'rule-type-valid', data: { version: '0.1', name: 'x', profile: 'papers-please', countries: {}, documents: {}, rules: { R: { type: 'teleport' } }, entrants: {}, days: {} } },
  { p: 'voxel', rule: 'structure-prefab-ref', data: { version: '0.1', name: 'x', profile: 'voxel', palettesCount: 1, materials: {}, prefabs: {}, structures: { s: { place: [{ prefab: 'NOPE', at: [0, 0, 0] }] } } } },
  { p: 'dungeon', rule: 'warp-ref', data: { version: '0.1', name: 'x', profile: 'dungeon', palettesCount: 1, tiles: { 17: { name: 'w', solid: true } }, scenes: { a: { rows: ['WW', 'WW'], warps: [{ col: 0, row: 0, to: 'NOPE' }] } }, player: { start: { scene: 'a' } } } },
  { p: 'roguelike', rule: 'generator-tile', data: { version: '0.1', name: 'x', profile: 'roguelike', palettesCount: 1, tiles: { 17: { name: 'w', solid: true } }, generator: { seed: 1, roomW: 5, roomH: 5, maxDepth: 1, floor: 99, wall: 17 }, player: { tile: 17, hp: 1 } } },
  { p: 'adventure', rule: 'goal-lock', data: { version: '0.1', name: 'x', profile: 'adventure', palettesCount: 1, tiles: { 48: { name: 'f', solid: false }, 19: { name: 'd', solid: false } }, scene: { fill: { tile: 48, pal: 0 }, rows: ['....', '....', '....'] }, player: { start: { col: 1, row: 1 } }, entities: { goal: { col: 2, row: 2, tile: 19, pal: 0, locked: 'KEY' } }, text: { x: 'y' } } },
];
for (const c of invalid) {
  const f = lintData(c.data, c.p);
  ok(hasRule(f, c.rule), 'invalido ' + c.p + ' → dispara ' + c.rule, 'reglas vistas: ' + errs(f).map(x => x.rule).join(', '));
}

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' casos de conformidad pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
