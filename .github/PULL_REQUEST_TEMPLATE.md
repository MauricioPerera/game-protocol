# Pull Request

## Resumen

<!-- ¿Qué cambia y por qué? Una frase. -->

## Tipo de cambio

- [ ] Fix (corrección, no breaking) — bump **patch**
- [ ] Aditivo (nuevo token/regla/perfil, no breaking) — bump **patch** en `0.x`
- [ ] Breaking en `0.x` — bump **minor** + `### Deprecated`/`### Removed` en `CHANGELOG.md`
- [ ] Breaking en `1.0+` — bump **major** + deprecation previa (ver [SPEC §7.1](../SPEC.md))
- [ ] Docs / governance

## Changelog

<!-- Si toca el core o un perfil, deja la entrada bajo [Unreleased] en
CHANGELOG.md (### Added / ### Changed / ### Deprecated / ### Removed / ### Fixed). -->

- [ ] CHANGELOG.md actualizado

## Testing

```bash
# Lint del ejemplo: debe dar 0 errores
node tools/game-lint.js examples/GAME.md

# Sin-drift del generado (si tocaste export o un ejemplo)
node tools/game-export.js examples/GAME.md examples/game-data.generated.js
git diff --exit-code examples/game-data.generated.js

# Sin-drift del manifest / schemas (si tocaste perfiles)
node tools/game-manifest.js /tmp/m.json && diff -q /tmp/m.json manifest.json
node tools/game-schema.js && git diff --exit-code schemas/

# Suite completa
npm test
```

- [ ] `npm test` verde
- [ ] Sin drift (generado, manifest, schemas)

## Breaking changes

<!-- Si el PR es breaking: ¿qué token/regla/perfil cambia? ¿Hay receta de
migración en MIGRATION.md? ¿`manifest.json` refleja la nueva versión en
`migrations.supported`? -->

- [ ] No hay breaking changes
- [ ] Breaking — adjunto receta en [MIGRATION.md](../MIGRATION.md) y bump de versión

## Notas para el reviewer

<!-- ¿Dónde mirar primero? ¿Casos límite probados? -->