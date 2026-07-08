/**
 * profiles/roguelike.js — Perfil "roguelike procedural" del Protocolo GAME.
 * El GAME.md NO declara salas: declara el GENERADOR (semilla, tamaño, profundidad, ramificacion)
 * y PLANTILLAS (tiles, paleta, repertorio de enemigos). El motor instancia las salas en tiempo real
 * al explorar, las fija en memoria y las dibuja en el minimapa. Spec = reglas; motor = generador.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['roguelike'] = api;
})(function () {

  // Helpers compartidos (tools/profile-helpers.js): rulePalettes/ruleTileArt eran duplicados
  // literales en 4 perfiles; ahora se reusan. Resolución isomorfa Node + navegador.
  const H = (typeof require !== 'undefined' && require('../tools/profile-helpers')) ||
            (typeof window !== 'undefined' && window.ProfileHelpers) || {};

  function rulePalettes(ctx) { H.rulePalettes(ctx); }
  function ruleTileArt(ctx) { H.ruleTileArt(ctx); }
  function ruleGenerator({ data, add }) {
    const tiles = data.tiles || {}; const g = data.generator;
    if (!g) { add('error', 'generator-missing', 'falta `generator`'); return; }
    for (const k of ['seed', 'roomW', 'roomH', 'maxDepth']) if (g[k] == null) add('error', 'generator-field', 'generator.' + k + ' requerido');
    if (g.roomW != null && !(g.roomW >= 5)) add('error', 'generator-size', 'generator.roomW >= 5');
    if (g.roomH != null && !(g.roomH >= 5)) add('error', 'generator-size', 'generator.roomH >= 5');
    for (const t of ['floor', 'wall', 'door', 'enemy', 'goal', 'key', 'lockedDoor']) if (g[t] != null && !(g[t] in tiles)) add('error', 'generator-tile', 'generator.' + t + ' tile inexistente: ' + g[t]);
    for (const c of ['branch', 'floorChance', 'itemChance', 'lockChance', 'keyChance'])
      if (g[c] != null && !(g[c] >= 0 && g[c] <= 100)) add('error', 'generator-chance', 'generator.' + c + ' debe estar en 0..100: ' + g[c]);
    for (const e of (data.enemyPool || [])) if (e.tile != null && !(e.tile in tiles)) add('error', 'enemypool-tile', 'enemyPool tile inexistente: ' + e.tile);
    for (const it of (data.itemPool || [])) {
      if (it.tile != null && !(it.tile in tiles)) add('error', 'itempool-tile', 'itemPool tile inexistente: ' + it.tile);
      if (!['heal', 'weapon'].includes(it.kind)) add('error', 'itempool-kind', 'itemPool kind invalido: ' + it.kind);
      if (it.kind === 'heal' && !(it.amount > 0)) add('error', 'itempool-amount', 'item heal sin amount > 0: ' + it.name);
      if (it.kind === 'weapon' && !(it.power > 0)) add('error', 'itempool-power', 'item weapon sin power > 0: ' + it.name);
    }
    const p = data.player || {};
    if (p.tile != null && !(p.tile in tiles)) add('error', 'player-tile', 'player.tile inexistente: ' + p.tile);
    if (p.hp != null && !(p.hp > 0)) add('error', 'player-hp', 'player.hp > 0');
  }
  // boss (opcional): custodia el cofre. tile existente, hp/damage enteros > 0.
  function ruleBoss({ data, add }) {
    const b = data.boss; if (b == null) return;
    if (b.tile == null || !(b.tile in (data.tiles || {}))) add('error', 'boss-fields', 'boss.tile inexistente: ' + b.tile);
    if (!(Number.isInteger(b.hp) && b.hp > 0)) add('error', 'boss-fields', 'boss.hp entero > 0');
    if (!(Number.isInteger(b.damage) && b.damage > 0)) add('error', 'boss-fields', 'boss.damage entero > 0');
  }
  // progression (opcional): XP por bajas y permadeath declarativo.
  function ruleProgression({ data, add }) {
    const p = data.progression; if (p == null) return;
    if (!(Number.isInteger(p.killsPerAtk) && p.killsPerAtk > 0)) add('error', 'progression-fields', 'progression.killsPerAtk entero > 0');
    if (!(Number.isInteger(p.maxBonus) && p.maxBonus >= 0)) add('error', 'progression-fields', 'progression.maxBonus entero >= 0');
    if (p.permadeath != null && typeof p.permadeath !== 'boolean') add('error', 'progression-fields', 'progression.permadeath debe ser boolean');
  }
  function ruleText({ data, add }) {
    for (const [k, v] of Object.entries(data.text || {}))
      if (typeof v !== 'string' || v.trim() === '') add('error', 'text-valid', 'text.' + k + ' vacio');
  }

  const derive = [
    { key: 'PALETTES', from: 'palettes' },
    { key: 'TILES', from: 'tiles' },
    { key: 'TILE_ART', from: 'tileArt' },
    { key: 'GENERATOR', from: 'generator' },
    { key: 'ENEMY_POOL', from: 'enemyPool', default: [] },
    { key: 'ITEM_POOL', from: 'itemPool', default: [] },
    { key: 'PLAYER', from: 'player' },
    { key: 'BOSS', from: 'boss' },
    { key: 'PROGRESSION', from: 'progression' },
    { key: 'TEXT', from: 'text' },
    { key: 'WIN', from: 'win' },
  ];

  return {
    id: 'roguelike', specVersion: '0.1',
    sections: ['Overview', 'Tiles', 'Generator', 'Player', 'Text', "Do's and Don'ts"],
    required: ['version', 'name'], refs: [],
    rules: [rulePalettes, ruleTileArt, ruleGenerator, ruleBoss, ruleProgression, ruleText],
    derive: derive,
  };
});
