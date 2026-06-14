// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: voxel
window.GAME = {
  "generatedFrom": "GAME.md",
  "name": "Voxel Hut",
  "description": null,
  "platform": {},
  "palettesCount": 0,
  "MATERIALS": {
    "STONE": {
      "color": [
        120,
        120,
        120
      ]
    },
    "WOOD": {
      "color": [
        150,
        100,
        60
      ]
    },
    "GLASS": {
      "color": [
        120,
        200,
        240
      ]
    }
  },
  "PREFABS": {
    "pillar": {
      "size": [
        1,
        3,
        1
      ],
      "fill": "STONE"
    },
    "wall": {
      "size": [
        4,
        3,
        1
      ],
      "fill": "WOOD"
    },
    "window": {
      "size": [
        1,
        1,
        1
      ],
      "cells": [
        {
          "x": 0,
          "y": 0,
          "z": 0,
          "m": "GLASS"
        }
      ]
    }
  },
  "STRUCTURES": {
    "hut": {
      "place": [
        {
          "prefab": "wall",
          "at": [
            0,
            0,
            0
          ]
        },
        {
          "prefab": "pillar",
          "at": [
            0,
            0,
            0
          ]
        },
        {
          "prefab": "pillar",
          "at": [
            3,
            0,
            0
          ]
        },
        {
          "prefab": "window",
          "at": [
            2,
            1,
            0
          ]
        }
      ]
    }
  },
  "VOXELS": {
    "hut": {
      "count": 12,
      "bounds": {
        "min": [
          0,
          0,
          0
        ],
        "max": [
          3,
          2,
          0
        ]
      },
      "voxels": [
        {
          "x": 0,
          "y": 0,
          "z": 0,
          "m": "STONE"
        },
        {
          "x": 0,
          "y": 1,
          "z": 0,
          "m": "STONE"
        },
        {
          "x": 0,
          "y": 2,
          "z": 0,
          "m": "STONE"
        },
        {
          "x": 1,
          "y": 0,
          "z": 0,
          "m": "WOOD"
        },
        {
          "x": 1,
          "y": 1,
          "z": 0,
          "m": "WOOD"
        },
        {
          "x": 1,
          "y": 2,
          "z": 0,
          "m": "WOOD"
        },
        {
          "x": 2,
          "y": 0,
          "z": 0,
          "m": "WOOD"
        },
        {
          "x": 2,
          "y": 1,
          "z": 0,
          "m": "GLASS"
        },
        {
          "x": 2,
          "y": 2,
          "z": 0,
          "m": "WOOD"
        },
        {
          "x": 3,
          "y": 0,
          "z": 0,
          "m": "STONE"
        },
        {
          "x": 3,
          "y": 1,
          "z": 0,
          "m": "STONE"
        },
        {
          "x": 3,
          "y": 2,
          "z": 0,
          "m": "STONE"
        }
      ]
    }
  }
};
