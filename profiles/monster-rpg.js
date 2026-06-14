/**
 * profiles/monster-rpg.js — Perfil de dominio "RPG de monstruos" del Protocolo GAME.
 *
 * Es el PRIMER perfil de aplicación, NO el protocolo. Reproduce exactamente las 28
 * reglas originales, pero ahora como datos+funciones que el core genérico consume:
 *   - sections / required : datos para las reglas estructurales del core
 *   - refs                : tabla declarativa para la FAMILIA broken-ref del core
 *   - rules               : funciones para la lógica no uniforme (charts, mapas, balance…)
 *
 * Un género nuevo se escribe como otro perfil de esta forma, sin tocar el core.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['monster-rpg'] = api;
})(function () {

  // ---------- FAMILIA broken-ref: 8 reglas como datos ----------
  const refs = [
    { rule: 'move-type-valid', level: 'error',
      src: { collection: 'moves', field: 'type' }, target: { collection: 'types', allow: ['NORMAL'] },
      msg: (v, k) => 'el ataque ' + k + ' usa tipo desconocido: ' + v },
    { rule: 'species-type-valid', level: 'error', optional: true,
      src: { collection: 'species', field: 'type' }, target: { collection: 'types', allow: ['NORMAL'] },
      msg: (v, k) => k + ' usa tipo desconocido: ' + v },
    { rule: 'moves-exist', level: 'error',
      src: { collection: 'species', arrayField: 'moves' }, target: { collection: 'moves' },
      msg: (v, k) => k + ' referencia un ataque inexistente: ' + v },
    { rule: 'broken-ref', level: 'error', optional: true,
      src: { collection: 'species', field: 'evolvesInto' }, target: { collection: 'species' },
      msg: (v, k) => k + '.evolvesInto referencia una especie inexistente: ' + v },
    { rule: 'trainer-team-valid', level: 'error',
      src: { collection: 'trainers', arrayField: 'team' }, target: { collection: 'species' },
      msg: (v, k) => k + ' tiene un POKEMON inexistente: ' + v },
    { rule: 'encounter-ref', level: 'error',
      src: { listMap: 'encounters' }, target: { collection: 'species' },
      msg: (v, area) => 'encounters.' + area + ' referencia especie inexistente: ' + v },
    { rule: 'sprite-ref', level: 'error', optional: true,
      src: { collection: 'species', field: 'sprite' }, target: { collection: 'sprites' },
      msg: (v, k) => k + ' usa un sprite inexistente: ' + v },
    { rule: 'player-ref', level: 'error', optional: true,
      src: { singleton: 'player', field: 'starter' }, target: { collection: 'species' },
      msg: (v) => 'player.starter referencia una especie inexistente: ' + v },
    { rule: 'player-ref', level: 'warn',
      src: { singleton: 'player', mapField: 'inventory' }, target: { collection: 'items' },
      msg: (v) => 'player.inventory tiene un item desconocido: ' + v },
  ];

  // ---------- Reglas con lógica propia del dominio (copiadas verbatim del core original) ----------

  function rulePaletteRange({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    for (const [id, t] of Object.entries(tiles))
      if (typeof t.pal === 'number' && (t.pal < 0 || t.pal >= palCount))
        add('error', 'palette-range', 'tile ' + id + ' usa paleta ' + t.pal + ' fuera de 0..' + (palCount - 1));
  }

  function rulePaletteColorRange({ data, add }) {
    for (const section of ['palettes', 'spritePalettes']) {
      for (const [pi, pal] of Object.entries(data[section] || {})) {
        if (!Array.isArray(pal)) continue;
        for (const c of pal) {
          if (!Array.isArray(c) || c.length !== 3 || c.some(v => typeof v !== 'number' || v < 0 || v > 31))
            add('error', 'palette-color-range', section + ' ' + pi + ': color invalido ' + JSON.stringify(c));
        }
      }
    }
  }

  function ruleSolidSync({ data, add, opts }) {
    const tiles = data.tiles || {};
    let solidSet = null;
    if (opts.engineSource) {
      const m = String(opts.engineSource).match(/SOLID_TILES\s*=\s*new Set\([^[]*\[([^\]]+)\]/);
      if (m) solidSet = new Set(m[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)));
    }
    if (solidSet) {
      for (const [id, t] of Object.entries(tiles)) {
        const n = Number(id), inSet = solidSet.has(n);
        if (t.solid === true && !inSet) add('error', 'solid-sync', 'tile ' + id + ' (' + t.name + ') es solid en GAME.md pero NO esta en el Set de solidos del motor');
        if (t.solid === false && inSet) add('error', 'solid-sync', 'tile ' + id + ' (' + t.name + ') es walkable en GAME.md pero SI esta en el Set de solidos del motor');
      }
      for (const n of solidSet) if (!(n in tiles)) add('warn', 'solid-sync', 'tile ' + n + ' es solido en el motor pero no esta declarado en GAME.md');
    } else if (opts.requireEngine) {
      add('warn', 'solid-sync', 'No se pudo leer el Set de solidos del motor (cross-check omitido)');
    }
  }

  function ruleTypeSymmetry({ data, add }) {
    const types = data.types || {};
    for (const a of Object.keys(types)) {
      for (const [b, mult] of Object.entries(types[a])) {
        if (a === b) continue;
        const rev = (types[b] || {})[a];
        if (mult === 2 && rev !== 0.5) add('warn', 'type-symmetry', a + '>' + b + ' es x2 pero ' + b + '>' + a + ' no es x0.5');
        if (mult === 0.5 && rev !== 2) add('warn', 'type-symmetry', a + '>' + b + ' es x0.5 pero ' + b + '>' + a + ' no es x2');
      }
    }
  }

  function ruleTrainerBounds({ data, add }) {
    for (const [tn, t] of Object.entries(data.trainers || {}))
      if (t.prize != null && !(t.prize > 0)) add('error', 'trainer-bounds', tn + ' tiene premio invalido: ' + t.prize);
  }

  function ruleSpriteDims({ data, add }) {
    for (const [sn, mat] of Object.entries(data.sprites || {}))
      if (!Array.isArray(mat) || mat.length !== 16 || mat.some(r => !Array.isArray(r) || r.length !== 16))
        add('error', 'sprite-dims', 'sprite ' + sn + ' no es 16x16');
  }

  function ruleItemEffect({ data, add }) {
    const ITEM_EFFECTS = new Set(['heal', 'cure', 'catch']);
    for (const [name, it] of Object.entries(data.items || {})) {
      if (!it || !ITEM_EFFECTS.has(it.effect))
        add('error', 'item-effect-valid', name + ' tiene effect invalido: ' + (it && it.effect));
      if (it && it.effect === 'heal' && !(it.amount > 0))
        add('error', 'item-effect-valid', name + ' es heal pero no tiene amount > 0');
      if (it && it.effect === 'cure' && !it.cures)
        add('warn', 'item-effect-valid', name + ' es cure pero no declara `cures`');
    }
  }

  function ruleMaps({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    const platform = data.platform || {};
    for (const [name, def] of Object.entries(data.maps || {})) {
      const rows = def.rows || [];
      if (platform.rows && rows.length !== platform.rows)
        add('error', 'map-dims', 'mapa ' + name + ' tiene ' + rows.length + ' filas (esperado ' + platform.rows + ')');
      for (let r = 0; r < rows.length; r++)
        if (platform.cols && String(rows[r]).length !== platform.cols)
          add('error', 'map-dims', 'mapa ' + name + ' fila ' + r + ' tiene ' + String(rows[r]).length + ' cols (esperado ' + platform.cols + ')');
      const cells = Object.assign({}, def.legend || {});
      if (def.fill) cells['<fill>'] = def.fill;
      for (const [sym, cell] of Object.entries(cells)) {
        if (!cell || cell.tile == null || !(cell.tile in tiles))
          add('error', 'map-legend-ref', 'mapa ' + name + ' simbolo "' + sym + '" referencia tile inexistente: ' + (cell && cell.tile));
        if (cell && typeof cell.pal === 'number' && (cell.pal < 0 || cell.pal >= palCount))
          add('error', 'map-legend-ref', 'mapa ' + name + ' simbolo "' + sym + '" usa paleta fuera de 0..' + (palCount - 1) + ': ' + cell.pal);
      }
      const inB = pt => pt && typeof pt.col === 'number' && typeof pt.row === 'number' &&
        pt.col >= 0 && (!platform.cols || pt.col < platform.cols) && pt.row >= 0 && (!platform.rows || pt.row < platform.rows);
      for (const key of ['entry', 'exit', 'return']) {
        if (def[key] && !inB(def[key])) add('error', 'map-meta', 'mapa ' + name + '.' + key + ' fuera de los limites del mapa');
      }
      if (def.exit && inB(def.exit)) {
        const ch = String(rows[def.exit.row] || '')[def.exit.col];
        const cell = (def.legend && def.legend[ch]) || def.fill || {};
        if (cell.tile !== 46) add('warn', 'map-meta', 'mapa ' + name + ': exit en (' + def.exit.col + ',' + def.exit.row + ') no cae sobre un felpudo (tile 46)');
      }
    }
  }

  function ruleOverworld({ data, add }) {
    const platform = data.platform || {};
    const trainers = data.trainers || {};
    const warpTargets = new Set([...Object.keys(data.overworld || {}), ...Object.keys(data.maps || {})]);
    for (const [area, def] of Object.entries(data.overworld || {})) {
      for (const n of (def.npcs || [])) {
        if (typeof n.col !== 'number' || typeof n.row !== 'number')
          add('error', 'overworld-ref', area + ': NPC sin col/row numericos');
        if (platform.cols && (n.col < 0 || n.col >= platform.cols))
          add('error', 'overworld-ref', area + ': NPC col ' + n.col + ' fuera de 0..' + (platform.cols - 1));
        if (!n.dialogue) add('warn', 'overworld-ref', area + ': NPC en (' + n.col + ',' + n.row + ') sin dialogue');
        if (typeof n.dialogue === 'string' && n.dialogue.includes(','))
          add('warn', 'overworld-ref', area + ': el dialogue de un NPC contiene "," (el parser YAML de flujo lo cortaria)');
      }
      for (const t of (def.trainers || [])) {
        if (!(t.name in trainers)) add('error', 'overworld-ref', area + ': entrenador inexistente en `trainers`: ' + t.name);
        if (platform.cols && (t.col < 0 || t.col >= platform.cols))
          add('error', 'overworld-ref', area + ': entrenador ' + t.name + ' col ' + t.col + ' fuera de 0..' + (platform.cols - 1));
      }
      for (const w of (def.warps || [])) {
        if (!w.target) add('error', 'overworld-ref', area + ': warp sin target');
        else if (!warpTargets.has(w.target)) add('error', 'overworld-ref', area + ': warp a destino desconocido: ' + w.target);
        if (platform.cols && (w.col < 0 || w.col >= platform.cols))
          add('error', 'overworld-ref', area + ': warp col ' + w.col + ' fuera de 0..' + (platform.cols - 1));
      }
    }
  }

  function ruleTileArt({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    for (const [id, mat] of Object.entries(data.tileArt || {})) {
      const n = Number(id);
      if (!(id in tiles)) add('warn', 'tileart-ref', 'tileArt define el tile ' + id + ' que no está en el registro `tiles`');
      if (n < 16 || n > 63) add('error', 'tileart-ref', 'tileArt id ' + id + ' fuera del rango de tiles 16..63');
      if (!Array.isArray(mat) || mat.length !== 8 || mat.some(r => !Array.isArray(r) || r.length !== 8))
        add('error', 'tileart-dims', 'tileArt ' + id + ' no es 8x8');
      else if (mat.some(r => r.some(v => typeof v !== 'number' || v < 0 || v >= palCount)))
        add('error', 'tileart-dims', 'tileArt ' + id + ' tiene un índice de color fuera de 0..' + (palCount - 1));
    }
  }

  function ruleSfx({ data, add }) {
    for (const [k, s] of Object.entries(data.sfx || {})) {
      if (!s || typeof s.freq !== 'number' || s.freq <= 0 || s.freq > 20000) add('error', 'sfx-valid', 'sfx.' + k + ' tiene freq invalida: ' + (s && s.freq));
      if (!s || typeof s.dur !== 'number' || s.dur <= 0 || s.dur > 5) add('error', 'sfx-valid', 'sfx.' + k + ' tiene dur invalida (0–5 s): ' + (s && s.dur));
    }
  }

  function rulePlayer({ data, add }) {
    const player = data.player || {};
    if (player.level != null && !(player.level > 0))
      add('error', 'player-ref', 'player.level invalido: ' + player.level);
    if (player.start && (typeof player.start.x !== 'number' || typeof player.start.y !== 'number'))
      add('error', 'player-ref', 'player.start debe tener x/y numericos');
  }

  function ruleEconomy({ data, add }) {
    const eco = data.economy || {}, bal = data.balance || {}, items = data.items || {};
    const prices = Object.assign({}, eco.prices || {});
    for (const [name, it] of Object.entries(items)) if (it && it.price != null) prices[name] = it.price;
    for (const [item, price] of Object.entries(prices))
      if (!(price > 0)) add('error', 'economy-bounds', 'precio invalido para ' + item + ': ' + price);
    if (bal.catchBase != null && bal.catchScale != null) {
      const sum = bal.catchBase + bal.catchScale;
      if (sum > 1 || bal.catchBase < 0 || bal.catchScale < 0)
        add('error', 'economy-bounds', 'catchBase+catchScale = ' + sum + ' fuera de [0,1]');
    }
  }

  function ruleDeadToken({ data, add, opts }) {
    if (!opts.engineSource) return;
    const bal = data.balance || {};
    for (const k of Object.keys(bal)) {
      const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const used = new RegExp("gBal\\(['\"]" + e + "['\"]|\\." + e + "\\b|\\[['\"]" + e + "['\"]\\]").test(String(opts.engineSource));
      if (!used) add('warn', 'dead-token', 'balance.' + k + ' declarado en GAME.md pero no referenciado en el motor');
    }
  }

  // ---------- COMPILACIÓN: derivaciones del dominio (consumidas por game-build-core) ----------
  // `expand` resuelve una lista de nombres de ataque a objetos completos (usa data.moves).
  function expandFactory(data) {
    const moves = data.moves || {};
    return arr => (arr || []).map(n => {
      const m = moves[n] || {};
      const o = { name: n, type: m.type, power: m.power };
      if (m.effect) o.effect = m.effect;
      if (m.chance != null) o.chance = m.chance;
      return o;
    });
  }
  const wildEntry = (data, name) => {
    const s = (data.species || {})[name] || {};
    return { name, maxhp: s.maxhp, pal: s.pal, sprite: s.sprite || 'generic', type: s.type, moves: expandFactory(data)(s.moves) };
  };

  const derive = [
    { key: 'TYPE_CHART', from: 'types' },
    { key: 'MOVES', from: 'moves' },
    { key: 'SPECIES', from: 'species' },
    { key: 'WILD_LIST', fn: (data) => {
      const expand = expandFactory(data);
      return Object.entries(data.species || {}).filter(([, s]) => s.wild)
        .map(([name, s]) => ({ name, maxhp: s.maxhp, pal: s.pal, sprite: s.sprite || 'generic', type: s.type, moves: expand(s.moves) }));
    } },
    { key: 'EVOLUTIONS', fn: (data) => {
      const expand = expandFactory(data); const species = data.species || {}; const out = {};
      for (const [name, s] of Object.entries(species)) {
        if (!s.evolvesInto) continue;
        const into = species[s.evolvesInto] || {};
        out[name] = { into: s.evolvesInto, level: s.atLevel, maxhp: into.maxhp, type: into.type, moves: expand(into.moves) };
      }
      return out;
    } },
    { key: 'TRAINERS', fn: (data) => {
      const expand = expandFactory(data); const species = data.species || {}; const out = {};
      for (const [tname, t] of Object.entries(data.trainers || {})) {
        out[tname] = {
          prize: t.prize, dialogue: t.dialogue, pal: t.pal, level: t.level,
          team: (t.team || []).map(spName => {
            const sp = species[spName] || {};
            return { name: spName, maxhp: sp.maxhp, type: sp.type, pal: sp.pal, sprite: sp.sprite || 'generic', level: t.level, moves: expand(sp.moves) };
          }),
        };
      }
      return out;
    } },
    { key: 'PALETTES', fn: (data, h) => h.palArray(data.palettes || {}) },
    { key: 'SPRITE_PALETTES', fn: (data, h) => h.palArray(data.spritePalettes || {}) },
    { key: 'SPRITES', from: 'sprites' },
    { key: 'ITEMS', from: 'items' },
    { key: 'ENCOUNTERS', fn: (data) => {
      const out = {};
      for (const [area, list] of Object.entries(data.encounters || {}))
        out[area] = (list || []).map(name => wildEntry(data, name));
      return out;
    } },
    { key: 'MAPS', fn: (data) => {
      const out = {};
      for (const [name, def] of Object.entries(data.maps || {})) {
        const fill = def.fill || { tile: 0, pal: 0 }; const legend = def.legend || {};
        const tilemap = [], attrs = [];
        for (const rowStr of (def.rows || [])) {
          const trow = [], arow = [];
          for (const ch of String(rowStr)) { const cell = legend[ch] || fill; trow.push(cell.tile); arow.push(cell.pal); }
          tilemap.push(trow); attrs.push(arow);
        }
        out[name] = { tilemap, attrs };
        if (def.entry) out[name].entry = def.entry;
        if (def.exit) out[name].exit = def.exit;
        if (def.return) out[name].return = def.return;
      }
      return out;
    } },
    { key: 'OVERWORLD', from: 'overworld' },
    { key: 'PLAYER', from: 'player' },
    { key: 'TILE_ART', from: 'tileArt' },
    { key: 'TEXT', from: 'text' },
    { key: 'SFX', from: 'sfx' },
    { key: 'ECONOMY', fn: (data) => {
      const items = data.items || {}; const prices = {};
      for (const [n, it] of Object.entries(items)) if (it && it.price != null) prices[n] = it.price;
      return Object.assign({}, data.economy || {}, { prices });
    } },
    { key: 'BALANCE', from: 'balance' },
    { key: 'TILES', from: 'tiles' },
    { key: 'SOLID_TILES', fn: (data) =>
      Object.entries(data.tiles || {}).filter(([, t]) => t.solid).map(([id]) => Number(id)).sort((a, b) => a - b) },
  ];

  return {
    id: 'monster-rpg',
    specVersion: '0.1',
    sections: ['Overview', 'Tiles', 'Types', 'Species', 'Maps', 'Player', 'Text', 'Economy & Balance', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [
      rulePaletteRange, rulePaletteColorRange, ruleSolidSync, ruleTypeSymmetry,
      ruleTrainerBounds, ruleSpriteDims, ruleItemEffect, ruleMaps, ruleOverworld,
      ruleTileArt, ruleSfx, rulePlayer, ruleEconomy, ruleDeadToken,
    ],
    derive: derive,
  };
});
