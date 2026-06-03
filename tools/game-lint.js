#!/usr/bin/env node
/**
 * game-lint.js — Linter del Protocolo GAME. Sin dependencias.
 * Uso:  node tools/game-lint.js [GAME.md]
 * Las reglas viven en game-lint-core.js (isomorfo: lo comparten la CLI y un lint en vivo del navegador).
 * Cruces con el motor (solid-sync / dead-token): opcionales, vía GAME_ENGINE=<ruta al archivo del motor>.
 */
const fs = require('fs');
const path = require('path');
const { splitFrontMatter, parseYamlSubset } = require('./yaml-min');
const { lintGame } = require('./game-lint-core');

const file = process.argv[2] || 'GAME.md';
const root = path.dirname(path.resolve(file));

let text;
try { text = fs.readFileSync(file, 'utf8'); }
catch (e) { console.error('No se pudo leer ' + file); process.exit(2); }

const { fm, body } = splitFrontMatter(text);
const data = fm ? parseYamlSubset(fm) : {};

// Cruce con el motor SOLO si GAME_ENGINE apunta a un archivo legible (este repo es portable, sin motor).
let engineSource = null;
if (process.env.GAME_ENGINE) {
  try { engineSource = fs.readFileSync(path.resolve(root, process.env.GAME_ENGINE), 'utf8'); }
  catch (e) { console.error('GAME_ENGINE no se pudo leer: ' + process.env.GAME_ENGINE); }
}

const findings = lintGame(data, body || '', { engineSource, requireEngine: false, frontMatterPresent: !!fm });

const errors = findings.filter(f => f.level === 'error').length;
const warns = findings.filter(f => f.level === 'warn').length;
const tiles = data.tiles || {}, types = data.types || {}, moves = data.moves || {}, species = data.species || {};
const report = {
  file,
  summary: { errors, warnings: warns, ok: errors === 0 },
  counts: { tiles: Object.keys(tiles).length, types: Object.keys(types).length, moves: Object.keys(moves).length, species: Object.keys(species).length },
  findings
};
console.log(JSON.stringify(report, null, 2));
process.exit(errors > 0 ? 1 : 0);
