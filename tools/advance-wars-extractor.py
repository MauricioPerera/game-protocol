#!/usr/bin/env python3
"""
advance-wars-extractor.py — Extrae sprites 8x8 4bpp + paleta BGR555 de una ROM de
Advance Wars (GBA) y genera un GAME.md procedural válido para el Protocolo GAME.

Uso:
    python tools/advance-wars-extractor.py [ROM.gba] [salida.GAME.md]

    Por defecto:
      ROM    = D:/GBA/A/Advance Wars (E) (M4) [!].gba
      SALIDA = examples/advance-wars-extracted.GAME.md

Formato GBA recordado:
  - Paleta 4bpp = 16 colores BGR555, cada color 2 bytes little-endian:
      bit15 unused, bits14..10 = B, 9..5 = G, 4..0 = R  (5 bits cada canal, 0..31).
    Bloque de paleta = 32 bytes. La VRAM en el cartucho se mapea en 0x08000000,
    pero en el archivo .gba el offset 0x0 corresponde a 0x08000000; aquí leemos
    offsets de archivo 0-based.
  - Tile 8x8 4bpp = 32 bytes: 64 píxeles, 2 píxeles por byte
      (nibble bajo = píxel izquierco, nibble alto = píxel derecho).
    Cada nibble (0..15) es un índice a la paleta de 16 colores.

NOTA HONESTA — ALCANCE DE LA HEURÍSTICA
  La atribución de un tile a un nombre de unidad (Infantry/Tank/Shogun/Recon)
  es POSICIONAL: se asignan los 4 mejores candidatos heurísticos en orden.
  Sin la tabla de punteros de gráficos de la ROM (E)(M4) no se puede verificar
  que el tile X sea realmente "Infantry". El nombre→tile es PROVISIONAL.
  La paleta se elige por mejor puntaje BGR555 en toda la ROM; puede no ser la
  paleta exacta de unidades de AW. Esto es una extracción funcional de
  demostración, no una extracción verificada contra el juego real.
"""

import os
import sys

DEFAULT_ROM = r"D:/GBA/A/Advance Wars (E) (M4) [!].gba"
DEFAULT_OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "examples", "advance-wars-extracted.GAME.md",
)

UNIT_NAMES = ["INFANTRY", "TANK", "SHOGUN", "RECON"]
TILE_BYTES = 32          # 8x8 4bpp
PALETTE_BYTES = 32        # 16 colores * 2 bytes


# ---------- lectura ----------

def read_rom(path):
    with open(path, "rb") as f:
        return f.read()


# ---------- paleta BGR555 ----------

def bgr555_to_rgb(word):
    """Convierte un u16 BGR555 a (r,g,b) cada canal 0..31 (rango del protocolo)."""
    r = word & 0x1F
    g = (word >> 5) & 0x1F
    b = (word >> 10) & 0x1F
    return [r, g, b]


def palette_score(block):
    """
    Puntúa un bloque de 32 bytes como paleta BGR555 de 16 colores.
    Criterios GBA plausibles:
      - bit15 (0x8000) de cada color == 0 (paletas normales sin bit de efectos).
      - canal0 (color 0) suele ser 0 (transparente/negro).
      - poca varianza extrema; todos los canales en 0..31 (siempre cierto si bit15=0).
    Devuelve (score, palette_rgb) o (None, None) si descartado.
    """
    if len(block) < PALETTE_BYTES:
        return None, None
    colors = []
    zero15 = 0
    for i in range(16):
        lo = block[2 * i]
        hi = block[2 * i + 1]
        word = lo | (hi << 8)
        if word & 0x8000:
            # bit15 puesto: improbable en paleta plana. Penaliza pero no descarta.
            zero15 -= 3
        colors.append(bgr555_to_rgb(word & 0x7FFF))
    # color0 suele ser 0,0,0
    c0bonus = 4 if colors[0] == [0, 0, 0] else 0
    # cuántos colores son distintos de puro-blanco/puro-negro saturado (paletas reales
    # tienen tonos): contamos canales con valor intermedio (1..30).
    mid = sum(1 for c in colors for ch in c if 1 <= ch <= 30)
    score = zero15 + c0bonus + mid
    return score, colors


def find_best_palette(rom, step=2):
    """Escanea la ROM alineado a 2 bytes, devuelve la mejor paleta (16 colores RGB)."""
    best = None
    best_off = 0
    n = len(rom) - PALETTE_BYTES
    off = 0
    while off < n:
        block = rom[off:off + PALETTE_BYTES]
        s, pal = palette_score(block)
        if pal is not None and (best is None or s > best):
            best = s
            best_off = off
            best_pal = pal
        off += step
    return best_pal, best_off, best


# ---------- tile 8x8 4bpp ----------

