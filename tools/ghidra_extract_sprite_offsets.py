#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ghidra_extract_sprite_offsets.py
#
# Script headless Ghidra (Jython/Python) que analiza una ROM GBA y exporta un
# JSON con offsets candidatos de tablas de sprites y paletas.
#
# Doble modo (HONESTO):
#   1) Bajo Ghidra (analyzeHeadless ... -postScript este_script.py):
#      usa currentProgram (memoria ya analizada) y hace detección de tablas de
#      punteros por clustering/estadística sobre la memoria del programa.
#   2) Sin Ghidra (python tools/ghidra_extract_sprite_offsets.py ROM.gba [out.json]):
#      fallback heurístico puro que escanea el archivo directamente. Misma salida
#      JSON, marcada con "source":"heuristic-fallback".
#
# LIMITACIÓN HONESTA: Ghidra NO conoce la estructura gráfica del GBA. El
# auto-análisis encuentra código, no tablas de sprites. La "detección de tablas"
# es HEURÍSTICA: busca corridas de u32 little-endian alineados a 4 bytes cuyos
# valores apuntan al espacio de ROM (0x08xxxxxx normalizado a offset de archivo,
# o 0-based). Produce CANDIDATOS, no offsets verificados. El usuario debe validar
# contra el juego real. Ver tools/SPRITE_EXTRACTION.md.
#
# Salida JSON:
#   {
#     "rom": "ROM.gba",
#     "romSize": 16777216,
#     "source": "ghidra" | "heuristic-fallback",
#     "sprites":  [ {"name":"Sprite0","offset":"0x016B40","size":128,"table":0}, ... ],
#     "palettes": [ {"name":"Palette0","offset":"0x020000","score":42}, ... ]
#   }
#   - size: 128 bytes = sprite 16x16 4bpp (4 tiles 8x8). El extractor decide.
#   - offset: string hex de 6 cifras (offset de archivo 0-based).
#
# Uso Ghidra:
#   analyzeHeadless ghidra_project proj -import ROM.gba \
#       -postScript ghidra_extract_sprite_offsets.py ROM.gba offsets.json \
#       -scriptPath tools -deleteProject
#   (El primer arg del script = ROM, segundo = salida JSON.)
#
# Uso sin Ghidra:
#   python tools/ghidra_extract_sprite_offsets.py ROM.gba offsets.json

import os
import sys
import json

# --- Parámetros de la heurística ---
TILE_BYTES_8x8 = 32
SPRITE_BYTES_16x16 = 128        # 16x16 4bpp = 256 pixels / 2 = 128 bytes
PALETTE_BYTES = 32              # 16 colores BGR555 * 2 bytes
MIN_TABLE_LEN = 4               # mínima corrida de punteros válidos para ser "tabla"
MAX_TABLE_LEN = 4096            # tope para no tragar toda la ROM como una tabla
SCAN_ALIGN = 4                  # alineación de escaneo de punteros (bytes)
MIN_INC_RATIO = 0.5             # fracción mínima de pasos next>current (tablas incrementales)
MIN_HEADER_OFFSET = 0xC0        # offsets < a esto = cabecera GBA, no sprites válidos

# GBA ROM memory map: cartucho visible en 0x08000000..0x09FFFFFF.
GBA_ROM_BASE = 0x08000000


def is_ghidra_env():
    """True si se está corriendo dentro de Ghidra (currentProgram disponible)."""
    try:
        globals()['_ghidra_probe']  # noqa
        return False
    except Exception:
        pass
    # En Ghidra, currentProgram se inyecta en el namespace global del script.
    g = globals()
    return 'currentProgram' in g and g['currentProgram'] is not None


# =================== utilidades compartidas ===================

def normalize_pointer(value, rom_size):
    """
    Convierte un u32 candidato a offset de archivo 0-based, o None si no apunta
    a la ROM. Acepta dos formas (la ROM puede tener base 0 o 0x08000000):
      - 0x08000000 <= v <= 0x08000000+rom_size  ->  v - 0x08000000
      - 0 <= v < rom_size                        ->  v (base 0)
    """
    if 0x08000000 <= value < 0x08000000 + rom_size:
        return value - 0x08000000
    if 0 <= value < rom_size:
        return value
    return None


def read_u32_le(buf, off):
    """u32 little-endian desde buf (bytes o bytearray), sin firmar."""
    return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)


# =================== detección de tablas de punteros ===================

