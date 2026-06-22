/**
 * buildGame-content.js — Tests de CONTENIDO de buildGame por perfil (Q4 / T4 inicio).
 * multi-genre.js sólo afirma Object.keys(built).length > 3; aquí se valida que cada perfil
 * produce sus CLAVES DERIVADAS con la forma esperada (no sólo conteo).
 *
 * (A) Targeted: monster-rpg → WILD_LIST / EVOLUTIONS / ECONOMY / SOLID_TILES con forma.
 * (B) Targeted: voxel → VOXELS.<structure>.bounds + voxels.
 * (C) Broad: los 8 examples/*.GAME.md → buildGame contiene TODAS las claves de profile.derive.
 *
 * Uso: node test/buildGame-content.js
 */
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const { buildGame } = require(path.join(REPO, 'tools/game-build-core.js'));
const { splitFrontMatter, parseYamlSubset } = require(path.join(REPO, 'tools/yaml-min.js'));
const loadProfile = id => require(path.join(REPO, 'profiles/' + id + '.js'));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

// ---- (A) monster-rpg: claves derivadas con forma ----
{
  const p = loadProfile('monster-rpg');
  const data = {
    version: '0.1', name: 'Demo', profile: 'monster-rpg', palettesCount: 1,
    types: { FIRE: { GRASS: 2 } },
    moves: { EMBER: { type: 'FIRE', power: 40 } },
    species: {
      CHAR: { type: 'FIRE', maxhp: 30, moves: ['EMBER'], wild: true, pal: 'red', sprite: 's1', evolvesInto: 'CHARZ', atLevel: 16 },
      CHARZ: { type: 'FIRE', maxhp: 60, moves: ['EMBER'], pal: 'red', sprite: 's2' },
    },
    items: { POTION: { price: 50 } },
    tiles: { 1: { name: 'wall', solid: true }, 2: { name: 'floor' } },
    economy: { startMoney: 100 },
  };
  const G = buildGame(data, p);
  // WILD_LIST: array con la especie wild, cada entry con moves expandidos
  ok(Array.isArray(G.WILD_LIST) && G.WILD_LIST.length === 1 && G.WILD_LIST[0].name === 'CHAR',
     'monster-rpg  WILD_LIST = [CHAR] con moves', JSON.stringify(G.WILD_LIST && G.WILD_LIST[0]));
  ok(G.WILD_LIST[0].moves && G.WILD_LIST[0].moves[0] && G.WILD_LIST[0].moves[0].name === 'EMBER',
     'monster-rpg  WILD_LIST expande moves (EMBER con type/power)');
  // EVOLUTIONS: object con la evo, entry con `into`
  ok(G.EVOLUTIONS && G.EVOLUTIONS.CHAR && G.EVOLUTIONS.CHAR.into === 'CHARZ',
     'monster-rpg  EVOLUTIONS.CHAR.into = CHARZ', JSON.stringify(G.EVOLUTIONS));
  ok(G.EVOLUTIONS.CHAR.maxhp === 60 && G.EVOLUTIONS.CHAR.type === 'FIRE',
     'monster-rpg  EVOLUTIONS deriva maxhp/type del destino');
  // ECONOMY: mergea economy + prices derivadas de items
  ok(G.ECONOMY && G.ECONOMY.startMoney === 100 && G.ECONOMY.prices && G.ECONOMY.prices.POTION === 50,
     'monster-rpg  ECONOMY = economy + prices derivadas', JSON.stringify(G.ECONOMY));
  // SOLID_TILES: ids de tiles solid, ordenados
  ok(Array.isArray(G.SOLID_TILES) && G.SOLID_TILES.length === 1 && G.SOLID_TILES[0] === 1,
     'monster-rpg  SOLID_TILES = [1]', JSON.stringify(G.SOLID_TILES));
}

// ---- (B) voxel: VOXELS.<structure>.bounds + voxels ----
{
  const p = loadProfile('voxel');
  const data = {
    version: '0.1', name: 'Vox', profile: 'voxel',
    materials: { STONE: { color: [10, 10, 10] }, WOOD: { color: [20, 15, 5] } },
    prefabs: {
      P: { size: [2, 2, 1], cells: [
        { x: 0, y: 0, z: 0, m: 'STONE' }, { x: 1, y: 0, z: 0, m: 'WOOD' },
        { x: 0, y: 1, z: 0, m: 'WOOD' }, { x: 1, y: 1, z: 0, m: 'STONE' },
      ] },
    },
    structures: { hut: { place: [{ prefab: 'P', at: [0, 0, 0] }] } },
  };
  const G = buildGame(data, p);
  ok(G.VOXELS && G.VOXELS.hut, 'voxel  VOXELS.hut existe', JSON.stringify(G.VOXELS && Object.keys(G.VOXELS)));
  ok(G.VOXELS.hut.bounds && Array.isArray(G.VOXELS.hut.bounds.min) && Array.isArray(G.VOXELS.hut.bounds.max),
     'voxel  VOXELS.hut.bounds {min,max}', JSON.stringify(G.VOXELS && G.VOXELS.hut && G.VOXELS.hut.bounds));
  ok(Array.isArray(G.VOXELS.hut.voxels) && G.VOXELS.hut.voxels.length === 4,
     'voxel  VOXELS.hut.voxels = 4 celdas', G.VOXELS && G.VOXELS.hut && ('len=' + G.VOXELS.hut.voxels.length));
  ok(G.VOXELS.hut.voxels[0].m === 'STONE', 'voxel  voxel[0].m = STONE');
}

