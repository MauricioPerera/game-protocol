// AUTO-GENERADO por tools/game-export.js desde GAME.md — NO EDITAR A MANO.
// Regenerar con:  node tools/game-export.js
// profile: peg-solitaire
window.GAME = {
  "generatedFrom": "GAME.md",
  "profile": "peg-solitaire",
  "name": "Senku",
  "description": "Solitario de clavijas (peg solitaire) — salta un peg sobre otro para retirarlo hasta dejar uno solo.",
  "platform": {},
  "palettesCount": 0,
  "BOARDS": {
    "B1": {
      "goal": "clear",
      "difficulty": "easy",
      "layout": [
        "__...__",
        "__...__",
        ".......",
        "..ooo..",
        "...o...",
        "__.o.__",
        "__...__"
      ]
    },
    "B2": {
      "goal": "clear",
      "difficulty": "normal",
      "layout": [
        "__...__",
        "__..o__",
        "....o..",
        "..oo.o.",
        "...oo..",
        "__.oo__",
        "__.o.__"
      ]
    },
    "B3": {
      "goal": "center",
      "difficulty": "hard",
      "layout": [
        "__ooo__",
        "__ooo__",
        "ooooooo",
        "ooo.ooo",
        "ooooooo",
        "__ooo__",
        "__ooo__"
      ]
    }
  },
  "PLAYER": {
    "start": "B1"
  },
  "TEXT": {
    "intro": "Salta un peg sobre otro vecino hacia un hueco: el saltado se retira. Deja uno solo.",
    "pick": "Peg elegido. Salta a un hueco a dos casillas (Enter).",
    "badmove": "Ese salto no es legal.",
    "jump": "Bien: un peg menos.",
    "win": "Uno solo. Senku resuelto.",
    "lose": "Sin saltos posibles.",
    "loseCenter": "Quedo uno... pero no en el centro."
  }
};