def bytes_to_tile(block):
    """32 bytes -> lista de 8 filas de 8 nibbles (paleta 0..15)."""
    rows = []
    for y in range(8):
        row = []
        for x in range(4):
            b = block[y * 4 + x]
            row.append(b & 0x0F)        # píxel izquierdo
            row.append((b >> 4) & 0x0F)  # píxel derecho
        rows.append(row)
    return rows


def tile_signature(rows):
    """Hash ligero para garantizar tiles distintos entre los 4 elegidos."""
    return tuple(v for row in rows for v in row)


def tile_score(block):
    """
    Puntúa un bloque de 32 bytes como tile 8x8 4bpp 'válido' (gráfico, no código).
    Heurística:
      - nibbles todos 0..15 (siempre cierto, pero descarta si algún byte forma
        un patrón de rampa monótona = típico de código/tablas).
      - 2..=10 colores distintos (un sprite usa subconjunto de la paleta).
      - muchos pares adyacentes iguales horizontalmente (zonas planas = gráfico).
      - rechazar all-igual, rampas 0,1,2,3... y todo-cero.
    Devuelve (score, rows) o (-1, rows).
    """
    rows = bytes_to_tile(block)
    flat = [v for row in rows for v in row]
    distinct = len(set(flat))
    if distinct < 2 or distinct > 10:
        return -1, rows
    # rampa monótona estricta = código/tabla, no gráfico
    if list(flat) == list(range(flat[0], flat[0] + 64)):
        return -1, rows
    # pares adyacentes horizontales iguales (suavizado = gráfico)
    adj = 0
    for r in rows:
        for x in range(7):
            if r[x] == r[x + 1]:
                adj += 1
    # bonus por no usar el nibble 0 de más de X (evita tiles "transparentes")
    zeros = flat.count(0)
    score = adj * 2 - (1 if zeros > 40 else 0)
    return score, rows


def find_best_tiles(rom, want=4):
    """Encuentra 'want' tiles 8x8 distintos y de mejor puntaje en la ROM."""
    found = []           # list of (score, offset, rows)
    seen_sig = set()
    n = len(rom) - TILE_BYTES
    # Saltar la cabecera GBA (0x000..0xC0: Nintendo logo, código de arranque).
    # No es zona de tiles de juego y genera falsos positivos (bloque logo).
    off = 0xC0
    while off < n and len(found) < want * 40:  # top-40 candidatos, luego recortamos
        block = rom[off:off + TILE_BYTES]
        s, rows = tile_score(block)
        if s > 0:
            sig = tile_signature(rows)
            if sig not in seen_sig:
                seen_sig.add(sig)
                found.append((s, off, rows))
        off += TILE_BYTES
    # ordenar por score desc, tomar 'want' distintos
    found.sort(key=lambda t: t[0], reverse=True)
    chosen = []
    for s, off, rows in found:
        if len(chosen) >= want:
            break
        chosen.append((off, rows))
    return chosen


# ---------- emisión GAME.md ----------

def fmt_palette(pal):
    lines = []
    for c in pal:
        lines.append("      " + "[%d,%d,%d]" % (c[0], c[1], c[2]))
    # 16 colores en una línea compacta, estilo del protocolo (array-of-arrays)
    return "[" + ", ".join("[%d,%d,%d]" % (c[0], c[1], c[2]) for c in pal) + "]"


def fmt_tile(rows):
    parts = []
    for row in rows:
        parts.append("[" + ",".join(str(v) for v in row) + "]")
    return "[" + ",".join(parts) + "]"


