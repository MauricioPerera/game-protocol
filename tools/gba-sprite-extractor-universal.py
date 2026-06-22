#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gba-sprite-extractor-universal.py — Extractor universal de sprites GBA.

ENTRADA:
    ROM.gba                    — ROM de Game Boy Advance (binario crudo).
    sprite-offsets.json        — JSON de offsets producido por
                                 tools/ghidra_extract_sprite_offsets.py
                                 (modo Ghidra o fallback heurístico). OPCIONAL:
                                 si no se pasa o está vacío, se usa heurística
                                 pura sobre la ROM.

SALIDA:
    examples/extracted.GAME.md — GAME.md perfil monster-rpg válido, con
                                 `spritePalettes` + `sprites` (16x16 4bpp),
                                 validado con `tools/game-lint.js` (0 errores).

PIPELINE:
    1. Lee offsets del JSON (sprites[].offset, palettes[].offset) si hay.
    2. Para cada sprite: extrae 128 bytes 4bpp en `offset` y los decodifica como
       sprite 16x16 GBA (2x2 tiles 8x8, orden fila-major de tiles:
       tile(0,0), tile(8,0), tile(0,8), tile(8,8)).
    3. Paleta: toma la primera paleta válida del JSON; si no, heurística BGR555.
    4. Convierte BGR555 -> [r,g,b] 0..31 (rango del protocolo).
    5. Emite GAME.md (monster-rpg) y corre `game-lint.js`; aborta si hay errores.

FORMATO GBA recordado:
    - Paleta 4bpp = 16 colores BGR555, 2 bytes LE c/u: bits14..10=B, 9..5=G,
      4..0=R (5 bits, 0..31). Bloque = 32 bytes.
    - Tile 8x8 4bpp = 32 bytes: 64 px, 2 px/byte (nibble bajo = px izquierdo,
      nibble alto = px derecho). Cada nibble 0..15 indexa la paleta.
    - Sprite 16x16 = 4 tiles 8x8 = 128 bytes, orden tile(0,0),(8,0),(0,8),(8,8).

LÍMITES HONESTOS:
    - "Universal" = cualquier ROM produce un GAME.md VÁLIDO (lint 0 errores).
      La FIDELIDAD gráfica varía: los offsets del JSON son CANDIDATOS
      heurísticos, no sprites verificados. Requiere validación del usuario
      contra el juego real. Ver tools/SPRITE_EXTRACTION.md.
    - El extractor sólo produce sprites 16x16 (4 tiles 8x8). Sprites GBA más
      grandes (32x32, 64x64) se recortan a su primer bloque 16x16.

USO:
    python tools/gba-sprite-extractor-universal.py ROM.gba [offsets.json] [salida.GAME.md]
    python tools/gba-sprite-extractor-universal.py ROM.gba   # heurística pura
