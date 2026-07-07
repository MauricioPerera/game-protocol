/**
 * game-build-core.js — Motor de COMPILACIÓN genérico del Protocolo GAME (isomorfo Node + navegador).
 *
 * No conoce ningún token de dominio. Emite la meta universal (generatedFrom/profile/name/description/platform/palettesCount)
 * y luego construye el resto del objeto GAME recorriendo la tabla `derive` del perfil:
 *   - { key, from, default? } : copia directa de data[from] (default {} si no existe)
 *   - { key, value }          : constante
 *   - { key, fn }             : derivación; fn(data, helpers) -> valor
 *
 * Las derivaciones de cada género (WILD_LIST, EVOLUTIONS, recetas, etc.) viven en su perfil.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GameBuildCore = api;
})(function () {

  // Helpers de presentación reutilizables por cualquier perfil 2D tile-based.
  function pad16(a) {
    const o = (a || []).map(c => c.slice());
    while (o.length < 16) o.push((o[o.length - 1] || [0, 0, 0]).slice());
    return o.slice(0, 16);
  }
  function palArray(obj) {
    const arr = [];
    for (const k of Object.keys(obj || {})) arr[Number(k)] = pad16(obj[k]);
    return arr;
  }
  const helpers = { pad16: pad16, palArray: palArray };

  function buildGame(data, profile) {
    data = data || {}; profile = profile || {};
    // Meta universal: presente en cualquier GAME.md (ver SPEC §2). Va primero para conservar
    // el orden de claves del artefacto generado. `profile` permite a un consumidor
    // MULTI-PERFIL (p.ej. un runtime que despacha por genero) saber que es este artefacto
    // sin heuristicas sobre las claves derivadas.
    const out = {
      generatedFrom: 'GAME.md',
      profile: data.profile || null,
      name: data.name || null,
      description: data.description || null,
      platform: data.platform || {},
      palettesCount: data.palettesCount || 0,
    };
    for (const e of (profile.derive || [])) {
      if ('fn' in e) out[e.key] = e.fn(data, helpers);
      else if ('value' in e) out[e.key] = e.value;
      else out[e.key] = (data[e.from] !== undefined ? data[e.from] : (e.default !== undefined ? e.default : {}));
    }
    return out;
  }

  return { buildGame: buildGame, pad16: pad16, palArray: palArray };
});
