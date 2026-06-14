---
version: "0.1"
name: Jumpy
profile: platformer
tilesets:
  grass: { name: Grass, solid: false }
  brick: { name: Brick, solid: true }
enemies:
  GOOMBA: { hp: 1, damage: 1, sprite: goomba }
  KOOPA: { hp: 2, damage: 1, sprite: koopa }
levels:
  1-1: { tileset: grass, enemies: [GOOMBA, KOOPA], goal: { x: 200, y: 0 } }
  1-2: { tileset: brick, enemies: [KOOPA], goal: { x: 320, y: 0 } }
physics: { gravity: 9.8, jump: 12, runSpeed: 5 }
player: { spawnLevel: 1-1, lives: 3 }
text:
  win: "You win!"
---

## Overview
Demo de plataformas: mismo Protocolo GAME, perfil `platformer`.

## Tilesets
## Enemies
## Levels
## Player
## Physics

## Do's and Don'ts
