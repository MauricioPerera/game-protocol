/**
 * lifecycle.js — Verifica el ciclo de vida del contrato (MEDIANO S2): deprecation policy,
 * migración y política de breaking changes. Chequea documentos y manifest, no reglas de
 * lint (eso vive en conformance.js). Uso: node test/lifecycle.js
 */
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(REPO, p), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label); if (extra) console.log('        ' + extra); }
};

// ---- MIGRATION.md existe y referencia al menos 1 receta de renombrado (S2.4 DoD) ----
const migration = read('MIGRATION.md');
ok(/## /.test(migration), 'MIGRATION.md  existe y tiene secciones');
// Receta de renombrado: un encabezado de receta + un script sed/jq + un par antes→después
ok(/receta/i.test(migration) && /sed|jq/.test(migration), 'MIGRATION.md  incluye receta de renombrado con script sed/jq');
// La receta canónica de ejemplo nombra el renombrado MOVES → ACTIONS
ok(/MOVES/.test(migration) && /ACTIONS/.test(migration), 'MIGRATION.md  documenta un renombrado concreto (MOVES → ACTIONS)');
// Checklist de migración + referencia al linter version-migration
ok(/version-migration/.test(migration), 'MIGRATION.md  cita la regla version-migration del linter');

// ---- CONTRIBUTING.md cita MIGRATION.md + política de breaking changes (S2.5 DoD) ----
const contributing = read('CONTRIBUTING.md');
ok(/MIGRATION\.md/.test(contributing), 'CONTRIBUTING.md  cita MIGRATION.md');
ok(/breaking/i.test(contributing) && /CHANGELOG/.test(contributing), 'CONTRIBUTING.md  declara la regla de PR breaking (CHANGELOG [Unreleased])');
ok(/minor/.test(contributing) && /major/.test(contributing), 'CONTRIBUTING.md  declara bump minor en 0.x / major en 1.0');

// ---- SPEC §7.1 Deprecation policy presente (S2.2 DoD) ----
const spec = read('SPEC.md');
ok(/### 7\.1 Deprecation policy/.test(spec), 'SPEC.md  tiene §7.1 Deprecation policy');
ok(/deprecated:\s*\{\s*since,\s*removedIn\s*\}|rule\.deprecated\s*=\s*\{/.test(spec), 'SPEC.md  documenta cómo marcar deprecated {since, removedIn}');
ok(/version-migration/.test(spec), 'SPEC.md  documenta la regla version-migration (reemplaza version-compatible)');
ok(/0\.x/.test(spec) && /breaking changes bump the minor/i.test(spec), 'SPEC.md  declara semver 0.x (breaking = minor)');

// ---- manifest.json expone el ciclo de vida (S2.1/S2.3 DoD) ----
const manifest = JSON.parse(read('manifest.json'));
ok(Array.isArray(manifest.migrations && manifest.migrations.supported) && manifest.migrations.doc === 'MIGRATION.md',
   'manifest.json  tiene migrations: {supported, doc: "MIGRATION.md"}');
// Cada perfil expone deprecatedRules (aunque sea [] hoy) — el campo existe para el ciclo de vida
const allHaveDep = Object.values(manifest.profiles).every(p => Array.isArray(p.deprecatedRules));
ok(allHaveDep, 'manifest.json  todos los perfiles exponen deprecatedRules (campo de ciclo de vida)');

console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' chequeos de ciclo de vida pasan') : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);