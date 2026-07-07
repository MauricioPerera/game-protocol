/**
 * profiles/advance-wars.js — Perfil "sprites extraídos de GBA" (estilo Advance Wars).
 *
 * Nace del pipeline de extracción (tools/advance-wars-extractor.py → examples/
 * advance-wars-extracted.GAME.md): el dominio son PALETAS (16 colores [r,g,b] 0..31,
 * BGR555 cuantizado) y UNIDADES (tiles 4bpp: matriz height×width de nibbles 0..15 que
 * indexan la paleta). El motor renderiza (canvas u otro backend); el spec declara datos.
 *
 * Nota sobre refs: `units.*.palette` referencia claves NUMÉRICAS de `palettes`; la
 * familia broken-ref del core compara por valor contra Object.keys (strings), así que
 * esa referencia se valida en rules (ruleUnits), igual que `armors` en tower-defense.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['advance-wars'] = api;
})(function () {

  // Helpers compartidos (tools/profile-helpers.js), resolución isomorfa Node + navegador.
  const H = (typeof require !== 'undefined' && require('../tools/profile-helpers')) ||
            (typeof window !== 'undefined' && window.ProfileHelpers) || {};

  // Paletas: cada color [r,g,b] con componentes 0..31 (emite palette-color-range).
  function rulePalettes(ctx) { H.rulePalettes(ctx); }

  // Unidades: paleta existente, dims coherentes (tileData = height filas × width celdas)
  // y celdas nibble 4bpp (enteros 0..15).
  function ruleUnits({ data, add }) {
    const palettes = data.palettes || {};
    for (const [name, u] of Object.entries(data.units || {})) {
      if (!u || typeof u !== 'object') { add('error', 'unit-dims', 'unidad ' + name + ' no es un objeto'); continue; }
      if (!(String(u.palette) in palettes))
        add('error', 'unit-palette-ref', 'unidad ' + name + ' usa paleta inexistente: ' + u.palette);
      const w = u.width, h = u.height;
      if (!Number.isInteger(w) || w <= 0 || !Number.isInteger(h) || h <= 0) {
        add('error', 'unit-dims', 'unidad ' + name + ' necesita width/height enteros > 0: ' + w + 'x' + h);
        continue;
      }
      const td = u.tileData;
      if (!Array.isArray(td) || td.length !== h || td.some(r => !Array.isArray(r) || r.length !== w))
        add('error', 'unit-dims', 'unidad ' + name + ': tileData no es ' + h + 'x' + w);
      else if (td.some(r => r.some(v => !Number.isInteger(v) || v < 0 || v > 15)))
        add('error', 'unit-tiledata-range', 'unidad ' + name + ': tileData tiene un indice fuera de 0..15 (4bpp)');
    }
  }

  // ---------- COMPILACIÓN: derivaciones (consumidas por game-build-core) ----------
  const derive = [
    { key: 'PALETTES', fn: (data, h) => h.palArray(data.palettes || {}) },
    { key: 'UNITS', from: 'units' },
  ];

  return {
    id: 'advance-wars',
    specVersion: '0.1',
    sections: ['Overview', 'Units', 'Rendering', "Do's and Don'ts"],
    required: ['version', 'name', 'profile'],
    refs: [],   // ver nota arriba: la única referencia (units.*.palette) es de clave numérica → rules
    rules: [rulePalettes, ruleUnits],
    derive: derive,
  };
});
