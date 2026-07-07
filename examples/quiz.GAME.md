---
version: "0.1"
name: Quiz Island
profile: quiz
description: "Demo del perfil puro-de-datos: profiles/quiz.json, cargado sin ejecutar codigo."
categories:
  GEO: { name: Geografia }
  SCI: { name: Ciencia }
  HIS: { name: Historia }
questions:
  Q1: { category: GEO, text: "Capital de Francia?", answer: Paris, options: [Paris, Roma, Berlin], difficulty: easy, points: 10, seconds: 15 }
  Q2: { category: SCI, text: "Simbolo quimico del oro?", answer: Au, options: [Au, Ag, Fe], difficulty: normal, points: 20, seconds: 20 }
  Q3: { category: SCI, text: "Planeta mas grande del sistema solar?", answer: Jupiter, options: [Jupiter, Saturno, Marte], difficulty: easy, points: 10, seconds: 15 }
  Q4: { category: HIS, text: "En que anio cayo el muro de Berlin?", answer: "1989", options: ["1989", "1991", "1979"], difficulty: hard, points: 40, seconds: 30 }
  Q5: { category: GEO, text: "Rio mas largo de Sudamerica?", answer: Amazonas, options: [Amazonas, Parana, Orinoco], difficulty: normal, points: 20, seconds: 20 }
rounds:
  1: { questions: [Q1, Q3], reward: 50 }
  2: { questions: [Q2, Q5], reward: 100 }
  3: { questions: [Q4], reward: 200 }
text:
  intro: "Quiz Island: responde antes de que corra el reloj."
  correct: "Correcto!"
  wrong: "Fallaste. La proxima sera."
  win: "Ronda superada!"
---

## Overview
Demo del **perfil puro-de-datos** del protocolo: `profiles/quiz.json` no contiene una sola
funcion — se carga con `JSON.parse` (nunca se ejecuta codigo) y valida integramente con las
familias declarativas del core: `refs` (con mensajes por defecto), `bounds`, `enums`.

## Categories
Tres categorias (`GEO`, `SCI`, `HIS`). Cada `question.category` debe existir aqui
(familia broken-ref, regla `question-category-ref`).

## Questions
Cinco preguntas con `points` (> 0, obligatorio), `seconds` (5..120, entero) y
`difficulty` (enum: easy | normal | hard, obligatorio). `text`/`answer`/`options` son
datos libres del motor.

## Rounds
Tres rondas ordenadas; cada entrada de `questions` debe existir (`round-question-ref`) y
`reward` es >= 0.

## Text
Mensajes de sistema del motor (intro, acierto, fallo, victoria).

## Do's and Don'ts
- Este perfil NO acepta logica: si una validacion no cabe en refs/bounds/enums/dims, no
  pertenece a un perfil puro-datos (ver SPEC §6.1 y §11).
- Preguntas con comas o ":" en el texto: entre comillas, como siempre (SPEC §1.2).
