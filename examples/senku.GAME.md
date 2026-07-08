---
version: '0.1'
name: Senku
description: Solitario de clavijas (peg solitaire) — salta un peg sobre otro para retirarlo hasta dejar uno solo.
profile: peg-solitaire
boards:
  B1:
    goal: clear
    difficulty: easy
    layout: ['__...__', '__...__', '.......', '..ooo..', '...o...', '__.o.__', '__...__']
  B2:
    goal: clear
    difficulty: normal
    layout: ['__...__', '__..o__', '....o..', '..oo.o.', '...oo..', '__.oo__', '__.o.__']
  B3:
    goal: center
    difficulty: hard
    layout: ['__ooo__', '__ooo__', 'ooooooo', 'ooo.ooo', 'ooooooo', '__ooo__', '__ooo__']
player: { start: B1 }
text:
  intro: 'Salta un peg sobre otro vecino hacia un hueco: el saltado se retira. Deja uno solo.'
  pick: 'Peg elegido. Salta a un hueco a dos casillas (Enter).'
  badmove: 'Ese salto no es legal.'
  jump: 'Bien: un peg menos.'
  win: 'Uno solo. Senku resuelto.'
  lose: 'Sin saltos posibles.'
  loseCenter: 'Quedo uno... pero no en el centro.'
---

# Senku

## Overview

**Senku** (solitario de clavijas / *peg solitaire*) sobre el tablero ingles en cruz de 7x7.
Un movimiento salta un peg por encima de un vecino ortogonal hacia un hueco a dos casillas;
el peg saltado se retira. Se gana al dejar **un solo peg** (`goal: clear`) o un solo peg
**en el centro** (`goal: center`). Se pierde al quedarse sin saltos legales.

Los tres tableros estan **generados por script y son solubles por construccion**: B1 y B2
nacen aplicando movimientos inversos desde un unico peg central (todo tablero asi construido
se resuelve deshaciendo el camino), y B3 es el tablero ingles clasico completo (32 pegs,
hueco central), cuya solucion de 31 saltos encontro el solver DFS del generador. Las
secuencias de solucion se rejuegan en `npm test`.

## Boards

- **B1** (easy, clear): 5 pegs — una T invertida bajo el centro; se resuelve en 4 saltos.
- **B2** (normal, clear): 10 pegs repartidos; se resuelve en 9 saltos.
- **B3** (hard, center): el ingles clasico — 32 pegs, hueco central, y el ultimo peg debe
  terminar exactamente en el centro (31 saltos).

El `layout` son 7 filas de 7 caracteres: `_` fuera del tablero, `o` peg, `.` hueco. La forma
7x7 y el alfabeto los valida `pegCheck` (simulacion de referencia) — las familias
declarativas no alcanzan strings con patron (limite documentado en el perfil, material
SPEC §11).

## Text

Textos de sistema del runtime: introduccion, seleccion de peg, salto ilegal, salto valido,
victoria (`win`), derrota por bloqueo (`lose`) y derrota especifica de `goal: center`
(`loseCenter`).

## Do's and Don'ts

- **Si**: tableros nuevos generados por movimientos inversos (solubilidad garantizada) o
  verificados con un solver antes de publicarlos.
- **Si**: `goal: center` solo en tableros donde el centro sea alcanzable como celda final.
- **No**: editar `layout` a mano sin re-verificar que sigue siendo soluble.
- **No**: tableros que no sean 7 filas x 7 columnas ni caracteres fuera de `_ o .`.
