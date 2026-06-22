---
version: "0.1"
name: Tower Defense Demo
profile: tower-defense
armors: [LIGHT, MEDIUM, HEAVY]
dmgTypes:
  PHYSICAL: { LIGHT: 1.0, MEDIUM: 0.8, HEAVY: 0.5 }
  ENERGY: { LIGHT: 0.8, MEDIUM: 1.0, HEAVY: 1.5 }
towers:
  rifle: { cost: 50, range: 3, damage: 5, rate: 2, dmgType: PHYSICAL }
  cannon: { cost: 120, range: 2, damage: 20, rate: 1, dmgType: PHYSICAL }
  laser: { cost: 200, range: 4, damage: 8, rate: 3, dmgType: ENERGY }
enemies:
  RUNNER: { hp: 10, speed: 2, armor: LIGHT, bounty: 5 }
  TANK: { hp: 40, speed: 1, armor: HEAVY, bounty: 15 }
waves:
  1: { spawns: [{ enemy: RUNNER, count: 5, gap: 30 }], reward: 50 }
  2: { spawns: [{ enemy: RUNNER, count: 8, gap: 25 }, { enemy: TANK, count: 2, gap: 60 }], reward: 80 }
economy: { startGold: 200, startLives: 20 }
balance: { sellRatio: 0.7, interestRate: 0.05 }
---

## Overview
Demo de tower-defense: mismo Protocolo GAME, perfil `tower-defense`. Tres torres, dos
oleadas, economía básica. No realista, pero linitea 0 errores.

## Towers
## DamageTypes
## Enemies
## Waves
## Maps
## Economy & Balance

## Do's and Don'ts