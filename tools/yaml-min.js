/**
 * yaml-min.js — Parser de un subconjunto de YAML suficiente para GAME.md (sin dependencias).
 * Soporta: front-matter ---, mapas de bloque (anidados, 2 espacios), flujo {..}/[..], escalares
 * (number/bool/string). Compartido por game-lint y game-export (isomorfo).
 *
 * Robustez (falla FUERTE, no en silencio):
 *  - respeta comillas al partir comas y el separador `:` en flujo (admite comas y `:` en strings);
 *  - LANZA error claro ante secuencias de bloque (`- item`) y lineas de front-matter sin `:`;
 *  - LANZA ante clave duplicada, string sin cerrar, tab en indentacion, sobre-indentacion;
 *  - LANZA ante valores de flujo mal formados (bracket sin cerrar, cierre de mas, brackets
 *    cruzados, texto tras el cierre) en vez de recortar a ciegas y PERDER datos;
 *  - LANZA ante hueco interno por coma de mas ([a, , b]) y ante numeros no finitos (1e999),
 *    que se convertirian en `null` al serializar el artefacto;
 *  - LANZA ante literales no decimales (0x1f, 0b101, 0o17): la gramatica define `number`
 *    como decimal, pero Number() los aceptaba y entraban en silencio;
 *  - guarda la recursion de parseBlock a 64 niveles (anidamiento profundo lanza error claro,
 *    no desborda la pila);
 *  - tolera CRLF;
 *  - no convierte enteros con cero a la izquierda (007) en numero.
 * No soporta (por diseño): anchors/aliases, multilinea. Las listas van en flujo: [a, b].
 */
function splitFrontMatter(text) {
  text = String(text).replace(/\r\n?/g, '\n'); // tolera CRLF y CR sueltos
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: text };
  return { fm: m[1], body: m[2] || '' };
}
function parseScalar(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"') && s.length >= 2) || (s.startsWith("'") && s.endsWith("'") && s.length >= 2)) return s.slice(1, -1);
  // string sin cerrar: empieza con comilla pero no cierra (antes se devolvía como string
  // crudo, silenciosamente). Se lanza para fallar fuerte.
  if (s.startsWith('"') || s.startsWith("'"))
    throw new Error('yaml-min: string sin cerrar: "' + s + '"');
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?0\d/.test(s)) return s;                       // 007, -012 → string (no perder ceros)
  if (s !== '' && !isNaN(Number(s))) {
    // La gramatica normativa (SPEC 1.2) define `number` como decimal: hex/binario/octal
    // NO son parte del subset. Number() si los acepta, asi que `0x1f` se colaba como 31 y
    // `0b101` como 5 — la implementacion de referencia contradecia su propia gramatica.
    // Se lanza en vez de degradar a string: convertirlo en texto en silencio dejaria un
    // string donde el autor puso un numero, que es justo el fallo que el subset evita.
    if (/^[+-]?0[xXbBoO]/.test(s))
      throw new Error('yaml-min: literal no decimal "' + s + '" (hex/binario/octal no son parte del subset): ' +
                      'escribilo en decimal (' + Number(s) + '), o entrecomillalo ("' + s + '") si querias texto');
    const n = Number(s);
    // Un numero no finito (1e999, Infinity) se serializa como `null` en el artefacto
    // generado: el dato se perderia EN SILENCIO al exportar. El subset no lo admite.
    if (!Number.isFinite(n))
      throw new Error('yaml-min: numero no finito "' + s + '" (no es representable en el artefacto)');
    return n;
  }
  return s;
}
// Verifica que un valor de FLUJO este bien formado antes de trocearlo: brackets balanceados
// y del tipo correcto, comillas cerradas, y nada de basura despues del cierre externo.
// Sin esto, `parseFlowMap`/`parseFlowList` hacian `slice(1, -1)` a ciegas y un valor sin
// cerrar degradaba EN SILENCIO: `a: [1, 2` perdia el 2, `a: {k: 1` daba {k: ''}.
function assertFlowWellFormed(s) {
  const stack = [];
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{' || c === '[') { stack.push(c); continue; }
    if (c === '}' || c === ']') {
      const open = stack.pop();
      if (open === undefined)
        throw new Error('yaml-min: cierre "' + c + '" sin apertura en flujo: "' + s + '"');
      if ((c === '}') !== (open === '{'))
        throw new Error('yaml-min: cierre "' + c + '" no coincide con la apertura "' + open + '" en flujo: "' + s + '"');
      continue;
    }
    if (stack.length === 0 && c.trim() !== '')
      throw new Error('yaml-min: texto fuera del valor de flujo ("' + c + '") en: "' + s + '"');
  }
  if (q) throw new Error('yaml-min: string sin cerrar en flujo: "' + s + '"');
  if (stack.length)
    throw new Error('yaml-min: falta cerrar "' + stack[stack.length - 1] + '" en flujo: "' + s + '"');
}
// Recorre `s` respetando comillas; devuelve el indice del primer `ch` de nivel-0 fuera de comillas (o -1).
function findTop(s, ch) {
  let q = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === ch && depth === 0) return i;
  }
  return -1;
}
// Parte por comas de nivel-0, respetando comillas y anidamiento {}/[].
// Un hueco INTERNO (`[a, , b]`, `{x: 1, , y: 2}`) es un error: antes se colaba y el
// elemento vacio desaparecia del resultado. Una coma FINAL (`[a, b, ]`) se sigue tolerando.
function splitTop(s) {
  const out = []; let depth = 0, cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      if (cur.trim() === '')
        throw new Error('yaml-min: elemento vacio en flujo (coma de mas) en: "' + s + '"');
      out.push(cur); cur = '';
    } else cur += ch;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}
