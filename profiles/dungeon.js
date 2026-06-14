/**
 * profiles/dungeon.js — Perfil "dungeon multi-sala" del Protocolo GAME.
 * Varias escenas conectadas por warps (escaleras / puertas con llave), pickups, NPCs, meta y agua animada.
 * Todo el contenido (incluido el pixel-art) en el GAME.md; el motor hace render + input + transiciones.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['dungeon'] = api;
})(function () {

  function dimsOf(scene) { const rows = scene.rows || []; return { w: rows.length ? String(rows[0]).length : 0, h: rows.length }; }

  function rulePalettes({ data, add }) {
    for (const [pi, pal] of Object.entries(data.palettes || {})) {
      if (!Array.isArray(pal)) continue;
      for (const c of pal)
        if (!Array.isArray(c) || c.length !== 3 || c.some(v => typeof v !== 'number' || v < 0 || v > 31))
          add('error', 'palette-color-range', 'palette ' + pi + ': color invalido ' + JSON.stringify(c));
    }
  }
  function ruleTileArt({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    for (const [id, mat] of Object.entries(data.tileArt || {})) {
      if (!(id in tiles)) add('warn', 'tileart-ref', 'tileArt ' + id + ' no declarado en `tiles`');
      if (!Array.isArray(mat) || mat.length !== 8 || mat.some(r => !Array.isArray(r) || r.length !== 8))
        add('error', 'tileart-dims', 'tileArt ' + id + ' no es 8x8');
      else if (mat.some(r => r.some(v => typeof v !== 'number' || v < 0 || v >= palCount)))
        add('error', 'tileart-dims', 'tileArt ' + id + ' tiene indice de color fuera de 0..' + (palCount - 1));
    }
  }
  function ruleScenes({ data, add }) {
    const tiles = data.tiles || {}; const text = data.text || {};
    const scenes = data.scenes || {};
    // inventario de items que algun pickup otorga (para validar puertas con llave)
    const allItems = new Set();
    for (const sc of Object.values(scenes)) for (const p of (sc.pickups || [])) allItems.add(p.item);
    for (const [name, sc] of Object.entries(scenes)) {
      const rows = sc.rows || [];
      if (!rows.length) { add('error', 'scene-rows', 'escena ' + name + ' sin rows'); continue; }
      const { w, h } = dimsOf(sc);
      for (let r = 0; r < rows.length; r++)
        if (String(rows[r]).length !== w) add('error', 'scene-dims', 'escena ' + name + ' fila ' + r + ' no tiene ' + w + ' cols');
      const inB = (c, r) => typeof c === 'number' && typeof r === 'number' && c >= 0 && r >= 0 && c < w && r < h;
      const cells = Object.assign({}, sc.legend || {}); if (sc.fill) cells['<fill>'] = sc.fill;
      for (const [sym, cell] of Object.entries(cells))
        if (!cell || cell.tile == null || !(cell.tile in tiles))
          add('error', 'scene-legend-ref', 'escena ' + name + ' simbolo "' + sym + '" tile inexistente: ' + (cell && cell.tile));
      for (const n of (sc.npcs || [])) {
        if (!inB(n.col, n.row)) add('error', 'entity-bounds', name + ': NPC fuera de la escena ' + JSON.stringify([n.col, n.row]));
        if (n.tile != null && !(n.tile in tiles)) add('error', 'entity-tile', name + ': NPC tile inexistente ' + n.tile);
        if (n.dialogue && !(n.dialogue in text)) add('warn', 'entity-text', name + ': NPC.dialogue sin text: ' + n.dialogue);
      }
      for (const p of (sc.pickups || [])) {
        if (!inB(p.col, p.row)) add('error', 'entity-bounds', name + ': pickup fuera de la escena');
        if (!p.item) add('error', 'entity-item', name + ': pickup sin item');
      }
      for (const en of (sc.enemies || [])) {
        if (!inB(en.col, en.row)) add('error', 'entity-bounds', name + ': enemigo fuera de la escena');
        if (en.tile != null && !(en.tile in tiles)) add('error', 'entity-tile', name + ': enemigo tile inexistente ' + en.tile);
        if (en.hp != null && !(en.hp > 0)) add('error', 'enemy-hp', name + ': enemigo con hp invalido ' + en.hp);
      }
      for (const wp of (sc.warps || [])) {
        if (!inB(wp.col, wp.row)) add('error', 'entity-bounds', name + ': warp fuera de la escena');
        if (!wp.to || !(wp.to in scenes)) add('error', 'warp-ref', name + ': warp a escena inexistente: ' + wp.to);
        if (wp.locked && !allItems.has(wp.locked)) add('error', 'warp-lock', name + ': warp.locked exige item que ningun pickup da: ' + wp.locked);
      }
      if (sc.goal && !inB(sc.goal.col, sc.goal.row)) add('error', 'entity-bounds', name + ': goal fuera de la escena');
    }
    const start = (data.player || {}).start;
    if (!start || !(start.scene in scenes)) add('error', 'player-start', 'player.start.scene inexistente: ' + (start && start.scene));
    if (!Object.values(scenes).some(s => s.goal)) add('warn', 'goal-missing', 'ninguna escena tiene goal (no se puede ganar)');
  }
  function ruleText({ data, add }) {
    for (const [k, v] of Object.entries(data.text || {}))
      if (typeof v !== 'string' || v.trim() === '') add('error', 'text-valid', 'text.' + k + ' vacio');
    if (!(data.win && data.win.text)) add('warn', 'win-text', 'no hay win.text');
  }

  function buildScene(sc) {
    const fill = sc.fill || { tile: 0, pal: 0 }; const legend = sc.legend || {};
    const tilemap = [], attrs = [];
    for (const rowStr of (sc.rows || [])) {
      const trow = [], arow = [];
      for (const ch of String(rowStr)) { const cell = legend[ch] || fill; trow.push(cell.tile); arow.push(cell.pal); }
      tilemap.push(trow); attrs.push(arow);
    }
    return {
      tilemap, attrs,
      name: sc.name, entry: sc.entry || { col: 1, row: 1 }, map: sc.map || null,
      npcs: sc.npcs || [], pickups: sc.pickups || [], warps: sc.warps || [],
      enemies: sc.enemies || [], goal: sc.goal || null, hazards: sc.hazards || [],
    };
  }

  const derive = [
    { key: 'PALETTES', from: 'palettes' },
    { key: 'TILES', from: 'tiles' },
    { key: 'TILE_ART', from: 'tileArt' },
    { key: 'SCENES', fn: (data) => { const out = {}; for (const [n, sc] of Object.entries(data.scenes || {})) out[n] = buildScene(sc); return out; } },
    { key: 'ANIMATE', from: 'animate' },
    { key: 'PLAYER', from: 'player' },
    { key: 'TEXT', from: 'text' },
    { key: 'WIN', from: 'win' },
  ];

  return {
    id: 'dungeon', specVersion: '0.1',
    sections: ['Overview', 'Tiles', 'Scenes', 'Player', 'Text', "Do's and Don'ts"],
    required: ['version', 'name'], refs: [],
    rules: [rulePalettes, ruleTileArt, ruleScenes, ruleText],
    derive: derive,
  };
});
