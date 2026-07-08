// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: shooter
window.GAME = {
  "generatedFrom": "GAME.md",
  "profile": "shooter",
  "name": "Neon Swarm",
  "description": "Arena shmup vertical sobre el perfil puro-de-datos shooter: 5 oleadas, 4 enemigos, 2 naves, powerups.",
  "platform": {},
  "palettesCount": 0,
  "SHIPS": {
    "VIPER": {
      "speed": 0.11,
      "hp": 5,
      "weapon": "BLASTER"
    },
    "JUGGERNAUT": {
      "speed": 0.07,
      "hp": 8,
      "weapon": "CANNON"
    }
  },
  "WEAPONS": {
    "BLASTER": {
      "damage": 1,
      "rate": 6,
      "bulletSpeed": 0.3
    },
    "CANNON": {
      "damage": 3,
      "rate": 2,
      "bulletSpeed": 0.22
    }
  },
  "ENEMIES": {
    "DRONE": {
      "hp": 1,
      "speed": 0.045,
      "points": 10,
      "behavior": "chaser"
    },
    "WASP": {
      "hp": 2,
      "speed": 0.07,
      "points": 20,
      "behavior": "drifter"
    },
    "TANKBUG": {
      "hp": 6,
      "speed": 0.03,
      "points": 50,
      "behavior": "chaser"
    },
    "PHANTOM": {
      "hp": 3,
      "speed": 0.055,
      "points": 35,
      "behavior": "drifter"
    }
  },
  "WAVES": {
    "1": {
      "spawns": [
        {
          "enemy": "DRONE",
          "count": 6,
          "gap": 40
        }
      ]
    },
    "2": {
      "spawns": [
        {
          "enemy": "DRONE",
          "count": 8,
          "gap": 30
        },
        {
          "enemy": "WASP",
          "count": 3,
          "gap": 60
        }
      ]
    },
    "3": {
      "spawns": [
        {
          "enemy": "WASP",
          "count": 6,
          "gap": 35
        },
        {
          "enemy": "TANKBUG",
          "count": 2,
          "gap": 120
        }
      ]
    },
    "4": {
      "spawns": [
        {
          "enemy": "DRONE",
          "count": 10,
          "gap": 20
        },
        {
          "enemy": "PHANTOM",
          "count": 4,
          "gap": 70
        }
      ]
    },
    "5": {
      "spawns": [
        {
          "enemy": "TANKBUG",
          "count": 4,
          "gap": 90
        },
        {
          "enemy": "PHANTOM",
          "count": 6,
          "gap": 45
        },
        {
          "enemy": "WASP",
          "count": 6,
          "gap": 30
        }
      ]
    }
  },
  "POWERUPS": {
    "MEDKIT": {
      "effect": "heal",
      "amount": 2
    },
    "OVERDRIVE": {
      "effect": "rapid",
      "duration": 300
    },
    "AEGIS": {
      "effect": "shield",
      "duration": 240
    }
  },
  "ARENA": {
    "width": 24,
    "height": 16
  },
  "PLAYER": {
    "ship": "VIPER"
  },
  "BALANCE": {
    "powerupChance": 0.18,
    "lives": 2
  },
  "TEXT": {
    "intro": "Neon Swarm. Flechas para moverte; Espacio para disparar. Sobrevive a las 5 oleadas.",
    "wave": "Oleada entrante.",
    "victory": "El enjambre cae. La colonia esta a salvo.",
    "defeat": "Tu escuadron ha caido."
  }
};
