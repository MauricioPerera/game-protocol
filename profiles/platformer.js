/**
 * profiles/platformer.js — Perfil "plataformas" del Protocolo GAME.
 * Mismo core, vocabulario distinto: tilesets, enemigos, niveles, física.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['platformer'] = api;
})(function () {

  const refs = [
    { rule: 'enemy-ref', level: 'error',
      src: { collection: 'levels', arrayField: 'enemies' }, target: { collection: 'enemies' },
      msg: (v, k) => 'level ' + k + ' referencia enemigo inexistente: ' + v },
    { rule: 'tileset-ref', level: 'error', optional: true,
      src: { collection: 'levels', field: 'tileset' }, target: { collection: 'tilesets' },
      msg: (v, k) => 'level ' + k + ' usa tileset inexistente: ' + v },
    { rule: 'spawn-ref', level: 'error', optional: true,
      src: { singleton: 'player', field: 'spawnLevel' }, target: { collection: 'levels' },
      msg: (v) => 'player.spawnLevel referencia un nivel inexistente: ' + v },
  ];

  function ruleEnemyStats({ data, add }) {
    for (const [n, e] of Object.entries(data.enemies || {})) {
      if (!(e.hp > 0)) add('error', 'enemy-bounds', 'enemigo ' + n + ' tiene hp invalido: ' + e.hp);
      if (e.damage != null && e.damage < 0) add('error', 'enemy-bounds', 'enemigo ' + n + ' tiene damage negativo: ' + e.damage);
    }
  }
  function rulePhysics({ data, add }) {
    const p = data.physics || {};
    for (const k of ['gravity', 'jump', 'runSpeed'])
      if (p[k] != null && !(p[k] > 0)) add('error', 'physics-bounds', 'physics.' + k + ' debe ser > 0: ' + p[k]);
  }
  function ruleLevelGoal({ data, add }) {
    for (const [n, l] of Object.entries(data.levels || {})) {
      if (l.goal && (typeof l.goal.x !== 'number' || typeof l.goal.y !== 'number'))
        add('error', 'level-goal', 'level ' + n + '.goal debe tener x/y numericos');
    }
  }

  const derive = [
    { key: 'TILESETS', from: 'tilesets' },
    { key: 'ENEMIES', from: 'enemies' },
    { key: 'LEVELS', from: 'levels' },
    { key: 'PHYSICS', from: 'physics' },
    { key: 'PLAYER', from: 'player' },
    { key: 'TEXT', from: 'text' },
    { key: 'SFX', from: 'sfx' },
  ];

  return {
    id: 'platformer',
    specVersion: '0.1',
    sections: ['Overview', 'Tilesets', 'Enemies', 'Levels', 'Player', 'Physics', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [ruleEnemyStats, rulePhysics, ruleLevelGoal],
    derive: derive,
  };
});
