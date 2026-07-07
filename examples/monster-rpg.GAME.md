---
version: "0.1"
name: Monster RPG Demo
profile: monster-rpg
platform: { mode: topdown, cols: 10, rows: 8 }
palettesCount: 4
palettes:
  0: [[8,17,7],[12,22,10],[15,25,12],[18,28,14]]
  1: [[10,14,20],[18,20,24],[24,26,28],[31,31,31]]
tiles:
  16: { name: grass, solid: false }
  17: { name: wall, solid: true }
  18: { name: tall_grass, solid: false, encounter: true }
  19: { name: door, solid: true, warp: true }
tileArt:
  16: [[1,1,2,1,1,0,3,1],[1,0,1,1,2,1,1,1],[2,1,1,3,1,1,1,0],[1,1,1,1,1,1,2,1],[1,3,1,0,1,1,1,1],[0,1,1,2,1,1,1,3],[1,1,1,1,1,0,1,1],[3,1,1,1,2,1,1,1]]
  17: [[1,1,1,1,1,1,1,1],[1,3,3,3,3,3,3,1],[1,3,2,2,2,2,3,1],[1,3,2,2,2,2,3,1],[1,3,2,2,2,2,3,1],[1,3,3,3,3,3,3,1],[1,2,2,2,2,2,2,1],[1,1,1,1,1,1,1,1]]
types:
  GRASS: { WATER: 2, FIRE: 0.5, GRASS: 0.5 }
  FIRE:  { GRASS: 2, WATER: 0.5, FIRE: 0.5 }
  WATER: { FIRE: 2, GRASS: 0.5, WATER: 0.5 }
  NORMAL: { }
moves:
  TACKLE: { type: NORMAL, power: 5 }
  EMBER:  { type: FIRE, power: 6, effect: burn }
  VINE:   { type: GRASS, power: 7, effect: leech }
  BUBBLE: { type: WATER, power: 6, effect: slow }
species:
  LEAFY:    { type: GRASS, maxhp: 20, moves: [TACKLE, VINE], evolvesInto: LEAFKING, atLevel: 8 }
  LEAFKING: { type: GRASS, maxhp: 30, moves: [TACKLE, VINE] }
  EMBY:     { type: FIRE, maxhp: 15, moves: [EMBER], wild: true }
  DROPLET:  { type: WATER, maxhp: 15, moves: [BUBBLE], wild: true }
trainers:
  ROOKIE: { level: 4, prize: 150, team: [EMBY] }
items:
  POTION: { price: 200, effect: heal, amount: 20 }
  BALL:   { price: 100, effect: catch }
encounters:
  field: [EMBY, DROPLET]
economy: { startMoney: 2000 }
balance: { catchBase: 0.4, catchScale: 0.5, xpCurveMul: 1.5, encounterRate: 0.2 }
maps:
  field:
    fill: { tile: 16, pal: 0 }
    legend:
      W: { tile: 17, pal: 0 }
      T: { tile: 18, pal: 0 }
    rows: ["WWWWWWWWWW", "W..T.....W", "W..T.....W", "W........W", "W........W", "W........W", "W........W", "WWWWWWWWWW"]
    entry: { col: 1, row: 7 }
overworld:
  field:
    trainers: [{ col: 5, row: 4, name: ROOKIE, dir: down, sight: 3 }]
player: { starter: LEAFY, level: 5, start: { x: 16, y: 56 }, inventory: { POTION: 1 } }
text:
  intro: "Campo con hierba alta. Camina entre la T para encontrar criaturas."
sfx:
  encounter: { freq: 440, dur: 0.08 }
  hit:       { freq: 660, dur: 0.07 }
  win:       { freq: 523, dur: 0.12 }
---

## Overview
Demo minimo de RPG de monstruos: 4 criaturas, un campo con hierba alta que dispara
encuentros y un entrenador. Estos tokens son la fuente de verdad; un motor los consume
via `monster-rpg.generated.js`.

## Tiles
IDs 8x8. `solid:true` marca colision. `tall_grass` (18) dispara encuentros; `door` (19) es warp.
El arte de cada tile vive en `tileArt`.

## Types
Triangulo de efectividad GRASS > WATER > FIRE > GRASS (x2 a favor, x0.5 en contra). NORMAL es neutro.

## Species
Cuatro criaturas. `LEAFY` evoluciona en `LEAFKING` al nivel 8. Las marcadas `wild:true`
aparecen en la hierba (ver `encounters`).

## Maps
El campo `field` se define con `fill` + `legend` + `rows` (ASCII 10x8), mas `entry`.
La T marca la hierba alta donde aparecen encuentros.

## Player
`starter: LEAFY`, nivel 5, posicion inicial y mochila (`POTION`). El dinero inicial esta en `economy`.

## Text
Textos de sistema (`intro`) como `clave: "cadena"`.

## Economy & Balance
Dinero inicial y catalogo `items` (precio + efecto). Captura: `catchBase + catchScale * (1 - PS/PSmax)`.

## Do's and Don'ts
- Todo `solid:true` debe coincidir con el Set de solidos del motor (cruce opcional `solid-sync`).
- Indices de paleta dentro de `0..palettesCount-1`; arte de tile 8x8; indices de color en 0..31.
- Listas en flujo (`[a, b]`); dialogos en flujo sin comas; textos largos como valor de bloque.