// ---- (C) Targeted: tower-defense → 8 claves del dominio (TOWERS/DMG_CHART/ENEMIES/ARMORS/WAVES/MAPS/ECONOMY/BALANCE) ----
{
  const p = loadProfile('tower-defense');
  const t = fs.readFileSync(path.join(REPO, 'examples', 'tower-defense.GAME.md'), 'utf8').replace(/\r\n/g, '\n');
  const { fm } = splitFrontMatter(t);
  const data = fm ? parseYamlSubset(fm) : {};
  const G = buildGame(data, p);
  const TD_KEYS = ['TOWERS', 'DMG_CHART', 'ENEMIES', 'ARMORS', 'WAVES', 'MAPS', 'ECONOMY', 'BALANCE'];
  for (const k of TD_KEYS) {
    ok(k in G, 'tower-defense  ' + k + ' presente', 'faltan: ' + k);
  }
  //Forma mínima: TOWERS.rifle, DMG_CHART con armor matrix, ENEMIES.RUNNER, WAVES.1 con spawns, ECONOMY.startGold, BALANCE.sellRatio
  ok(G.TOWERS && G.TOWERS.rifle && G.TOWERS.rifle.cost === 50, 'tower-defense  TOWERS.rifle.cost = 50',
     JSON.stringify(G.TOWERS && G.TOWERS.rifle));
  ok(G.DMG_CHART && G.DMG_CHART.PHYSICAL && G.DMG_CHART.PHYSICAL.LIGHT === 1.0,
     'tower-defense  DMG_CHART.PHYSICAL.LIGHT = 1.0', JSON.stringify(G.DMG_CHART));
  ok(G.ENEMIES && G.ENEMIES.RUNNER && G.ENEMIES.RUNNER.hp === 10, 'tower-defense  ENEMIES.RUNNER.hp = 10',
     JSON.stringify(G.ENEMIES && G.ENEMIES.RUNNER));
  ok(G.ARMORS && Array.isArray(G.ARMORS) && G.ARMORS.length === 3, 'tower-defense  ARMORS = [LIGHT,MEDIUM,HEAVY]',
     JSON.stringify(G.ARMORS));
  ok(G.WAVES && G.WAVES['1'] && Array.isArray(G.WAVES['1'].spawns) && G.WAVES['1'].spawns.length === 1,
     'tower-defense  WAVES.1.spawns = [RUNNER x5]', JSON.stringify(G.WAVES && G.WAVES['1']));
  ok(G.WAVES['1'].spawns[0].enemy === 'RUNNER' && G.WAVES['1'].spawns[0].hp === 10,
     'tower-defense  WAVES.1.spawns[0] expande hp del enemy', JSON.stringify(G.WAVES['1'].spawns[0]));
  ok(G.ECONOMY && G.ECONOMY.startGold === 200 && G.ECONOMY.startLives === 20,
     'tower-defense  ECONOMY = {startGold:200, startLives:20}', JSON.stringify(G.ECONOMY));
  ok(G.BALANCE && G.BALANCE.sellRatio === 0.7 && G.BALANCE.interestRate === 0.05,
     'tower-defense  BALANCE = {sellRatio:0.7, interestRate:0.05}', JSON.stringify(G.BALANCE));
}

// ---- (D) Broad: 9 ejemplos → buildGame contiene todas las claves de profile.derive ----
const examples = [
  ['GAME.md', 'monster-rpg'], ['platformer.GAME.md', 'platformer'], ['crafting.GAME.md', 'crafting'],
  ['papers-please.GAME.md', 'papers-please'], ['voxel.GAME.md', 'voxel'], ['adventure.GAME.md', 'adventure'],
  ['dungeon.GAME.md', 'dungeon'], ['roguelike.GAME.md', 'roguelike'], ['tower-defense.GAME.md', 'tower-defense'],
];
const META_KEYS = new Set(['generatedFrom', 'name', 'description', 'platform', 'palettesCount']);
for (const [mdFile, pid] of examples) {
  const t = fs.readFileSync(path.join(REPO, 'examples', mdFile), 'utf8').replace(/\r\n/g, '\n');
  const { fm } = splitFrontMatter(t);
  const data = fm ? parseYamlSubset(fm) : {};
  const p = loadProfile(pid);
  const G = buildGame(data, p);
  const deriveKeys = (p.derive || []).map(d => d.key);
  const missing = deriveKeys.filter(k => !(k in G));
  ok(missing.length === 0, 'build  ' + pid + '  derivadas presentes (' + deriveKeys.length + ' claves)',
     missing.length ? 'faltan: ' + missing.join(', ') : '');
  // meta universal siempre presente
  ok(['generatedFrom', 'name', 'platform', 'palettesCount'].every(k => k in G),
     'build  ' + pid + '  meta universal presente');
}

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos de contenido buildGame pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);