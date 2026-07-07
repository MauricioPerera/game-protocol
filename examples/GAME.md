---
version: "0.1"
name: Demo Protocol Game
profile: monster-rpg
description: Ejemplo minimo y autocontenido del Protocolo GAME (gameplay-as-data).
platform: { mode: demo, cols: 10, rows: 8, screenW: 160, screenH: 128 }
palettesCount: 8
tiles:
  16: { name: grass, solid: false }
  17: { name: wall, solid: true }
  18: { name: tall_grass, solid: false, encounter: true }
  19: { name: door, solid: true, warp: true }
  46: { name: mat, solid: false }
  48: { name: floor, solid: false }
types:
  GRASS: { WATER: 2, FIRE: 0.5, GRASS: 0.5 }
  FIRE:  { GRASS: 2, WATER: 0.5, FIRE: 0.5 }
  WATER: { FIRE: 2, GRASS: 0.5, WATER: 0.5 }
  NORMAL: { }
moves:
  TACKLE: { type: NORMAL, power: 5 }
  VINE:   { type: GRASS, power: 7 }
  EMBER:  { type: FIRE, power: 6 }
  BUBBLE: { type: WATER, power: 6 }
species:
  LEAFY:    { type: GRASS, maxhp: 20, pal: green, moves: [TACKLE, VINE], evolvesInto: LEAFKING, atLevel: 8 }
  LEAFKING: { type: GRASS, maxhp: 30, moves: [TACKLE, VINE] }
  RATTY:    { type: NORMAL, maxhp: 14, pal: purple, moves: [TACKLE], wild: true }
  EMBY:     { type: FIRE, maxhp: 15, pal: red, moves: [EMBER], wild: true }
  DROPLET:  { type: WATER, maxhp: 15, pal: blue, moves: [BUBBLE], wild: true }
trainers:
  ROOKIE JAY: { level: 4, pal: 1, prize: 150, dialogue: Lets battle?, team: [RATTY] }
items:
  POTION:   { price: 200, effect: heal, amount: 20 }
  BALL:     { price: 100, effect: catch }
  ANTIDOTE: { price: 80, effect: cure, cures: poison }
encounters:
  field: [RATTY, EMBY, DROPLET]
economy: { startMoney: 2000 }
balance: { catchBase: 0.4, catchScale: 0.5, xpCurveMul: 1.5, encounterRate: 0.2 }
palettes:
  0: [[8,17,7],[12,22,10],[15,25,12],[18,28,14]]
  1: [[12,22,10],[6,6,8],[16,18,20],[24,26,28],[31,31,31]]
spritePalettes:
  0: [[0,0,0],[1,1,1],[6,20,8],[31,22,16]]
maps:
  house:
    fill: { tile: 48, pal: 1 }
    legend:
      W: { tile: 17, pal: 1 }
      M: { tile: 46, pal: 1 }
    rows: ["WWWWWWWWWW", "W........W", "W........W", "W........W", "W........W", "W........W", "W...M....W", "WWWWWWWWWW"]
    entry:  { col: 4, row: 6 }
    exit:   { col: 4, row: 6 }
    return: { col: 5, row: 3 }
overworld:
  field:
    npcs:     [{ col: 3, row: 4, pal: 1, range: 2, timer: 40, dialogue: "Welcome to the demo!" }]
    trainers: [{ col: 5, row: 5, name: ROOKIE JAY, dir: down, sight: 4 }]
    warps:    [{ col: 5, row: 1, target: house, entry: { col: 4, row: 6 } }]
player: { starter: LEAFY, level: 5, start: { x: 24, y: 24 }, inventory: { POTION: 1 } }
text:
  intro: "Bienvenido a la demo del Protocolo GAME. Camina por la hierba alta para encontrar criaturas."
  sign:  "Esto es un cartel del pueblo demo."
sfx:
  encounter: { freq: 440, dur: 0.08 }
  hit:       { freq: 660, dur: 0.07 }
  win:       { freq: 523, dur: 0.12 }
tileArt:
  16: [[1,1,2,1,1,0,3,1],[1,0,1,1,2,1,1,1],[2,1,1,3,1,1,1,0],[1,1,1,1,1,1,2,1],[1,3,1,0,1,1,1,1],[0,1,1,2,1,1,1,3],[1,1,1,1,1,0,1,1],[3,1,1,1,2,1,1,1]]
  17: [[1,1,1,1,1,1,1,1],[1,3,3,3,3,3,3,1],[1,3,4,4,4,4,3,1],[1,3,4,4,4,4,3,1],[1,3,4,4,4,4,3,1],[1,3,3,3,3,3,3,1],[1,2,2,2,2,2,2,1],[1,1,1,1,1,1,1,1]]
---

## Overview
Juego demo de 10×8 tiles: un campo con hierba alta y encuentros, una casa con interior, un entrenador
y un NPC. Estos tokens son la fuente de verdad; un motor los consume vía `game-data.generated.js`.

## Tiles
Registro de IDs (8×8). `solid:true` marca colisión. `tall_grass` dispara encuentros; `door` es warp;
`mat` (46) es la salida de interiores. El arte de cada tile vive en `tileArt`.

## Types
Triángulo de efectividad GRASS › WATER › FIRE › GRASS (×2 a favor, ×0.5 en contra).

## Species
Cada especie tiene `type` y `moves`. `LEAFY` evoluciona en `LEAFKING` al nivel 8. Las `wild:true`
aparecen en la hierba (ver `encounters`).

## Maps
El interior `house` se define con `fill` + `legend` + `rows` (ASCII), más `entry`/`exit`/`return`.
La `exit` cae sobre el felpudo (tile 46).

## Player
`starter: LEAFY`, posición inicial y mochila (`POTION`). El dinero inicial está en `economy`.

## Text
Textos de sistema (`intro`, `sign`) como `clave: "cadena"`.

## Economy & Balance
Dinero inicial y catálogo `items` (precio + efecto). Captura: `catchBase + catchScale * (1 - PS/PSmax)`.

## Do's and Don'ts
- Todo `solid:true` debe coincidir con el Set de sólidos del motor (cruce opcional `solid-sync`).
- Índices de paleta dentro de `0..palettesCount-1`; arte de tile 8×8; sprites 16×16.
- Listas en **flujo** (`[a, b]`); diálogos con comas **entre comillas**; textos largos como valor de bloque.
