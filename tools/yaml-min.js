/**
 * yaml-min.js — Parser de un subconjunto de YAML suficiente para GAME.md (sin dependencias).
 * Soporta: front-matter ---, mapas de bloque (anidados, 2 espacios), flujo {..}/[..], escalares
 * (number/bool/string). Compartido por game-lint y game-export (isomorfo).
 *
 * Robustez (falla FUERTE, no en silencio):
 *  - respeta comillas al partir comas y el separador `:` en flujo (admite comas y `:` en strings);
 *  - LANZA error claro ante secuencias de bloque (`- item`) y lineas de front-matter sin `:`;
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
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?0\d/.test(s)) return s;                       // 007, -012 → string (no perder ceros)
  if (s !== '' && !isNaN(Number(s))) return Number(s);
  return s;
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
function splitTop(s) {
  const out = []; let depth = 0, cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}
function parseValue(s) {
  s = s.trim();
  if (s.startsWith('{')) return parseFlowMap(s);
  if (s.startsWith('[')) return parseFlowList(s);
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
  return splitTop(s).map(p => parseValue(p)).filter(v => v !== '');
}
function parseYamlSubset(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const indentOf = l => (l.match(/^ */) || [''])[0].length;
  function parseBlock(indent) {
    const obj = Object.create(null);
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent) { i++; continue; }
      const content = line.trim();
      if (content.startsWith('- ') || content === '-')
        throw new Error('yaml-min: secuencia de bloque ("- item") no soportada en linea ' + (i + 1) + ': "' + content + '". Usa lista de flujo: [a, b].');
      const ci = findTop(content, ':');
      if (ci === -1)
        throw new Error('yaml-min: linea de front-matter sin ":" (linea ' + (i + 1) + '): "' + content + '"');
      const key = parseScalar(content.slice(0, ci));
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        throw new Error('yaml-min: clave prohibida "' + key + '" en linea ' + (i + 1) + ' (prototype pollution)');
      const rest = content.slice(ci + 1).trim();
      i++;
      if (rest === '') {
        let child = indent + 2, j = i;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) child = indentOf(lines[j]);
        obj[key] = child > indent ? parseBlock(child) : {};
      } else {
        obj[key] = parseValue(rest);
      }
    }
    return obj;
  }
  return parseBlock(0);
}
const _api = { splitFrontMatter, parseYamlSubset };
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
if (typeof window !== 'undefined') window.YamlMin = _api;
