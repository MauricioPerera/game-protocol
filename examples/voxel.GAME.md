---
version: "0.1"
name: Voxel Hut
profile: voxel
materials:
  STONE: { color: [120, 120, 120] }
  WOOD: { color: [150, 100, 60] }
  GLASS: { color: [120, 200, 240] }
prefabs:
  pillar: { size: [1, 3, 1], fill: STONE }
  wall: { size: [4, 3, 1], fill: WOOD }
  window: { size: [1, 1, 1], cells: [{ x: 0, y: 0, z: 0, m: GLASS }] }
structures:
  hut:
    place: [{ prefab: wall, at: [0, 0, 0] }, { prefab: pillar, at: [0, 0, 0] }, { prefab: pillar, at: [3, 0, 0] }, { prefab: window, at: [2, 1, 0] }]
---

## Overview
Estructura voxel compuesta por referencia a prefabs reutilizables. Mismo Protocolo GAME, perfil `voxel`.
Una "casita" = un muro de madera + dos pilares de piedra + una ventana de cristal, sin redibujar geometría.

## Materials
## Prefabs
## Structures

## Do's and Don'ts
