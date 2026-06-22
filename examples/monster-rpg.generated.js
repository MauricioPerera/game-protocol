// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: monster-rpg
window.GAME = {
  "generatedFrom": "GAME.md",
  "name": "Monster RPG Demo",
  "description": null,
  "platform": {
    "mode": "topdown",
    "cols": 10,
    "rows": 8
  },
  "palettesCount": 4,
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
    "EMBER": {
      "type": "FIRE",
      "power": 6,
      "effect": "burn"
    },
    "VINE": {
      "type": "GRASS",
      "power": 7,
      "effect": "leech"
    },
    "BUBBLE": {
      "type": "WATER",
      "power": 6,
      "effect": "slow"
    }
  },
  "SPECIES": {
    "LEAFY": {
      "type": "GRASS",
      "maxhp": 20,
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
    "EMBY": {
      "type": "FIRE",
      "maxhp": 15,
      "moves": [
        "EMBER"
      ],
      "wild": true
    },
    "DROPLET": {
      "type": "WATER",
      "maxhp": 15,
      "moves": [
        "BUBBLE"
      ],
      "wild": true
    }
  },
  "WILD_LIST": [
    {
      "name": "EMBY",
      "maxhp": 15,
      "sprite": "generic",
      "type": "FIRE",
      "moves": [
        {
          "name": "EMBER",
          "type": "FIRE",
          "power": 6,
          "effect": "burn"
        }
      ]
    },
    {
      "name": "DROPLET",
      "maxhp": 15,
      "sprite": "generic",
      "type": "WATER",
      "moves": [
        {
          "name": "BUBBLE",
          "type": "WATER",
          "power": 6,
          "effect": "slow"
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
          "power": 7,
          "effect": "leech"
        }
      ]
    }
  },
  "TRAINERS": {
    "ROOKIE": {
      "prize": 150,
      "level": 4,
      "team": [
        {
          "name": "EMBY",
          "maxhp": 15,
          "type": "FIRE",
          "sprite": "generic",
          "level": 4,
          "moves": [
            {
              "name": "EMBER",
              "type": "FIRE",
              "power": 6,
              "effect": "burn"
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
        10,
        14,
        20
      ],
      [
        18,
        20,
        24
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
      ],
      [
        31,
        31,
        31
      ]
    ]
  ],
  "SPRITE_PALETTES": [],
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
    }
  },
  "ENCOUNTERS": {
    "field": [
      {
        "name": "EMBY",
        "maxhp": 15,
        "sprite": "generic",
        "type": "FIRE",
        "moves": [
          {
            "name": "EMBER",
            "type": "FIRE",
            "power": 6,
            "effect": "burn"
          }
        ]
      },
      {
        "name": "DROPLET",
        "maxhp": 15,
        "sprite": "generic",
        "type": "WATER",
        "moves": [
          {
            "name": "BUBBLE",
            "type": "WATER",
            "power": 6,
            "effect": "slow"
          }
        ]
      }
    ]
  },
  "MAPS": {
    "field": {
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
          16,
          16,
          18,
          16,
          16,
          16,
          16,
          16,
          17
        ],
        [
          17,
          16,
          16,
          18,
          16,
          16,
          16,
          16,
          16,
          17
        ],
        [
          17,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          17
        ],
        [
          17,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          17
        ],
        [
          17,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          17
        ],
        [
          17,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
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
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      "entry": {
        "col": 1,
        "row": 7
      }
    }
  },
  "OVERWORLD": {
    "field": {
      "trainers": [
        {
          "col": 5,
          "row": 4,
          "name": "ROOKIE",
          "dir": "down",
          "sight": 3
        }
      ]
    }
  },
  "PLAYER": {
    "starter": "LEAFY",
    "level": 5,
    "start": {
      "x": 16,
      "y": 56
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
        2,
        2,
        2,
        2,
        3,
        1
      ],
      [
        1,
        3,
        2,
        2,
        2,
        2,
        3,
        1
      ],
      [
        1,
        3,
        2,
        2,
        2,
        2,
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
    "intro": "Campo con hierba alta. Camina entre la T para encontrar criaturas."
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
      "BALL": 100
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
    }
  },
  "SOLID_TILES": [
    17,
    19
  ]
};
