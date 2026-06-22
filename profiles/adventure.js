/**
 * profiles/adventure.js — Perfil "aventura top-down" del Protocolo GAME.
 * Una escena jugable completa: tiles+arte, una sala, entidades (NPC, objetos, meta) y jugador.
 * Gráficos 100% desde el spec (tileArt 8x8 + palettes). El motor solo hace el render y el input.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['adventure'] = api;
})(function () {

  // Helpers compartidos (tools/profile-helpers.js): rulePalettes/ruleTileArt eran duplicados
  // literales en 4 perfiles; ahora se reusan. Resolución isomorfa Node + navegador.
  const H = (typeof require !== 'undefined' && require('../tools/profile-helpers')) ||
            (typeof window !== 'undefined' && window.ProfileHelpers) || {};

  function rulePalettes(ctx) { H.rulePalettes(ctx); }
  function ruleTileArt(ctx) { H.ruleTileArt(ctx); }
  function sceneDims(data) {
    const rows = (data.scene || {}).rows || [];
    return { h: rows.length, w: rows.length ? String(rows[0]).length : 0 };
  }
  function ruleScene({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    const sc = data.scene || {};
    const rows = sc.rows || [];
    if (!rows.length) { add('error', 'scene-rows', 'scene.rows vacio'); return; }
    const w = String(rows[0]).length;
    for (let r = 0; r < rows.length; r++)
      if (String(rows[r]).length !== w) add('error', 'scene-dims', 'scene fila ' + r + ' no tiene ' + w + ' columnas');
    const cells = Object.assign({}, sc.legend || {});
    if (sc.fill) cells['<fill>'] = sc.fill;
    for (const [sym, cell] of Object.entries(cells)) {
      if (!cell || cell.tile == null || !(cell.tile in tiles))
        add('error', 'scene-legend-ref', 'scene simbolo "' + sym + '" referencia tile inexistente: ' + (cell && cell.tile));
      if (cell && typeof cell.pal === 'number' && (cell.pal < 0 || cell.pal >= palCount))
        add('error', 'scene-legend-ref', 'scene simbolo "' + sym + '" usa paleta fuera de rango: ' + cell.pal);
    }
  }
  function ruleEntities({ data, add }) {
    const tiles = data.tiles || {}; const text = data.text || {};
    const { w, h } = sceneDims(data);
    const inB = (c, r) => typeof c === 'number' && typeof r === 'number' && c >= 0 && r >= 0 && c < w && r < h;
    const ent = data.entities || {};
    const pickItems = new Set((ent.pickups || []).map(p => p.item));
    for (const n of (ent.npcs || [])) {
      if (!inB(n.col, n.row)) add('error', 'entity-bounds', 'NPC fuera de la escena: ' + JSON.stringify([n.col, n.row]));
      if (n.tile != null && !(n.tile in tiles)) add('error', 'entity-tile', 'NPC usa tile inexistente: ' + n.tile);
      if (!n.dialogue || !(n.dialogue in text)) add('warn', 'entity-text', 'NPC.dialogue no referencia un text valido: ' + n.dialogue);
    }
    for (const p of (ent.pickups || [])) {
      if (!inB(p.col, p.row)) add('error', 'entity-bounds', 'pickup fuera de la escena: ' + JSON.stringify([p.col, p.row]));
      if (p.tile != null && !(p.tile in tiles)) add('error', 'entity-tile', 'pickup usa tile inexistente: ' + p.tile);
      if (!p.item) add('error', 'entity-item', 'pickup sin `item`');
    }
    const g = ent.goal;
    if (g) {
      if (!inB(g.col, g.row)) add('error', 'entity-bounds', 'goal fuera de la escena: ' + JSON.stringify([g.col, g.row]));
      if (g.tile != null && !(g.tile in tiles)) add('error', 'entity-tile', 'goal usa tile inexistente: ' + g.tile);
      if (g.locked && !pickItems.has(g.locked)) add('error', 'goal-lock', 'goal.locked exige un item que ningun pickup otorga: ' + g.locked);
    } else add('warn', 'goal-missing', 'la escena no tiene goal (no se puede ganar)');
  }
  function rulePlayer({ data, add }) {
    const { w, h } = sceneDims(data); const st = (data.player || {}).start;
    if (!st || !(st.col >= 0 && st.row >= 0 && st.col < w && st.row < h))
      add('error', 'player-start', 'player.start fuera de la escena: ' + JSON.stringify(st));
  }
  function ruleText({ data, add }) {
    for (const [k, v] of Object.entries(data.text || {}))
      if (typeof v !== 'string' || v.trim() === '') add('error', 'text-valid', 'text.' + k + ' vacio');
    if (!(data.win && data.win.text)) add('warn', 'win-text', 'no hay win.text');
  }

  const derive = [
    { key: 'PALETTES', from: 'palettes' },
    { key: 'TILES', from: 'tiles' },
    { key: 'TILE_ART', from: 'tileArt' },
    { key: 'SCENE', fn: (data) => {
      const sc = data.scene || {}; const fill = sc.fill || { tile: 0, pal: 0 }; const legend = sc.legend || {};
      const tilemap = [], attrs = [];
      for (const rowStr of (sc.rows || [])) {
        const trow = [], arow = [];
        for (const ch of String(rowStr)) { const cell = legend[ch] || fill; trow.push(cell.tile); arow.push(cell.pal); }
        tilemap.push(trow); attrs.push(arow);
      }
      return { tilemap, attrs };
    } },
    { key: 'ENTITIES', from: 'entities' },
    { key: 'PLAYER', from: 'player' },
    { key: 'TEXT', from: 'text' },
    { key: 'WIN', from: 'win' },
  ];

  return {
    id: 'adventure',
    specVersion: '0.1',
    sections: ['Overview', 'Tiles', 'Scene', 'Entities', 'Player', 'Text', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: [],
    rules: [rulePalettes, ruleTileArt, ruleScene, ruleEntities, rulePlayer, ruleText],
    derive: derive,
  };
});
