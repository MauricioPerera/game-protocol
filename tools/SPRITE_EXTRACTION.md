# SPRITE_EXTRACTION.md — Extracción universal de sprites GBA (Ghidra + heurística)

Pipeline end-to-end para extraer sprites de **cualquier ROM GBA** y producir un
`GAME.md` válido para el Protocolo GAME (perfil `monster-rpg`), validado con
`tools/game-lint.js`.

```
ROM.gba ──[Parte 1: Ghidra script]──> sprite-offsets.json
                                              │
ROM.gba + sprite-offsets.json ──[Parte 2: extractor]──> examples/extracted.GAME.md
                                              │
                                       game-lint.js (0 errores)
```

**Dos scripts:**
1. `tools/ghidra_extract_sprite_offsets.py` — script headless Ghidra (Jython/Python)
   que analiza la ROM y exporta un JSON con offsets candidatos de tablas de
   sprites y paletas. **Doble modo**: bajo Ghidra usa `currentProgram`; sin
   Ghidra hace escaneo heurístico puro del archivo (mismo JSON).
2. `tools/gba-sprite-extractor-universal.py` — lee ROM + JSON de offsets,
   extrae sprites 16×16 4bpp y paletas BGR555, emite `GAME.md`, valida con
   `game-lint.js`. Fallback heurístico si no hay JSON.

---

## ⚠️ Honestidad sobre el alcance (LEER PRIMERO)

- **"Universal" = cualquier ROM produce un `GAME.md` VÁLIDO (lint 0 errores).**
  No significa que los sprites extraídos sean los *correctos* del juego.
- Ghidra **no conoce** la estructura gráfica del GBA. Su auto-análisis
  encuentra **código**, no tablas de sprites. La detección de tablas aquí es
  **heurística**: busca corridas de u32 little-endian alineados a 4 bytes,
  estrictamente crecientes, que apuntan al espacio de ROM. Produce
  **candidatos**, no offsets verificados.
- Cada juego (Pokémon, Advance Wars, Metroid Zero Mission,…) guarda los
  sprites en formatos distintos. Sin la tabla de gráficos *documentada* de
  cada juego, la atribución `SpriteN → sprite real` es **posicional**, no
  verificada.
- **Usa el output como demo de pipeline o como punto de partida para
  inspección manual.** NO lo uses como asset gráfico fiel sin verificar contra
  la ROM real.

---

## Parte 1 — Instalar y correr el script Ghidra

### 1.1 Instalar Ghidra headless

1. Instalar **JDK 17+** (`java -version` ≥ 17).
2. Descargar Ghidra (~11.x) desde https://ghidra-sre.org/ y descomprimir.
3. El binario headless está en:
   - Linux/macOS: `<GHIDRA>/support/analyzeHeadless`
   - Windows: `<GHIDRA>\support\analyzeHeadless.bat`
4. Verificar:
   ```bash
   <GHIDRA>/support/analyzeHeadless
   # debe imprimir usage (sin error de Java).
   ```
5. No requiere `node` ni Python específicos; Ghidra trae su Jython.

### 1.2 Correr el script sobre una ROM

```bash
# Crea un proyecto Ghidra temporal, importa la ROM, corre el script, borra el proyecto.
analyzeHeadless ghidra_project proj \
    -import ROM.gba \
    -processor "ARM:LE:32:v4" \
    -postScript ghidra_extract_sprite_offsets.py ROM.gba ROM.sprite-offsets.json \
    -scriptPath tools \
    -deleteProject
```

Argumentos del script (en orden):
1. `ROM.gba` — ruta a la ROM (usada como etiqueta y para el modo fallback).
2. `ROM.sprite-offsets.json` — ruta de salida del JSON. Si se omite, se usa
   `<rom-stem>.sprite-offsets.json`.

> Nota: el `-processor` es opcional. Ghidra puede importar la ROM como binario
> crudo (base 0) o mapeado a `0x08000000`. El script **normaliza ambas formas**
> de puntero (0x08xxxxxx → offset archivo, y 0-based → offset archivo), así que
> no depende de la base que elija el loader.

### 1.3 Modo sin Ghidra (fallback heurístico)

Si no tienes Ghidra instalado, el mismo script corre como Python 3 normal y
escanea el archivo directamente:

```bash
python tools/ghidra_extract_sprite_offsets.py ROM.gba ROM.sprite-offsets.json
# source: "heuristic-fallback"
```

Produce el mismo formato JSON (con `"source": "heuristic-fallback"`).
La detección de tablas es idéntica (mismo algoritmo); la diferencia es que bajo
Ghidra el buffer proviene de la memoria analizada del programa.

### 1.4 Interpretar el JSON de salida

```json
{
  "rom": "ROM.gba",
  "romSize": 16777216,
  "source": "ghidra",
  "sprites": [
    { "name": "Sprite0", "offset": "0x016B40", "size": 128, "table": 0 },
    { "name": "Sprite1", "offset": "0x016BC0", "size": 128, "table": 0 }
  ],
  "palettes": [
    { "name": "Palette0", "offset": "0x020000", "score": 49 }
  ]
}
```

