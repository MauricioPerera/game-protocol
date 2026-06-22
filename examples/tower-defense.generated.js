// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: tower-defense
window.GAME = {
  "generatedFrom": "GAME.md",
  "name": "Tower Defense Demo",
  "description": null,
  "platform": {},
  "palettesCount": 0,
  "TOWERS": {
    "rifle": {
      "cost": 50,
      "range": 3,
      "damage": 5,
      "rate": 2,
      "dmgType": "PHYSICAL"
    },
    "cannon": {
      "cost": 120,
      "range": 2,
      "damage": 20,
      "rate": 1,
      "dmgType": "PHYSICAL"
    },
    "laser": {
      "cost": 200,
      "range": 4,
      "damage": 8,
      "rate": 3,
      "dmgType": "ENERGY"
    }
  },
  "DMG_CHART": {
    "PHYSICAL": {
      "LIGHT": 1,
      "MEDIUM": 0.8,
      "HEAVY": 0.5
    },
    "ENERGY": {
      "LIGHT": 0.8,
      "MEDIUM": 1,
      "HEAVY": 1.5
    }
  },
  "ENEMIES": {
    "RUNNER": {
      "hp": 10,
      "speed": 2,
      "armor": "LIGHT",
      "bounty": 5
    },
    "TANK": {
      "hp": 40,
      "speed": 1,
      "armor": "HEAVY",
      "bounty": 15
    }
  },
  "ARMORS": [
    "LIGHT",
    "MEDIUM",
    "HEAVY"
  ],
  "WAVES": {
    "1": {
      "reward": 50,
      "spawns": [
        {
          "enemy": "RUNNER",
          "count": 5,
          "gap": 30,
          "hp": 10,
          "speed": 2,
          "armor": "LIGHT",
          "bounty": 5
        }
      ]
    },
    "2": {
      "reward": 80,
      "spawns": [
        {
          "enemy": "RUNNER",
          "count": 8,
          "gap": 25,
          "hp": 10,
          "speed": 2,
          "armor": "LIGHT",
          "bounty": 5
        },
        {
          "enemy": "TANK",
          "count": 2,
          "gap": 60,
          "hp": 40,
          "speed": 1,
          "armor": "HEAVY",
          "bounty": 15
        }
      ]
    }
  },
  "MAPS": {},
  "ECONOMY": {
    "startGold": 200,
    "startLives": 20
  },
  "BALANCE": {
    "sellRatio": 0.7,
    "interestRate": 0.05
  },
  "PALETTES": [],
  "SPRITE_PALETTES": [],
  "SPRITES": {},
  "TILE_ART": {},
  "TILES": {}
};
