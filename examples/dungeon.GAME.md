---
version: "0.1"
name: Mazmorra del Protocolo
profile: dungeon
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
  53: { name: chest, solid: false }
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
scenes:
  sala:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 2, row: 7 }
    map: { x: 1, y: 1 }
    npcs: [{ col: 3, row: 3, tile: 22, pal: 0, dialogue: guide }]
    warps: [{ col: 6, row: 0, tile: 19, pal: 0, to: tesoro, at: { col: 6, row: 1 }, locked: KEY }, { col: 10, row: 7, tile: 50, pal: 0, to: sotano, at: { col: 10, row: 1 } }, { col: 11, row: 4, tile: 19, pal: 0, to: galeria, at: { col: 1, row: 4 } }]
  sotano:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      o: { tile: 51, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W...oooo...W", "W...oooo...W", "W...oooo...W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 10, row: 1 }
    map: { x: 1, y: 2 }
    npcs: [{ col: 2, row: 6, tile: 22, pal: 0, dialogue: cellar }]
    pickups: [{ col: 8, row: 6, tile: 20, pal: 0, item: KEY }]
    enemies: [{ col: 7, row: 4, tile: 54, pal: 0, hp: 1, dir: 1 }]
    warps: [{ col: 1, row: 7, tile: 50, pal: 0, to: sala, at: { col: 10, row: 6 } }]
  tesoro:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 1 }
    map: { x: 1, y: 0 }
    npcs: [{ col: 3, row: 4, tile: 22, pal: 0, dialogue: keeper }]
    goal: { col: 6, row: 4, tile: 53, pal: 0 }
  galeria:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 1, row: 4 }
    map: { x: 2, y: 1 }
    npcs: [{ col: 6, row: 3, tile: 22, pal: 0, dialogue: galeria }]
    enemies: [{ col: 6, row: 6, tile: 54, pal: 0, hp: 2, dir: 1 }, { col: 9, row: 2, tile: 54, pal: 0, hp: 1, dir: 1, axis: v }]
    warps: [{ col: 0, row: 4, tile: 50, pal: 0, to: sala, at: { col: 10, row: 4 } }, { col: 6, row: 8, tile: 50, pal: 0, to: cripta, at: { col: 6, row: 1 } }]
  cripta:
    fill: { tile: 48, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "WWWWWWWWWWWW"]
    entry: { col: 6, row: 1 }
    map: { x: 2, y: 2 }
    npcs: [{ col: 1, row: 7, tile: 22, pal: 0, dialogue: cripta }]
    enemies: [{ col: 4, row: 5, tile: 54, pal: 0, hp: 2, dir: 1 }, { col: 9, row: 4, tile: 54, pal: 0, hp: 1, dir: 1, axis: v }, { col: 3, row: 2, tile: 54, pal: 0, hp: 1, dir: 1 }]
    warps: [{ col: 6, row: 0, tile: 50, pal: 0, to: galeria, at: { col: 6, row: 7 } }]
player: { start: { scene: sala, col: 2, row: 7 }, hp: 3, tile: 21, pal: 0 }
animate: { water: [51] }
text:
  intro: "Mazmorra — flechas para mover, Espacio para hablar. Baja por las escaleras, halla la llave y abre la puerta del norte."
  guide: "Bienvenido. La puerta del norte esta cerrada. Baja por las escaleras de la derecha a buscar la llave."
  cellar: "Cuidado con el agua. La llave esta al fondo a la derecha."
  keeper: "Has llegado al tesoro. Tocalo para reclamarlo."
  locked: "La puerta esta cerrada con llave."
  got_key: "Has recogido: KEY"
  galeria: "Esta galeria lleva al este y baja a la cripta. Abajo acecha algo: pulsa Espacio junto a el para atacar."
  cripta: "La criatura patrulla. Golpeala dos veces o esquivala."
  hit: "Te golpearon. Vuelves a la entrada."
  defeat: "Enemigo derrotado."
  fallen: "Has caido. Reapareces al inicio."
win: { text: "Tesoro reclamado. Mazmorra completada, 100% definida en GAME.md." }
---

## Overview
Mazmorra de 3 salas (sala, sotano, tesoro) conectadas por warps. Busca la llave en el sotano y abre la puerta.

## Tiles
Suelo, muro, puerta (warp con llave), escaleras (warp), agua (solida), llave, jugador, NPC y cofre-meta. Arte 8x8 en `tileArt`.

## Scenes
Cada escena: `fill`+`legend`+`rows`, su `entry`, y entidades (`npcs`, `pickups`, `warps`, `goal`).

## Player
`start.scene` + coordenadas; su tile de render.

## Text
Diálogos y mensajes de sistema.

## Do's and Don'ts
- Cada `warp.to` debe ser una escena existente; `warp.locked` debe coincidir con un `item` de algun pickup.
- Arte 8x8; indices de color dentro de `0..palettesCount-1`.
