---
version: "0.1"
name: "Advance Wars (Extracted)"
profile: advance-wars
platform: { mode: grid, cols: 12, rows: 10 }
palettesCount: 1
palettes:
  0: [[0,0,0], [1,18,16], [3,2,17], [5,18,17], [7,2,18], [12,10,19], [15,2,20], [18,26,20], [20,10,21], [22,26,21], [1,19,24], [3,3,25], [5,19,25], [7,3,26], [9,27,26], [12,11,27]]
units:
  INFANTRY: { palette: 0, width: 8, height: 8, tileData: [[2,11,13,0,0,0,0,0],[4,11,13,0,0,0,0,0],[6,11,13,0,0,0,0,0],[11,3,7,4,0,0,0,0],[2,2,7,4,0,0,0,0],[8,2,2,4,0,0,3,0],[2,8,6,4,0,0,0,0],[2,2,10,0,0,0,0,0]] }
  TANK: { palette: 0, width: 8, height: 8, tileData: [[0,0,7,4,0,0,0,0],[0,0,0,0,0,0,3,0],[2,0,8,4,0,0,8,8],[0,0,4,0,0,0,4,1],[0,7,7,4,0,0,0,0],[12,2,2,3,0,0,3,0],[0,0,2,2,3,0,9,4],[8,0,8,8,0,0,8,2]] }
  SHOGUN: { palette: 0, width: 8, height: 8, tileData: [[0,0,0,2,8,0,0,8],[0,7,7,4,0,0,0,0],[8,8,3,3,0,0,3,0],[0,4,14,1,0,0,3,0],[2,0,8,4,3,0,9,4],[9,0,8,8,1,0,0,8],[0,7,7,4,0,0,0,0],[0,14,14,1,0,0,3,0]] }
  RECON: { palette: 0, width: 8, height: 8, tileData: [[1,0,0,2,0,4,2,4],[0,7,7,4,0,0,0,0],[0,0,1,2,1,0,0,6],[0,7,7,4,0,0,0,0],[4,0,10,4,0,0,4,0],[0,0,4,1,1,4,0,0],[9,0,8,1,9,12,0,0],[9,8,8,1,0,0,0,2]] }
---

# Advance Wars — sprites extraídos (heurístico, PROVISIONAL)

## Overview
ROM: `D:/GBA/A/Advance Wars (E) (M4) [!].gba` (8388608 bytes).
Extracción 100% heurística: paleta BGR555 de 16 colores y tiles 8x8 4bpp.
La atribución nombre→tile es **posicional**, NO verificada contra la
tabla de gráficos del juego. Úsalo como demo de pipeline, no como
asset gráfico fiel.

## Units
| unidad | offset ROM | paleta | size |
|---|---|---|---|
| INFANTRY | 0x016B40 | 0 | 8x8 |
| TANK | 0x00FF60 | 0 | 8x8 |
| SHOGUN | 0x00F720 | 0 | 8x8 |
| RECON | 0x018720 | 0 | 8x8 |

`tileData` = 8 filas × 8 nibbles; cada nibble (0..15) indexa `palettes.0`.

## Rendering
Render en canvas (motor) — por cada unidad:
1. Leer `palettes.0` → 16 colores RGB 0..31. Escalar a 0..255
   (`rgb8 = chan * 255 / 31`) para `fillStyle`.
2. Leer `tileData` (8×8) y `palette` de la unidad.
3. Por cada celda (y,x): `idx = tileData[y][x]`; si `idx == 0` → skip
   (color 0 = transparente en sprites GBA); si no, pintar el pixel con
   `ctx.fillStyle = rgb(palette[idx])` y `ctx.fillRect(x*scale, y*scale, scale, scale)`.
4. `scale` típicamente 4..8 para verlo en pantalla. Para unidades > 8x8,
   componer varios tiles adyacentes (mismo método, distintos offsets).

Pseudocódigo JS:
```js
function renderUnit(ctx, unit, palettes, scale = 6) {
  const pal = palettes[unit.palette];            // 16 colores [r,g,b] 0..31
  for (let y = 0; y < unit.height; y++) {
    for (let x = 0; x < unit.width; x++) {
      const idx = unit.tileData[y][x];
      if (idx === 0) continue;                    // transparente
      const [r,g,b] = pal[idx].map(v => Math.round(v * 255 / 31));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}
```

## Do's and Don'ts
- **Do**: tratar `tileData` como índices de paleta (nibbles), NO como RGB.
- **Do**: escalar canales 0..31 → 0..255 al renderizar fuera del GBA.
- **Don't**: asumir que `INFANTRY` aquí es el sprite real del juego; es el
  mejor candidato heurístico en esa posición. Verificar contra la ROM con
  la tabla de punteros antes de usarlo como asset.
- **Don't**: usar `width/height` distintos de 8 con este extractor; sólo
  extrae tiles 8x8. Unidades reales de AW se componen de varios tiles.
