---
name: Feature request
about: Propón un token, regla, sección de spec o un nuevo perfil
labels: enhancement
---

## Resumen

<!-- Una frase describiendo la mejora. -->

## Tipo

- [ ] Token / sección de spec nuevo (sigue el patrón de 5 pasos de [SPEC §8](../../SPEC.md))
- [ ] Regla de validación nueva (core o de perfil)
- [ ] Perfil nuevo (vocabulario de género)
- [ ] Mejora a una herramienta (`game-lint`, `game-export`, `game-build-core`, `yaml-min`)
- [ ] Otra (especifica)

## Caso de uso

<!-- ¿Qué problema concreto resuelve? ¿Quién lo usaría? -->

## Solución propuesta

<!-- ¿Cómo lo imaginas en el `GAME.md`? Si es un token, pega una maqueta
YAML mínima. Si es una regla, qué validaría y en qué nivel (error/warn/deprecated). -->

```
---
version: "0.1"
name: "..."
profile: ...
# (tokens nuevos aquí)
---
```

## Alternativas consideradas

<!-- ¿Por qué esta forma y no otra? -->

## ¿Es breaking?

- [ ] No (aditivo)
- [ ] Sí — sigue la política de deprecation de [SPEC §7.1](../../SPEC.md) y
      deja entrada `### Deprecated`/`### Removed` en `CHANGELOG.md` (ver
      [CONTRIBUTING.md](../../CONTRIBUTING.md)).