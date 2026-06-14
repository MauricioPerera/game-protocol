/**
 * game-lint-core.js — Núcleo de validación GENÉRICO del Protocolo GAME (isomorfo Node + navegador).
 *
 * El core NO conoce ningún token de dominio (species, moves, tiles…). Solo sabe:
 *   - reglas estructurales (frontmatter, campos requeridos, orden de secciones, text)
 *   - la FAMILIA broken-ref: resuelve referencias entre colecciones de forma declarativa
 *   - cómo ejecutar las reglas de un PERFIL (profile.rules) dándoles helpers
 *
 * Todo el vocabulario de un género vive en un perfil (p.ej. profiles/monster-rpg.js).
 *
 * lintGame(data, body, opts) -> [{ level, rule, msg }]
 *   opts.profile : descriptor de perfil { id, sections, required, refs, rules }.
 *                  Si falta, solo se aplican las reglas estructurales del core.
 *   opts.engineSource / opts.requireEngine / opts.frontMatterPresent : como antes.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GameLintCore = api;
})(function () {

  // ---- FAMILIA broken-ref: maquinaria genérica de resolución de referencias ----
  // Una entrada `ref` declara de dónde salen los valores (src) y contra qué se validan (target).
  function targetSet(target, data) {
    const keys = Object.keys(data[target.collection] || {});
    return new Set(keys.concat(target.allow || []));
  }
  // Recolecta [{ value, owner }] según la forma de la fuente.
  function refValues(src, data) {
    const out = [];
    if (src.collection && src.field) {                       // colección[k][field]
      for (const [k, obj] of Object.entries(data[src.collection] || {}))
        out.push({ value: obj && obj[src.field], owner: k });
    } else if (src.collection && src.arrayField) {           // colección[k][arrayField][] (opcional: .itemField)
      for (const [k, obj] of Object.entries(data[src.collection] || {}))
        for (const v of ((obj && obj[src.arrayField]) || []))
          out.push({ value: src.itemField ? (v && v[src.itemField]) : v, owner: k });
    } else if (src.listMap) {                                // listMap[area][] (lista por clave)
      for (const [area, list] of Object.entries(data[src.listMap] || {}))
        for (const v of (list || [])) out.push({ value: v, owner: area });
    } else if (src.singleton && src.field) {                 // data[singleton][field]
      const obj = data[src.singleton] || {};
      out.push({ value: obj[src.field], owner: src.singleton });
    } else if (src.singleton && src.mapField) {              // claves de data[singleton][mapField]
      const obj = (data[src.singleton] || {})[src.mapField] || {};
      for (const key of Object.keys(obj)) out.push({ value: key, owner: src.singleton });
    }
    return out;
  }
  function processRef(entry, data, add) {
    const set = targetSet(entry.target, data);
    for (const { value, owner } of refValues(entry.src, data)) {
      if (entry.optional && (value == null || value === '')) continue;
      if (!set.has(value)) add(entry.level, entry.rule, entry.msg(value, owner));
    }
  }

  function lintGame(data, body, opts) {
    data = data || {}; body = body || ''; opts = opts || {};
    const profile = opts.profile || {};
    const findings = [];
    const add = (level, rule, msg) => findings.push({ level, rule, msg });

    // ---- Reglas estructurales del CORE (válidas para cualquier género) ----

    // frontmatter-present
    if (opts.frontMatterPresent === false) add('error', 'frontmatter-present', 'Falta el front-matter YAML (--- ... ---).');

    // required-fields (el perfil puede ampliar la lista; el core exige version+name)
    const required = profile.required || ['version', 'name'];
    for (const f of required) if (!(f in data)) add('error', 'required-fields', 'Falta el campo obligatorio: ' + f);

    // section-order (el orden canónico lo aporta el perfil; sin perfil no se valida)
    if (profile.sections) {
      const CANON = profile.sections;
      const headings = (body.match(/^##\s+(.+)$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());
      let last = -1;
      for (const h of headings) {
        const idx = CANON.indexOf(h);
        if (idx === -1) { add('warn', 'section-order', 'Seccion no canonica: "' + h + '"'); continue; }
        if (idx < last) add('error', 'section-order', 'Seccion fuera de orden: "' + h + '"');
        else last = idx;
      }
    }

    // text-valid (token `text` es del core)
    for (const [k, v] of Object.entries(data.text || {}))
      if (typeof v !== 'string' || v.trim() === '') add('error', 'text-valid', 'text.' + k + ' debe ser una cadena no vacía');

    // ---- FAMILIA broken-ref dirigida por el descriptor del perfil ----
    for (const entry of (profile.refs || [])) processRef(entry, data, add);

    // ---- Reglas específicas del perfil (lógica no uniforme: charts, mapas, balance…) ----
    const ctx = { data, body, opts, add };
    for (const rule of (profile.rules || [])) rule(ctx);

    return findings;
  }

  return { lintGame: lintGame };
});
