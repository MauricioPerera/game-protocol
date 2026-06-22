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
 *   opts.profile     : descriptor de perfil { id, sections, required, refs, rules, specVersion }.
 *                      Si falta, solo se aplican las reglas estructurales del core.
 *   opts.profileId   : id del perfil que se intentó cargar. Si se pasa y opts.profile es
 *                      nulo, el core emite `profile-known` (perfil desconocido) sin necesidad
 *                      del wrapper CLI — así un consumidor directo (browser/otra tool) recibe
 *                      el hallazgo. El wrapper sigue encargándose de `profile-load-error`
 *                      (error de sintaxis), que requiere fs y no corresponde al core.
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

  // Compara dos versiones semver-lite ('0.1' vs '0.2') → -1/0/+1.
  // Usada por version-migration para decidir si el GAME.md es anterior (warn, migrar)
  // o posterior (error, tooling viejo) respecto a la specVersion soportada por el tooling.
  function cmpVersion(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x < y) return -1; if (x > y) return 1;
    }
    return 0;
  }

  function lintGame(data, body, opts) {
    data = data || {}; body = body || ''; opts = opts || {};
    const profile = opts.profile || {};
    const findings = [];
    // `extra` permite adjuntar campos de ciclo de vida (since/removedIn) al hallazgo,
    // usado por el nivel `deprecated` (S2.1). El resto de reglas ignoran el extra.
    const add = (level, rule, msg, extra) => findings.push(Object.assign({ level, rule, msg }, extra || {}));

    // ---- Reglas estructurales del CORE (válidas para cualquier género) ----

    // frontmatter-present
    if (opts.frontMatterPresent === false) add('error', 'frontmatter-present', 'Falta el front-matter YAML (--- ... ---).');

    // profile-known (movido del wrapper CLI al core): si el consumidor declaró un
    // profileId pero no resolvió un perfil cargado (opts.profile nulo), el core lo
    // reporta. Así lintGame directo (sin wrapper) emite la regla. El wrapper delega
    // pasando opts.profileId; el caso de sintaxis rota (profile-load-error) lo sigue
    // manejando el wrapper y NO pasa profileId, para no duplicar hallazgo.
    if (opts.profileId && !opts.profile)
      add('error', 'profile-known', 'perfil desconocido: ' + opts.profileId);

    // required-fields (el perfil puede ampliar la lista; el core exige version+name+profile).
    // SPEC §2/§4: `profile` es un token obligatorio del front-matter. El core lo incluye en
    // la lista por defecto: cuando un consumidor llama a lintGame SIN descriptor de perfil
    // (opts.profile nulo), se exige `profile`. Si un perfil cargado aporta su propio
    // `required`, se usa ése (el wrapper CLI ya resuelve el perfil desde `data.profile`).
    const required = profile.required || ['version', 'name', 'profile'];
    for (const f of required) if (!(f in data)) add('error', 'required-fields', 'Falta el campo obligatorio: ' + f);

    // version-migration (core, S2.3 — reemplaza a version-compatible): data.version se
    // compara con la specVersion soportada por el tooling (profile.specVersion o el
    // default del core '0.1'). Sólo corre si `version` está presente (si falta,
    // required-fields ya lo reportó).
    //   - data.version < esperada → warn: el GAME.md es de una versión anterior; el
    //     contrato sigue siendo válido (0 errores) pero debe consultarse MIGRATION.md
    //     para migrar antes de que la versión vieja se remueva (ciclo de deprecation).
    //   - data.version > esperada → error: el GAME.md usa una versión que este tooling
    //     aún no soporta; hay que actualizar el tooling.
    //   - iguales → sin hallazgo.
    const SUPPORTED_VERSION = '0.1';
    if ('version' in data) {
      const expected = profile.specVersion || SUPPORTED_VERSION;
      if (data.version !== expected) {
        const cmp = cmpVersion(data.version, expected);
        if (cmp < 0)
          add('warn', 'version-migration',
              'version ' + data.version + ' es anterior a la soportada ' + expected + '; consulta MIGRATION.md para migrar (se remueve en la major siguiente)');
        else
          add('error', 'version-migration',
              'version ' + data.version + ' no soportada por este tooling (max ' + expected + '); actualiza el tooling');
      }
    }

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
    // Nivel `deprecated` (S2.1): una regla puede marcar `rule.deprecated = {since, removedIn}`
    // para declarar su ciclo de vida. El core emite un hallazgo level=deprecated (NO es
    // error: no rompe el gate) con since/removedIn y un msg accionable, y de todos modos
    // ejecuta la regla — sigue aplicando hasta que se remueva en `removedIn`.
    const ctx = { data, body, opts, add };
    for (const rule of (profile.rules || [])) {
      if (rule && rule.deprecated) {
        const name = rule.name || 'unknown';
        add('deprecated', name,
            'regla deprecada: se remueve en ' + rule.deprecated.removedIn + ' (desde ' + rule.deprecated.since + ')',
            { since: rule.deprecated.since, removedIn: rule.deprecated.removedIn });
      }
      if (rule) rule(ctx);
    }

    return findings;
  }

  return { lintGame: lintGame };
});