| Campo            | Significado |
|------------------|-------------|
| `romSize`        | Tamaño de la ROM en bytes. |
| `source`         | `"ghidra"` o `"heuristic-fallback"`. |
| `sprites[].offset` | Offset de archivo 0-based donde empieza el sprite 16×16 (128 bytes). **String hex.** |
| `sprites[].size`   | 128 bytes (16×16 4bpp). El extractor decodifica 4 tiles 8×8. |
| `sprites[].table`  | Índice de la tabla de punteros de la que provino. |
| `palettes[].offset` | Offset de archivo 0-based de un bloque de 32 bytes BGR555. |
| `palettes[].score`  | Puntaje heurístico de "paleta plausible" (más alto = mejor). |

**Criterio de tabla (Parte 1):** una corrida de ≥4 u32 little-endian
consecutivos, **estrictamente crecientes**, todos apuntando a ROM. Filtra runs
de ceros (no crecen) y datos gráficos casualmente alineados (rara vez
monótonos). Falsos positivos aún posibles — revisar el JSON a mano.

---

## Parte 2 — Extractor universal

```bash
python tools/gba-sprite-extractor-universal.py ROM.gba [offsets.json] [salida.GAME.md]
```

- Sin `offsets.json` (o JSON vacío) → heurística pura sobre la ROM.
- Salida por defecto: `examples/extracted.GAME.md`.
- Al final corre `node tools/game-lint.js <salida>` y aborta con exit 1 si hay
  errores.

### Qué hace

1. Lee offsets del JSON (`sprites[].offset`, `palettes[].offset`) si hay.
2. Por cada sprite: lee 128 bytes en `offset`, decodifica como **sprite 16×16
   GBA** = 4 tiles 8×8 en orden `(0,0),(8,0),(0,8),(8,8)` (char-data row-major).
3. Paleta: primera paleta válida del JSON; si no, heurística BGR555.
4. Convierte BGR555 → `[r,g,b]` en `0..31` (rango del protocolo).
5. Emite `GAME.md` (perfil `monster-rpg`, `spritePalettes` + `sprites` 16×16).
6. Valida: `game-lint.js` → **0 errores, 0 warnings**.

### Formato GBA recordado

- **Paleta 4bpp** = 16 colores BGR555, 2 bytes LE c/u: `bit15` unused,
  `bits14..10`=B, `9..5`=G, `4..0`=R (5 bits, 0..31). Bloque = 32 bytes.
- **Tile 8×8 4bpp** = 32 bytes: 64 px, 2 px/byte (nibble bajo = px izquierdo,
  nibble alto = px derecho). Cada nibble 0..15 indexa la paleta.
- **Sprite 16×16** = 4 tiles 8×8 = 128 bytes, orden tile(0,0),(8,0),(0,8),(8,8).

---

## Troubleshooting

### `sprites candidatos: 0` (JSON vacío de sprites)
- La ROM no tiene tablas de punteros estrictamente crecientes detectables, o
  todas apuntan fuera de rango. **Solución:** correr el extractor **sin JSON**
  (heurística pura, que escanea tiles gráficos directamente):
  ```bash
  python tools/gba-sprite-extractor-universal.py ROM.gba
  ```
- Alternativa: ajustar `MIN_TABLE_LEN` (bajar a 3) o `MIN_INC_RATIO` (bajar a
  0.4) en `ghidra_extract_sprite_offsets.py` y regenerar el JSON. Más candidatos
  = más falsos positivos.

### `LINT FALLO` — `palette-color-range` con texto del comentario en el color
- No ocurre con el extractor actual (los comentarios inline se eliminaron del
  front-matter). Si editas el `GAME.md` a mano: **no pongas `#` en la misma
  línea que un flow array** (`spritePalettes:` / `sprites:`). El parser
  `yaml-min` no limpia comentarios inline tras `[...]`. Pon los comentarios en
  su propia línea.

### Paleta corrupta / colores saturados a 31
- La heurística elige el bloque de 32 bytes con mejor puntaje BGR555. Si la ROM
  no tiene una paleta plana (bit15=0), puede elegir basura. **Solución:**
  pasar offsets de paleta verificados vía JSON (`palettes[].offset` apuntando a
  la paleta real del juego, extraída con un visor GBA como `gba-palette-viewer`
  o documentada en una wiki del juego).

### Offsets inválidos / sprite todo ceros
- El offset apunta a una zona sin gráficos (cabecera, código, tablas).
- **Solución:** validar el offset con un visor de tiles GBA
  (p.ej. TileViewer / GBA Graphics Editor) antes de usar el sprite. El extractor
  no puede saber si un offset es "realmente" un sprite sin la tabla documentada.

### El script Ghidra no encuentra `currentProgram`
- Estás corriendo el `.py` con Python en vez de con `analyzeHeadless -postScript`.
  Eso activa el modo `heuristic-fallback` (válido, pero sin análisis de Ghidra).
  Para usar Ghidra de verdad, invoca vía `analyzeHeadless` (ver §1.2).

### `No se encontro node en PATH`
- El extractor necesita `node` para correr `game-lint.js`. Instala Node.js 18+
  o corre el lint a mano y reporta el resultado.