function parseValue(s) {
  s = s.trim();
  if (s.startsWith('{')) { assertFlowWellFormed(s); return parseFlowMap(s); }
  if (s.startsWith('[')) { assertFlowWellFormed(s); return parseFlowList(s); }
  return parseScalar(s);
}
function parseFlowMap(s) {
  s = s.trim().slice(1, -1);
  const obj = Object.create(null);
  for (const part of splitTop(s)) {
    if (!part.trim()) continue;
    const ci = findTop(part, ':');                      // separador `:` fuera de comillas
    if (ci === -1) throw new Error('yaml-min: par sin ":" en flujo: "' + part.trim() + '"');
    const key = parseScalar(part.slice(0, ci));
    if (key === '__proto__' || key === 'constructor' || key === 'prototype')
      throw new Error('yaml-min: clave prohibida "' + key + '" (prototype pollution)');
    obj[key] = parseValue(part.slice(ci + 1));
  }
  return obj;
}
function parseFlowList(s) {
  s = s.trim().slice(1, -1);
  // Sin filtro: un `""` explicito es un elemento legitimo y antes se borraba en silencio
  // (`[x, "", y]` daba ["x","y"]). Los huecos de sintaxis los atrapa `splitTop`.
  return splitTop(s).map(p => parseValue(p));
}
function parseYamlSubset(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const indentOf = l => (l.match(/^ */) || [''])[0].length;
  // Guard de profundidad: limita la recursión de parseBlock a MAX_DEPTH niveles. Ante un
  // anidamiento patológico (input adversarial) lanza un error claro en vez de desbordar la
  // pila (RangeError opaco). 64 niveles cubren cualquier GAME.md real con margen amplio.
  const MAX_DEPTH = 64;
  function parseBlock(indent, depth) {
    if (depth == null) depth = 0;
    if (depth > MAX_DEPTH)
      throw new Error('yaml-min: anidamiento profundo > ' + MAX_DEPTH + ' niveles (profundidad ' + depth + ')');
    const obj = Object.create(null);
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }
      // tab en indentación: antes se tragaba el tab (indentOf cuenta sólo espacios), ahora
      // falla fuerte — YAML prohíbe tabs para indentar.
      if (/^ *\t/.test(line))
        throw new Error('yaml-min: tab en indentacion (linea ' + (i + 1) + '): usa solo espacios. "' + line.replace(/\t/g, '\\t') + '"');
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent)
        throw new Error('yaml-min: sobre-indentacion (linea ' + (i + 1) + '): indent ' + ind + ' > esperado ' + indent + '. Linea "' + line + '" sin padre que la abra.');
      const content = line.trim();
      if (content.startsWith('- ') || content === '-')
        throw new Error('yaml-min: secuencia de bloque ("- item") no soportada en linea ' + (i + 1) + ': "' + content + '". Usa lista de flujo: [a, b].');
      const ci = findTop(content, ':');
      if (ci === -1)
        throw new Error('yaml-min: linea de front-matter sin ":" (linea ' + (i + 1) + '): "' + content + '"');
      const key = parseScalar(content.slice(0, ci));
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        throw new Error('yaml-min: clave prohibida "' + key + '" en linea ' + (i + 1) + ' (prototype pollution)');
      if (key in obj)
        throw new Error('yaml-min: clave duplicada "' + key + '" en linea ' + (i + 1));
      const rest = content.slice(ci + 1).trim();
      i++;
      if (rest === '') {
        let child = indent + 2, j = i;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) child = indentOf(lines[j]);
        obj[key] = child > indent ? parseBlock(child, depth + 1) : {};
      } else {
        obj[key] = parseValue(rest);
      }
    }
    return obj;
  }
  return parseBlock(0, 0);
}
const _api = { splitFrontMatter, parseYamlSubset };
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
if (typeof window !== 'undefined') window.YamlMin = _api;