def emit_gamemd(rom_path, palette, pal_off, tiles, out_path):
    units_block = []
    for name, (off, rows) in zip(UNIT_NAMES, tiles):
        units_block.append(
            "  %s: { palette: 0, width: 8, height: 8, tileData: %s }  # @0x%06X"
            % (name, fmt_tile(rows), off)
        )

    fm = []
    fm.append('version: "0.1"')
    fm.append('name: "Advance Wars (Extracted)"')
    fm.append('profile: advance-wars')
    fm.append('platform: { mode: grid, cols: 12, rows: 10 }')
    fm.append('palettesCount: 1')
    fm.append('palettes:')
    fm.append('  0: %s  # BGR555 @0x%06X (16 colores, heuristic)' % (fmt_palette(palette), pal_off))
    fm.append('units:')
    fm.extend(units_block)

    body = []
    body.append("# Advance Wars — sprites extraídos (heurístico, PROVISIONAL)")
    body.append("")
    body.append("## Overview")
    body.append("ROM: `%s` (%d bytes)." % (rom_path, os.path.getsize(rom_path)))
    body.append("Extracción 100% heurística: paleta BGR555 de 16 colores y tiles 8x8 4bpp.")
    body.append("La atribución nombre→tile es **posicional**, NO verificada contra la")
    body.append("tabla de gráficos del juego. Úsalo como demo de pipeline, no como")
    body.append("asset gráfico fiel.")
    body.append("")
    body.append("## Units")
    body.append("| unidad | offset ROM | paleta | size |")
    body.append("|---|---|---|---|")
    for name, (off, rows) in zip(UNIT_NAMES, tiles):
        body.append("| %s | 0x%06X | 0 | 8x8 |" % (name, off))
    body.append("")
    body.append("`tileData` = 8 filas × 8 nibbles; cada nibble (0..15) indexa `palettes.0`.")
    body.append("")
    body.append("## Rendering")
    body.append("Render en canvas (motor) — por cada unidad:")
    body.append("1. Leer `palettes.0` → 16 colores RGB 0..31. Escalar a 0..255")
    body.append("   (`rgb8 = chan * 255 / 31`) para `fillStyle`.")
    body.append("2. Leer `tileData` (8×8) y `palette` de la unidad.")
    body.append("3. Por cada celda (y,x): `idx = tileData[y][x]`; si `idx == 0` → skip")
    body.append("   (color 0 = transparente en sprites GBA); si no, pintar el pixel con")
    body.append("   `ctx.fillStyle = rgb(palette[idx])` y `ctx.fillRect(x*scale, y*scale, scale, scale)`.")
    body.append("4. `scale` típicamente 4..8 para verlo en pantalla. Para unidades > 8x8,")
    body.append("   componer varios tiles adyacentes (mismo método, distintos offsets).")
    body.append("")
    body.append("Pseudocódigo JS:")
    body.append("```js")
    body.append("function renderUnit(ctx, unit, palettes, scale = 6) {")
    body.append("  const pal = palettes[unit.palette];            // 16 colores [r,g,b] 0..31")
    body.append("  for (let y = 0; y < unit.height; y++) {")
    body.append("    for (let x = 0; x < unit.width; x++) {")
    body.append("      const idx = unit.tileData[y][x];")
    body.append("      if (idx === 0) continue;                    // transparente")
    body.append("      const [r,g,b] = pal[idx].map(v => Math.round(v * 255 / 31));")
    body.append("      ctx.fillStyle = `rgb(${r},${g},${b})`;")
    body.append("      ctx.fillRect(x * scale, y * scale, scale, scale);")
    body.append("    }")
    body.append("  }")
    body.append("}")
    body.append("```")
    body.append("")
    body.append("## Do's and Don'ts")
    body.append("- **Do**: tratar `tileData` como índices de paleta (nibbles), NO como RGB.")
    body.append("- **Do**: escalar canales 0..31 → 0..255 al renderizar fuera del GBA.")
    body.append("- **Don't**: asumir que `INFANTRY` aquí es el sprite real del juego; es el")
    body.append("  mejor candidato heurístico en esa posición. Verificar contra la ROM con")
    body.append("  la tabla de punteros antes de usarlo como asset.")
    body.append("- **Don't**: usar `width/height` distintos de 8 con este extractor; sólo")
    body.append("  extrae tiles 8x8. Unidades reales de AW se componen de varios tiles.")

    content = "---\n" + "\n".join(fm) + "\n---\n\n" + "\n".join(body) + "\n"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    return content


# ---------- main ----------

def main(argv):
    rom_path = argv[1] if len(argv) > 1 else DEFAULT_ROM
    out_path = argv[2] if len(argv) > 2 else DEFAULT_OUT

    if not os.path.isfile(rom_path):
        sys.stderr.write("ROM no encontrada: %s\n" % rom_path)
        return 2
    rom = read_rom(rom_path)
    print("ROM: %s (%d bytes)" % (rom_path, len(rom)))

    print("Buscando paleta BGR555 (16 colores)...")
    palette, pal_off, pal_score = find_best_palette(rom)
    if palette is None:
        sys.stderr.write("No se halló paleta candidata.\n")
        return 1
    print("  paleta @0x%06X  score=%d" % (pal_off, pal_score))

    print("Buscando %d tiles 8x8 4bpp distintos..." % len(UNIT_NAMES))
    tiles = find_best_tiles(rom, want=len(UNIT_NAMES))
    if len(tiles) < len(UNIT_NAMES):
        sys.stderr.write("Sólo %d tiles candidatos (< %d).\n" % (len(tiles), len(UNIT_NAMES)))
        # rellenar con tile cero si falta
        while len(tiles) < len(UNIT_NAMES):
            tiles.append((0, [[0] * 8 for _ in range(8)]))
    for name, (off, _rows) in zip(UNIT_NAMES, tiles):
        print("  %-8s @0x%06X" % (name, off))

    print("Emitiendo %s ..." % out_path)
    emit_gamemd(rom_path, palette, pal_off, tiles, out_path)
    print("OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))