def find_pointer_tables(data, rom_size):
    """
    Escanea `data` alineado a 4 bytes. Una "tabla" es una corrida de u32 LE
    consecutivos (>= MIN_TABLE_LEN) que TODOS normalizan a offsets válidos de
    ROM Y con tendencia monótona creciente: al menos MIN_INC_RATIO de los pasos
    consecutivos deben ser next > current. Esto filtra:
      - runs de ceros (punteros todos a 0): 0% crecientes -> descartado.
      - datos gráficos 4bpp casualmente alineados: rara vez monótonos.
    "Patrón: secuencia de valores little-endian incrementales (típico en tablas)"
    -- spec Parte 1.
    Devuelve lista de corridas (listas de offsets) ordenada por longitud desc.
    """
    tables = []
    n = len(data) - 4
    off = 0
    while off < n:
        run = []
        cur = off
        prev = None
        while cur + 4 <= len(data) and len(run) < MAX_TABLE_LEN:
            v = read_u32_le(data, cur)
            foff = normalize_pointer(v, rom_size)
            if foff is None:
                break
            # cortar al primer no-creciente (foff <= prev): una tabla
            # "incremental" estricta no baja ni repite. Esto también corta los
            # runs de ceros en 1 entrada (avance rápido) y evita que un run
            # válido se contamine con la basura siguiente.
            if prev is not None and foff <= prev:
                break
            run.append(foff)
            prev = foff
            cur += 4
        if len(run) >= MIN_TABLE_LEN and _is_increasing_run(run):
            tables.append(run)
            off = cur
        elif len(run) >= MIN_TABLE_LEN:
            # corrida larga de punteros válidos pero NO creciente (típica de
            # runs de ceros o datos gráficos): saltar la corrida entera para no
            # re-escanearla (cualquier sub-corrida de un run all-igual tampoco es
            # creciente). Costo O(n) en vez de O(n*MAX_TABLE_LEN).
            off = cur
        else:
            off += SCAN_ALIGN
    tables.sort(key=len, reverse=True)
    return tables


def _is_increasing_run(run):
    """
    True si la corrida es mayormente estrictamente creciente:
      - al menos MIN_INC_RATIO de pasos con next > current
      - al menos un paso estrictamente creciente (descarta all-iguales)
    El corte por decretemento ya garantiza que no hay pasos negativos.
    """
    if len(run) < 2:
        return False
    inc = 0
    strict = 0
    for a, b in zip(run, run[1:]):
        if b > a:
            inc += 1
            strict += 1
    ratio = inc / float(len(run) - 1)
    return strict >= 1 and ratio >= MIN_INC_RATIO


def tables_to_sprites(tables, max_sprites=64):
    """
    Convierte las tablas en entradas de sprites. Toma hasta max_sprites offsets
    totales (repartidos entre las tablas más largas). Cada offset = un sprite
    candidato de 16x16 (128 bytes). Descarta offsets duplicados.
    """
    sprites = []
    seen = set()
    for ti, run in enumerate(tables):
        for off in run:
            if off in seen:
                continue
            if off < MIN_HEADER_OFFSET:
                continue   # cabecera GBA: no es sprite válido
            seen.add(off)
            sprites.append({
                "name": "Sprite%d" % len(sprites),
                "offset": "0x%06X" % off,
                "size": SPRITE_BYTES_16x16,
                "table": ti,
            })
            if len(sprites) >= max_sprites:
                return sprites
    return sprites


# =================== paletas BGR555 (heurística, compartida) ===================

def palette_score(block):
    """
    Puntúa 32 bytes como paleta BGR555 de 16 colores. Criterios GBA plausibles:
      - bit15 (0x8000) de cada color == 0 (paletas planas, sin bit de efectos).
      - color 0 suele ser 0,0,0 (transparente/negro).
      - canales con valor intermedio 1..30 (tonos reales, no saturados extremos).
    Devuelve (score, colors_rgb) o (None, None).
    """
    if len(block) < PALETTE_BYTES:
        return None, None
    colors = []
    penalty = 0
    for i in range(16):
        lo = block[2 * i]
        hi = block[2 * i + 1]
        word = lo | (hi << 8)
        if word & 0x8000:
            penalty -= 3
        word &= 0x7FFF
        r = word & 0x1F
        g = (word >> 5) & 0x1F
        b = (word >> 10) & 0x1F
        colors.append([r, g, b])
    c0bonus = 4 if colors[0] == [0, 0, 0] else 0
    mid = sum(1 for c in colors for ch in c if 1 <= ch <= 30)
    score = penalty + c0bonus + mid
    if score <= 0:
        return None, None
    return score, colors


def find_palettes(data, max_palettes=4, step=2):
    """Escanea data alineado a 2 bytes; devuelve hasta max_palettes mejores."""
    cands = []
    n = len(data) - PALETTE_BYTES
    off = 0
    while off < n:
        block = data[off:off + PALETTE_BYTES]
        s, _ = palette_score(block)
        if s is not None:
            cands.append((s, off))
        off += step
    cands.sort(key=lambda t: t[0], reverse=True)
    # desempate por offset menor; separar paletas que no solapen
    chosen = []
    for s, off in cands:
        if len(chosen) >= max_palettes:
            break
        if any(abs(off - o) < PALETTE_BYTES for _, o in chosen):
            continue
        chosen.append((s, off))
    return chosen


