// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: crafting
window.GAME = {
  "generatedFrom": "GAME.md",
  "profile": "crafting",
  "name": "Forge",
  "description": null,
  "platform": {},
  "palettesCount": 0,
  "MATERIALS": {
    "IRON": {
      "tier": 1,
      "stack": 99
    },
    "WOOD": {
      "tier": 1,
      "stack": 99
    },
    "COAL": {
      "tier": 1,
      "stack": 99
    }
  },
  "ITEMS": {
    "SWORD": {
      "value": 50
    },
    "AXE": {
      "value": 40
    }
  },
  "STATIONS": {
    "ANVIL": {},
    "BENCH": {}
  },
  "RECIPES": {
    "IRON_SWORD": {
      "output": "SWORD",
      "qty": 1,
      "station": "ANVIL",
      "outputValue": 50,
      "inputs": [
        {
          "material": "IRON",
          "qty": 2
        },
        {
          "material": "WOOD",
          "qty": 1
        }
      ]
    },
    "IRON_AXE": {
      "output": "AXE",
      "qty": 1,
      "station": "ANVIL",
      "outputValue": 40,
      "inputs": [
        {
          "material": "IRON",
          "qty": 1
        },
        {
          "material": "WOOD",
          "qty": 2
        }
      ]
    }
  },
  "TEXT": {
    "done": "Crafted!"
  }
};
