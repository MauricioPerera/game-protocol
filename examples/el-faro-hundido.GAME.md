---
version: "0.1"
name: El Faro Hundido
profile: dungeon
description: "Juego completo jugable sobre el motor dungeon de referencia: 7 salas, 2 llaves encadenadas, 5 enemigos, agua animada."
palettesCount: 16
palettes:
  0: [[1,1,2], [9,11,14], [13,15,19], [7,6,6], [15,12,10], [21,17,13], [18,11,4], [27,19,8], [29,27,6], [31,31,18], [5,16,27], [14,27,31], [27,8,8], [31,17,17], [6,22,12], [31,31,31]]
tiles:
  48: { name: floor, solid: false }
  17: { name: wall, solid: true }
  19: { name: door, solid: false }
  20: { name: key, solid: false }
  21: { name: player, solid: false }
  22: { name: npc, solid: false }
  50: { name: stairs, solid: false }
  51: { name: water, solid: true }
  52: { name: pillar, solid: true }
  53: { name: lamp, solid: false }
  54: { name: enemy, solid: false }
tileArt:
  48: [[1,1,1,1,1,1,1,1],[1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1],[1,1,1,1,1,1,1,1],[1,2,1,1,1,1,2,1],[1,1,1,1,1,1,1,1],[1,1,1,2,1,1,1,1],[1,1,1,1,1,1,1,1]]
  17: [[0,0,0,0,0,0,0,0],[0,5,5,4,4,5,5,0],[0,5,4,4,4,4,3,0],[0,4,4,3,3,4,4,0],[0,4,3,3,4,4,4,0],[0,5,4,4,4,3,4,0],[0,3,4,4,3,4,5,0],[0,0,0,0,0,0,0,0]]
  19: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,7,7,7,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,7,7,7,6,0],[0,6,6,6,8,6,6,0],[0,0,0,0,0,0,0,0]]
  20: [[0,0,0,0,0,0,0,0],[0,0,0,8,8,0,0,0],[0,0,8,9,9,8,0,0],[0,0,8,9,9,8,0,0],[0,0,0,8,8,0,0,0],[0,0,0,8,0,0,0,0],[0,0,0,8,8,0,0,0],[0,0,0,8,0,0,0,0]]
  21: [[0,0,10,10,10,10,0,0],[0,10,11,11,11,11,10,0],[0,10,11,15,15,11,10,0],[0,10,11,11,11,11,10,0],[0,0,10,10,10,10,0,0],[0,0,10,0,0,10,0,0],[0,0,10,0,0,10,0,0],[0,0,0,0,0,0,0,0]]
  22: [[0,0,12,12,12,12,0,0],[0,12,13,13,13,13,12,0],[0,12,13,15,15,13,12,0],[0,12,13,13,13,13,12,0],[0,0,12,12,12,12,0,0],[0,0,12,0,0,12,0,0],[0,0,12,0,0,12,0,0],[0,0,0,0,0,0,0,0]]
  50: [[0,0,0,0,0,0,0,0],[5,5,5,5,5,5,5,5],[3,3,3,3,3,3,3,3],[4,4,4,4,4,4,4,4],[5,5,5,5,5,5,5,5],[3,3,3,3,3,3,3,3],[4,4,4,4,4,4,4,4],[3,3,3,3,3,3,3,3]]
  51: [[10,10,11,10,10,10,11,10],[10,11,10,10,11,10,10,10],[11,10,10,11,10,10,10,11],[10,10,11,10,10,11,10,10],[10,11,10,10,10,11,10,10],[11,10,10,11,10,10,10,11],[10,10,11,10,10,11,10,10],[10,11,10,10,11,10,10,10]]
  53: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,8,9,9,8,6,0],[0,6,8,8,8,8,6,0],[0,7,7,7,7,7,7,0],[0,6,6,9,9,6,6,0],[0,6,6,6,6,6,6,0],[0,0,0,0,0,0,0,0]]
  54: [[0,0,12,12,12,12,0,0],[0,12,12,12,12,12,12,0],[12,12,15,12,12,15,12,12],[12,12,15,12,12,15,12,12],[12,12,12,12,12,12,12,12],[12,0,12,0,12,0,12,0],[0,12,0,12,0,12,0,12],[0,0,0,0,0,0,0,0]]
  52: [[0,0,3,3,3,3,0,0],[0,3,4,4,4,4,3,0],[0,3,4,5,5,4,3,0],[0,3,4,5,5,4,3,0],[0,3,4,5,5,4,3,0],[0,3,4,4,4,4,3,0],[0,3,4,4,4,4,3,0],[3,3,3,3,3,3,3,3]]
