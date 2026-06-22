/**
 * render-png.js — Tests del renderer PNG.
 * (1) perfil no soportado (monster-rpg -> game-data.generated.js, sin G.SCENE) se rechaza con
 *     exit 2 y un mensaje accionable (no TypeError opaco).  → U4
 * (2) perfil adventure sigue renderizando OK (exit 0, PNG valido).
 * Uso: node test/render-png.js
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..');
const RENDER = path.join(REPO, 'tools/render-png.js');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [RENDER, ...args], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: (e.stdout || '').toString(), stderr: (e.stderr || '').toString() };
  }
}

// (1) monster-rpg.generated.js (profile monster-rpg, sin G.SCENE) -> exit 2 + mensaje accionable.
const bad = run(['examples/game-data.generated.js']);
ok(bad.code === 2, 'reject  monster-rpg.generated.js  (exit 2)', 'exit=' + bad.code);
ok(/adventure/.test(bad.stderr) && /G\.SCENE/.test(bad.stderr),
   'reject  mensaje accionable menciona adventure + G.SCENE', JSON.stringify(bad.stderr));

// (2) adventure.generated.js -> exit 0 + PNG en disco.
const out = path.join(os.tmpdir(), 'game-protocol-render-png-test.png');
if (fs.existsSync(out)) fs.unlinkSync(out);
const good = run(['examples/adventure.generated.js', out]);
ok(good.code === 0, 'render  adventure.generated.js  (exit 0)', 'exit=' + good.code + ' stderr=' + good.stderr);
ok(fs.existsSync(out) && fs.statSync(out).size > 0, 'render  PNG en disco no vacio',
   fs.existsSync(out) ? fs.statSync(out).size + ' bytes' : 'no existe');
if (fs.existsSync(out)) fs.unlinkSync(out);

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos de render-png pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);