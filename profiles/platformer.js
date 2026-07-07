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

  // FAMILIA range/bounds DECLARATIVA del core: sustituye a las antiguas funciones
  // ruleEnemyStats / rulePhysics con una tabla de datos (mismos rule ids y niveles).
  // Este perfil es la prueba de que la familia funciona sin logica propia.
  const bounds = [
    { rule: 'enemy-bounds', collection: 'enemies', field: 'hp', gt: 0, required: true,
      msg: (v, k) => 'enemigo ' + k.split('.').pop() + ' tiene hp invalido: ' + v },
    { rule: 'enemy-bounds', collection: 'enemies', field: 'damage', min: 0,
      msg: (v, k) => 'enemigo ' + k.split('.').pop() + ' tiene damage negativo: ' + v },
    { rule: 'physics-bounds', singleton: 'physics', field: 'gravity', gt: 0 },
    { rule: 'physics-bounds', singleton: 'physics', field: 'jump', gt: 0 },
    { rule: 'physics-bounds', singleton: 'physics', field: 'runSpeed', gt: 0 },
  ];

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
    bounds: bounds,
    rules: [ruleLevelGoal],
    derive: derive,
  };
});
