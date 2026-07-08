---
version: "0.1"
name: Roguelike Procedural
profile: roguelike
palettesCount: 16
palettes:
  0: [[1,1,2], [9,11,14], [13,15,19], [7,6,6], [15,12,10], [21,17,13], [18,11,4], [27,19,8], [29,27,6], [31,31,18], [5,16,27], [14,27,31], [27,8,8], [31,17,17], [6,22,12], [31,31,31]]
tiles:
  48: { name: floor, solid: false }
  17: { name: wall, solid: true }
  19: { name: door, solid: false }
  21: { name: player, solid: false }
  54: { name: enemy, solid: false }
  53: { name: chest, solid: false }
  55: { name: stairs_up, solid: false }
  56: { name: stairs_down, solid: false }
  57: { name: potion, solid: false }
  58: { name: sword, solid: false }
  59: { name: axe, solid: false }
  60: { name: key, solid: false }
  61: { name: locked_door, solid: false }
  62: { name: boss, solid: false }
tileArt:
  48: [[1,1,1,1,1,1,1,1],[1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1],[1,1,1,1,1,1,1,1],[1,2,1,1,1,1,2,1],[1,1,1,1,1,1,1,1],[1,1,1,2,1,1,1,1],[1,1,1,1,1,1,1,1]]
  17: [[0,0,0,0,0,0,0,0],[0,5,5,4,4,5,5,0],[0,5,4,4,4,4,3,0],[0,4,4,3,3,4,4,0],[0,4,3,3,4,4,4,0],[0,5,4,4,4,3,4,0],[0,3,4,4,3,4,5,0],[0,0,0,0,0,0,0,0]]
  19: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,7,7,7,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,6,6,7,6,0],[0,6,7,7,7,7,6,0],[0,6,6,6,8,6,6,0],[0,0,0,0,0,0,0,0]]
  21: [[0,0,10,10,10,10,0,0],[0,10,11,11,11,11,10,0],[0,10,11,15,15,11,10,0],[0,10,11,11,11,11,10,0],[0,0,10,10,10,10,0,0],[0,0,10,0,0,10,0,0],[0,0,10,0,0,10,0,0],[0,0,0,0,0,0,0,0]]
  54: [[0,0,12,12,12,12,0,0],[0,12,12,12,12,12,12,0],[12,12,15,12,12,15,12,12],[12,12,15,12,12,15,12,12],[12,12,12,12,12,12,12,12],[12,0,12,0,12,0,12,0],[0,12,0,12,0,12,0,12],[0,0,0,0,0,0,0,0]]
  53: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,8,9,9,8,6,0],[0,6,8,8,8,8,6,0],[0,7,7,7,7,7,7,0],[0,6,6,9,9,6,6,0],[0,6,6,6,6,6,6,0],[0,0,0,0,0,0,0,0]]
  55: [[0,0,0,15,15,0,0,0],[0,0,15,5,5,15,0,0],[0,15,5,5,5,5,15,0],[0,5,5,5,5,5,5,0],[0,4,4,4,4,4,4,0],[0,3,3,3,3,3,3,0],[0,4,4,4,4,4,4,0],[0,0,0,0,0,0,0,0]]
  56: [[0,0,0,0,0,0,0,0],[0,4,4,4,4,4,4,0],[0,3,3,3,3,3,3,0],[0,4,4,4,4,4,4,0],[0,5,5,5,5,5,5,0],[0,15,5,5,5,5,15,0],[0,0,15,5,5,15,0,0],[0,0,0,15,15,0,0,0]]
  57: [[0,0,0,15,15,0,0,0],[0,0,0,2,2,0,0,0],[0,0,15,15,15,15,0,0],[0,0,15,12,12,15,0,0],[0,15,12,13,13,12,15,0],[0,15,12,12,12,12,15,0],[0,15,13,12,12,13,15,0],[0,0,15,15,15,15,0,0]]
  58: [[0,0,0,0,0,15,15,0],[0,0,0,0,15,15,15,0],[0,0,0,15,15,15,0,0],[0,0,15,15,15,0,0,0],[0,7,15,15,0,0,0,0],[7,7,7,15,0,0,0,0],[0,7,6,6,0,0,0,0],[0,0,6,0,0,0,0,0]]
  59: [[0,0,15,15,15,0,0,0],[0,15,15,15,15,15,0,0],[15,15,5,5,15,15,0,0],[15,15,5,5,15,6,0,0],[0,15,15,15,6,0,0,0],[0,0,0,6,6,0,0,0],[0,0,0,6,0,0,0,0],[0,0,0,6,0,0,0,0]]
  60: [[0,0,9,9,9,0,0,0],[0,9,8,0,8,9,0,0],[0,9,8,0,8,9,0,0],[0,0,9,9,9,0,0,0],[0,0,0,9,0,0,0,0],[0,0,0,9,9,0,0,0],[0,0,0,9,0,0,0,0],[0,0,0,9,9,0,0,0]]
  61: [[0,0,0,0,0,0,0,0],[0,6,6,6,6,6,6,0],[0,6,7,7,7,7,6,0],[0,6,7,9,9,7,6,0],[0,6,7,9,9,7,6,0],[0,6,7,8,8,7,6,0],[0,6,6,6,6,6,6,0],[0,0,0,0,0,0,0,0]]
  62: [[12,0,0,0,0,0,0,12],[12,12,0,0,0,0,12,12],[0,12,12,12,12,12,12,0],[12,12,15,12,12,15,12,12],[12,12,12,12,12,12,12,12],[12,13,13,12,12,13,13,12],[0,12,12,12,12,12,12,0],[12,0,12,0,0,12,0,12]]
