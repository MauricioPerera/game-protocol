---
version: "0.1"
name: Border Checkpoint
profile: papers-please
countries:
  ARSTOTZKA: { ally: true }
  KOLECHIA: { ally: false }
  OBRISTAN: { ally: true }
documents:
  PASSPORT: { fields: [name, country, number, expiration], photo: true }
  ID_CARD: { fields: [name, district, height] }
  ENTRY_PERMIT: { fields: [name, expiration] }
rules:
  NEED_PASSPORT: { type: require-document, document: PASSPORT }
  BAN_KOLECHIA: { type: ban-country, country: KOLECHIA }
  NAME_MATCH: { type: require-field-match, documents: [PASSPORT, ID_CARD], field: name }
  PASSPORT_VALID: { type: not-expired, document: PASSPORT, field: expiration }
entrants:
  E1: { docs: { PASSPORT: { name: "Jan Stepovic", country: ARSTOTZKA, number: A1, expiration: "1983.06" } }, decision: approve }
  E2: { docs: {}, decision: deny, reason: "sin pasaporte" }
  E3: { docs: { PASSPORT: { name: "Ivan Volkov", country: KOLECHIA, number: K9, expiration: "1983.07" }, ID_CARD: { name: "Ivan Volkov", district: Vedor } }, decision: deny, reason: "país vetado" }
  E4: { docs: { PASSPORT: { name: "Lena Sorokin", country: OBRISTAN, number: O3, expiration: "1982.01" } }, decision: deny, reason: "pasaporte caducado" }
days:
  1: { rules: [NEED_PASSPORT], entrants: [E1, E2] }
  2: { rules: [NEED_PASSPORT, BAN_KOLECHIA, NAME_MATCH, PASSPORT_VALID], entrants: [E3, E4] }
economy: { salary: 5, rent: 20, penaltyFee: 5 }
text:
  rulebook_d1: "Los solicitantes deben portar pasaporte."
  rulebook_d2: "Prohibida la entrada a ciudadanos de Kolechia."
---

## Overview
Punto de control fronterizo: mismo Protocolo GAME, perfil `papers-please`. Sin tiles ni sprites.

## Countries
## Documents
## Rules
## Entrants
## Days

## Economy & Balance

## Do's and Don'ts
