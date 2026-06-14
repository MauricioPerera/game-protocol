// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: platformer
window.GAME = {
  "generatedFrom": "GAME.md",
  "name": "Jumpy",
  "description": null,
  "platform": {},
  "palettesCount": 0,
  "TILESETS": {
    "grass": {
      "name": "Grass",
      "solid": false
    },
    "brick": {
      "name": "Brick",
      "solid": true
    }
  },
  "ENEMIES": {
    "GOOMBA": {
      "hp": 1,
      "damage": 1,
      "sprite": "goomba"
    },
    "KOOPA": {
      "hp": 2,
      "damage": 1,
      "sprite": "koopa"
    }
  },
  "LEVELS": {
    "1-1": {
      "tileset": "grass",
      "enemies": [
        "GOOMBA",
        "KOOPA"
      ],
      "goal": {
        "x": 200,
        "y": 0
      }
    },
    "1-2": {
      "tileset": "brick",
      "enemies": [
        "KOOPA"
      ],
      "goal": {
        "x": 320,
        "y": 0
      }
    }
  },
  "PHYSICS": {
    "gravity": 9.8,
    "jump": 12,
    "runSpeed": 5
  },
  "PLAYER": {
    "spawnLevel": "1-1",
    "lives": 3
  },
  "TEXT": {
    "win": "You win!"
  },
  "SFX": {}
};
