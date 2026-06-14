---
version: "0.1"
name: Escape Room Demo
profile: adventure
palettesCount: 16
palettes:
  0: [[2,2,3], [10,12,14], [14,16,18], [8,6,5], [16,12,9], [22,16,11], [20,12,4], [28,20,8], [30,28,6], [31,31,20], [6,18,28], [16,28,31], [28,8,8], [31,18,18], [12,24,10], [31,31,31]]
tiles:
  48: { name: floor, solid: false }
  17: { name: wall, solid: true }
  19: { name: door, solid: false }
  20: { name: key, solid: false }
  21: { name: player, solid: false }
  22: { name: npc, solid: false }
tileArt:
  48: [[1,1,1,1,1,1,1,1],[1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1],[1,1,1,1,1,1,1,1],[1,2,1,1,1,1,2,1],[1,1,1,1,1,1,1,1],[1,1,1,2,1,1,1,1],[1,1,1,1,1,1,1,1]]
  17: [[0,0,0,0,0,0,0,0],[0,5,5,4,4,5,5,0],[0,5,4,4,4,4,3,0],[0,4,4,3,3,4,4,0],[0,4,3,3,4,4,4,0],[0,5,4,4,4,3,4,0],[0,3,4,4,3,4,5,0],[0,0,0,0,0,0,0,0]]
  19: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,7,7,7,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,7,7,7,6,0],[0,6,6,6,8,6,6,0],[0,0,0,0,0,0,0,0]]
  20: [[0,0,0,0,0,0,0,0],[0,0,0,8,8,0,0,0],[0,0,8,9,9,8,0,0],[0,0,8,9,9,8,0,0],[0,0,0,8,8,0,0,0],[0,0,0,8,0,0,0,0],[0,0,0,8,8,0,0,0],[0,0,0,8,0,0,0,0]]
  21: [[0,0,10,10,10,10,0,0],[0,10,11,11,11,11,10,0],[0,10,11,15,15,11,10,0],[0,10,11,11,11,11,10,0],[0,0,10,10,10,10,0,0],[0,0,10,0,0,10,0,0],[0,0,10,0,0,10,0,0],[0,0,0,0,0,0,0,0]]
  22: [[0,0,12,12,12,12,0,0],[0,12,13,13,13,13,12,0],[0,12,13,15,15,13,12,0],[0,12,13,13,13,13,12,0],[0,0,12,12,12,12,0,0],[0,0,12,0,0,12,0,0],[0,0,12,0,0,12,0,0],[0,0,0,0,0,0,0,0]]
scene:
  fill: { tile: 48, pal: 0 }
  legend:
    W: { tile: 17, pal: 0 }
  rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
player: { start: { col: 2, row: 7 }, tile: 21, pal: 0 }
entities:
  npcs: [{ col: 3, row: 3, tile: 22, pal: 0, dialogue: npc_hello }]
  pickups: [{ col: 9, row: 6, tile: 20, pal: 0, item: KEY }]
  goal: { col: 6, row: 0, tile: 19, pal: 0, locked: KEY }
text:
  intro: "Escape Room — flechas para mover, Espacio para hablar / recoger. Encuentra la llave y abre la puerta del norte."
  npc_hello: "La puerta del norte esta cerrada. Hay una llave en la esquina sureste."
  locked: "Cerrada con llave. Necesitas una llave."
win: { text: "Has escapado. Juego completo, 100% definido en GAME.md." }
---

## Overview
Sala 12x9 jugable: muros con colision, un NPC con pista, una llave y una puerta-meta cerrada.
Todo el contenido (pixel-art incluido) vive en este GAME.md; el motor solo renderiza y gestiona input.

## Tiles
Suelo, muro (solid), puerta-meta, llave, jugador y NPC. El arte 8x8 de cada uno esta en `tileArt`.

## Scene
La sala se define con `fill` + `legend` + `rows` (ASCII). Las entidades se dibujan encima.

## Entities
`npcs` (con `dialogue` -> clave de `text`), `pickups` (otorgan un `item`) y `goal` (meta; `locked` exige item).

## Player
`start` en coordenadas de celda y su tile de render.

## Text
Textos de sistema e `intro`/diálogos como `clave: "cadena"`.

## Do's and Don'ts
- Indices de tileArt dentro de `0..palettesCount-1`; arte 8x8; filas de `scene` rectangulares.
- `goal.locked` debe coincidir con el `item` de algun pickup, o el juego es imposible.
