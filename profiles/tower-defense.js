/**
 * profiles/tower-defense.js — Perfil de dominio "tower-defense" del Protocolo GAME.
 *
 * Segundo perfil de aplicación, igual que monster-rpg: NO es el protocolo. Se expresa
 * íntegramente como token schema + grafo de referencias + bounds + orden de secciones +
 * claves derivadas, sin tocar el core genérico. Vocabulario distinto, maquinaria idéntica:
 *   - towers   ↔ monster-rpg.species  (entidades que el jugador despliega)
 *   - dmgTypes  ↔ monster-rpg.types    (chart de efectividad dmgType × armor)
 *   - enemies  ↔ monster-rpg.species  (los que caminan el camino)
 *   - waves    ↔ monster-rpg.encounters  (oleadas ordenadas por nivel)
 *   - armors   ↔ eje defensivo del chart (las columnas de dmgTypes)
 * El core consume refs (FAMILIA broken-ref) + rules (lógica no uniforme) + derive (export).
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['tower-defense'] = api;
})(function () {

  // ---------- FAMILIA broken-ref: referencias entre colecciones (datos) ----------
  // Nota: `armors` es una LISTA (no un mapa), por lo que la validez de `enemies.*.armor`
  // y de las claves de `dmgTypes.*` contra `armors` NO se resuelve con esta familia (el
  // core hace Object.keys sobre la colección destino, que en un array da índices, no
  // valores). Esas dos validaciones viven en rules (ruleEnemyBounds / ruleDmgChart).
  const refs = [
    { rule: 'tower-dmgtype-valid', level: 'error',
      src: { collection: 'towers', field: 'dmgType' }, target: { collection: 'dmgTypes' },
      msg: (v, k) => 'tower ' + k + ' usa dmgType desconocido: ' + v },
    { rule: 'wave-enemy-valid', level: 'error',
      src: { collection: 'waves', arrayField: 'spawns', itemField: 'enemy' }, target: { collection: 'enemies' },
      msg: (v, k) => 'wave ' + k + ' referencia enemigo inexistente: ' + v },
    { rule: 'tower-sprite-ref', level: 'error', optional: true,
      src: { collection: 'towers', field: 'sprite' }, target: { collection: 'sprites' },
      msg: (v, k) => 'tower ' + k + ' usa un sprite inexistente: ' + v },
    { rule: 'enemy-sprite-ref', level: 'error', optional: true,
      src: { collection: 'enemies', field: 'sprite' }, target: { collection: 'sprites' },
      msg: (v, k) => 'enemigo ' + k + ' usa un sprite inexistente: ' + v },
  ];

  // ---------- Reglas con lógica propia del dominio ----------

  // Bounds de torres: cost/range/damage/rate > 0 (feeds core `range` family, perfil-specific).
  function ruleTowerBounds({ data, add }) {
    for (const [n, t] of Object.entries(data.towers || {})) {
      if (!(t.cost > 0)) add('error', 'tower-cost-valid', 'tower ' + n + ' tiene cost invalido: ' + t.cost);
      if (!(t.range > 0)) add('error', 'tower-range', 'tower ' + n + ' tiene range invalido: ' + t.range);
      if (!(t.damage > 0)) add('error', 'tower-damage', 'tower ' + n + ' tiene damage invalido: ' + t.damage);
      if (!(t.rate > 0)) add('error', 'tower-rate', 'tower ' + n + ' tiene rate invalido: ' + t.rate);
    }
  }

  // Bounds de enemigos + validez de armor contra la lista `armors` (la lista no se puede
  // validar via broken-ref porque el core indexa arrays por posición, no por valor).
  function ruleEnemyBounds({ data, add }) {
    const armors = Array.isArray(data.armors) ? data.armors : [];
    for (const [n, e] of Object.entries(data.enemies || {})) {
      if (!(e.hp > 0)) add('error', 'enemy-bounds', 'enemigo ' + n + ' tiene hp invalido: ' + e.hp);
      if (!(e.speed > 0)) add('error', 'enemy-bounds', 'enemigo ' + n + ' tiene speed invalido: ' + e.speed);
      if (!(e.bounty > 0)) add('error', 'enemy-bounds', 'enemigo ' + n + ' tiene bounty invalido: ' + e.bounty);
      if (e.armor != null && !armors.includes(e.armor))
        add('error', 'enemy-armor-valid', 'enemigo ' + n + ' usa armor desconocido: ' + e.armor);
    }
  }

  // Oleadas: spawns no vacío, count>0, gap>=0. Adicionalmente `wave-monotonic` (warn):
  // el HP total por oleada no debe decaer (balance smell, mismo espíritu que type-symmetry).
  function ruleWaves({ data, add }) {
    const enemies = data.enemies || {};
    const levels = Object.keys(data.waves || {}).sort((a, b) => Number(a) - Number(b));
    let prevHP = null;
    for (const lvl of levels) {
      const w = data.waves[lvl] || {};
      const spawns = w.spawns;
      if (!Array.isArray(spawns) || spawns.length === 0)
        add('error', 'wave-valid', 'wave ' + lvl + ' no tiene spawns (lista no vacía)');
      let totalHP = 0;
      for (const s of (Array.isArray(spawns) ? spawns : [])) {
        if (!(s.count > 0)) add('error', 'wave-valid', 'wave ' + lvl + ' spawn con count invalido: ' + s.count);
        if (s.gap == null || typeof s.gap !== 'number' || s.gap < 0)
          add('error', 'wave-valid', 'wave ' + lvl + ' spawn con gap invalido: ' + s.gap);
        const e = enemies[s.enemy] || {};
        totalHP += (Number(s.count) || 0) * (Number(e.hp) || 0);
      }
      if (prevHP != null && totalHP < prevHP)
        add('warn', 'wave-monotonic', 'wave ' + lvl + ' tiene menos HP total (' + totalHP + ') que la anterior (' + prevHP + ')');
      prevHP = totalHP;
    }
  }

  // Economía y balance: startGold/startLives > 0; sellRatio en [0,1]; interestRate >= 0.
  function ruleEconomy({ data, add }) {
    const eco = data.economy || {}, bal = data.balance || {};
    if (eco.startGold != null && !(eco.startGold > 0))
      add('error', 'economy-balance', 'economy.startGold invalido: ' + eco.startGold);
    if (eco.startLives != null && !(eco.startLives > 0))
      add('error', 'economy-balance', 'economy.startLives invalido: ' + eco.startLives);
    if (bal.sellRatio != null && (typeof bal.sellRatio !== 'number' || bal.sellRatio < 0 || bal.sellRatio > 1))
      add('error', 'economy-balance', 'balance.sellRatio fuera de [0,1]: ' + bal.sellRatio);
    if (bal.interestRate != null && (typeof bal.interestRate !== 'number' || bal.interestRate < 0))
      add('error', 'economy-balance', 'balance.interestRate debe ser >= 0: ' + bal.interestRate);
  }

  // Chart dmgType × armor: claves-armor válidas, multiplicadores numéricos > 0, y
  // `dmgtype-symmetry` (warn): cada dmgType con >=2 entradas debe tener varianza (si todos
  // los multiplicadores son iguales, el tipo no aporta counters — balance smell, análogo
  // a type-symmetry de monster-rpg pero adaptado a un chart no cuadrado).
  function ruleDmgChart({ data, add }) {
    const armors = Array.isArray(data.armors) ? data.armors : [];
    for (const [dt, chart] of Object.entries(data.dmgTypes || {})) {
      const vals = Object.values(chart || {});
      for (const [armor, mult] of Object.entries(chart || {})) {
        if (!armors.includes(armor))
          add('error', 'dmgtype-armor-valid', 'dmgType ' + dt + ' usa armor desconocido: ' + armor);
        if (typeof mult !== 'number' || !(mult > 0))
          add('error', 'dmgtype-mult', 'dmgType ' + dt + '.' + armor + ' multiplicador invalido: ' + mult);
      }
      if (vals.length >= 2 && vals.every(v => v === vals[0]))
        add('warn', 'dmgtype-symmetry', 'dmgType ' + dt + ' tiene todos sus multiplicadores iguales (' + vals[0] + '): no aporta counters');
    }
  }

  // Mapas: dims vs platform, legend/fill referencian tiles, y `path-contiguous` (error):
  // cada par de waypoints consecutivo debe ser ortogonalmente adyacente.
  function ruleMaps({ data, add }) {
    const tiles = data.tiles || {}; const platform = data.platform || {};
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
      }
      const path = def.path || [];
      const inB = pt => pt && typeof pt.col === 'number' && typeof pt.row === 'number' &&
        pt.col >= 0 && (!platform.cols || pt.col < platform.cols) && pt.row >= 0 && (!platform.rows || pt.row < platform.rows);
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (!inB(p)) add('error', 'path-bounds', 'mapa ' + name + ' path[' + i + '] fuera de limites: (' + (p && p.col) + ',' + (p && p.row) + ')');
        if (i > 0) {
          const q = path[i - 1];
          if (Math.abs(p.col - q.col) + Math.abs(p.row - q.row) !== 1)
            add('error', 'path-contiguous', 'mapa ' + name + ' path no contiguo entre (' + q.col + ',' + q.row + ') y (' + p.col + ',' + p.row + ')');
        }
      }
    }
  }

  function ruleSpriteDims({ data, add }) {
    for (const [sn, mat] of Object.entries(data.sprites || {}))
      if (!Array.isArray(mat) || mat.length !== 16 || mat.some(r => !Array.isArray(r) || r.length !== 16))
        add('error', 'sprite-dims', 'sprite ' + sn + ' no es 16x16');
  }

  function ruleTileArt({ data, add }) {
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    for (const [id, mat] of Object.entries(data.tileArt || {})) {
      const n = Number(id);
      if (!(id in tiles)) add('warn', 'tileart-ref', 'tileArt define el tile ' + id + ' que no está en el registro `tiles`');
      if (n < 16 || n > 63) add('error', 'tileart-ref', 'tileArt id ' + id + ' fuera del rango de tiles 16..63');
      if (!Array.isArray(mat) || mat.length !== 8 || mat.some(r => !Array.isArray(r) || r.length !== 8))
        add('error', 'tileart-dims', 'tileArt ' + id + ' no es 8x8');
      else if (palCount && mat.some(r => r.some(v => typeof v !== 'number' || v < 0 || v >= palCount)))
        add('error', 'tileart-dims', 'tileArt ' + id + ' tiene un índice de color fuera de 0..' + (palCount - 1));
    }
  }

  // ---------- COMPILACIÓN: derivaciones del dominio (consumidas por game-build-core) ----------
  const derive = [
    { key: 'TOWERS', from: 'towers' },
    { key: 'DMG_CHART', from: 'dmgTypes' },
    { key: 'ENEMIES', from: 'enemies' },
    { key: 'ARMORS', fn: (data) => Array.isArray(data.armors) ? data.armors : [] },
    { key: 'WAVES', fn: (data) => {
      const enemies = data.enemies || {}; const out = {};
      for (const [lvl, w] of Object.entries(data.waves || {})) {
        out[lvl] = {
          reward: (w || {}).reward,
          spawns: ((w || {}).spawns || []).map(s => {
            const e = enemies[s.enemy] || {};
            return { enemy: s.enemy, count: s.count, gap: s.gap,
              hp: e.hp, speed: e.speed, armor: e.armor, bounty: e.bounty };
          }),
        };
      }
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
        if (def.path) out[name].path = def.path;
      }
      return out;
    } },
    { key: 'ECONOMY', from: 'economy' },
    { key: 'BALANCE', from: 'balance' },
    { key: 'PALETTES', fn: (data, h) => h.palArray(data.palettes || {}) },
    { key: 'SPRITE_PALETTES', fn: (data, h) => h.palArray(data.spritePalettes || {}) },
    { key: 'SPRITES', from: 'sprites' },
    { key: 'TILE_ART', from: 'tileArt' },
    { key: 'TILES', from: 'tiles' },
  ];

  return {
    id: 'tower-defense',
    specVersion: '0.1',
    sections: ['Overview', 'Towers', 'DamageTypes', 'Enemies', 'Waves', 'Maps', 'Economy & Balance', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [ruleTowerBounds, ruleEnemyBounds, ruleWaves, ruleEconomy, ruleDmgChart, ruleMaps, ruleSpriteDims, ruleTileArt],
    derive: derive,
  };
});