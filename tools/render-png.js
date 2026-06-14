// Renderiza un GAME (perfil adventure) a PNG en Node, sin navegador ni dependencias.
// Usa el mismo dato (window.GAME) y la misma logica de dibujo que el motor del navegador.
const fs = require('fs'), zlib = require('zlib'), path = require('path');

const genFile = process.argv[2] || 'examples/adventure.generated.js';
const outFile = process.argv[3] || 'examples/adventure-render.png';
const SCALE = 10;

// cargar window.GAME
const win = {};
new Function('window', fs.readFileSync(genFile, 'utf8'))(win);
const G = win.GAME;
const tm = G.SCENE.tilemap, at = G.SCENE.attrs, ART = G.TILE_ART, PAL = G.PALETTES, ENT = G.ENTITIES;
const H = tm.length, W = tm[0].length;
const PW = W * 8, PH = H * 8;

function colorAt(idx, palIdx) { const c = (PAL[palIdx] || [])[idx] || [0, 0, 0]; return [Math.round(c[0]*255/31), Math.round(c[1]*255/31), Math.round(c[2]*255/31)]; }

// estado inicial: jugador en start, llave y NPC presentes, meta presente
const player = G.PLAYER, npc = (ENT.npcs||[])[0], pickup = (ENT.pickups||[])[0], goal = ENT.goal;
function entityAt(c, r) { // devuelve {tile,pal} de la entidad superior en la celda, o null
  if (player && player.start.col===c && player.start.row===r) return player;
  if (npc && npc.col===c && npc.row===r) return npc;
  if (pickup && pickup.col===c && pickup.row===r) return pickup;
  if (goal && goal.col===c && goal.row===r) return goal;
  return null;
}

// buffer logico PW x PH (RGB)
const logical = Buffer.alloc(PW * PH * 3);
for (let ly = 0; ly < PH; ly++) for (let lx = 0; lx < PW; lx++) {
  const c = (lx/8)|0, r = (ly/8)|0, px = lx%8, py = ly%8;
  let [R,Gc,B] = colorAt((ART[tm[r][c]]||[])[py] ? ART[tm[r][c]][py][px] : 0, at[r][c]);
  const e = entityAt(c, r);
  if (e && ART[e.tile]) { const ei = ART[e.tile][py][px]; if (ei !== 0) [R,Gc,B] = colorAt(ei, e.pal); }
  const o = (ly*PW + lx)*3; logical[o]=R; logical[o+1]=Gc; logical[o+2]=B;
}

// escalar a SCALE y construir scanlines con byte de filtro 0
const OW = PW*SCALE, OH = PH*SCALE;
const raw = Buffer.alloc(OH * (1 + OW*3));
for (let y = 0; y < OH; y++) {
  const rowStart = y*(1+OW*3); raw[rowStart] = 0;
  const ly = (y/SCALE)|0;
  for (let x = 0; x < OW; x++) {
    const lx = (x/SCALE)|0, src = (ly*PW+lx)*3, dst = rowStart+1+x*3;
    raw[dst]=logical[src]; raw[dst+1]=logical[src+1]; raw[dst+2]=logical[src+2];
  }
}

// CRC32
const crcTable = (()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xffffffff;for(let i=0;i<buf.length;i++)c=crcTable[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type, data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const t=Buffer.from(type,'ascii');const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);return Buffer.concat([len,t,data,crc]);}

const sig = Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW,0); ihdr.writeUInt32BE(OH,4); ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
const idat = zlib.deflateSync(raw);
const png = Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',idat), chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(outFile, png);
console.log('PNG '+OW+'x'+OH+' -> '+outFile+'  ('+png.length+' bytes)');
