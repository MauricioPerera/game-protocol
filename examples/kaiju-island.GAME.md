---
version: "0.1"
name: Kaiju Island
profile: monster-rpg
description: "Stress-test del protocolo: ejercita todos los tokens del perfil monster-rpg."
platform: { mode: topdown, cols: 12, rows: 10, screenW: 192, screenH: 160 }
palettesCount: 8
palettes:
  0: [[6,15,6],[10,20,9],[14,25,12],[18,29,15],[22,31,18],[3,9,4],[26,31,22],[31,31,26]]
  1: [[10,8,6],[15,12,9],[20,16,12],[25,21,16],[29,26,21],[6,5,4],[31,29,24],[12,10,8]]
  2: [[4,8,16],[7,13,22],[10,18,27],[14,23,31],[19,27,31],[2,5,11],[24,29,31],[8,12,20]]
  3: [[8,7,9],[12,11,13],[17,15,18],[22,20,23],[27,25,28],[4,4,5],[30,29,31],[14,13,15]]
  4: [[16,12,4],[21,16,7],[26,21,10],[30,26,14],[31,29,19],[10,7,2],[31,31,24],[19,15,6]]
  5: [[14,4,3],[20,7,4],[26,11,5],[31,16,7],[31,22,12],[8,2,2],[31,27,18],[24,9,5]]
  6: [[4,12,12],[6,17,17],[9,22,22],[13,27,26],[18,31,29],[2,7,7],[24,31,31],[7,15,15]]
  7: [[12,12,14],[16,16,19],[21,21,24],[26,26,29],[30,30,31],[7,7,8],[31,31,31],[18,18,21]]
spritePalettes:
  0: [[0,0,0],[4,10,4],[8,18,7],[13,25,10],[19,30,14],[26,31,20],[31,31,28],[10,6,3],[16,11,5],[23,17,9],[29,23,14],[31,29,21],[5,5,6],[14,14,16],[23,23,26],[31,31,31]]
  1: [[0,0,0],[4,6,14],[7,11,20],[11,17,26],[16,23,31],[22,28,31],[28,31,31],[10,4,12],[16,8,19],[22,13,26],[28,19,31],[31,25,31],[5,4,6],[14,12,16],[23,21,26],[31,31,31]]
sprites:
  kaiju: ["0000033333000000", "0003344444330000", "0034455555443000", "0345566666554300", "03456fc6fc654300", "3456666666665430", "3456622222665430", "3456221112265430", "3456211111265430", "3456221112265430", "0345622222654300", "0345566666554300", "0034455555443000", "0034334443343000", "0344303330344300", "0333000000033300"]
  wisp: ["000000eee0000000", "0000eefffee00000", "000efffffffe0000", "00effbfffbffe000", "00efbbfffbbfe000", "0efffffffffffe00", "0effccfffccffe00", "0effcdfffdcffe00", "0efffffefffffe00", "00efffeeefffe000", "00effffffffe0000", "000effffffe00000", "000eefffee000000", "00e00efe00e00000", "0e0000e0000e0000", "0000000000000000"]
tiles:
  16: { name: grass, solid: false }
  17: { name: wall, solid: true }
  18: { name: tall_grass, solid: false, encounter: true }
  19: { name: door, solid: true, warp: true }
  20: { name: water, solid: true }
  21: { name: sand, solid: false }
  46: { name: mat, solid: false }
  48: { name: floor, solid: false }
  50: { name: rock, solid: true }
  51: { name: cave_floor, solid: false }
tileArt:
  16: ["11211031", "10112111", "21131110", "11111121", "13101111", "01121113", "11111011", "31112111"]
  17: ["55555555", "53352225", "53352225", "55555555", "52225335", "52225335", "55555555", "00000000"]
  18: ["14121412", "42414241", "14341434", "21424142", "14143414", "42414241", "14341434", "21424142"]
  19: ["55555555", "53333335", "53222235", "53222235", "53222235", "53226235", "53222235", "55555555"]
  20: ["22322232", "23223222", "32232223", "22322322", "23222322", "32232223", "22322322", "23223222"]
  21: ["33233323", "32332333", "23343332", "33333323", "34323333", "23333334", "33323233", "43333333"]
  46: ["00000000", "06666660", "06333360", "06366360", "06366360", "06333360", "06666660", "00000000"]
  48: ["22222222", "23333332", "23222232", "23233232", "23233232", "23222232", "23333332", "22222222"]
  50: ["00333300", "03444430", "34454443", "34555443", "34454443", "34444543", "03444430", "00333300"]
  51: ["11121111", "12111121", "11112111", "21111112", "11211211", "11111111", "12112112", "11111111"]
