/**
 * multi-genre.js — Demuestra que el MISMO core (lint + build) sirve a cualquier género
 * con solo cambiar de perfil. RPG de monstruos, plataformas y crafteo, sin tocar el core.
 *
 * Uso: node game-protocol-draft/test/multi-genre.js
 */
const path = require('path');
const DRAFT = path.resolve(__dirname, '..');
const { lintGame } = require(path.join(DRAFT, 'tools/game-lint-core.js'));
const { buildGame } = require(path.join(DRAFT, 'tools/game-build-core.js'));

const profiles = {
  'monster-rpg': require(path.join(DRAFT, 'profiles/monster-rpg.js')),
  'platformer': require(path.join(DRAFT, 'profiles/platformer.js')),
  'crafting': require(path.join(DRAFT, 'profiles/crafting.js')),
};

// --- Datos válidos por género (front-matter ya parseado) ---
const valid = {
  'monster-rpg': {
    version: '0.1', name: 'Demo', profile: 'monster-rpg', palettesCount: 1,
    types: { FIRE: { GRASS: 2 }, GRASS: { FIRE: 0.5 } },
    moves: { EMBER: { type: 'FIRE', power: 40 } },
    species: { CHAR: { type: 'FIRE', maxhp: 30, moves: ['EMBER'], wild: true } },
    encounters: { route1: ['CHAR'] },
    player: { starter: 'CHAR', level: 5 },
  },
  'platformer': {
    version: '0.1', name: 'Jumpy', profile: 'platformer',
    tilesets: { grass: { name: 'Grass' } },
    enemies: { GOOMBA: { hp: 1, damage: 1 } },
    levels: { '1-1': { tileset: 'grass', enemies: ['GOOMBA'], goal: { x: 200, y: 0 } } },
    physics: { gravity: 9.8, jump: 12, runSpeed: 5 },
    player: { spawnLevel: '1-1', lives: 3 },
  },
  'crafting': {
    version: '0.1', name: 'Forge', profile: 'crafting',
    materials: { IRON: { tier: 1, stack: 99 }, WOOD: { tier: 1, stack: 99 } },
    items: { SWORD: { value: 50 } },
    stations: { ANVIL: {} },
    recipes: { IRON_SWORD: { output: 'SWORD', qty: 1, station: 'ANVIL', inputs: { IRON: 2, WOOD: 1 } } },
  },
};

// --- Datos inválidos por género (deben disparar errores) ---
const invalid = {
  'monster-rpg': { version: '0.1', name: 'Bad', profile: 'monster-rpg', palettesCount: 1,
    species: { CHAR: { type: 'FIRE', moves: ['MISSING'] } }, player: { starter: 'GHOST' } },
  'platformer': { version: '0.1', name: 'Bad', profile: 'platformer',
    enemies: { G: { hp: 0 } }, levels: { '1': { tileset: 'nope', enemies: ['MISSING'] } }, physics: { gravity: -1 } },
  'crafting': { version: '0.1', name: 'Bad', profile: 'crafting',
    materials: {}, items: {}, stations: {}, recipes: { R: { output: 'NOPE', station: 'GHOST', inputs: { UNOBTANIUM: 0 } } } },
};

let ok = true;
for (const id of Object.keys(profiles)) {
  const p = profiles[id];
  const okFindings = lintGame(valid[id], '', { profile: p, frontMatterPresent: true });
  const okErrors = okFindings.filter(f => f.level === 'error');
  const built = buildGame(valid[id], p);
  const badFindings = lintGame(invalid[id], '', { profile: p, frontMatterPresent: true });
  const badErrors = badFindings.filter(f => f.level === 'error');

  const pass = okErrors.length === 0 && badErrors.length > 0 && Object.keys(built).length > 3;
  ok = ok && pass;
  console.log((pass ? 'PASS' : 'FAIL') + '  [' + id + ']  valido: ' + okErrors.length + ' errores · ' +
    'build: ' + Object.keys(built).length + ' claves {' + Object.keys(built).slice(3).join(', ') + '} · ' +
    'invalido: ' + badErrors.length + ' errores');
  if (!pass) badErrors.forEach(f => console.log('     ' + f.rule + ': ' + f.msg));
}
console.log('\n' + (ok ? 'OK — un mismo core compila y valida 3 géneros distintos sin cambios.' : 'FALLÓ'));
process.exit(ok ? 0 : 1);
