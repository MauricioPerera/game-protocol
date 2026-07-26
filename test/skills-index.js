#!/usr/bin/env node
/**
 * skills-index.js — Gatea el bundle de conocimiento que este origen publica: el snapshot
 * BM25 (`skills-index.snapshot`), su sha256 en `llms.txt`, y la coherencia entre los
 * documentos indexados y las skills que los anuncian.
 *
 * Por que existe: el snapshot estaba commiteado SIN generador ni gate. Quedo desactualizado
 * (no contenia la version vigente) y su troceado estaba roto — una ventana deslizante de un
 * caracter producia miles de chunks-cola de 1..30 caracteres ("0/20.", "/20.", "20.").
 * Este test cierra las dos puertas: sin-drift y calidad minima del troceado.
 *
 * Uso: node test/skills-index.js
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(REPO, p), 'utf8');
const { buildSnapshot, serialize, MIN } = require('../tools/skills-index');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); }
};

// ---- Sin-drift: el snapshot commiteado == el que produce el generador ----
const committed = read('skills-index.snapshot');
const regenerated = serialize(buildSnapshot());
ok(committed === regenerated, 'skills-index.snapshot  sin drift respecto de knowledge/',
   'regenera con: node tools/skills-index.js');

// Determinismo: dos corridas dan el mismo byte.
ok(serialize(buildSnapshot()) === regenerated, 'generador  determinista (misma entrada, mismo byte)');

// ---- El sha256 que declara llms.txt corresponde al snapshot en disco ----
const llms = read('llms.txt');
const m = llms.match(/<!--\s*skills-memory:\s*(\{.*?\})\s*-->/);
ok(!!m, 'llms.txt  declara el comentario skills-memory');
if (m) {
  const meta = JSON.parse(m[1]);
  const sha = crypto.createHash('sha256').update(committed, 'utf8').digest('hex');
  ok(meta.snapshot_sha256 === sha, 'llms.txt  snapshot_sha256 coincide con el snapshot',
     'declarado: ' + meta.snapshot_sha256 + '  real: ' + sha);
  ok(meta.format === 'minimemory-okf-v1', 'llms.txt  formato declarado sin cambios (minimemory-okf-v1)');
}

// ---- Contrato de forma (lo que consume search_knowledge) ----
const snap = JSON.parse(committed);
ok(Array.isArray(snap) && snap.length > 0, 'snapshot  es un array no vacio (' + snap.length + ' chunks)');
const shapeBad = snap.filter(c =>
  !c || typeof c.id !== 'string' || !c.metadata ||
  typeof c.metadata.content !== 'string' || typeof c.metadata.okf_concept !== 'string' ||
  typeof c.metadata.okf_type !== 'string' || typeof c.metadata.title !== 'string');
ok(shapeBad.length === 0, 'snapshot  toda entrada es {id, metadata:{content, okf_concept, okf_type, title}}',
   shapeBad.length + ' entradas mal formadas');
ok(snap.every(c => c.id === c.metadata.okf_concept + '#' + c.id.split('#')[1]),
   'snapshot  los id siguen el patron <concepto>#<n>');
ok(new Set(snap.map(c => c.id)).size === snap.length, 'snapshot  no hay id duplicados');

// ---- Calidad del troceado: la regresion concreta que rompio el indice ----
const lens = snap.map(c => c.metadata.content.length).sort((a, b) => a - b);
const median = lens[Math.floor(lens.length / 2)];
const tiny = lens.filter(l => l < MIN).length;
ok(median >= 200, 'troceado  mediana >= 200 chars (es ' + median + ')',
   'una mediana minuscula = el chunker degenero en ventana deslizante');
ok(tiny / snap.length < 0.05, 'troceado  menos del 5% de chunks por debajo de ' + MIN + ' chars (' + tiny + '/' + snap.length + ')');
const uniq = new Set(snap.map(c => c.metadata.content)).size;
ok(uniq / snap.length > 0.95, 'troceado  >95% de chunks con contenido unico (' + uniq + '/' + snap.length + ')',
   'contenido repetido = el chunker esta emitiendo sufijos solapados');

// ---- El indice cubre lo que las skills anuncian ----
const conceptsInSnap = [...new Set(snap.map(c => c.metadata.okf_concept))].sort();
const onDisk = fs.readdirSync(path.join(REPO, 'knowledge')).filter(f => f.endsWith('.md')).sort();
ok(JSON.stringify(conceptsInSnap) === JSON.stringify(onDisk),
   'snapshot  indexa exactamente los documentos de knowledge/',
   'snapshot: ' + conceptsInSnap.join(',') + '  disco: ' + onDisk.join(','));

const listed = JSON.parse(read('skills/list_concepts/tool.js').match(/var CONCEPTS = (\[.*?\]);/s)[1]);
ok(JSON.stringify(listed.map(c => c.id).sort()) === JSON.stringify(onDisk),
   'list_concepts  anuncia exactamente los documentos de knowledge/');
const titleOfConcept = {};
for (const c of snap) titleOfConcept[c.metadata.okf_concept] = c.metadata.title;
const titleMismatch = listed.filter(c => titleOfConcept[c.id] !== c.title);
ok(titleMismatch.length === 0, 'list_concepts  los title coinciden con el encabezado real del documento',
   titleMismatch.map(c => c.id + ': anuncia "' + c.title + '" vs doc "' + titleOfConcept[c.id] + '"').join(' | '));

const gc = read('skills/get_concept/tool.js');
ok(onDisk.every(f => gc.includes('/knowledge/' + f)), 'get_concept  mapea todos los documentos de knowledge/');

// ---- knowledge/ es una copia fiel de los documentos raiz ----
// El bundle publicado se sirve desde knowledge/; si driftea de la raiz, el snapshot indexa
// una version vieja del spec y las skills responden con documentacion caducada.
for (const f of onDisk) {
  if (!fs.existsSync(path.join(REPO, f))) continue;   // documento que solo vive en el bundle
  ok(read(f) === read('knowledge/' + f), 'knowledge/' + f + '  identico al documento raiz',
     'sincroniza copiando ' + f + ' -> knowledge/' + f);
}

// ---- El indice refleja el estado actual del repo (no una version vieja) ----
const version = JSON.parse(read('package.json')).version;
const all = snap.map(c => c.metadata.content).join('\n');
ok(all.includes(version), 'snapshot  contiene la version vigente del paquete (' + version + ')',
   'el snapshot quedo atras respecto del CHANGELOG');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos del indice de skills pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