types:
  FLAME:   { FLORA: 2, TIDE: 0.5, FLAME: 0.5 }
  TIDE:    { FLAME: 2, FLORA: 0.5, VOLT: 0.5, SPECTER: 0.5, TIDE: 0.5 }
  FLORA:   { TIDE: 2, STONE: 2, FLAME: 0.5, FLORA: 0.5 }
  VOLT:    { TIDE: 2, STONE: 0.5, VOLT: 0.5 }
  STONE:   { VOLT: 2, SPECTER: 2, FLORA: 0.5, STONE: 0.5 }
  SPECTER: { TIDE: 2, STONE: 0.5, SPECTER: 0.5 }
  NORMAL:  { }
moves:
  TACKLE:       { type: NORMAL, power: 5 }
  HOWL:         { type: NORMAL, power: 3, effect: flinch, chance: 0.2 }
  EMBERSTORM:   { type: FLAME, power: 7, effect: burn, chance: 0.25 }
  INFERNO:      { type: FLAME, power: 12, effect: burn, chance: 0.4 }
  TIDALSLAM:    { type: TIDE, power: 7, effect: slow, chance: 0.3 }
  MAELSTROM:    { type: TIDE, power: 12 }
  VINE_WHIP:    { type: FLORA, power: 6, effect: leech, chance: 0.5 }
  BLOOM_BURST:  { type: FLORA, power: 11, effect: leech, chance: 0.35 }
  SPARKBOLT:    { type: VOLT, power: 7, effect: paralyze, chance: 0.25 }
  THUNDERCRASH: { type: VOLT, power: 12, effect: paralyze, chance: 0.3 }
  ROCKFALL:     { type: STONE, power: 8 }
  LANDSLIDE:    { type: STONE, power: 13 }
  SOUL_DRAIN:   { type: SPECTER, power: 9, effect: leech, chance: 0.6 }
species:
  SPROUTLE:    { type: FLORA, maxhp: 22, pal: green, sprite: kaiju, moves: [TACKLE, VINE_WHIP], evolvesInto: THORNBACK, atLevel: 9 }
  THORNBACK:   { type: FLORA, maxhp: 34, pal: green, sprite: kaiju, moves: [TACKLE, VINE_WHIP, BLOOM_BURST], evolvesInto: VERDRAKON, atLevel: 18 }
  VERDRAKON:   { type: FLORA, maxhp: 52, pal: green, sprite: kaiju, moves: [VINE_WHIP, BLOOM_BURST, LANDSLIDE] }
  CINDERPUP:   { type: FLAME, maxhp: 20, pal: red, sprite: kaiju, moves: [TACKLE, EMBERSTORM], evolvesInto: PYROHOUND, atLevel: 10 }
  PYROHOUND:   { type: FLAME, maxhp: 32, pal: red, sprite: kaiju, moves: [HOWL, EMBERSTORM, INFERNO], evolvesInto: INFERNOX, atLevel: 20 }
  INFERNOX:    { type: FLAME, maxhp: 50, pal: red, sprite: kaiju, moves: [EMBERSTORM, INFERNO, HOWL] }
  DRIPLET:     { type: TIDE, maxhp: 21, pal: blue, sprite: kaiju, moves: [TACKLE, TIDALSLAM], evolvesInto: TORRENTEEL, atLevel: 10, wild: true }
  TORRENTEEL:  { type: TIDE, maxhp: 33, pal: blue, sprite: kaiju, moves: [TACKLE, TIDALSLAM, MAELSTROM], evolvesInto: ABYSSKRAKEN, atLevel: 21 }
  ABYSSKRAKEN: { type: TIDE, maxhp: 55, pal: blue, sprite: kaiju, moves: [TIDALSLAM, MAELSTROM, SOUL_DRAIN] }
  VOLTMOUSE:   { type: VOLT, maxhp: 18, pal: yellow, moves: [TACKLE, SPARKBOLT], wild: true }
  PEBBLIT:     { type: STONE, maxhp: 26, pal: brown, moves: [TACKLE, ROCKFALL], wild: true }
  GHOSTWISP:   { type: SPECTER, maxhp: 17, pal: violet, sprite: wisp, moves: [SOUL_DRAIN, HOWL], wild: true }
  DUSTRAT:     { type: NORMAL, maxhp: 15, pal: gray, moves: [TACKLE, HOWL], wild: true }
