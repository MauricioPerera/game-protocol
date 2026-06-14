---
version: "0.1"
name: Forge
profile: crafting
materials:
  IRON: { tier: 1, stack: 99 }
  WOOD: { tier: 1, stack: 99 }
  COAL: { tier: 1, stack: 99 }
items:
  SWORD: { value: 50 }
  AXE: { value: 40 }
stations:
  ANVIL: {}
  BENCH: {}
recipes:
  IRON_SWORD: { output: SWORD, qty: 1, station: ANVIL, inputs: { IRON: 2, WOOD: 1 } }
  IRON_AXE: { output: AXE, qty: 1, station: ANVIL, inputs: { IRON: 1, WOOD: 2 } }
text:
  done: "Crafted!"
---

## Overview
Demo de crafteo: mismo Protocolo GAME, perfil `crafting`.

## Materials
## Items
## Stations
## Recipes

## Do's and Don'ts