scenes:
  vestibulo:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..P....P..W", "W..........W", "W..........W", "W..P....P..W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 6 }
    map: { x: 1, y: 1 }
    npcs: [{ col: 3, row: 3, tile: 22, pal: 0, dialogue: guia }]
    warps: [{ col: 6, row: 0, tile: 19, pal: 0, to: linterna, at: { col: 6, row: 7 }, locked: LLAVE_DORADA }, { col: 11, row: 4, tile: 19, pal: 0, to: galeria, at: { col: 1, row: 4 } }, { col: 0, row: 4, tile: 19, pal: 0, to: bodega, at: { col: 10, row: 4 } }, { col: 6, row: 8, tile: 50, pal: 0, to: cisterna, at: { col: 6, row: 1 } }]
  galeria:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W.P.P..P.P.W", "W..........W", "W..........W", "W.P.P..P.P.W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 1, row: 4 }
    map: { x: 2, y: 1 }
    enemies: [{ col: 5, row: 4, tile: 54, pal: 0, hp: 1, dir: 1 }]
    warps: [{ col: 0, row: 4, tile: 19, pal: 0, to: vestibulo, at: { col: 10, row: 4 } }, { col: 6, row: 0, tile: 19, pal: 0, to: torreon, at: { col: 6, row: 7 }, locked: LLAVE_OXIDADA }]
  bodega:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W.PP.......W", "W.PP.......W", "W..........W", "W..........W", "W......PP..W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 10, row: 4 }
    map: { x: 0, y: 1 }
    npcs: [{ col: 2, row: 6, tile: 22, pal: 0, dialogue: bodeguero }]
    pickups: [{ col: 5, row: 6, tile: 20, pal: 0, item: LLAVE_OXIDADA }]
    enemies: [{ col: 5, row: 3, tile: 54, pal: 0, hp: 1, dir: 1, axis: v }]
    warps: [{ col: 11, row: 4, tile: 19, pal: 0, to: vestibulo, at: { col: 1, row: 4 } }]
  cisterna:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      o: { tile: 51, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W...oooo...W", "W...oooo...W", "W...oooo...W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 1 }
    map: { x: 1, y: 2 }
    enemies: [{ col: 2, row: 2, tile: 54, pal: 0, hp: 1, dir: 1, axis: v }]
    warps: [{ col: 6, row: 0, tile: 50, pal: 0, to: vestibulo, at: { col: 6, row: 7 } }, { col: 0, row: 4, tile: 19, pal: 0, to: cripta, at: { col: 10, row: 4 } }]
  torreon:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W.P......P.W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W.P......P.W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 7 }
    map: { x: 2, y: 0 }
    pickups: [{ col: 6, row: 2, tile: 20, pal: 0, item: LLAVE_DORADA }]
    enemies: [{ col: 4, row: 4, tile: 54, pal: 0, hp: 2, dir: 1 }, { col: 8, row: 3, tile: 54, pal: 0, hp: 1, dir: 1, axis: v }]
    warps: [{ col: 6, row: 8, tile: 19, pal: 0, to: galeria, at: { col: 6, row: 1 } }]
  cripta:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W.P.P.P.P..W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W.P.P.P.P..W", "WWWWWWWWWWWW"]
    entry: { col: 10, row: 4 }
    map: { x: 0, y: 2 }
    npcs: [{ col: 6, row: 4, tile: 22, pal: 0, dialogue: espectro }]
    enemies: [{ col: 4, row: 6, tile: 54, pal: 0, hp: 2, dir: 1 }]
    warps: [{ col: 11, row: 4, tile: 19, pal: 0, to: cisterna, at: { col: 1, row: 4 } }]
  linterna:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      P: { tile: 52, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W....PP....W", "W..........W", "W....PP....W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 7 }
    map: { x: 1, y: 0 }
    goal: { col: 6, row: 3, tile: 53, pal: 0 }
    warps: [{ col: 6, row: 8, tile: 19, pal: 0, to: vestibulo, at: { col: 6, row: 1 } }]
player: { start: { scene: vestibulo, col: 6, row: 6 }, hp: 3, tile: 21, pal: 0 }
animate: { water: [51] }
text:
  intro: "El faro se apago hace anios. Enciende la linterna del piso alto. Flechas para moverte; Espacio para hablar y golpear."
  guia: "La puerta norte pide la llave dorada. Dicen que esta en el torreon... y que el torreon pide otra llave."
  bodeguero: "La llave oxidada anda entre mis cajas. El bicho que ronda no es mio."
  espectro: "Fui farero. La cisterna desborda desde que la luz murio... no toques el agua."
  locked: "Cerrada con llave."
  got_key: "Has recogido una llave."
  hit: "Te golpearon. Vuelves a la entrada de la sala."
  defeat: "Enemigo derrotado."
  fallen: "Has caido. El mar te devuelve al vestibulo."
win: { text: "La linterna arde de nuevo. El Faro Hundido vuelve a guiar barcos. Juego completo, 100% definido en GAME.md." }
---

## Overview
Juego **completo y jugable** sobre el motor dungeon de referencia: siete salas conectadas
(vestibulo, galeria, bodega, cisterna, torreon, cripta y la linterna), progresion por dos
llaves encadenadas (la oxidada de la bodega abre el torreon; la dorada del torreon abre
la linterna), cinco enemigos que patrullan (horizontal y vertical, hasta 2 HP), tres NPCs
con pistas y una meta final. Todo el contenido — mundo, arte, dialogos, balance — vive en
este GAME.md; el motor (examples/el-faro-hundido.html) es el mismo codigo del perfil.

## Tiles
Suelo, muro, puerta, escaleras, agua (solida y animada por `animate.water`), pilar/cajas,
llave, lampara-meta, jugador, NPC y enemigo. Arte 8x8 en `tileArt`.

## Scenes
Siete salas 12x9 con `map {x,y}` coherente para el minimapa (niebla de guerra del motor).
Los warps con `locked` implementan la progresion: bodega → LLAVE_OXIDADA → torreon →
LLAVE_DORADA → linterna → goal.

## Player
Empieza en el vestibulo con 3 de vida. Al ser golpeado vuelve a la entrada de la sala; al
caer, al vestibulo.

## Text
Intro, tres dialogos de NPC (guia, bodeguero, espectro) y los mensajes de sistema que el
motor consume con fallback (locked, got_key, hit, defeat, fallen).

## Do's and Don'ts
- Cada `warp.to` existe y cada `warp.locked` lo otorga algun pickup (o el juego es imposible).
- El agua (51) es `solid: true`: la cisterna se rodea, no se cruza.
- Arte 8x8 con indices en 0..palettesCount-1; el shimmer del agua usa los indices 10/11.
