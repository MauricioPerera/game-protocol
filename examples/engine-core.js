/**
 * engine-core.js — Toolkit compartido por los motores de demo (adventure / dungeon / roguelike).
 * Centraliza lo que se duplicaba: el color de paleta, el dibujo de un tile (tileArt 8x8) y el
 * escapado HTML. NO es parte del protocolo: es codigo de motor reutilizable.
 *   EngineCore.esc(s)                              -> string seguro para innerHTML
 *   EngineCore.makeRenderer(ctx, {ART, PAL, SCALE}) -> { rgb, drawTile, TS }
 */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function makeRenderer(ctx, opt) {
    const ART = opt.ART, PAL = opt.PAL, SCALE = opt.SCALE, TS = 8 * SCALE;
    function rgb(p, i) {
      const c = (PAL[p] || [])[i] || [0, 0, 0];
      return 'rgb(' + Math.round(c[0] * 255 / 31) + ',' + Math.round(c[1] * 255 / 31) + ',' + Math.round(c[2] * 255 / 31) + ')';
    }
    // remap(idx, tileId) opcional: permite efectos por-tile (p.ej. el shimmer del agua) sin duplicar drawTile.
    function drawTile(id, p, col, row, transparent0, remap) {
      const a = ART[id]; if (!a) return;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        let i = a[y][x];
        if (transparent0 && i === 0) continue;
        if (remap) i = remap(i, id);
        ctx.fillStyle = rgb(p, i);
        ctx.fillRect(col * TS + x * SCALE, row * TS + y * SCALE, SCALE, SCALE);
      }
    }
    return { rgb: rgb, drawTile: drawTile, TS: TS };
  }
  const api = { esc: esc, makeRenderer: makeRenderer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.EngineCore = api;
})();
