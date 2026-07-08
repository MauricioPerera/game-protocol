---
version: "0.1"
name: Neon Swarm
profile: shooter
description: "Arena shmup vertical sobre el perfil puro-de-datos shooter: 5 oleadas, 4 enemigos, 2 naves, powerups."
ships:
  VIPER:      { speed: 0.11, hp: 5, weapon: BLASTER }
  JUGGERNAUT: { speed: 0.07, hp: 8, weapon: CANNON }
weapons:
  BLASTER: { damage: 1, rate: 6, bulletSpeed: 0.3 }
  CANNON:  { damage: 3, rate: 2, bulletSpeed: 0.22 }
enemies:
  DRONE:   { hp: 1, speed: 0.045, points: 10, behavior: chaser }
  WASP:    { hp: 2, speed: 0.07,  points: 20, behavior: drifter }
  TANKBUG: { hp: 6, speed: 0.03,  points: 50, behavior: chaser }
  PHANTOM: { hp: 3, speed: 0.055, points: 35, behavior: drifter }
waves:
  1: { spawns: [{ enemy: DRONE, count: 6, gap: 40 }] }
  2: { spawns: [{ enemy: DRONE, count: 8, gap: 30 }, { enemy: WASP, count: 3, gap: 60 }] }
  3: { spawns: [{ enemy: WASP, count: 6, gap: 35 }, { enemy: TANKBUG, count: 2, gap: 120 }] }
  4: { spawns: [{ enemy: DRONE, count: 10, gap: 20 }, { enemy: PHANTOM, count: 4, gap: 70 }] }
  5: { spawns: [{ enemy: TANKBUG, count: 4, gap: 90 }, { enemy: PHANTOM, count: 6, gap: 45 }, { enemy: WASP, count: 6, gap: 30 }] }
powerups:
  MEDKIT:    { effect: heal, amount: 2 }
  OVERDRIVE: { effect: rapid, duration: 300 }
  AEGIS:     { effect: shield, duration: 240 }
arena: { width: 24, height: 16 }
player: { ship: VIPER }
balance: { powerupChance: 0.18, lives: 2 }
text:
  intro:   "Neon Swarm. Flechas para moverte; Espacio para disparar. Sobrevive a las 5 oleadas."
  wave:    "Oleada entrante."
  victory: "El enjambre cae. La colonia esta a salvo."
  defeat:  "Tu escuadron ha caido."
---

## Overview
Arena shmup vertical sobre el **perfil puro-de-datos `shooter`** (`profiles/shooter.json`,
sin funciones): el jugador pilota una nave en la base de la arena y sobrevive a 5 oleadas
que entran por el borde superior. Toda la simulacion es del motor; este documento declara
naves, armas, enemigos, oleadas, powerups, arena y balance.

## Ships
`VIPER` (rapida, arma automatica) y `JUGGERNAUT` (lenta, canon pesado). `player.ship`
elige la del jugador; `speed` en unidades/tick y `hp` como vidas de casco.

## Weapons
`rate` en disparos/segundo, `damage` por impacto y `bulletSpeed` en unidades/tick.

## Enemies
Dos comportamientos (enum): `chaser` persigue a la nave; `drifter` desciende con vaiven.
`points` alimenta la puntuacion. Un `drifter` que sale por abajo se pierde sin castigo.

## Waves
Cinco oleadas con `spawns` [{enemy, count, gap}] — gap en ticks entre apariciones.
Limite conocido del perfil puro-datos: `count`/`gap` viven dentro de un array y la
familia `bounds` no los alcanza (SPEC §11, agregados anidados).

## Arena
Espacio continuo `width` x `height`; la nave se mueve libre por la franja inferior.

## Text
Intro, aviso de oleada y textos de victoria/derrota que el motor consume con fallback.

## Do's and Don'ts
- Todo `weapon`/`enemy`/`ship` referenciado debe existir (familia broken-ref).
- `behavior` y `effect` son enums cerrados: un valor nuevo exige soporte del motor.
- `powerupChance` en [0,1]; velocidades y daños > 0 (familia bounds).