def palettes_to_json(chosen):
    out = []
    for i, (s, off) in enumerate(chosen):
        out.append({
            "name": "Palette%d" % i,
            "offset": "0x%06X" % off,
            "score": s,
        })
    return out


# =================== modo Ghidra ===================

def run_ghidra(rom_path, out_path):
    """
    Bajo Ghidra: currentProgram es la ROM ya importada/analizada. Leemos toda la
    memoria a un buffer y aplicamos las mismas heurísticas que el modo puro.
    El auto-análisis de Ghidra no aporta información gráfica; se usa su memoria
    como fuente de bytes y su dirección base para normalizar punteros.
    """
    prog = globals()['currentProgram']
    memory = prog.getMemory()
    rom_size = int(prog.getMaxAddress().subtract(prog.getMinAddress())) + 1

    # volcar memoria a bytes
    buf = bytearray(rom_size)
    # getAllInitializedAddressRanges() en Ghidra; leemos por bloques inicializados
    from ghidra.program.model.address import AddressIterator  # noqa: F401
    base = prog.getMinAddress()
    try:
        memory.getBytes(base, buf)             # bulk read
    except Exception:
        # fallback: leer byte a byte (lento) para rangos inicializados
        it = memory.getInitializedAddressRanges()
        for rng in it:
            start = rng.getMinAddress()
            length = int(rng.getLength())
            tmp = bytearray(length)
            memory.getBytes(start, tmp)
            rel = int(start.subtract(base))
            buf[rel:rel + length] = tmp
        rom_size = len(buf)

    data = bytes(buf)
    tables = find_pointer_tables(data, rom_size)
    sprites = tables_to_sprites(tables)
    pals = find_palettes(data)
    result = {
        "rom": rom_path or os.path.basename(str(prog.getExecutablePath())),
        "romSize": rom_size,
        "source": "ghidra",
        "sprites": sprites,
        "palettes": palettes_to_json(pals),
    }
    write_json(out_path, result)
    return result


# =================== modo fallback puro (sin Ghidra) ===================

def run_heuristic(rom_path, out_path):
    with open(rom_path, "rb") as f:
        data = f.read()
    rom_size = len(data)
    tables = find_pointer_tables(data, rom_size)
    sprites = tables_to_sprites(tables)
    pals = find_palettes(data)
    result = {
        "rom": os.path.basename(rom_path),
        "romSize": rom_size,
        "source": "heuristic-fallback",
        "sprites": sprites,
        "palettes": palettes_to_json(pals),
    }
    write_json(out_path, result)
    return result


def write_json(out_path, result):
    if out_path:
        d = os.path.dirname(os.path.abspath(out_path))
        if d and not os.path.isdir(d):
            os.makedirs(d)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)


def get_args():
    """
    Args del script. En Ghidra vienen de getScriptArgs(); en CLI de sys.argv.
    Devuelve (rom_path, out_path).
    """
    try:
        sa = getScriptArgs()  # type: ignore  # noqa: inyectada por Ghidra
        args = list(sa)
    except NameError:
        args = sys.argv[1:]
    rom_path = args[0] if len(args) > 0 else None
    out_path = args[1] if len(args) > 1 else None
    if not out_path:
        # default junto a la ROM: <rom-stem>.sprite-offsets.json
        if rom_path:
            stem = os.path.splitext(rom_path)[0]
            out_path = stem + ".sprite-offsets.json"
        else:
            out_path = "sprite-offsets.json"
    return rom_path, out_path


def main():
    rom_path, out_path = get_args()
    if is_ghidra_env():
        print("[ghidra_extract] modo Ghidra")
        if not rom_path:
            # bajo Ghidra sin arg, usar el path del programa importado
            try:
                rom_path = str(globals()['currentProgram'].getExecutablePath())
            except Exception:
                rom_path = "rom.gba"
        result = run_ghidra(rom_path, out_path)
    else:
        print("[ghidra_extract] modo heurístico (sin Ghidra)")
        if not rom_path or not os.path.isfile(rom_path):
            sys.stderr.write("Uso: python tools/ghidra_extract_sprite_offsets.py ROM.gba [out.json]\n")
            return 2
        result = run_heuristic(rom_path, out_path)
    print("[ghidra_extract] ROM: %s (%d bytes)" % (rom_path, result["romSize"]))
    print("[ghidra_extract] sprites candidatos: %d" % len(result["sprites"]))
    print("[ghidra_extract] paletas candidatas: %d" % len(result["palettes"]))
    print("[ghidra_extract] JSON -> %s" % out_path)
    return 0


# Punto de entrada compatible con Ghidra (que llama a run()/_run) y con CLI.
if __name__ == "__main__":
    sys.exit(main())
else:
    # Ghidra invoca el script y llama a run() si existe; exponer main como run.
    def run():
        main()