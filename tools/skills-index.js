#!/usr/bin/env node
/**
 * skills-index.js — Genera `skills-index.snapshot`, el indice BM25 del bundle de
 * conocimiento que este origen publica (formato `minimemory-okf-v1`, ver `llms.txt`), y
 * actualiza el `snapshot_sha256` que `llms.txt` declara.
 * Uso:  node tools/skills-index.js [salida.snapshot]
 *
 * Por que existe: el snapshot estaba COMMITEADO SIN GENERADOR. Nada en el repo lo producia
 * ni lo verificaba, asi que (a) quedo desactualizado respecto de los documentos que indexa
 * y (b) su troceado estaba roto — degeneraba en una ventana deslizante de UN caracter, y
 * producia miles de chunks-cola de 1..30 caracteres ("0/20.", "/20.", "20.") que no
 * responden a ninguna consulta. De 2608 chunks, 2387 median menos de 60 caracteres y 901
 * estaban duplicados.
 *
 * El troceado de aca es por ESTRUCTURA del markdown: se acumulan parrafos completos (los
 * bloques ``` se mantienen enteros) hasta MAX caracteres, cortando solo en limites
 * naturales. Un parrafo mas largo que MAX se parte por limite de palabra con solape, que es
 * el unico caso donde el corte es arbitrario. Cada chunk lleva su ruta de encabezados como
 * prefijo: BM25 puede asi encontrar "exit codes" desde el texto de la seccion que los
 * explica aunque el parrafo no repita el titulo.
 *
 * Determinista: mismo bundle -> mismo snapshot byte a byte (lo gatea test/skills-index.js).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const KNOWLEDGE_DIR = path.join(REPO, 'knowledge');
const LLMS_TXT = path.join(REPO, 'llms.txt');

const MAX = 800;      // techo de caracteres por chunk (el del snapshot original)
const OVERLAP = 120;  // solape SOLO al partir un parrafo mas largo que MAX
const MIN = 40;       // por debajo de esto un chunk se funde con el anterior

// ---- Troceado ----
// Divide en bloques atomicos: parrafos separados por linea en blanco, con los bloques de
// codigo (```) enteros aunque contengan lineas en blanco.
function toBlocks(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let cur = [], fence = false;
  const flush = () => { const s = cur.join('\n').trim(); if (s) blocks.push(s); cur = []; };
  for (const line of lines) {
    if (/^\s*```/.test(line)) { cur.push(line); fence = !fence; if (!fence) flush(); continue; }
    if (!fence && line.trim() === '') { flush(); continue; }
    cur.push(line);
  }
  flush();
  return blocks;
}
// Parte un bloque mas largo que MAX por limite de palabra, con solape.
function splitLong(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let end = Math.min(i + MAX, s.length);
    if (end < s.length) {
      const sp = s.lastIndexOf(' ', end);
      if (sp > i + MIN) end = sp;
    }
    out.push(s.slice(i, end).trim());
    if (end >= s.length) break;
    i = Math.max(end - OVERLAP, i + 1);
  }
  return out.filter(Boolean);
}
// Ruta de encabezados vigente (## / ###) para dar contexto al chunk.
function headingOf(block) {
  const m = block.match(/^(#{1,6})\s+(.+)$/);
  return m ? { level: m[1].length, text: m[2].trim() } : null;
}
function chunkMarkdown(text) {
  const blocks = toBlocks(text);
  const chunks = [];
  const trail = [];                                    // pila de encabezados vigentes
  let buf = '', bufHead = '';

  const prefixFor = () => trail.map(h => h.text).join(' > ');
  const flush = () => {
    const s = buf.trim();
    buf = '';
    if (!s) return;
    const body = bufHead && !s.startsWith(bufHead) ? bufHead + '\n\n' + s : s;
    // Un resto minusculo se funde con el chunk anterior en vez de quedar suelto.
    if (chunks.length && s.length < MIN) chunks[chunks.length - 1] += '\n\n' + s;
    else chunks.push(body);
  };

  for (const block of blocks) {
    const h = headingOf(block);
    if (h) {
      flush();
      while (trail.length && trail[trail.length - 1].level >= h.level) trail.pop();
      trail.push(h);
      buf = block;
      bufHead = '';
      continue;
    }
    if (block.length > MAX) {
      flush();
      const head = prefixFor();
      for (const piece of splitLong(block))
        chunks.push(head && !piece.startsWith(head) ? head + '\n\n' + piece : piece);
      bufHead = head;
      continue;
    }
    if (buf && (buf.length + block.length + 2) > MAX) { flush(); bufHead = prefixFor(); }
    if (!buf) bufHead = prefixFor();
    buf = buf ? buf + '\n\n' + block : block;
  }
  flush();
  return chunks;
}

// ---- Bundle ----
function titleOf(text) {
  const m = String(text).match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}
function buildSnapshot() {
  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md')).sort();
  const out = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf8');
    const title = titleOf(text);
    if (!title) throw new Error('knowledge/' + f + ' no tiene encabezado `# ` (title del concepto)');
    chunkMarkdown(text).forEach((content, n) => {
      out.push({ id: f + '#' + n, metadata: { content, okf_concept: f, okf_type: 'Documentation', title } });
    });
  }
  return out;
}
function serialize(snapshot) { return JSON.stringify(snapshot); }

// `llms.txt` declara el sha256 del snapshot: si no se actualiza junto con el snapshot, un
// consumidor que verifique el hash rechaza el bundle entero.
function rewriteLlmsTxt(sha256) {
  const txt = fs.readFileSync(LLMS_TXT, 'utf8');
  const re = /(<!--\s*skills-memory:\s*)(\{.*?\})(\s*-->)/;
  const m = txt.match(re);
  if (!m) throw new Error('llms.txt no tiene el comentario `skills-memory` con el sha256 del snapshot');
  const meta = JSON.parse(m[2]);
  if (meta.snapshot_sha256 === sha256) return false;
  meta.snapshot_sha256 = sha256;
  fs.writeFileSync(LLMS_TXT, txt.replace(re, m[1] + JSON.stringify(meta) + m[3]));
  return true;
}

module.exports = { chunkMarkdown, buildSnapshot, serialize, titleOf, MAX, MIN };

if (require.main === module) {
  const args = process.argv.slice(2);
  const usage = () => {
    console.log('Usage: node tools/skills-index.js [salida.snapshot]');
    console.log('Regenera el indice BM25 del bundle knowledge/ y actualiza el sha256 en llms.txt.');
    console.log('Options:');
    console.log('  --help     Show this help message');
    console.log('Exit codes: 0=OK, 2=input/sintaxis');
  };
  if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
  const unknown = args.filter(a => a.startsWith('-') && a.length > 1);
  if (unknown.length) { console.error('Error: flag desconocido: ' + unknown.join(', ')); usage(); process.exit(2); }

  try {
    const snapshot = buildSnapshot();
    const body = serialize(snapshot);
    const out = args[0] || path.join(REPO, 'skills-index.snapshot');
    fs.writeFileSync(out, body);
    const sha = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
    // Solo se toca llms.txt cuando se escribe el snapshot canonico del repo.
    const touched = (args[0] == null) ? rewriteLlmsTxt(sha) : false;
    const lens = snapshot.map(c => c.metadata.content.length).sort((a, b) => a - b);
    console.log('Generado ' + path.relative(process.cwd(), out) +
      '  (' + snapshot.length + ' chunks, mediana ' + lens[Math.floor(lens.length / 2)] + ' chars, sha256 ' + sha.slice(0, 12) + '…)');
    if (touched) console.log('llms.txt  snapshot_sha256 actualizado');
  } catch (e) { console.error('Error: ' + e.message); process.exit(2); }
}
