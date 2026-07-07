/**
 * profile-helpers.js — Helpers compartidos por los descriptores de perfil y por las
 * herramientas que los inspeccionan (game-manifest, game-schema). Evita duplicar lógica
 * de validación (paletas, tileArt 8x8) y de descripción de referencias entre 4+ perfiles.
 * Isomorfo Node + navegador (mismo patrón que yaml-min / game-lint-core).
 *
 * Exporta:
 *   describeSrc(src)            : serializa una referencia `src` a un string legible
 *                               (collection.*.field, listMap.*[], singleton.field, …).
 *                               Usada por game-manifest y game-schema para `x-references`.
 *   rulePalettes({ data, add }, sections?) : valida que cada color RGB de las paletas
 *                               indicadas esté en 0..31. `sections` defaulted a ['palettes'];
 *                               monster-rpg pasa ['palettes','spritePalettes'].
 *                               Emite 'palette-color-range' (error) por color inválido.
 *   ruleTileArt({ data, add }, opts?) : valida tileArt 8x8 y rango de índices de color.
 *                               opts.idRange = [min,max] (opcional): si viene, emite
 *                               'tileart-ref' (error) para ids fuera de rango (monster-rpg
 *                               exige 16..63). Emite 'tileart-ref' (warn) si el tile no está
 *                               declarado en `tiles`, 'tileart-dims' (error) si no es 8x8
 *                               o si un índice de color cae fuera de 0..palettesCount-1.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ProfileHelpers = api;
})(function () {

  // Forma COMPACTA de arte 4bpp: un array de strings hex (1 caracter = 1 celda 0..15).
  // Ej. tileArt 8x8: ["11211031", ...x8]; sprite 16x16: 16 strings de 16 chars.
  // Devuelve: null si NO es la forma compacta (array de arrays u otra cosa — el llamador
  // valida como matriz); { error } si es compacta pero tiene un caracter no-hex;
  // { grid } con la matriz de numeros decodificada. Ahorra ~4x de texto en el GAME.md
  // y compila EXACTAMENTE al mismo artefacto que la forma matriz (determinismo).
  function decodeArtRows(mat) {
    if (!Array.isArray(mat) || !mat.length || !mat.every(r => typeof r === 'string')) return null;
    const out = [];
    for (const row of mat) {
      const cells = [];
      for (const ch of String(row).toLowerCase()) {
        const v = '0123456789abcdef'.indexOf(ch);
        if (v === -1) return { error: 'caracter no-hex "' + ch + '" en la fila "' + row + '"' };
        cells.push(v);
      }
      out.push(cells);
    }
    return { grid: out };
  }

  // Serializa una referencia `src` (forma declarativa usada por profile.refs) a un string
  // legible para manifest/schema. Estaba duplicada en game-manifest.js y game-schema.js.
  function describeSrc(s) {
    if (s.collection && s.field) return s.collection + '.*.' + s.field;
    if (s.collection && s.arrayField) return s.collection + '.*.' + s.arrayField + '[]' + (s.itemField ? ('.' + s.itemField) : '');
    if (s.listMap) return s.listMap + '.*[]';
    if (s.singleton && s.field) return s.singleton + '.' + s.field;
    if (s.singleton && s.mapField) return s.singleton + '.' + s.mapField + '.*';
    return JSON.stringify(s);
  }

  // Valida colores de paleta: cada color es [r,g,b] con componentes number en 0..31.
  // Estaba duplicada en 4 perfiles (roguelike, adventure, dungeon + monster-rpg que
  // además revisa spritePalettes). `sections` permite cubrir el caso monster-rpg.
  function rulePalettes({ data, add }, sections) {
    sections = sections || ['palettes'];
    for (const section of sections) {
      for (const [pi, pal] of Object.entries(data[section] || {})) {
        if (!Array.isArray(pal)) continue;
        for (const c of pal)
          if (!Array.isArray(c) || c.length !== 3 || c.some(v => typeof v !== 'number' || v < 0 || v > 31))
            add('error', 'palette-color-range', section + ' ' + pi + ': color invalido ' + JSON.stringify(c));
      }
    }
  }

  // Valida tileArt 8x8: cada matriz es 8 filas x 8 columnas y cada celda es un índice de
  // color en 0..palettesCount-1. `opts.idRange` (opcional, [min,max]) añade un chequeo de
  // rango del id del tile (monster-rpg exige ids 16..63). Estaba duplicada en 4 perfiles.
  function ruleTileArt({ data, add }, opts) {
    opts = opts || {};
    const tiles = data.tiles || {}; const palCount = data.palettesCount || 0;
    for (const [id, matRaw] of Object.entries(data.tileArt || {})) {
      if (opts.idRange) {
        const n = Number(id);
        if (n < opts.idRange[0] || n > opts.idRange[1])
          add('error', 'tileart-ref', 'tileArt id ' + id + ' fuera del rango ' + opts.idRange[0] + '..' + opts.idRange[1]);
      }
      if (!(id in tiles)) add('warn', 'tileart-ref', 'tileArt ' + id + ' no declarado en `tiles`');
      // opts.allowHex: acepta ademas la forma compacta (array de strings hex, ver decodeArtRows).
      let mat = matRaw;
      if (opts.allowHex) {
        const dec = decodeArtRows(matRaw);
        if (dec && dec.error) { add('error', 'tileart-dims', 'tileArt ' + id + ' forma hex invalida: ' + dec.error); continue; }
        if (dec && dec.grid) mat = dec.grid;
      }
      if (!Array.isArray(mat) || mat.length !== 8 || mat.some(r => !Array.isArray(r) || r.length !== 8))
        add('error', 'tileart-dims', 'tileArt ' + id + ' no es 8x8');
      else if (mat.some(r => r.some(v => typeof v !== 'number' || v < 0 || v >= palCount)))
        add('error', 'tileart-dims', 'tileArt ' + id + ' tiene indice de color fuera de 0..' + (palCount - 1));
    }
  }

  return { describeSrc: describeSrc, rulePalettes: rulePalettes, ruleTileArt: ruleTileArt, decodeArtRows: decodeArtRows };
});