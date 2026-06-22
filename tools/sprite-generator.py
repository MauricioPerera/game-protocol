#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sprite-generator.py — Generador de sprites procedurales en formato game-protocol.

Produce un GAME.md valido (perfil monster-rpg) con:
  - spritePalettes: N paletas de 16 colores RGB en formato protocolo [r,g,b] 0..31
    (5-bit por canal; el lint `palette-color-range` rechaza componentes >31).
  - sprites: N sprites 16x16 en 4bpp (indices 0..15). El lint `sprite-dims` exige
    exactamente 16x16; 8x8 se rechaza. Indices 0..15 = 16 colores = 4bpp.

Uso:
  python tools/sprite-generator.py [--out RUTA] [--seed N] [--sprites N] [--palettes N]
  python tools/sprite-generator.py --help

Default: genera tools/sprite-generator.example.GAME.md con 3 sprites y 3 paletas,
y ejecuta `node tools/game-lint.js <out>` para verificar 0 errores / 0 warnings.

Notas sobre el formato (importante para no romper el lint):
  - Paletas: [r,g,b] con cada componente en 0..31 (NO 0..255, NO hex 0xRRGGBB).
  - Sprites: matriz 16x16 de enteros 0..15 (4bpp). El indice 0 es convencionalmente
    "transparente"/fondo.
  - El cuerpo Markdown solo puede usar headings canonicos del perfil monster-rpg
    en orden (Overview, Tiles, Types, Species, Maps, Player, Text,
    Economy & Balance, Do's and Don'ts). Otros headings disparan `section-order`.

