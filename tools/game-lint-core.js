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
  // P3: el Set de claves válidas del target se cachea por `collection` dentro de una misma
  // llamada a lintGame. Antes se reconstruía en cada processRef (O(refs * keys)); ahora si
  // varias refs apuntan a la misma colección, el Set se construye una sola vez (O(keys) total).
  function targetSet(target, data, cache) {
    const col = target.collection;
    if (cache && cache.has(col)) return cache.get(col);
    const keys = Object.keys(data[col] || {});
    const set = new Set(keys.concat(target.allow || []));
    if (cache) cache.set(col, set);
    return set;
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
  function processRef(entry, data, add, setCache) {
    const set = targetSet(entry.target, data, setCache);
    for (const { value, owner } of refValues(entry.src, data)) {
      if (entry.optional && (value == null || value === '')) continue;
      // `msg` es opcional (perfiles puro-datos, §11): sin ella, mensaje por defecto.
      if (!set.has(value)) add(entry.level, entry.rule,
        entry.msg ? entry.msg(value, owner)
                  : owner + ' referencia un valor inexistente en `' + entry.target.collection + '`: ' + value);
    }
  }

  // ---- FAMILIA enum DECLARATIVA: pertenencia a un conjunto cerrado de valores.
  // Entrada: { rule, level?, collection|singleton, field, values: [...], required? }.
  function processEnum(e, data, add) {
    const level = e.level || 'error';
    const set = new Set(e.values);
    const check = (owner, v) => {
      if (v == null) {
        if (e.required) add(level, e.rule, owner + '.' + e.field + ' requerido (uno de: ' + e.values.join(', ') + ')');
        return;
      }
      if (!set.has(v)) add(level, e.rule, owner + '.' + e.field + ' invalido: ' + v + ' (esperado: ' + e.values.join(', ') + ')');
    };
    if (e.collection) {
      for (const [k, obj] of Object.entries(data[e.collection] || {}))
        check(e.collection + '.' + k, obj && obj[e.field]);
    } else if (e.singleton) {
      const o = data[e.singleton] || {};
      if (e.field in o || e.required) check(e.singleton, o[e.field]);
    }
  }

  // ---- FAMILIA range/bounds DECLARATIVA: el perfil declara una tabla `bounds` y el core
  // la ejecuta (antes esta familia existia solo como funciones-regla en cada perfil).
  // Entrada: { rule, level?, collection|singleton, field, gt?, min?, max?, integer?,
  //            required?, msg? }. gt = minimo exclusivo (el caso "> 0" tipico).
  function processBound(e, data, add) {
    const level = e.level || 'error';
    const check = (owner, v) => {
      if (v == null) {
        if (e.required) add(level, e.rule, owner + '.' + e.field + ' requerido');
        return;
      }
      const bad = typeof v !== 'number'
        || (e.integer && !Number.isInteger(v))
        || (e.gt != null && !(v > e.gt))
        || (e.min != null && v < e.min)
        || (e.max != null && v > e.max);
      if (bad) add(level, e.rule, e.msg ? e.msg(v, owner) : owner + '.' + e.field + ' fuera de rango: ' + v);
    };
    if (e.collection) {
      for (const [k, obj] of Object.entries(data[e.collection] || {}))
        check(e.collection + '.' + k, obj && obj[e.field]);
    } else if (e.singleton) {
      const o = data[e.singleton] || {};
      if (e.field in o || e.required) check(e.singleton, o[e.field]);
    }
  }

  // ---- FAMILIA dims DECLARATIVA: matrices de forma fija por coleccion.
  // Entrada: { rule, level?, collection, shape: [alto, ancho] }.
  function processDims(e, data, add) {
    const level = e.level || 'error';
    const h = e.shape[0], w = e.shape[1];
    for (const [k, mat] of Object.entries(data[e.collection] || {}))
      if (!Array.isArray(mat) || mat.length !== h || mat.some(r => !Array.isArray(r) || r.length !== w))
        add(level, e.rule, e.collection + '.' + k + ' no es ' + h + 'x' + w);
  }

  // ---- FAMILIA grid/legend DECLARATIVA (SPEC §11): mapas de tiles como filas de texto
  // ("rows") + una leyenda de simbolo→celda ("legend", con "fill" opcional para el
  // relleno por defecto). Cubre el patron repetido en 4+ perfiles (scene/scenes con rows
  // desparejas y simbolos que referencian tiles/paletas inexistentes) — antes era codigo
  // JS casi identico en cada perfil (ruleScene/ruleScenes).
  //
  // Entrada: { rule, emptyRule?, level?, collection|singleton, rowsField?, legendField?, fillField?,
  //            shape?: { singleton, rowsField?, colsField? },
  //            legend?: { rule, level?, tileField?, tileTarget: { collection, allow? },
  //                       palField?, palMax? } }.
  //   rule          fila con ancho distinto a la primera ("scene-dims"), o (con `shape`)
  //                 desajuste contra la forma externa.
  //   emptyRule     rows vacio o ausente (solo sin `shape`); default = rule.
  //   rowsField/legendField/fillField    default a 'rows'/'legend'/'fill'.
  //   shape         forma FIJA tomada de OTRO singleton (p.ej. `platform.rows`/`.cols`),
  //                 en vez de autoconsistencia contra la primera fila (mapas de
  //                 tower-defense/monster-rpg, donde varios `maps.*` deben calzar con la
  //                 grilla global). Cada chequeo es opcional: si el campo objetivo no está
  //                 seteado, no se exige. A diferencia del modo autoconsistente, rows=[]
  //                 NO corta el procesamiento del legend (los mapas pueden declarar legend
  //                 sin filas todavia).
  //   legend.tileTarget                  misma forma que refs[].target (broken-ref): el
  //                                      chequeo usa el operador `in` (no un Set de
  //                                      Object.keys) para que funcione con colecciones de
  //                                      claves numericas (p.ej. `tiles: {16: {...}}`).
  //   legend.palMax                      numero literal, o el nombre de un campo raiz de
  //                                      `data` (p.ej. 'palettesCount') que lo contiene.
  function gridInstances(e, data) {
    if (e.collection) return Object.entries(data[e.collection] || {});
    if (e.singleton) return [[e.singleton, data[e.singleton] || {}]];
    return [];
  }
  function processGrid(e, data, add) {
    const level = e.level || 'error';
    const rowsField = e.rowsField || 'rows';
    const legendField = e.legendField || 'legend';
    const fillField = e.fillField || 'fill';
    const emptyRule = e.emptyRule || e.rule;
    const shape = e.shape;
    const lg = e.legend;
    const targetCol = lg && lg.tileTarget ? (data[lg.tileTarget.collection] || {}) : null;
    const allow = new Set((lg && lg.tileTarget && lg.tileTarget.allow) || []);
    const palMax = lg && lg.palMax != null
      ? (typeof lg.palMax === 'number' ? lg.palMax : (data[lg.palMax] || 0))
      : null;

    for (const [name, obj] of gridInstances(e, data)) {
      const rows = (obj && obj[rowsField]) || [];
      if (shape) {
        const target = data[shape.singleton] || {};
        const wantRows = target[shape.rowsField || 'rows'];
        const wantCols = target[shape.colsField || 'cols'];
        if (wantRows && rows.length !== wantRows)
          add(level, e.rule, name + ' tiene ' + rows.length + ' filas (esperado ' + wantRows + ')');
        for (let r = 0; r < rows.length; r++)
          if (wantCols && String(rows[r]).length !== wantCols)
            add(level, e.rule, name + ' fila ' + r + ' tiene ' + String(rows[r]).length + ' cols (esperado ' + wantCols + ')');
      } else {
        if (!rows.length) { add(level, emptyRule, name + '.' + rowsField + ' vacio'); continue; }
        const w = String(rows[0]).length;
        for (let r = 0; r < rows.length; r++)
          if (String(rows[r]).length !== w) add(level, e.rule, name + ': fila ' + r + ' no tiene ' + w + ' columnas');
      }

      if (lg) {
        const lvl2 = lg.level || level;
        const cells = Object.assign({}, (obj && obj[legendField]) || {});
        if (obj && obj[fillField]) cells['<fill>'] = obj[fillField];
        for (const [sym, cell] of Object.entries(cells)) {
          const tileField = lg.tileField || 'tile';
          const tileVal = cell && cell[tileField];
          if (targetCol && (tileVal == null || (!(tileVal in targetCol) && !allow.has(tileVal))))
            add(lvl2, lg.rule, name + ': simbolo "' + sym + '" referencia ' + lg.tileTarget.collection + ' inexistente: ' + tileVal);
          const palField = lg.palField;
          if (palField && cell && typeof cell[palField] === 'number' && palMax != null && (cell[palField] < 0 || cell[palField] >= palMax))
            add(lvl2, lg.rule, name + ': simbolo "' + sym + '" usa paleta fuera de rango: ' + cell[palField]);
        }
      }
    }
  }

  // P1: pre-tokeniza el motor una sola vez por llamada a lintGame. Extrae los tokens que el
  // motor "usa": literales string (cubre gBal('k') y ['k']) y accesos miembro `.k` (cubre
  // `.k\b`). ruleDeadToken consulta este Set en O(1) por clave de balance, en vez de lanzar
  // una RegExp por clave contra todo el fuente (O(B*E) → O(E+B)). Fiel a los 3 patrones
  // originales: no incluye identificadores sueltos (`.k` exige el punto).
  function engineTokenSet(engineSource) {
    const src = String(engineSource);
    const set = new Set();
    const strRe = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let m;
    while ((m = strRe.exec(src))) set.add(m[1] !== undefined ? m[1] : m[2]);
    const propRe = /\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
    while ((m = propRe.exec(src))) set.add(m[1]);
    return set;
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
    // P3: setCache evita reconstruir el Set de claves de una misma colección cuando varias
    // refs apuntan a ella. Se crea por llamada a lintGame (no se comparte entre llamadas).
    const setCache = new Map();
    for (const entry of (profile.refs || [])) processRef(entry, data, add, setCache);

    // ---- FAMILIAS range/dims/enum/grid dirigidas por el descriptor del perfil (tablas declarativas) ----
    for (const entry of (profile.bounds || [])) processBound(entry, data, add);
    for (const entry of (profile.dims || [])) processDims(entry, data, add);
    for (const entry of (profile.enums || [])) processEnum(entry, data, add);
    for (const entry of (profile.grids || [])) processGrid(entry, data, add);

    // ---- Reglas específicas del perfil (lógica no uniforme: charts, mapas, balance…) ----
    // Nivel `deprecated` (S2.1): una regla puede marcar `rule.deprecated = {since, removedIn}`
    // para declarar su ciclo de vida. El core emite un hallazgo level=deprecated (NO es
    // error: no rompe el gate) con since/removedIn y un msg accionable, y de todos modos
    // ejecuta la regla — sigue aplicando hasta que se remueva en `removedIn`.
    // P1: si hay engineSource, se pre-tokeniza UNA vez aquí y se expone vía ctx.engineTokens.
    // ruleDeadToken lo consume en O(1) por clave (antes: RegExp por clave contra todo el fuente).
    const ctx = { data, body, opts, add };
    if (opts.engineSource) ctx.engineTokens = engineTokenSet(opts.engineSource);
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
