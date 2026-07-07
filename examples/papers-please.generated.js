// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: papers-please
window.GAME = {
  "generatedFrom": "GAME.md",
  "profile": "papers-please",
  "name": "Border Checkpoint",
  "description": null,
  "platform": {},
  "palettesCount": 0,
  "COUNTRIES": {
    "ARSTOTZKA": {
      "ally": true
    },
    "KOLECHIA": {
      "ally": false
    },
    "OBRISTAN": {
      "ally": true
    }
  },
  "DOCUMENTS": {
    "PASSPORT": {
      "fields": [
        "name",
        "country",
        "number",
        "expiration"
      ],
      "photo": true
    },
    "ID_CARD": {
      "fields": [
        "name",
        "district",
        "height"
      ]
    },
    "ENTRY_PERMIT": {
      "fields": [
        "name",
        "expiration"
      ]
    }
  },
  "RULES": {
    "NEED_PASSPORT": {
      "type": "require-document",
      "document": "PASSPORT"
    },
    "BAN_KOLECHIA": {
      "type": "ban-country",
      "country": "KOLECHIA"
    },
    "NAME_MATCH": {
      "type": "require-field-match",
      "documents": [
        "PASSPORT",
        "ID_CARD"
      ],
      "field": "name"
    },
    "PASSPORT_VALID": {
      "type": "not-expired",
      "document": "PASSPORT",
      "field": "expiration"
    }
  },
  "ENTRANTS": {
    "E1": {
      "docs": {
        "PASSPORT": {
          "name": "Jan Stepovic",
          "country": "ARSTOTZKA",
          "number": "A1",
          "expiration": "1983.06"
        }
      },
      "decision": "approve"
    },
    "E2": {
      "docs": {},
      "decision": "deny",
      "reason": "sin pasaporte"
    },
    "E3": {
      "docs": {
        "PASSPORT": {
          "name": "Ivan Volkov",
          "country": "KOLECHIA",
          "number": "K9",
          "expiration": "1983.07"
        },
        "ID_CARD": {
          "name": "Ivan Volkov",
          "district": "Vedor"
        }
      },
      "decision": "deny",
      "reason": "país vetado"
    },
    "E4": {
      "docs": {
        "PASSPORT": {
          "name": "Lena Sorokin",
          "country": "OBRISTAN",
          "number": "O3",
          "expiration": "1982.01"
        }
      },
      "decision": "deny",
      "reason": "pasaporte caducado"
    }
  },
  "DAYS": {
    "1": {
      "rules": [
        {
          "id": "NEED_PASSPORT",
          "type": "require-document",
          "document": "PASSPORT"
        }
      ],
      "entrants": [
        {
          "id": "E1",
          "docs": {
            "PASSPORT": {
              "name": "Jan Stepovic",
              "country": "ARSTOTZKA",
              "number": "A1",
              "expiration": "1983.06"
            }
          },
          "decision": "approve"
        },
        {
          "id": "E2",
          "docs": {},
          "decision": "deny",
          "reason": "sin pasaporte"
        }
      ]
    },
    "2": {
      "rules": [
        {
          "id": "NEED_PASSPORT",
          "type": "require-document",
          "document": "PASSPORT"
        },
        {
          "id": "BAN_KOLECHIA",
          "type": "ban-country",
          "country": "KOLECHIA"
        },
        {
          "id": "NAME_MATCH",
          "type": "require-field-match",
          "documents": [
            "PASSPORT",
            "ID_CARD"
          ],
          "field": "name"
        },
        {
          "id": "PASSPORT_VALID",
          "type": "not-expired",
          "document": "PASSPORT",
          "field": "expiration"
        }
      ],
      "entrants": [
        {
          "id": "E3",
          "docs": {
            "PASSPORT": {
              "name": "Ivan Volkov",
              "country": "KOLECHIA",
              "number": "K9",
              "expiration": "1983.07"
            },
            "ID_CARD": {
              "name": "Ivan Volkov",
              "district": "Vedor"
            }
          },
          "decision": "deny",
          "reason": "país vetado"
        },
        {
          "id": "E4",
          "docs": {
            "PASSPORT": {
              "name": "Lena Sorokin",
              "country": "OBRISTAN",
              "number": "O3",
              "expiration": "1982.01"
            }
          },
          "decision": "deny",
          "reason": "pasaporte caducado"
        }
      ]
    }
  },
  "ECONOMY": {
    "salary": 5,
    "rent": 20,
    "penaltyFee": 5
  },
  "TEXT": {
    "rulebook_d1": "Los solicitantes deben portar pasaporte.",
    "rulebook_d2": "Prohibida la entrada a ciudadanos de Kolechia."
  }
};