generator: { seed: 1337, roomW: 11, roomH: 9, maxDepth: 5, branch: 62, floorChance: 45, maxFloor: 3, itemChance: 42, lockChance: 25, keyChance: 30, floor: 48, wall: 17, door: 19, enemy: 54, goal: 53, stairsUp: 55, stairsDown: 56, key: 60, lockedDoor: 61 }
enemyPool: [{ tile: 54, pal: 0, hp: 2 }, { tile: 54, pal: 0, hp: 3 }]
itemPool: [{ tile: 57, pal: 0, kind: heal, amount: 2, name: Pocion }, { tile: 58, pal: 0, kind: weapon, power: 2, name: Espada }, { tile: 59, pal: 0, kind: weapon, power: 3, name: Hacha }]
player: { tile: 21, pal: 0, hp: 5, atk: 1 }
boss: { tile: 62, pal: 0, hp: 8, damage: 2 }
progression: { killsPerAtk: 3, maxBonus: 2, permadeath: false }
text:
  intro: "Roguelike 3D — flechas para mover, Espacio para atacar. Cruza puertas (mismo piso) y pisa escaleras ▲▼ para cambiar de piso. Las salas se generan y se fijan en el mapa."
  enter: "Nueva sala generada."
  hit: "Te golpearon."
  defeat: "Enemigo derrotado."
  fallen: "Has caido. Vuelves al inicio."
  heal: "Bebes una pocion. Vida recuperada."
  equip: "Equipas un arma mejor."
  key: "Encuentras una llave."
  locked: "Puerta cerrada. Necesitas una llave."
  unlock: "La llave abre la puerta."
  boss: "El guardian bloquea el cofre. Derrotalo."
  bossdown: "El guardian cae. El cofre es tuyo."
  levelup: "Tu ataque crece con la experiencia."
win: { text: "Cofre encontrado. Mazmorra procedural completada." }
---

## Overview
Mazmorra infinita generada en tiempo real. El GAME.md no contiene salas: contiene el `generator` y las
plantillas. El motor instancia cada sala al cruzar su puerta, la fija en memoria y la pinta en el minimapa.

## Tiles
Suelo, muro, puerta, jugador, enemigo y cofre (meta). Arte 8x8 en `tileArt`.

## Generator
`seed` (reproducible), `roomW`/`roomH`, `maxDepth` (hasta donde ramifica), `branch` (% de ramificacion),
y los tiles que usa el generador. `enemyPool` es el repertorio de enemigos que coloca.
`lockChance`/`keyChance` (%): puertas cerradas y llaves. Solvencia por construccion: toda sala
conserva al menos una salida SIN cerrar, y como el cofre aparece donde exploras (generacion
perezosa), nunca queda tras una puerta cerrada — las llaves abren atajos y zonas extra.

## Player
`tile`, `pal` y `hp` iniciales. `boss` (opcional): custodia el cofre — hay que derrotarlo para ganar
(`hp`, `damage` por contacto). `progression` (opcional): cada `killsPerAtk` bajas suben el ataque
(+1, hasta `maxBonus`); `permadeath: true` convierte la caida en fin de partida.

## Text
Mensajes de sistema.

## Do's and Don'ts
- `generator.*` tiles deben existir en `tiles`; `roomW`/`roomH` >= 5.
- Sin `seed` fija el mapa cambia cada partida; con ella es reproducible.
