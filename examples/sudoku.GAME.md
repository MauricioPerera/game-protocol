---
version: "0.1"
name: Senku
profile: sudoku
description: "Sudoku clasico sobre el perfil puro-de-datos sudoku: 3 puzzles generados y verificados (unicidad incluida)."
puzzles:
  P1: { grid: "..3..2..9.6...385.47958...254231.7...8...419591....243...6.54.113........94...528", solution: "853142679261973854479586312542319786387264195916857243728695431135428967694731528", difficulty: easy }
  P2: { grid: ".76.5.1....16.7..4.89..37..3..4...1..64.3.2..19..8....7...6....6.8.2.49..52.....6", solution: "476258139231697854589143762325476918864931275197582643743869521618325497952714386", difficulty: normal }
  P3: { grid: "..9....35.2.....61.....8.........913..1..4.....8.......74..9..6..5167...1.3845..2", solution: "489671235527493861316258479742586913951734628638912547874329156295167384163845792", difficulty: hard }
player: { start: P1 }
balance: { lives: 3, hints: 3 }
text:
  intro:   "Senku. Flechas para moverte por el tablero; 1-9 para escribir; H para pista."
  correct: "Bien."
  wrong:   "Ese numero no va ahi."
  win:     "Tablero completo. Senku resuelto."
  lose:    "Sin vidas. El tablero te vence esta vez."
---

## Overview
Sudoku clasico sobre el **perfil puro-de-datos `sudoku`** (`profiles/sudoku.json`, sin
funciones): tres tableros de dificultad creciente, generados por script con
**verificacion de unicidad** (cada puzzle tiene exactamente una solucion) y validados de
punta a punta por la simulacion de referencia y sus tests de Node.

## Puzzles
`grid` = 81 caracteres (digitos dados y `.` para vacios); `solution` = los 81 digitos.
Pistas reales: P1 easy 40, P2 normal 32, P3 hard 27. La consistencia grid↔solution y la
validez del sudoku no caben en las familias declarativas (limite documentado del perfil):
las verifica `sudokuCheck` en la simulacion y en `npm test`.

## Text
Intro, acierto, fallo y finales de victoria/derrota que el motor consume con fallback.

## Do's and Don'ts
- `player.start` debe existir en `puzzles` (familia broken-ref).
- `difficulty` es un enum cerrado: easy | normal | hard.
- No edites `grid`/`solution` a mano: regenera con un script y deja que los tests
  verifiquen unicidad y validez (los strings de 81 no perdonan).