Requisitos: Python 3.8+ (stdlib). Para auto-lint: Node.js en PATH.
"""

import argparse
import math
import os
import random
import subprocess
import sys

# --------------------------------------------------------------------------- #
# 1. GENERACION DE PALETAS (16 colores RGB, cuantizados a 5-bit 0..31)
# --------------------------------------------------------------------------- #

def _q5(v):
    """Cuantiza un canal 0..255 a 0..31 (5-bit), como exige el protocolo."""
    return max(0, min(31, int(round(v / 255.0 * 31))))


def _rgb_to_protocol(r, g, b):
    """Convierte RGB 0..255 a [r,g,b] 0..31 (formato que valida game-lint)."""
    return [_q5(r), _q5(g), _q5(b)]


def _hsv_to_rgb(h, s, v):
    """HSV (h en [0,1), s,v en [0,1]) -> RGB 0..255."""
    i = int(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - f * s)
    t = v * (1.0 - (1.0 - f) * s)
    i %= 6
    if i == 0:   r, g, b = v, t, p
    elif i == 1: r, g, b = q, v, p
    elif i == 2: r, g, b = p, v, t
    elif i == 3: r, g, b = p, q, v
    elif i == 4: r, g, b = t, p, v
    else:        r, g, b = v, p, q
    return int(r * 255), int(g * 255), int(b * 255)


def generate_palette(seed, index):
    """Genera 16 colores RGB coherentes (base hue rotada por paleta).

    Devuelve una lista de 16 pares [r,g,b] en 0..31. El color 0 es negro
    (convencion: fondo/transparente).
    """
    rng = random.Random((seed * 1009) + index)
    base_h = (index * 0.37) % 1.0          # hue base distinto por paleta
    pal = [[0, 0, 0]]                      # idx 0 = fondo
    # Sombra oscura del hue base (idx 1)
    pal.append(_rgb_to_protocol(*_hsv_to_rgb(base_h, 0.55, 0.20)))
    # Cuerpo principal (idx 2) y variantes de brillo (idx 3..6)
    for k, v in enumerate([0.45, 0.60, 0.75, 0.90]):
        pal.append(_rgb_to_protocol(*_hsv_to_rgb(base_h, 0.70, v)))
    # Acentos: hue complementario, 4 brillos (idx 7..10)
    comp = (base_h + 0.5) % 1.0
    for k, v in enumerate([0.40, 0.55, 0.70, 0.85]):
        pal.append(_rgb_to_protocol(*_hsv_to_rgb(comp, 0.75, v)))
    # Acentos: hue analogo +30deg, 4 brillos (idx 10..13)
    ana = (base_h + 1.0 / 12.0) % 1.0
    for k, v in enumerate([0.45, 0.60, 0.75, 0.90]):
        pal.append(_rgb_to_protocol(*_hsv_to_rgb(ana, 0.65, v)))
    # Gris claro (idx 14) y blanco (idx 15)
    pal.append(_rgb_to_protocol(180, 180, 180))
    pal.append(_rgb_to_protocol(255, 255, 255))
    assert len(pal) == 16
    return pal


# --------------------------------------------------------------------------- #
# 2. GENERACION DE TILE DATA 16x16 (4bpp, indices 0..15)
# --------------------------------------------------------------------------- #

SPRITE_SIZE = 16
SPRITE_HALF = SPRITE_SIZE / 2.0


def _new_grid():
    return [[0] * SPRITE_SIZE for _ in range(SPRITE_SIZE)]


def _in_bounds(x, y):
    return 0 <= x < SPRITE_SIZE and 0 <= y < SPRITE_SIZE


def _ring(grid, cx, cy, radius, color):
    """Dibuja un anel (circunferencia) de un color, grosor 1px."""
    r2_lo = (radius - 0.5) ** 2
    r2_hi = (radius + 0.5) ** 2
    for y in range(SPRITE_SIZE):
        for x in range(SPRITE_SIZE):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r2_lo <= d2 <= r2_hi:
                grid[y][x] = color


def _fill_circle(grid, cx, cy, radius, color):
    """Dibuja un disco relleno."""
    r2 = radius * radius
    for y in range(SPRITE_SIZE):
        for x in range(SPRITE_SIZE):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r2:
                grid[y][x] = color


def _rect(grid, x0, y0, x1, y1, color):
    for y in range(max(0, y0), min(SPRITE_SIZE, y1 + 1)):
        for x in range(max(0, x0), min(SPRITE_SIZE, x1 + 1)):
            grid[y][x] = color


def _ring_rect(grid, x0, y0, x1, y1, color):
    """Borde de un rectangulo (perimetro) de grosor 1px."""
    for x in range(x0, x1 + 1):
        if _in_bounds(x, y0): grid[y0][x] = color
        if _in_bounds(x, y1): grid[y1][x] = color
    for y in range(y0, y1 + 1):
        if _in_bounds(x0, y): grid[y][x0] = color
        if _in_bounds(x1, y): grid[y][x1] = color


def sprite_circle(palette_idx):
    """Sprite abstracto tipo 'criatura': disco con borde, ojos y base."""
    g = _new_grid()
    body, dark, accent, light = 2, 1, 7, 14
    _fill_circle(g, SPRITE_HALF, SPRITE_HALF, 6.5, body)
    _ring(g, SPRITE_HALF, SPRITE_HALF, 6.5, dark)
    # ojos (acentos claros)
    _fill_circle(g, 5.5, 6.5, 1.4, light)
    _fill_circle(g, 10.5, 6.5, 1.4, light)
    _fill_circle(g, 5.5, 6.5, 0.7, dark)
    _fill_circle(g, 10.5, 6.5, 0.7, dark)
    # base/sombra
    _rect(g, 5, 12, 10, 13, dark)
    return g


def sprite_square(palette_idx):
    """Sprite tipo 'tile/sprite bloque': cuadrado con borde y motivo interno."""
    g = _new_grid()
    body, dark, accent, light = 2, 1, 7, 14
    _rect(g, 2, 2, 13, 13, body)
    _ring_rect(g, 2, 2, 13, 13, dark)
    # motivo: cruz central en acento
    _rect(g, 7, 5, 8, 10, accent)
    _rect(g, 5, 7, 10, 8, accent)
    # esquinas claras
    for cx, cy in [(4, 4), (11, 4), (4, 11), (11, 11)]:
        g[cy][cx] = light
    return g


def sprite_diamond(palette_idx):
    """Sprite abstracto tipo 'gema/diamante': rombo con facetas."""
    g = _new_grid()
    body, dark, accent, light = 2, 1, 7, 14
    c = SPRITE_HALF
    # rombo: |x-cx| + |y-cy| <= R
    R = 7
    for y in range(SPRITE_SIZE):
        for x in range(SPRITE_SIZE):
            if abs(x + 0.5 - c) + abs(y + 0.5 - c) <= R:
                g[y][x] = body
    # borde
    for y in range(SPRITE_SIZE):
        for x in range(SPRITE_SIZE):
            if abs(abs(x + 0.5 - c) + abs(y + 0.5 - c) - R) < 0.6 and g[y][x] == body:
                g[y][x] = dark
    # faceta superior (brillo) y faceta inferior (sombra)
    _fill_circle(g, c - 1.5, c - 1.5, 1.6, light)
    _fill_circle(g, c + 2.0, c + 2.0, 1.4, accent)
    return g


SPRITE_SHAPES = {
    "circle": sprite_circle,
    "square": sprite_square,
    "diamond": sprite_diamond,
}


def generate_sprite(shape, palette_idx):
    fn = SPRITE_SHAPES.get(shape)
    if fn is None:
        raise ValueError("shape desconocida: %r (validas: %s)" % (shape, sorted(SPRITE_SHAPES)))
    grid = fn(palette_idx)
    # sanity: 16x16, indices 0..15
    assert len(grid) == SPRITE_SIZE and all(len(r) == SPRITE_SIZE for r in grid)
    assert all(0 <= v <= 15 for r in grid for v in r), "indice fuera de 0..15 (4bpp)"
    return grid


# --------------------------------------------------------------------------- #
# 3. EMISION DEL GAME.md (YAML valido para game-lint)
# --------------------------------------------------------------------------- #

def _yaml_palette(pal):
    """Serializa una paleta [[r,g,b],...] en YAML de flujo."""
    inner = ",".join("[%d,%d,%d]" % tuple(c) for c in pal)
    return "[%s]" % inner


def render_game_md(name, seed, n_sprites, n_palettes, shapes):
    """Devuelve el texto completo del GAME.md (front-matter + body canonico)."""
    fm = []
    fm.append('version: "0.1"')
    fm.append('name: %s' % name)
    fm.append('profile: monster-rpg')
    fm.append('')

    # spritePalettes: N paletas de 16 colores [r,g,b] 0..31
    fm.append('spritePalettes:')
    for i in range(n_palettes):
        pal = generate_palette(seed, i)
        fm.append('  %d: %s' % (i, _yaml_palette(pal)))
    fm.append('')

    # sprites: N sprites 16x16 (4bpp, indices 0..15). Cada uno pinta con la
    # paleta i % n_palettes.
    fm.append('sprites:')
    for i in range(n_sprites):
        shape = shapes[i % len(shapes)]
        pal_idx = i % n_palettes
        grid = generate_sprite(shape, pal_idx)
        rows = ",".join("[%s]" % ",".join(str(v) for v in row) for row in grid)
        fm.append('  sprite%d: [%s]' % (i + 1, rows))
    fm.append('')

    body = []
    body.append("## Overview")
    body.append("")
    body.append(
        "Demo de sprites procedurales generados por `tools/sprite-generator.py`. "
        "Cada sprite es una matriz 16x16 en 4bpp (indices 0..15) que indexa una "
        "paleta de 16 colores RGB en formato protocolo `[r,g,b]` con componentes "
        "en 0..31. El indice 0 es el fondo/transparente convencional."
    )
    body.append("")
    body.append("## Tiles")
    body.append("")
    body.append(
        "No hay tiles ni mapas en este demo: solo `spritePalettes` + `sprites`. "
        "Para usar estos sprites en un juego completo, referencialos desde "
        "`species.<id>.sprite` (la regla `sprite-ref` valida la referencia)."
    )
    body.append("")
    body.append("## Do's and Don'ts")
    body.append("")
    body.append("- Paletas: `[r,g,b]` con cada componente en 0..31 (5-bit). "
                "No usar hex `0xRRGGBB` ni 0..255: `palette-color-range` falla.")
    body.append("- Sprites: matriz 16x16 exacta, indices 0..15 (4bpp). "
                "`sprite-dims` rechaza 8x8 u otros tamanos.")
    body.append("- Indices de sprite 0..15 mapean a los 16 colores de su paleta.")
    body.append("")

    return "---\n" + "\n".join(fm) + "---\n" + "\n".join(body) + "\n"


# --------------------------------------------------------------------------- #
# 4. VALIDACION con game-lint.js
# --------------------------------------------------------------------------- #

def run_lint(out_path):
    """Ejecuta `node tools/game-lint.js <out>` y devuelve (ok, resumen, findings)."""
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lint = os.path.join(repo_root, "tools", "game-lint.js")
    if not os.path.isfile(lint):
        return False, "no se encontro tools/game-lint.js", []
    try:
        proc = subprocess.run(
            ["node", lint, out_path],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        return False, "node no esta en el PATH (instala Node.js para auto-lint)", []
    except subprocess.TimeoutExpired:
        return False, "timeout ejecutando game-lint.js", []
    out = proc.stdout.strip()
    try:
        import json
        rep = json.loads(out)
    except Exception:
        return False, "salida no-JSON de game-lint: %s" % (proc.stderr.strip() or out), []
    s = rep.get("summary", {})
    findings = rep.get("findings", [])
    ok = s.get("errors", 0) == 0 and s.get("warnings", 0) == 0
    summary = "errors=%d warnings=%d ok=%s" % (s.get("errors", 0), s.get("warnings", 0), s.get("ok"))
    return ok, summary, findings


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def main(argv=None):
    p = argparse.ArgumentParser(
        description="Generador de sprites procedurales en formato game-protocol.",
    )
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(here)
    default_out = os.path.join(repo_root, "tools", "sprite-generator.example.GAME.md")
    p.add_argument("--out", default=default_out, help="Ruta de salida del GAME.md.")
    p.add_argument("--seed", type=int, default=42, help="Semilla determinista.")
    p.add_argument("--sprites", type=int, default=3, help="Cantidad de sprites (>=1).")
    p.add_argument("--palettes", type=int, default=3, help="Cantidad de paletas (>=1).")
    p.add_argument("--shapes", default="circle,square,diamond",
                   help="Lista de formas separadas por coma (circle,square,diamond).")
    p.add_argument("--no-lint", action="store_true", help="No ejecutar game-lint.js al final.")
    args = p.parse_args(argv)

    if args.sprites < 1 or args.palettes < 1:
        p.error("--sprites y --palettes deben ser >= 1")
    shapes = [s.strip() for s in args.shapes.split(",") if s.strip()]
    for s in shapes:
        if s not in SPRITE_SHAPES:
            p.error("shape invalida %r (validas: %s)" % (s, sorted(SPRITE_SHAPES)))

    name = "Procedural Sprites Demo"
    text = render_game_md(name, args.seed, args.sprites, args.palettes, shapes)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    print("Generado: %s" % out)
    print("  sprites=%d palettes=%d shapes=%s seed=%d" % (
        args.sprites, args.palettes, ",".join(shapes), args.seed))

    if args.no_lint:
        print("Lint omitido (--no-lint). Validar con: node tools/game-lint.js %s" % out)
        return 0

    ok, summary, findings = run_lint(out)
    print("Lint: %s" % summary)
    if findings:
        print("Findings:")
        for fnd in findings:
            print("  [%s] %s: %s" % (fnd.get("level"), fnd.get("rule"), fnd.get("msg")))
    if not ok:
        print("DoD NO cumplido (esperado 0 errores / 0 warnings).", file=sys.stderr)
        return 1
    print("DoD OK: 0 errores, 0 warnings.")
    return 0


if __name__ == "__main__":
    sys.exit(main())