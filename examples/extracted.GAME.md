---
version: "0.1"
name: "Extracted Sprites (universal extractor)"
profile: monster-rpg
description: "Sprites extraidos de ROM GBA via pipeline Ghidra+heuristica. Candidatos NO verificados."

spritePalettes:
  0: [[0,0,0], [2,3,5], [4,6,10], [6,9,15], [8,12,20], [10,15,25], [12,18,30], [14,21,4], [16,24,9], [18,27,14], [20,30,19], [22,2,24], [24,5,29], [26,8,3], [28,11,8], [30,14,13]]

sprites:
  sprite1: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,9,9,9,9,9,9,9,9,0,0,0,0],[0,0,0,9,9,9,5,5,5,5,9,9,9,0,0,0],[0,0,9,9,5,5,5,5,5,5,5,5,9,9,0,0],[0,9,9,5,5,5,2,2,2,2,5,5,5,9,9,0],[0,9,9,5,5,2,2,2,2,2,2,5,5,9,9,0],[0,9,5,5,2,2,2,1,1,2,2,2,5,5,9,0],[0,9,5,5,2,2,1,1,1,1,2,2,5,5,9,0],[0,9,5,5,2,2,1,1,1,1,2,2,5,5,9,0],[0,9,5,5,2,2,2,1,1,2,2,2,5,5,9,0],[0,9,9,5,5,2,2,2,2,2,2,5,5,9,9,0],[0,9,9,5,5,5,2,2,2,2,5,5,5,9,9,0],[0,0,9,9,5,5,5,5,5,5,5,5,9,9,0,0],[0,0,0,9,9,9,5,5,5,5,9,9,9,0,0,0],[0,0,0,0,9,9,9,9,9,9,9,9,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]
  sprite2: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]
  sprite3: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]
  sprite4: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]
---

# Extracted Sprites — universal extractor

## Overview
ROM: `__test_rom.gba` (1048576 bytes).
Fuente de offsets: `offsets JSON (heuristic-fallback)`.
Pipeline: `tools/ghidra_extract_sprite_offsets.py` -> JSON de offsets -> este extractor.

Cada `sprite` es una matriz 16x16 en 4bpp (indices 0..15) que indexa
`spritePalettes`. Cada paleta son 16 colores `[r,g,b]` en 0..31 (BGR555
cuantizado a 5-bit). El indice 0 es el fondo/transparente convencional.

Atribucion HONESTA: los offsets son **candidatos heuristicos**, no sprites
verificados del juego. `source: ghidra` = tablas de punteros detectadas en
memoria de Ghidra; `source: heuristic-fallback` = escaneo directo sin Ghidra.
Sin la tabla de graficos documentada de cada juego, la atribucion
nombre->sprite es POSICIONAL, no verificada.

## Tiles
Sprites extraidos (16x16 4bpp, offset de archivo 0-based):

| sprite | offset ROM | size |
|---|---|---|
| sprite1 | 0x020000 | 16x16 |
| sprite2 | 0x020080 | 16x16 |
| sprite3 | 0x020100 | 16x16 |
| sprite4 | 0x020180 | 16x16 |

Paletas extraidas (BGR555, 16 colores):

| paleta | offset ROM |
|---|---|
| 0 | 0x010000 |

Render en canvas (motor) — por cada sprite:
1. Leer `spritePalettes[i]` -> 16 colores [r,g,b] 0..31. Escalar a 0..255:
   `rgb8 = (v << 3) | (v >> 2)`.
2. Leer `sprites.<name>` (16x16). Elegir paleta por `i %% n_palettes`.
3. Por cada celda (y,x): `idx = grid[y][x]`; si `idx == 0` -> skip
   (transparente); si no, pintar con `ctx.fillStyle = rgb(pal[idx])`.

## Do's and Don'ts
- **Do**: tratar `sprites.*` como indices de paleta (nibbles 0..15).
- **Do**: escalar canales 0..31 -> 0..255 al renderizar fuera del GBA.
- **Don't**: asumir que `Sprite0` es el sprite real del juego; es el
  mejor candidato en esa posicion. Verificar contra la ROM antes de
  usarlo como asset grafico fiel.
- **Don't**: mezclar este extractor con `advance-wars-extractor.py`; este
  emite perfil `monster-rpg` con sprites 16x16, el otro emite `advance-wars`
