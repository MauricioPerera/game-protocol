/**
 * mutation-manual.js — Mutation audit MANUAL del oráculo del linter (perfil monster-rpg).
 *
 * Idea: parte de un GAME.md válido (0 errores), le aplica mutaciones pequeñas y quirúrgicas
 * (una sola por caso) al AST de datos ya parseado, y verifica que el linter ATRAPA cada
 * mutación (dispara la regla esperada). Un mutante que pasa sin disparar la regla = oráculo
 * débil (el contrato NO detectó el fallo). Reporta killed / survived.
 *
 * Es el complemento humano de mutation_audit del MCP ccdd: aquí los mutantes los escribe un
 * humano contra el .md real del repo (no contra un contrato aislado), cubriendo reglas de
 * varias familias (broken-ref, dims, range, economy, sfx, type-symmetry).
 *
 * Uso: node test/mutation-manual.js
 */
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const { splitFrontMatter, parseYamlSubset } = require(REPO + '/tools/yaml-min');
const { lintGame } = require(REPO + '/tools/game-lint-core');
const loadProfile = id => require(REPO + '/profiles/' + id + '.js');

// ---- Fixture base: examples/monster-rpg.GAME.md (válido, 0 errores) ----
const MD = fs.readFileSync(REPO + '/examples/monster-rpg.GAME.md', 'utf8').replace(/\r\n/g, '\n');
const { fm, body } = splitFrontMatter(MD);
const BASE = parseYamlSubset(fm);
const PID = BASE.profile || 'monster-rpg';
const prof = loadProfile(PID);

let pass = 0, fail = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); } };

// Lint con perfil + frontMatterPresent (igual que conformance.js)
function lint(data) {
  return lintGame(data, '', { profile: prof, frontMatterPresent: true });
}
const hasRule = (f, rule) => f.some(x => x.rule === rule);
const clone = o => JSON.parse(JSON.stringify(o));

// Sanity: la base DEBE linter limpio (si no, los mutantes son ruido)
const baseErrs = lint(BASE).filter(x => x.level === 'error');
ok(baseErrs.length === 0, 'base  monster-rpg.GAME.md lintero limpio (precondición)',
   baseErrs.map(x => x.rule + ': ' + x.msg).join(' | '));

// ---- Mutantes manuales: cada uno rompe UNA cosa y debe disparar UNA regla ----
// `mutate` recibe un clon profundo de BASE y lo muta in-place; `rule` es la regla esperada.
const mutants = [
  { name: 'move.type = NOPE',          rule: 'move-type-valid',    mutate: d => { d.moves.EMBER.type = 'NOPE'; } },
  { name: 'move.type eliminado',        rule: 'move-type-valid',    mutate: d => { delete d.moves.TACKLE.type; } },
  { name: 'species.moves = [NOPE]',     rule: 'moves-exist',        mutate: d => { d.species.LEAFY.moves = ['NOPE']; } },
  { name: 'species.type = NOPE',        rule: 'species-type-valid',  mutate: d => { d.species.EMBY.type = 'NOPE'; } },
  { name: 'species.evolvesInto = NOPE', rule: 'broken-ref',         mutate: d => { d.species.LEAFY.evolvesInto = 'NOPE'; } },
  { name: 'trainer.team = [NOPE]',      rule: 'trainer-team-valid',  mutate: d => { d.trainers.ROOKIE.team = ['NOPE']; } },
  { name: 'encounters.field = [NOPE]',  rule: 'encounter-ref',       mutate: d => { d.encounters.field = ['NOPE']; } },
  { name: 'player.starter = NOPE',      rule: 'player-ref',         mutate: d => { d.player.starter = 'NOPE'; } },
  { name: 'map.row.cols -1',            rule: 'map-dims',           mutate: d => { d.maps.field.rows[1] = d.maps.field.rows[1].slice(0, -1); } },
  { name: 'map.legend.tile = 999',     rule: 'map-legend-ref',     mutate: d => { d.maps.field.legend.W.tile = 999; } },
  { name: 'palette color = 999',       rule: 'palette-color-range', mutate: d => { d.palettes[0][0][0] = 999; } },
  { name: 'sfx.freq = -1',              rule: 'sfx-valid',          mutate: d => { d.sfx.encounter.freq = -1; } },
  { name: 'item.price = -5',            rule: 'economy-bounds',     mutate: d => { d.items.POTION.price = -5; } },
  { name: 'item.effect = nope',         rule: 'item-effect-valid',  mutate: d => { d.items.POTION.effect = 'nope'; } },
  { name: 'type chart asimétrico',      rule: 'type-symmetry',      mutate: d => { d.types.GRASS.WATER = 0.5; } }, // warn-level
];

console.log('\n— Mutantes —');
const results = [];
for (const m of mutants) {
  const d = clone(BASE);
  m.mutate(d);
  const f = lint(d);
  const killed = hasRule(f, m.rule);
  ok(killed, 'mutant  ' + m.name + '  → ' + m.rule,
      killed ? '' : 'reglas vistas: ' + [...new Set(f.map(x => x.rule))].join(', '));
  results.push({ name: m.name, rule: m.rule, killed });
}

console.log('\n— Reporte mutation audit —');
console.log('  Mutantes totales: ' + results.length);
console.log('  Killed (atrapados): ' + results.filter(r => r.killed).length);
console.log('  Survived (oráculo débil): ' + results.filter(r => !r.killed).length);
const survived = results.filter(r => !r.killed);
if (survived.length) console.log('  Survivientes:\n' + survived.map(r => '    - ' + r.name + ' (esperaba ' + r.rule + ')').join('\n'));

console.log('\n' + (fail === 0
  ? ('OK — ' + pass + ' chequeos pasan; ' + results.filter(r => r.killed).length + '/' + results.length + ' mutantes atrapados')
  : (fail + ' FALLOS de ' + (pass + fail))));
process.exit(fail === 0 ? 0 : 1);