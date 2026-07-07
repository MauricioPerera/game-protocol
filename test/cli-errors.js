/**
 * cli-errors.js — Tests de los flujos de ERROR de los CLI (T3).
 * Verifica que cada CLI rechaza entradas inválidas con el exit code contract (SPEC §3.1):
 *   0=OK, 1=validacion (solo game-lint), 2=input/perfil/sintaxis.
 * Cubre: archivo inexistente, parse-error, perfil inválido/desconocido, --help, flag desconocido.
 * Uso: node test/cli-errors.js
 *
 * Usa execFileSync(process.execPath, ...) + shell:false para ser multi-OS (Windows/Linux).
 * Normaliza CRLF→LF en stdout/stderr. Los exit codes se leen del error.status (execSync lanza
 * en non-zero).
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

// ---- Fixture: front-matter con parse-error (línea sin ":") ----
const TMP = path.join(os.tmpdir(), 'game-protocol-cli-errors');
fs.mkdirSync(TMP, { recursive: true });
const parseErrMd = path.join(TMP, 'parse-error.GAME.md');
fs.writeFileSync(parseErrMd, '---\nversion: 0.1\nname: x\nbrokenline\n---\nbody\n', 'utf8');
// Fixture válido con perfil desconocido (profile: nope — lowercase pasa el regex pero no existe el .js)
const unknownProfileMd = path.join(TMP, 'unknown-profile.GAME.md');
fs.writeFileSync(unknownProfileMd, '---\nversion: 0.1\nname: x\nprofile: nope\n---\nbody\n', 'utf8');
// Fixture válido con perfil de caracteres inválidos
const badProfileMd = path.join(TMP, 'bad-profile.GAME.md');
fs.writeFileSync(badProfileMd, '---\nversion: 0.1\nname: x\nprofile: Bad Profile\n---\nbody\n', 'utf8');
const tmpOut = path.join(TMP, 'out.js');

// ===== game-lint.js =====
// (1) archivo inexistente → exit 2
{
  const r = run('game-lint.js', ['no-existent.md']);
  ok(r.code === 2, 'lint  no-existent.md  (exit 2)', 'exit=' + r.code);
  ok(/No se pudo leer/.test(r.stderr), 'lint  mensaje "No se pudo leer"');
}
// (2) parse-error → exit 1 + finding parse-error en el reporte JSON
{
  const r = run('game-lint.js', [parseErrMd]);
  ok(r.code === 1, 'lint  parse-error.GAME.md  (exit 1, validacion)', 'exit=' + r.code);
  ok(/parse-error/.test(r.stdout), 'lint  reporta regla parse-error');
}
// (3) perfil desconocido → exit 1 + profile-known (validacion: el core lo emite)
{
  const r = run('game-lint.js', [unknownProfileMd]);
  ok(r.code === 1, 'lint  profile:nope  (exit 1, profile-known)', 'exit=' + r.code);
  ok(/profile-known/.test(r.stdout), 'lint  reporta regla profile-known');
}
// (4) perfil caracteres inválidos → exit 1 + profile-load-error (wrapper)
{
  const r = run('game-lint.js', [badProfileMd]);
  ok(r.code === 1, 'lint  profile:Bad Profile  (exit 1, profile-load-error)', 'exit=' + r.code);
  ok(/profile-load-error/.test(r.stdout), 'lint  reporta regla profile-load-error');
}
// (5) --help / -h → exit 0 + usage
{
  const r1 = run('game-lint.js', ['--help']);
  ok(r1.code === 0 && /Usage:/.test(r1.stdout), 'lint  --help  (exit 0 + usage)', 'exit=' + r1.code);
  const r2 = run('game-lint.js', ['-h']);
  ok(r2.code === 0 && /Usage:/.test(r2.stdout), 'lint  -h  (exit 0 + usage)', 'exit=' + r2.code);
}
// (6) flag desconocido → exit 2
{
  const r = run('game-lint.js', ['--nope']);
  ok(r.code === 2, 'lint  --nope  (exit 2, flag desconocido)', 'exit=' + r.code);
  ok(/flag desconocido/.test(r.stderr), 'lint  mensaje "flag desconocido"');
}

// ===== game-export.js =====
// (7) archivo inexistente → exit 2
{
  const r = run('game-export.js', ['no-existent.md', tmpOut]);
  ok(r.code === 2, 'export  no-existent.md  (exit 2)', 'exit=' + r.code);
  ok(/No se pudo leer/.test(r.stderr), 'export  mensaje "No se pudo leer"');
}
// (8) parse-error → exit 2
{
  const r = run('game-export.js', [parseErrMd, tmpOut]);
  ok(r.code === 2, 'export  parse-error.GAME.md  (exit 2)', 'exit=' + r.code);
  ok(/parseo/i.test(r.stderr), 'export  mensaje de error de parseo');
}
// (9) perfil desconocido → exit 2
{
  const r = run('game-export.js', [unknownProfileMd, tmpOut]);
  ok(r.code === 2, 'export  profile:nope  (exit 2, perfil desconocido)', 'exit=' + r.code);
  ok(/Perfil desconocido/.test(r.stderr), 'export  mensaje "Perfil desconocido"');
}
// (10) --help → exit 0
{
  const r = run('game-export.js', ['--help']);
  ok(r.code === 0 && /Usage:/.test(r.stdout), 'export  --help  (exit 0 + usage)', 'exit=' + r.code);
}
// (11) flag desconocido → exit 2
{
  const r = run('game-export.js', ['--nope']);
  ok(r.code === 2, 'export  --nope  (exit 2, flag desconocido)', 'exit=' + r.code);
}

// ===== build-standalone.js =====
// (12) archivo inexistente → exit 2
{
  const r = run('build-standalone.js', ['no-existent.html']);
  ok(r.code === 2, 'standalone  no-existent.html  (exit 2)', 'exit=' + r.code);
  ok(/No se pudo leer/.test(r.stderr), 'standalone  mensaje "No se pudo leer"');
}
// (13) --help → exit 0
{
  const r = run('build-standalone.js', ['--help']);
  ok(r.code === 0 && /Usage:/.test(r.stdout), 'standalone  --help  (exit 0 + usage)', 'exit=' + r.code);
}
// (14) falta argumento → exit 2
{
  const r = run('build-standalone.js', []);
  ok(r.code === 2, 'standalone  sin args  (exit 2, falta archivo.html)', 'exit=' + r.code);
}

// ===== render-png.js =====
// (15) genFile inexistente → exit 2
{
  const r = run('render-png.js', ['examples/no-existent.generated.js']);
  ok(r.code === 2, 'render-png  no-existent.generated.js  (exit 2)', 'exit=' + r.code);
}
// (16) --help → exit 0
{
  const r = run('render-png.js', ['--help']);
  ok(r.code === 0 && /Usage:/.test(r.stdout), 'render-png  --help  (exit 0 + usage)', 'exit=' + r.code);
}

// ===== game-manifest.js / game-schema.js: --help =====
{
  const r = run('game-manifest.js', ['--help']);
  ok(r.code === 0 && /Usage:/.test(r.stdout), 'manifest  --help  (exit 0 + usage)', 'exit=' + r.code);
}
{
  const r = run('game-schema.js', ['--help']);
  ok(r.code === 0 && /Usage:/.test(r.stdout), 'schema  --help  (exit 0 + usage)', 'exit=' + r.code);
}
// (17) flag desconocido en manifest/schema → exit 2
{
  const r = run('game-manifest.js', ['--nope']);
  ok(r.code === 2, 'manifest  --nope  (exit 2, flag desconocido)', 'exit=' + r.code);
}
{
  const r = run('game-schema.js', ['--nope']);
  ok(r.code === 2, 'schema  --nope  (exit 2, flag desconocido)', 'exit=' + r.code);
}

// ===== 2.0.0: `profile` obligatorio (fallback removido; deprecado en 1.3.0) =====
// (18) GAME.md valido SIN `profile` → lint exit 1 + error required-fields sobre profile
//      (el hallazgo profile-fallback ya NO se emite); export exit 2 + mensaje accionable.
{
  const noProfileMd = path.join(TMP, 'no-profile.GAME.md');
  fs.writeFileSync(noProfileMd, '---\nversion: "0.1"\nname: x\n---\nbody\n', 'utf8');
  const r = run('game-lint.js', [noProfileMd]);
  ok(r.code === 1, 'lint  sin profile  (exit 1, obligatorio desde 2.0.0)', 'exit=' + r.code);
  ok(/required-fields/.test(r.stdout) && /obligatorio: profile/.test(r.stdout),
     'lint  error required-fields por profile');
  ok(!/profile-fallback/.test(r.stdout), 'lint  sin hallazgo profile-fallback (removido)');
  const e = run('game-export.js', [noProfileMd, tmpOut]);
  ok(e.code === 2, 'export  sin profile  (exit 2)', 'exit=' + e.code);
  ok(/Falta `profile`/.test(e.stderr) && /2\.0\.0/.test(e.stderr),
     'export  mensaje de profile obligatorio', JSON.stringify(e.stderr));
}

// Limpieza
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos CLI de error pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);