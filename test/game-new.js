#!/usr/bin/env node
/**
 * game-new.js — Gatea el ARRANQUE LIMPIO: `tools/game-new.js` debe producir, para CADA
 * perfil del repo, un GAME.md que lintea 0 errores y exporta sin fallar, sin heredar una
 * sola linea de contenido de `examples/`.
 *
 * Por que este test existe: sin un generador, el unico GAME.md del repo era un ejemplo
 * completo (monster-rpg), y tanto humanos como agentes lo copiaban creyendo que era el
 * punto de partida de un proyecto. Este test es el que impide que ese hueco vuelva: si
 * alguien agrega un perfil cuyo esqueleto no lintea limpio, el gate lo atrapa aca.
 *
 * Incluye ademas la regresion de `version-migration`: `version: 0.1` SIN comillas parsea
 * como numero y `0.1.0` es la misma version que `0.1`; ambas daban un error
 * autocontradictorio ("version 0.1 no soportada (max 0.1)") que castigaba a quien escribia
 * un GAME.md a mano en vez de copiar un ejemplo.
 *
 * Uso: node test/game-new.js
 */
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const REPO = path.resolve(__dirname, '..');
const T = f => path.join(REPO, 'tools', f);

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); }
};
const run = (script, argv) => cp.spawnSync('node', [T(script)].concat(argv), { encoding: 'utf8' });

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'game-new-'));

// ---- Perfiles disponibles (--list es el contrato que usa el resto del test) ----
const listed = run('game-new.js', ['--list']);
ok(listed.status === 0 && listed.stdout.trim() !== '', 'game-new --list  exit 0 y lista no vacia');
const ids = listed.stdout.trim().split('\n').map(s => s.trim()).filter(Boolean);

const onDisk = [...new Set(fs.readdirSync(path.join(REPO, 'profiles'))
  .filter(f => /\.(js|json)$/.test(f)).map(f => f.replace(/\.(js|json)$/, '')))].sort();
ok(JSON.stringify(ids) === JSON.stringify(onDisk),
   'game-new --list  cubre TODOS los perfiles de profiles/ (' + onDisk.length + ')',
   'listados: ' + ids.join(',') + '  en disco: ' + onDisk.join(','));

// ---- El esqueleto de CADA perfil: lint 0 errores + export OK ----
for (const id of ids) {
  const md = path.join(TMP, id + '.GAME.md');
  const gen = path.join(TMP, id + '.generated.js');
  const n = run('game-new.js', [id, md, '--name', 'Prueba ' + id]);
  if (n.status !== 0) { ok(false, id + '  game-new exit 0', n.stderr.trim()); continue; }

  const l = run('game-lint.js', [md]);
  let rep = {}; try { rep = JSON.parse(l.stdout); } catch (e) {}
  const errs = (rep.findings || []).filter(f => f.level === 'error');
  ok(l.status === 0 && errs.length === 0, id + '  esqueleto lintea 0 errores',
     errs.map(e => e.rule + ': ' + e.msg).join(' | '));

  const e = run('game-export.js', [md, gen]);
  ok(e.status === 0 && fs.existsSync(gen), id + '  esqueleto exporta sin fallar', e.stderr.trim());
}

// ---- El esqueleto NO arrastra contenido de los ejemplos ----
// El sintoma original: un GAME.md nuevo nacia con species/tiles/mapas del monster-rpg de
// ejemplo. Ningun esqueleto debe contener tokens de contenido que no haya sembrado su perfil.
const advSkeleton = fs.readFileSync(path.join(TMP, 'monster-rpg.GAME.md'), 'utf8');
const leaked = ['species:', 'moves:', 'typeChart:', 'encounters:', 'trainers:', 'tileArt:']
  .filter(tok => advSkeleton.includes(tok));
ok(leaked.length === 0, 'esqueleto monster-rpg  sin contenido heredado de examples/',
   'tokens filtrados: ' + leaked.join(', '));
ok(/game-new\.js/.test(advSkeleton) && /examples\//.test(advSkeleton),
   'esqueleto  se autoidentifica como esqueleto y desaconseja copiar examples/');

// ---- Contrato de exit codes (SPEC §3.1): 0 = OK, 2 = input/perfil; nunca 1 ----
ok(run('game-new.js', ['--help']).status === 0, 'game-new --help  exit 0');
ok(run('game-new.js', ['--nope']).status === 2, 'game-new  flag desconocido exit 2');
ok(run('game-new.js', []).status === 2, 'game-new  sin perfil exit 2');
ok(run('game-new.js', ['no-existe-este-perfil', path.join(TMP, 'x.md')]).status === 2,
   'game-new  perfil desconocido exit 2');
ok(run('game-new.js', ['../etc/passwd', path.join(TMP, 'y.md')]).status === 2,
   'game-new  id con traversal rechazado exit 2');
ok(run('game-new.js', ['quiz', '--name']).status === 2, 'game-new  --name sin valor exit 2');

// Sobrescritura: protegida por defecto, permitida con --force.
const dup = path.join(TMP, 'dup.GAME.md');
ok(run('game-new.js', ['quiz', dup]).status === 0, 'game-new  primera escritura exit 0');
ok(run('game-new.js', ['quiz', dup]).status === 2, 'game-new  no sobrescribe sin --force (exit 2)');
ok(run('game-new.js', ['quiz', dup, '--force']).status === 0, 'game-new  --force sobrescribe (exit 0)');

// ---- Regresion version-migration: la comparacion es SEMANTICA, no textual ----
const { lintGame } = require('../tools/game-lint-core');
const vm = v => lintGame({ version: v, name: 'x', profile: 'quiz' }, '', { profile: { id: 'quiz' } })
  .filter(f => f.rule === 'version-migration');

ok(vm('0.1').length === 0, "version-migration  '0.1' (string) sin hallazgo");
ok(vm(0.1).length === 0, 'version-migration  0.1 SIN COMILLAS (numero) sin hallazgo — regresion');
ok(vm('0.1.0').length === 0, "version-migration  '0.1.0' == '0.1' sin hallazgo — regresion");
ok(vm('0.2').length === 1 && vm('0.2')[0].level === 'error',
   "version-migration  '0.2' (mas nueva que el tooling) sigue siendo error");
ok(vm('0.0.9').length === 1 && vm('0.0.9')[0].level === 'warn',
   "version-migration  '0.0.9' (mas vieja) sigue siendo warn");

// Un GAME.md escrito a mano con `version: 0.1` sin comillas lintea limpio end-to-end.
const handWritten = path.join(TMP, 'a-mano.GAME.md');
fs.writeFileSync(handWritten, '---\nversion: 0.1\nname: A Mano\nprofile: quiz\n---\n\n## Overview\n\nx\n');
const hw = run('game-lint.js', [handWritten]);
ok(hw.status === 0, 'GAME.md a mano con `version: 0.1` sin comillas  lintea exit 0',
   (JSON.parse(hw.stdout || '{}').findings || []).map(f => f.rule + ': ' + f.msg).join(' | '));

fs.rmSync(TMP, { recursive: true, force: true });

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);