"""

import os
import sys
import json
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TILE_BYTES_8x8 = 32
SPRITE_BYTES_16x16 = 128       # 16x16 4bpp
PALETTE_BYTES = 32             # 16 colores BGR555
N_SPRITES_DEFAULT = 4
N_SPRITES_MAX = 16
N_PALETTES_DEFAULT = 1

# Cabecera GBA (0x000..0xC0): Nintendo logo + código de arranque. No es zona de
# tiles de juego y genera falsos positivos (bloque logo). Se salta en fallback.
GBA_HEADER_END = 0xC0


# ---------- lectura ----------

def read_rom(path):
    with open(path, "rb") as f:
        return f.read()


def read_u32_le(buf, off):
    return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)


# ---------- JSON de offsets ----------

def load_offsets(json_path):
    """Carga el JSON de offsets. Devuelve dict {sprites:[...], palettes:[...]} o None."""
    if not json_path or not os.path.isfile(json_path):
        return None
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        sys.stderr.write("[extractor] JSON inválido (%s): %s\n" % (json_path, e))
        return None
    if not isinstance(data, dict):
        return None
    sprites = data.get("sprites") or []
    palettes = data.get("palettes") or []
    if not sprites and not palettes:
        return None
    return {"sprites": sprites, "palettes": palettes, "source": data.get("source", "unknown")}


def parse_hex_offset(s):
    """Acepta '0x016B40', '0x16b40' o entero decimal. Devuelve int o None."""
    if isinstance(s, int):
        return s if s >= 0 else None
    if not isinstance(s, str):
        return None
    s = s.strip()
    try:
        if s.lower().startswith("0x"):
            return int(s, 16)
        return int(s, 10)
    except ValueError:
        return None


# ---------- paleta BGR555 ----------

def bgr555_word_to_rgb(word):
    word &= 0x7FFF
    r = word & 0x1F
    g = (word >> 5) & 0x1F
    b = (word >> 10) & 0x1F
    return [r, g, b]


def block_to_palette(block):
    """32 bytes -> 16 colores [r,g,b] 0..31, o None si el bloque no parece paleta."""
    if len(block) < PALETTE_BYTES:
        return None
    pal = []
    bad = 0
    for i in range(16):
        lo = block[2 * i]
        hi = block[2 * i + 1]
        word = lo | (hi << 8)
        if word & 0x8000:
            bad += 1
        pal.append(bgr555_word_to_rgb(word))
    # paleta plausible: no más de 2 colores con bit15 puesto
    if bad > 2:
        return None
    return pal


def palette_score(block):
    pal = block_to_palette(block)
    if pal is None:
        return None, None
    c0bonus = 4 if pal[0] == [0, 0, 0] else 0
    mid = sum(1 for c in pal for ch in c if 1 <= ch <= 30)
    return c0bonus + mid, pal


def find_best_palette(rom, step=2, skip=GBA_HEADER_END):
    """Mejor paleta BGR555 escaneando la ROM. Devuelve (pal_rgb, offset)."""
    best = None
    best_off = 0
    best_pal = None
    n = len(rom) - PALETTE_BYTES
    off = skip
    while off < n:
        block = rom[off:off + PALETTE_BYTES]
        s, pal = palette_score(block)
        if pal is not None and (best is None or s > best):
            best = s
            best_off = off
            best_pal = pal
        off += step
    return best_pal, best_off


def find_n_palettes(rom, want, step=2, skip=GBA_HEADER_END):
    """Hasta `want` paletas BGR555 no solapadas, por puntaje desc."""
    cands = []
    n = len(rom) - PALETTE_BYTES
    off = skip
    while off < n:
        block = rom[off:off + PALETTE_BYTES]
        s, pal = palette_score(block)
        if pal is not None:
            cands.append((s, off, pal))
        off += step
    cands.sort(key=lambda t: t[0], reverse=True)
    chosen = []
    for s, off, pal in cands:
        if len(chosen) >= want:
            break
        if any(abs(off - o) < PALETTE_BYTES for _, o, _ in chosen):
            continue
        chosen.append((off, pal))
    # rellenar si faltan
    while len(chosen) < want and chosen:
        chosen.append((chosen[0][0], [list(c) for c in chosen[0][1]]))
    return chosen


# ---------- tiles / sprites ----------

def bytes_to_tile_8x8(block):
    """32 bytes -> 8 filas de 8 nibbles (0..15)."""
    rows = []
    for y in range(8):
        row = []
        for x in range(4):
            b = block[y * 4 + x]
            row.append(b & 0x0F)
            row.append((b >> 4) & 0x0F)
        rows.append(row)
    return rows


def decode_sprite_16x16(rom, offset):
    """
    Decodifica 128 bytes en `offset` como sprite 16x16 GBA (2x2 tiles 8x8).
    Orden GBA char data: tile(0,0) tile(8,0) tile(0,8) tile(8,8).
    Devuelve lista de 16 filas de 16 nibbles. Rellena con 0 si hay pocos bytes.
    """
    grid = [[0] * 16 for _ in range(16)]
    # 4 tiles en orden: (x0,y0) = (0,0),(8,0),(0,8),(8,8)
    tile_positions = [(0, 0), (8, 0), (0, 8), (8, 8)]
    for ti, (tx, ty) in enumerate(tile_positions):
        start = offset + ti * TILE_BYTES_8x8
        block = rom[start:start + TILE_BYTES_8x8]
        if len(block) < TILE_BYTES_8x8:
            block = block + bytes(TILE_BYTES_8x8 - len(block))
        rows = bytes_to_tile_8x8(block)
        for y in range(8):
            for x in range(8):
                grid[ty + y][tx + x] = rows[y][x]
    return grid


def tile_score(block):
    """Puntúa 32 bytes como tile 8x8 4bpp 'gráfico'. Ver advance-wars-extractor."""
    rows = bytes_to_tile_8x8(block)
    flat = [v for row in rows for v in row]
    distinct = len(set(flat))
    if distinct < 2 or distinct > 10:
        return -1
    if list(flat) == list(range(flat[0], flat[0] + 64)):
        return -1
    adj = 0
    for r in rows:
        for x in range(7):
            if r[x] == r[x + 1]:
                adj += 1
    zeros = flat.count(0)
    score = adj * 2 - (1 if zeros > 40 else 0)
    return score


def find_best_sprite_offsets(rom, want, skip=GBA_HEADER_END):
    """
    Fallback heurístico: encuentra `want` offsets de 16x16 (alineados a 128
    bytes) cuyo primer tile 8x8 puntúa como gráfico. Devuelve lista de offsets.
    """
    n = len(rom) - SPRITE_BYTES_16x16
    cands = []
    off = skip
    # alineado a 32 bytes (tile); sprite = 4 tiles
    while off < n and len(cands) < want * 20:
        first = rom[off:off + TILE_BYTES_8x8]
        s = tile_score(first)
        if s > 0:
            cands.append((s, off))
        off += TILE_BYTES_8x8
    cands.sort(key=lambda t: t[0], reverse=True)
    chosen = []
    seen = set()
    for s, off in cands:
        if len(chosen) >= want:
            break
        # evitar solapamiento con uno ya elegido
        if any(abs(off - o) < SPRITE_BYTES_16x16 for o in seen):
            continue
        chosen.append(off)
        seen.add(off)
    return chosen


# ---------- emisión GAME.md ----------

def fmt_palette_inline(pal):
    return "[" + ", ".join("[%d,%d,%d]" % (c[0], c[1], c[2]) for c in pal) + "]"


def fmt_grid(grid):
    parts = []
    for row in grid:
        parts.append("[" + ",".join(str(v) for v in row) + "]")
    return "[" + ",".join(parts) + "]"


def emit_gamemd(rom_path, palettes, sprites, offsets_json, out_path, source_tag):
    """
    palettes: list of (offset, pal_rgb16)
    sprites: list of (name, offset, grid16x16)
    """
    fm = []
    fm.append('version: "0.1"')
    fm.append('name: "Extracted Sprites (universal extractor)"')
    fm.append('profile: monster-rpg')
    fm.append('description: "Sprites extraidos de ROM GBA via pipeline Ghidra+heuristica. Candidatos NO verificados."')
    fm.append("")
    fm.append("spritePalettes:")
    for i, (off, pal) in enumerate(palettes):
        # SIN comentario inline: yaml-min no limpia `#` tras un flow array.
        # El offset va documentado en el body (## Tiles).
        fm.append("  %d: %s" % (i, fmt_palette_inline(pal)))
    fm.append("")
    fm.append("sprites:")
    for name, off, grid in sprites:
        fm.append("  %s: %s" % (name, fmt_grid(grid)))

    body = []
    body.append("# Extracted Sprites — universal extractor")
    body.append("")
    body.append("## Overview")
    body.append("ROM: `%s` (%d bytes)." % (os.path.basename(rom_path), os.path.getsize(rom_path)))
    body.append("Fuente de offsets: `%s`." % source_tag)
    body.append("Pipeline: `tools/ghidra_extract_sprite_offsets.py` -> JSON de offsets -> este extractor.")
    body.append("")
    body.append("Cada `sprite` es una matriz 16x16 en 4bpp (indices 0..15) que indexa")
    body.append("`spritePalettes`. Cada paleta son 16 colores `[r,g,b]` en 0..31 (BGR555")
    body.append("cuantizado a 5-bit). El indice 0 es el fondo/transparente convencional.")
    body.append("")
    body.append("Atribucion HONESTA: los offsets son **candidatos heuristicos**, no sprites")
    body.append("verificados del juego. `source: ghidra` = tablas de punteros detectadas en")
    body.append("memoria de Ghidra; `source: heuristic-fallback` = escaneo directo sin Ghidra.")
    body.append("Sin la tabla de graficos documentada de cada juego, la atribucion")
    body.append("nombre->sprite es POSICIONAL, no verificada.")
    body.append("")
    body.append("## Tiles")
    body.append("Sprites extraidos (16x16 4bpp, offset de archivo 0-based):")
    body.append("")
    body.append("| sprite | offset ROM | size |")
    body.append("|---|---|---|")
    for name, off, _ in sprites:
        body.append("| %s | 0x%06X | 16x16 |" % (name, off))
    body.append("")
    body.append("Paletas extraidas (BGR555, 16 colores):")
    body.append("")
    body.append("| paleta | offset ROM |")
    body.append("|---|---|")
    for i, (off, _pal) in enumerate(palettes):
        body.append("| %d | 0x%06X |" % (i, off))
    body.append("")
    body.append("Render en canvas (motor) — por cada sprite:")
    body.append("1. Leer `spritePalettes[i]` -> 16 colores [r,g,b] 0..31. Escalar a 0..255:")
    body.append("   `rgb8 = (v << 3) | (v >> 2)`.")
    body.append("2. Leer `sprites.<name>` (16x16). Elegir paleta por `i %% n_palettes`.")
    body.append("3. Por cada celda (y,x): `idx = grid[y][x]`; si `idx == 0` -> skip")
    body.append("   (transparente); si no, pintar con `ctx.fillStyle = rgb(pal[idx])`.")
    body.append("")
    body.append("## Do's and Don'ts")
    body.append("- **Do**: tratar `sprites.*` como indices de paleta (nibbles 0..15).")
    body.append("- **Do**: escalar canales 0..31 -> 0..255 al renderizar fuera del GBA.")
    body.append("- **Don't**: asumir que `Sprite0` es el sprite real del juego; es el")
    body.append("  mejor candidato en esa posicion. Verificar contra la ROM antes de")
    body.append("  usarlo como asset grafico fiel.")
    body.append("- **Don't**: mezclar este extractor con `advance-wars-extractor.py`; este")
    body.append("  emite perfil `monster-rpg` con sprites 16x16, el otro emite `advance-wars`")

    content = "---\n" + "\n".join(fm) + "\n---\n\n" + "\n".join(body) + "\n"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    return content


# ---------- lint ----------

def run_lint(out_path):
    """Corre node tools/game-lint.js <out>. Devuelve (ok, errors, raw)."""
    lint = os.path.join(HERE, "game-lint.js")
    if not os.path.isfile(lint):
        sys.stderr.write("[extractor] no se encontro game-lint.js en %s\n" % lint)
        return False, -1, ""
    cmd = ["node", lint, out_path]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    except FileNotFoundError:
        sys.stderr.write("[extractor] no se encontro `node` en PATH\n")
        return False, -1, ""
    raw = proc.stdout + proc.stderr
    ok = proc.returncode == 0
    errors = -1
    try:
        rep = json.loads(proc.stdout)
        errors = rep.get("summary", {}).get("errors", -1)
        if errors == 0:
            ok = True
    except Exception:
        pass
    return ok, errors, raw


# ---------- main ----------

def main(argv):
    rom_path = argv[1] if len(argv) > 1 else None
    json_path = argv[2] if len(argv) > 2 else None
    out_path = argv[3] if len(argv) > 3 else os.path.join(ROOT, "examples", "extracted.GAME.md")

    if not rom_path or not os.path.isfile(rom_path):
        sys.stderr.write("Uso: python tools/gba-sprite-extractor-universal.py ROM.gba [offsets.json] [salida.GAME.md]\n")
        return 2

    rom = read_rom(rom_path)
    print("[extractor] ROM: %s (%d bytes)" % (rom_path, len(rom)))

    offsets = load_offsets(json_path)
    if offsets:
        source_tag = "offsets JSON (%s)" % offsets.get("source", "unknown")
        print("[extractor] offsets JSON: %s" % json_path)
    else:
        source_tag = "heuristic-fallback (sin JSON)"
        print("[extractor] sin JSON valido -> heuristica pura")

    # ---- sprites ----
    sprite_offsets = []
    if offsets and offsets["sprites"]:
        for s in offsets["sprites"]:
            off = parse_hex_offset(s.get("offset"))
            if off is not None and 0 <= off < len(rom) - SPRITE_BYTES_16x16 + 1:
                sprite_offsets.append(off)
            if len(sprite_offsets) >= N_SPRITES_MAX:
                break
        print("[extractor] %d offsets de sprite desde JSON" % len(sprite_offsets))

    if not sprite_offsets:
        # fallback heuristico
        want = N_SPRITES_DEFAULT
        sprite_offsets = find_best_sprite_offsets(rom, want)
        print("[extractor] %d offsets heuristicos" % len(sprite_offsets))

    if not sprite_offsets:
        sys.stderr.write("[extractor] no se hallaron sprites candidatos\n")
        return 1

    sprites = []
    for i, off in enumerate(sprite_offsets[:N_SPRITES_MAX]):
        grid = decode_sprite_16x16(rom, off)
        sprites.append(("sprite%d" % (i + 1), off, grid))

    # ---- paletas ----
    palettes = []
    if offsets and offsets["palettes"]:
        for p in offsets["palettes"]:
            off = parse_hex_offset(p.get("offset"))
            if off is None or off < 0 or off > len(rom) - PALETTE_BYTES:
                continue
            pal = block_to_palette(rom[off:off + PALETTE_BYTES])
            if pal is not None:
                palettes.append((off, pal))
            if len(palettes) >= N_PALETTES_DEFAULT:
                break
        print("[extractor] %d paletas desde JSON" % len(palettes))

    if not palettes:
        pal, off = find_best_palette(rom)
        if pal is not None:
            palettes.append((off, pal))
        print("[extractor] paleta: heuristica @0x%06X" % (palettes[0][0] if palettes else 0))

    if not palettes:
        # paleta por defecto (cumple rango 0..31 para que el lint pase)
        palettes.append((0, [[0, 0, 0]] + [[i, i, i] for i in range(1, 16)]))

    # ---- emitir ----
    print("[extractor] emitiendo %s ..." % out_path)
    emit_gamemd(rom_path, palettes, sprites, json_path, out_path, source_tag)

    # ---- validar ----
    print("[extractor] validando con game-lint.js ...")
    ok, errors, raw = run_lint(out_path)
    if ok:
        print("[extractor] LINT OK (errors=%d)" % errors)
        return 0
    sys.stderr.write("[extractor] LINT FALLO (errors=%s)\n" % errors)
    sys.stderr.write(raw[:2000] + "\n")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))