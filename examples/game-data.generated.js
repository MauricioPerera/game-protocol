// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: monster-rpg
window.GAME = {
  "generatedFrom": "GAME.md",
  "profile": "monster-rpg",
  "name": "Demo Protocol Game",
  "description": "Ejemplo minimo y autocontenido del Protocolo GAME (gameplay-as-data).",
  "platform": {
    "mode": "demo",
    "cols": 10,
    "rows": 8,
    "screenW": 160,
    "screenH": 128
  },
  "palettesCount": 8,
  "TYPE_CHART": {
    "GRASS": {
      "WATER": 2,
      "FIRE": 0.5,
      "GRASS": 0.5
    },
    "FIRE": {
      "GRASS": 2,
      "WATER": 0.5,
      "FIRE": 0.5
    },
    "WATER": {
      "FIRE": 2,
      "GRASS": 0.5,
      "WATER": 0.5
    },
    "NORMAL": {}
  },
  "MOVES": {
    "TACKLE": {
      "type": "NORMAL",
      "power": 5
    },
    "VINE": {
      "type": "GRASS",
      "power": 7
    },
    "EMBER": {
      "type": "FIRE",
      "power": 6
    },
    "BUBBLE": {
      "type": "WATER",
      "power": 6
    }
  },
  "SPECIES": {
    "LEAFY": {
      "type": "GRASS",
      "maxhp": 20,
      "pal": "green",
      "moves": [
        "TACKLE",
        "VINE"
      ],
      "evolvesInto": "LEAFKING",
      "atLevel": 8
    },
    "LEAFKING": {
      "type": "GRASS",
      "maxhp": 30,
      "moves": [
        "TACKLE",
        "VINE"
      ]
    },
    "RATTY": {
      "type": "NORMAL",
      "maxhp": 14,
      "pal": "purple",
      "moves": [
        "TACKLE"
      ],
      "wild": true
    },
    "EMBY": {
      "type": "FIRE",
      "maxhp": 15,
      "pal": "red",
      "moves": [
        "EMBER"
      ],
      "wild": true
    },
    "DROPLET": {
      "type": "WATER",
      "maxhp": 15,
      "pal": "blue",
      "moves": [
        "BUBBLE"
      ],
      "wild": true
    }
  },
  "WILD_LIST": [
    {
      "name": "RATTY",
      "maxhp": 14,
      "pal": "purple",
      "sprite": "generic",
      "type": "NORMAL",
      "moves": [
        {
          "name": "TACKLE",
          "type": "NORMAL",
          "power": 5
        }
      ]
    },
    {
      "name": "EMBY",
      "maxhp": 15,
      "pal": "red",
      "sprite": "generic",
      "type": "FIRE",
      "moves": [
        {
          "name": "EMBER",
          "type": "FIRE",
          "power": 6
        }
      ]
    },
    {
      "name": "DROPLET",
      "maxhp": 15,
      "pal": "blue",
      "sprite": "generic",
      "type": "WATER",
      "moves": [
        {
          "name": "BUBBLE",
          "type": "WATER",
          "power": 6
        }
      ]
    }
  ],
  "EVOLUTIONS": {
    "LEAFY": {
      "into": "LEAFKING",
      "level": 8,
      "maxhp": 30,
      "type": "GRASS",
      "moves": [
        {
          "name": "TACKLE",
          "type": "NORMAL",
          "power": 5
        },
        {
          "name": "VINE",
          "type": "GRASS",
          "power": 7
        }
      ]
    }
  },
  "TRAINERS": {
    "ROOKIE JAY": {
      "prize": 150,
      "dialogue": "Lets battle?",
      "pal": 1,
      "level": 4,
      "team": [
        {
          "name": "RATTY",
          "maxhp": 14,
          "type": "NORMAL",
          "pal": "purple",
          "sprite": "generic",
          "level": 4,
          "moves": [
            {
              "name": "TACKLE",
              "type": "NORMAL",
              "power": 5
            }
          ]
        }
      ]
    }
  },
  "PALETTES": [
    [
      [
        8,
        17,
        7
      ],
      [
        12,
        22,
        10
      ],
      [
        15,
        25,
        12
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ],
      [
        18,
        28,
        14
      ]
    ],
    [
      [
        12,
        22,
        10
      ],
      [
        6,
        6,
        8
      ],
      [
        16,
        18,
        20
      ],
      [
        24,
        26,
        28
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ],
      [
        31,
        31,
        31
      ]
    ]
  ],
  "SPRITE_PALETTES": [
    [
      [
        0,
        0,
        0
      ],
      [
        1,
        1,
        1
      ],
      [
        6,
        20,
        8
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ],
      [
        31,
        22,
        16
      ]
    ]
  ],
  "SPRITES": {},
  "ITEMS": {
    "POTION": {
      "price": 200,
      "effect": "heal",
      "amount": 20
    },
    "BALL": {
      "price": 100,
      "effect": "catch"
    },
    "ANTIDOTE": {
      "price": 80,
      "effect": "cure",
      "cures": "poison"
    }
  },
  "ENCOUNTERS": {
    "field": [
      {
        "name": "RATTY",
        "maxhp": 14,
        "pal": "purple",
        "sprite": "generic",
        "type": "NORMAL",
        "moves": [
          {
            "name": "TACKLE",
            "type": "NORMAL",
            "power": 5
          }
        ]
      },
      {
        "name": "EMBY",
        "maxhp": 15,
        "pal": "red",
        "sprite": "generic",
        "type": "FIRE",
        "moves": [
          {
            "name": "EMBER",
            "type": "FIRE",
            "power": 6
          }
        ]
      },
      {
        "name": "DROPLET",
        "maxhp": 15,
        "pal": "blue",
        "sprite": "generic",
        "type": "WATER",
        "moves": [
          {
            "name": "BUBBLE",
            "type": "WATER",
            "power": 6
          }
        ]
      }
    ]
  },
  "MAPS": {
    "house": {
      "tilemap": [
        [
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17
        ],
        [
          17,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          48,
          48,
          48,
          46,
          48,
          48,
          48,
          48,
          17
        ],
        [
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          17
        ]
      ],
      "attrs": [
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ],
        [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
        ]
      ],
      "entry": {
        "col": 4,
        "row": 6
      },
      "exit": {
        "col": 4,
        "row": 6
      },
      "return": {
        "col": 5,
        "row": 3
      }
    }
  },
  "OVERWORLD": {
    "field": {
      "npcs": [
        {
          "col": 3,
          "row": 4,
          "pal": 1,
          "range": 2,
          "timer": 40,
          "dialogue": "Welcome to the demo!"
        }
      ],
      "trainers": [
        {
          "col": 5,
          "row": 5,
          "name": "ROOKIE JAY",
          "dir": "down",
          "sight": 4
        }
      ],
      "warps": [
        {
          "col": 5,
          "row": 1,
          "target": "house",
          "entry": {
            "col": 4,
            "row": 6
          }
        }
      ]
    }
  },
  "PLAYER": {
    "starter": "LEAFY",
    "level": 5,
    "start": {
      "x": 24,
      "y": 24
    },
    "inventory": {
      "POTION": 1
    }
  },
  "TILE_ART": {
    "16": [
      [
        1,
        1,
        2,
        1,
        1,
        0,
        3,
        1
      ],
      [
        1,
        0,
        1,
        1,
        2,
        1,
        1,
        1
      ],
      [
        2,
        1,
        1,
        3,
        1,
        1,
        1,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        1
      ],
      [
        1,
        3,
        1,
        0,
        1,
        1,
        1,
        1
      ],
      [
        0,
        1,
        1,
        2,
        1,
        1,
        1,
        3
      ],
      [
        1,
        1,
        1,
        1,
        1,
        0,
        1,
        1
      ],
      [
        3,
        1,
        1,
        1,
        2,
        1,
        1,
        1
      ]
    ],
    "17": [
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ],
      [
        1,
        3,
        3,
        3,
        3,
        3,
        3,
        1
      ],
      [
        1,
        3,
        4,
        4,
        4,
        4,
        3,
        1
      ],
      [
        1,
        3,
        4,
        4,
        4,
        4,
        3,
        1
      ],
      [
        1,
        3,
        4,
        4,
        4,
        4,
        3,
        1
      ],
      [
        1,
        3,
        3,
        3,
        3,
        3,
        3,
        1
      ],
      [
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        1
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ]
    ]
  },
  "TEXT": {
    "intro": "Bienvenido a la demo del Protocolo GAME. Camina por la hierba alta para encontrar criaturas.",
    "sign": "Esto es un cartel del pueblo demo."
  },
  "SFX": {
    "encounter": {
      "freq": 440,
      "dur": 0.08
    },
    "hit": {
      "freq": 660,
      "dur": 0.07
    },
    "win": {
      "freq": 523,
      "dur": 0.12
    }
  },
  "ECONOMY": {
    "startMoney": 2000,
    "prices": {
      "POTION": 200,
      "BALL": 100,
      "ANTIDOTE": 80
    }
  },
  "BALANCE": {
    "catchBase": 0.4,
    "catchScale": 0.5,
    "xpCurveMul": 1.5,
    "encounterRate": 0.2
  },
  "TILES": {
    "16": {
      "name": "grass",
      "solid": false
    },
    "17": {
      "name": "wall",
      "solid": true
    },
    "18": {
      "name": "tall_grass",
      "solid": false,
      "encounter": true
    },
    "19": {
      "name": "door",
      "solid": true,
      "warp": true
    },
    "46": {
      "name": "mat",
      "solid": false
    },
    "48": {
      "name": "floor",
      "solid": false
    }
  },
  "SOLID_TILES": [
    17,
    19
  ]
};