### ROM muy grande / lento
- El escaneo de tablas es O(n) sobre la ROM (con avance por corridas). Una ROM
  de 16 MiB tarda segundos. Si es más lento, revisa que el buffer de memoria en
  modo Ghidra se leyó de una sola vez (`memory.getBytes`); el fallback byte a
  byte es lento.

---

## Ejemplos por juego

> **Importante:** los offsets reales varían entre versiones/región. Los valores
> de abajo son **ejemplos de dónde buscar**, no offsets verificados. Confirma
> siempre con una wiki del juego o un visor de tiles.

### Advance Wars (E) (M4)
- Paleta de unidades: bloque BGR555 en torno a `0x580000`–`0x600000` (varía).
- Tiles de unidades: bloques 8×8 4bpp en la zona de gráficos de unidades.
- Este repo ya tiene `tools/advance-wars-extractor.py` (heurística posicional
  específica para AW, perfil `advance-wars`). El extractor **universal**
  (`monster-rpg`, sprites 16×16) y el de AW son complementarios, no
  reemplazos: ver "Do's and Don'ts" del `GAME.md` generado.

### Pokémon Rubi/Zafiro/Esmeralda (R/S/E)
- Los sprites frontales de Pokémon están en formato **64×64** (no 16×16) en
  zonas como `0x240000`+ (varía por versión). El extractor universal recorta
  al **primer bloque 16×16** de cada offset — útil como muestra, no como
  sprite completo. Para sprites 64×64 reales, extender el extractor (escalar
  `SPRITE_BYTES` y el grid a 64×64; el protocolo `sprite-dims` exige 16×16, así
  que habría que trozar el 64×64 en 16 sprites 16×16).
- Tablas de punteros a sprites: en R/S/E existen tablas de punteros a
  `species->sprite`; el script las puede detectar si son estrictamente
  crecientes (no siempre lo son — pueden tener huecos).

### Metroid Zero Mission / Kirby & Amazing Mirror
- Sprites del jugador: típicamente 16×16 o 32×32 4bpp con paleta BGR555
  dedicada. El extractor universal funciona bien para los 16×16.

### Consejos generales para ROMs desconocidas
1. Corre primero el extractor **sin JSON** (heurística pura) para ver qué
   produce un `GAME.md` válido de inmediato.
2. Si quieres mejor atribución, corre el script Ghidra y revisa el JSON: las
   tablas más largas (`table: 0`) son las mejores candidatas.
3. Abre la ROM en un visor de tiles GBA, localiza un sprite conocido, anota su
   offset de archivo, y pásalo a mano en un JSON mínimo:
   ```json
   { "sprites":[{"name":"Hero","offset":"0x123456","size":128}],
     "palettes":[{"name":"Pal0","offset":"0x123400"}] }
   ```
   El extractor usará exactamente esos offsets.

---

## Ejemplo completo end-to-end

```bash
# 1) (Opcional, con Ghidra) generar JSON de offsets
analyzeHeadless ghidra_project proj \
    -import MiJuego.gba \
    -postScript ghidra_extract_sprite_offsets.py MiJuego.gba MiJuego.sprite-offsets.json \
    -scriptPath tools -deleteProject

# 1b) (Sin Ghidra) mismo script en modo fallback
python tools/ghidra_extract_sprite_offsets.py MiJuego.gba MiJuego.sprite-offsets.json

# 2) Extraer sprites y validar
python tools/gba-sprite-extractor-universal.py MiJuego.gba MiJuego.sprite-offsets.json examples/extracted.GAME.md

# 3) Validación independiente (DoD: errors=0)
node tools/game-lint.js examples/extracted.GAME.md
# { "summary": { "errors": 0, "warnings": 0, "ok": true } }

# 4) Render (motor): ver sección "## Tiles" del GAME.md generado para el
#    pseudocódigo de canvas.
```

### Salida esperada

`examples/extracted.GAME.md` — perfil `monster-rpg` con `spritePalettes`
(1+ paletas de 16 colores BGR555 en 0..31) y `sprites` (N matrices 16×16 4bpp).
Lint: **0 errores, 0 warnings**.

Cada `sprite` es una matriz 16×16 de nibbles 0..15 que indexan
`spritePalettes[i]` (paleta elegida por `i % n_palettes`). El índice 0 es
transparente/fondo. Render: escalar canales 0..31 → 0..255 con
`rgb8 = (v << 3) | (v >> 2)` y pintar cada celda no-cero con `fillRect`.

---

## DoD — verificación

- [x] Extractor corre para múltiples ROMs (cualquier ROM produce output válido).
- [x] Output: `GAME.md` válido con `game-lint.js` — 0 errores, 0 warnings.
- [x] Documentación clara (este archivo).
- [x] Sin Ghidra instalado → fallback a heurística pura (mismo script + extractor).
- [x] Entrega: 2 scripts (`tools/ghidra_extract_sprite_offsets.py`,
      `tools/gba-sprite-extractor-universal.py`) + esta doc + ejemplo
      (`examples/extracted.GAME.md`).