trainers:
  RANGER LILA:  { level: 7, pal: 2, prize: 300, dialogue: "El bosque me dio mi equipo!", team: [SPROUTLE, VOLTMOUSE] }
  SCOUT BRUNO:  { level: 11, pal: 4, prize: 550, dialogue: Las rocas nunca fallan., team: [PEBBLIT, PEBBLIT, CINDERPUP] }
  CHAMPION ODA: { level: 18, pal: 5, prize: 1500, dialogue: "Soy la ultima prueba de la isla!", team: [PYROHOUND, TORRENTEEL, THORNBACK, GHOSTWISP] }
items:
  TONIC:      { price: 200, effect: heal, amount: 20 }
  MEGA_TONIC: { price: 700, effect: heal, amount: 60 }
  ANTIDOTE:   { price: 120, effect: cure, cures: poison }
  NET_BALL:   { price: 150, effect: catch }
  STORM_BALL: { price: 400, effect: catch }
encounters:
  field: [VOLTMOUSE, DUSTRAT, DRIPLET]
  cave:  [PEBBLIT, GHOSTWISP, DUSTRAT]
  shore: [DRIPLET, VOLTMOUSE, GHOSTWISP]
economy: { startMoney: 2500 }
balance: { catchBase: 0.35, catchScale: 0.5, xpCurveMul: 1.4, encounterRate: 0.18, runChance: 0.6 }
maps:
  field:
    fill: { tile: 16, pal: 0 }
    legend:
      W: { tile: 17, pal: 1 }
      T: { tile: 18, pal: 0 }
      D: { tile: 19, pal: 1 }
      o: { tile: 20, pal: 2 }
      s: { tile: 21, pal: 4 }
      C: { tile: 19, pal: 3 }
    rows: ["WWWWWWWWWWWW", "W....TT....W", "W..TTTT..o.W", "W....D...ooW", "W.........oW", "W...ss.....W", "W.TT...TT..W", "W....C.....W", "W..T....T..W", "WWWWWWWWWWWW"]
    entry: { col: 2, row: 8 }
  house:
    fill: { tile: 48, pal: 1 }
    legend:
      W: { tile: 17, pal: 1 }
      M: { tile: 46, pal: 1 }
    rows: ["WWWWWWWWWWWW", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W..........W", "W.....M....W", "WWWWWWWWWWWW"]
    entry:  { col: 6, row: 8 }
    exit:   { col: 6, row: 8 }
    return: { col: 5, row: 4 }
  cave:
    fill: { tile: 51, pal: 3 }
    legend:
      W: { tile: 17, pal: 3 }
      R: { tile: 50, pal: 3 }
      M: { tile: 46, pal: 3 }
      T: { tile: 18, pal: 6 }
    rows: ["WWWWWWWWWWWW", "W..R....R..W", "W..RR..TT..W", "W......TT..W", "W.R........W", "W.RR...R...W", "W......RR..W", "W..T.......W", "W.....M.R..W", "WWWWWWWWWWWW"]
    entry:  { col: 6, row: 8 }
    exit:   { col: 6, row: 8 }
    return: { col: 5, row: 7 }
overworld:
  field:
    npcs:     [{ col: 3, row: 4, pal: 1, range: 2, timer: 40, dialogue: "Bienvenido a Kaiju Island! La hierba alta esconde criaturas." }]
    trainers: [{ col: 8, row: 5, name: RANGER LILA, dir: down, sight: 3 }]
    warps:    [{ col: 5, row: 3, target: house, entry: { col: 6, row: 8 } }, { col: 5, row: 7, target: cave, entry: { col: 6, row: 8 } }, { col: 10, row: 4, target: shore }]
  shore:
    npcs:     [{ col: 4, row: 3, pal: 6, range: 1, timer: 60, dialogue: "El campeon espera al final de la playa." }]
    trainers: [{ col: 6, row: 4, name: SCOUT BRUNO, dir: left, sight: 4 }, { col: 9, row: 6, name: CHAMPION ODA, dir: up, sight: 5 }]
    warps:    [{ col: 1, row: 4, target: field }]
player: { starter: SPROUTLE, level: 5, start: { x: 16, y: 64 }, inventory: { TONIC: 2, NET_BALL: 5, ANTIDOTE: 1 } }
text:
  intro:   "Kaiju Island te espera. Elige bien a tu companero."
  sign:    "Norte: casa del sanador. Sur: la cueva. Este: la costa."
  healer:  "Tus kaiju estan como nuevos!"
  elder:   "Dicen que un GHOSTWISP ronda la cueva de noche."
  victory: "Has vencido! La isla reconoce tu vinculo."
  defeat:  "Tus kaiju necesitan descansar..."
sfx:
  encounter: { freq: 440, dur: 0.08 }
  hit:       { freq: 660, dur: 0.07 }
  crit:      { freq: 880, dur: 0.09 }
  faint:     { freq: 196, dur: 0.3 }
  catch:     { freq: 523, dur: 0.15 }
  levelup:   { freq: 784, dur: 0.2 }
  win:       { freq: 1046, dur: 0.25 }
---

## Overview
Stress-test del Protocolo GAME sobre el perfil `monster-rpg`: usa **todos** los tokens del
perfil a la vez (arte, sonido, mapas, overworld, evoluciones en cadena, 3 entrenadores,
economia completa). 12×10 tiles; tres zonas de encuentro; tres lineas evolutivas de tres
etapas cada una.

## Tiles
Diez tiles registrados (ids 16..63): hierba, muro, hierba alta (encuentros), puerta (warp),
agua y roca (solidos), arena, felpudo (46, salida de interiores), suelo interior y suelo de
cueva. Cada uno con su `tileArt` 8×8 (indices de color 0..7 = `palettesCount`).

## Types
Seis tipos + NORMAL neutro. Dos triangulos entrelazados: FLAME›FLORA›TIDE›FLAME y
VOLT›TIDE con STONE›VOLT, mas SPECTER›TIDE y STONE›SPECTER. La tabla es simetrica
(cada ×2 tiene su inverso ×0.5) — lo exige `type-symmetry`.

## Moves
Trece ataques: dos NORMAL y un par por tipo (basico + avanzado), con `effect` y `chance`
(burn, slow, leech, paralyze, flinch). La semantica del efecto es del motor.

## Species
Trece especies: tres lineas evolutivas de tres etapas (FLORA, FLAME, TIDE — via
`evolvesInto` + `atLevel`) y cuatro salvajes sueltas (VOLT, STONE, SPECTER, NORMAL).
`wild: true` alimenta `WILD_LIST` y las zonas de `encounters`. Sprites 16×16 (`kaiju`,
`wisp`) referenciados desde `sprite`.

## Trainers
RANGER LILA (campo), SCOUT BRUNO y CHAMPION ODA (costa). Equipos expandidos con stats
completos en la clave derivada `TRAINERS`.

## Maps
`field` (exterior 12×10 con hierba alta, lago y arena), `house` (interior con felpudo de
salida) y `cave` (rocas + hierba alta subterranea). Los interiores declaran
`entry`/`exit`/`return`; la `exit` cae sobre el felpudo (tile 46). El `overworld` conecta
`field` y `shore` con NPCs, entrenadores a la vista y warps a los interiores.

## Player
`starter: SPROUTLE` a nivel 5, posicion inicial en pixels y mochila con TONIC, NET_BALL y
ANTIDOTE. El dinero inicial vive en `economy`.

## Text
Seis textos de sistema (intro, cartel, sanador, anciano, victoria y derrota).

## Economy & Balance
Cinco items cubren los tres efectos del enum (`heal` con `amount`, `cure` con `cures`,
`catch`). Los precios se derivan a `ECONOMY.prices`. `balance` declara los knobs de
captura, curva de XP, tasa de encuentro y `runChance` (usado para el cruce `dead-token`
con el motor).

## Do's and Don'ts
- Toda referencia cruzada (tipos, moves, especies, sprites, tiles, items, warps) debe
  existir: familia `broken-ref`.
- Listas en flujo `[a, b]`; dialogos con comas SIEMPRE entre comillas.
- Arte: tiles 8×8 con indices `0..palettesCount-1`; sprites 16×16; colores `0..31`.
- La `exit` de un interior cae sobre un felpudo (tile 46) o `map-meta` avisa.
