---
name: Bug report
about: Reporta un error del linter, compilador o un perfil
labels: bug
---

## Resumen

<!-- Una frase describiendo qué falló y dónde. -->

## Perfil afectado

<!-- Ej: monster-rpg, tower-defense, platformer, voxel, adventure, dungeon,
roguelike, crafting, papers-please, o "core" si es independiente de género. -->

- [ ] monster-rpg
- [ ] tower-defense
- [ ] platformer
- [ ] voxel
- [ ] adventure
- [ ] dungeon
- [ ] roguelike
- [ ] crafting
- [ ] papers-please
- [ ] core (independiente de perfil)

## Reproducción

```
# Comando(s) para reproducir (mínimo reproducible)
node tools/game-lint.js ...
node tools/game-export.js ...
```

## Comportamiento esperado

<!-- Qué esperabas que pasara. -->

## Comportamiento actual

<!-- Qué pasa en su lugar (stderr, exit code, JSON del linter, mensaje). -->

```
(pega la salida / el JSON del linter aquí)
```

## Archivo `GAME.md` mínimo que reproduce

```
---
version: "0.1"
name: "..."
profile: ...
---

# (cuerpo mínimo)
```

## Versión

- `package.json` version:
- `node --version`:
- SO: