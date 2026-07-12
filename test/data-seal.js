/**
 * data-seal.js — Tests CONGELADOS (oraculo del PM) del sellado de datos de GAME.md.
 * NO EDITAR sin re-sellar: el sello dataSha256 es el analogo de tests_sha256 en KDD.
 *
 * Contrato:
 *  - tools/game-seal.js <GAME.md> imprime en stdout UNA linea: sha256 hex lowercase (64)
 *    del JSON canonico (claves ordenadas recursivamente, arrays en orden, UTF-8) de los
 *    tokens del front-matter EXCLUYENDO la clave dataSha256. Exit 0. Archivo inexistente
 *    o sin front-matter -> exit != 0 con mensaje en stderr.
 *  - game-lint: si el front-matter trae dataSha256 y NO coincide con el hash canonico,
 *    emite finding {level:'error', rule:'data-seal'} (exit 1); si coincide, ningun
 *    finding data-seal; si no hay dataSha256, el sello es opcional (sin finding).
 * Uso: node test/data-seal.js
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..');
const TOOLS = path.join(REPO, 'tools');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

function run(tool, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(TOOLS, tool), ...args],
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    return { code: 0, stdout: stdout.replace(/\r\n/g, '\n'), stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: (e.stdout || '').toString().replace(/\r\n/g, '\n'),
             stderr: (e.stderr || '').toString().replace(/\r\n/g, '\n') };
  }
}

const TMP = path.join(os.tmpdir(), 'game-protocol-data-seal');
fs.mkdirSync(TMP, { recursive: true });

// Fixture base (perfil voxel, valido para lint) — claves en un orden dado.
const bodyA = '---\nversion: \'0.1\'\nname: SealDemo\nprofile: voxel\nmaterials:\n  A: { color: [10, 20, 30] }\n  B: { color: [1, 2, 3] }\n---\ncuerpo\n';
// Mismos DATOS, otro orden de claves (el hash canonico debe ser identico).
const bodyB = '---\nprofile: voxel\nname: SealDemo\nmaterials:\n  B: { color: [1, 2, 3] }\n  A: { color: [10, 20, 30] }\nversion: \'0.1\'\n---\ncuerpo distinto (el sello cubre DATOS, no el cuerpo)\n';
const fileA = path.join(TMP, 'a.GAME.md');
const fileB = path.join(TMP, 'b.GAME.md');
fs.writeFileSync(fileA, bodyA, 'utf8');
fs.writeFileSync(fileB, bodyB, 'utf8');

// 1) game-seal imprime un sha256 hex de 64, exit 0
const sealA = run('game-seal.js', [fileA]);
ok(sealA.code === 0, 'game-seal: exit 0 sobre GAME.md valido', 'code=' + sealA.code + ' stderr=' + sealA.stderr);
const hashA = sealA.stdout.trim();
ok(/^[0-9a-f]{64}$/.test(hashA), 'game-seal: stdout es un sha256 hex lowercase', 'got: ' + JSON.stringify(sealA.stdout.slice(0, 80)));

// 2) determinismo + independencia del orden de claves y del cuerpo
const sealA2 = run('game-seal.js', [fileA]);
ok(sealA2.stdout.trim() === hashA, 'game-seal: determinista (mismo archivo, mismo hash)');
const sealB = run('game-seal.js', [fileB]);
ok(sealB.stdout.trim() === hashA, 'game-seal: canonico (otro orden de claves y otro cuerpo, mismo hash)', sealB.stdout.trim());

// 3) dataSha256 queda excluido del calculo (sellar un doc ya sellado da el mismo hash)
const sealedGood = bodyA.replace('---\ncuerpo', 'dataSha256: \'' + hashA + '\'\n---\ncuerpo');
const fileSealed = path.join(TMP, 'sealed.GAME.md');
fs.writeFileSync(fileSealed, sealedGood, 'utf8');
const sealSealed = run('game-seal.js', [fileSealed]);
ok(sealSealed.stdout.trim() === hashA, 'game-seal: excluye dataSha256 del calculo', sealSealed.stdout.trim());

// 4) lint: sello correcto -> sin finding data-seal y exit 0
const lintGood = run('game-lint.js', [fileSealed]);
ok(lintGood.code === 0, 'lint: sello correcto pasa (exit 0)', 'code=' + lintGood.code + ' ' + lintGood.stdout.slice(0, 200));
let goodFindings = null;
try { goodFindings = JSON.parse(lintGood.stdout).findings || []; } catch (_e) { /* fall through */ }
ok(Array.isArray(goodFindings) && !goodFindings.some(f => f.rule === 'data-seal'),
  'lint: sello correcto no emite finding data-seal');

// 5) lint: sello INCORRECTO -> finding error data-seal y exit 1
const sealedBad = bodyA.replace('---\ncuerpo', 'dataSha256: \'' + 'f'.repeat(64) + '\'\n---\ncuerpo');
const fileBad = path.join(TMP, 'bad.GAME.md');
fs.writeFileSync(fileBad, sealedBad, 'utf8');
const lintBad = run('game-lint.js', [fileBad]);
ok(lintBad.code === 1, 'lint: sello roto -> exit 1 (validacion)', 'code=' + lintBad.code);
let findings = [];
try { findings = JSON.parse(lintBad.stdout).findings || []; } catch (_e) { /* fall through */ }
ok(findings.some(f => f.rule === 'data-seal' && f.level === 'error'),
  'lint: sello roto -> finding {rule: data-seal, level: error}', JSON.stringify(findings).slice(0, 200));

// 6) sin dataSha256 el sello es opcional: lint del doc base sin finding data-seal
const lintPlain = run('game-lint.js', [fileA]);
let plainFindings = null;
try { plainFindings = JSON.parse(lintPlain.stdout).findings || []; } catch (_e) { /* fall through */ }
ok(Array.isArray(plainFindings) && !plainFindings.some(f => f.rule === 'data-seal'),
  'lint: sin dataSha256 no hay finding (sello opcional)');

// 7) editar un DATO tras sellar rompe el sello (deteccion de drift silencioso)
const tampered = sealedGood.replace('[10, 20, 30]', '[10, 20, 31]');
const fileTampered = path.join(TMP, 'tampered.GAME.md');
fs.writeFileSync(fileTampered, tampered, 'utf8');
const lintTampered = run('game-lint.js', [fileTampered]);
let tf = [];
try { tf = JSON.parse(lintTampered.stdout).findings || []; } catch (_e) { /* fall through */ }
ok(lintTampered.code === 1 && tf.some(f => f.rule === 'data-seal'),
  'lint: dato editado tras sellar -> data-seal en error', 'code=' + lintTampered.code);

// 8) errores de CLI: archivo inexistente y sin front-matter
const noFile = run('game-seal.js', [path.join(TMP, 'nope.GAME.md')]);
ok(noFile.code !== 0 && noFile.stderr.length > 0, 'game-seal: archivo inexistente -> exit != 0 con stderr');
const noFm = path.join(TMP, 'nofm.md');
fs.writeFileSync(noFm, 'sin front matter\n', 'utf8');
const noFmRun = run('game-seal.js', [noFm]);
ok(noFmRun.code !== 0, 'game-seal: sin front-matter -> exit != 0');

console.log('\n' + (fail === 0 ? 'OK' : 'FAIL') + ' — ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail === 0 ? 0 : 1);
