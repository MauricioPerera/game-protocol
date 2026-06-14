/**
 * profiles/voxel.js — Perfil "estructuras voxel" del Protocolo GAME.
 * Mismo core, sin tiles 2D: materiales, prefabs reutilizables y estructuras compuestas POR REFERENCIA.
 *
 * Frontera dato/lógica: el perfil declara la estructura (intensión: qué prefab va en qué offset);
 * el MOTOR/adaptador hace el render (mesher voxel, three.js BufferGeometry, raytracer…).
 * `derive` produce un grid canónico NEUTRAL DE BACKEND que cualquier motor puede consumir.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['voxel'] = api;
})(function () {

  const refs = [
    { rule: 'prefab-fill-ref', level: 'error', optional: true,
      src: { collection: 'prefabs', field: 'fill' }, target: { collection: 'materials' },
      msg: (v, k) => 'prefab ' + k + ' usa material de relleno inexistente: ' + v },
    { rule: 'prefab-cell-ref', level: 'error',
      src: { collection: 'prefabs', arrayField: 'cells', itemField: 'm' }, target: { collection: 'materials' },
      msg: (v, k) => 'prefab ' + k + ' tiene una celda con material inexistente: ' + v },
    { rule: 'structure-prefab-ref', level: 'error',
      src: { collection: 'structures', arrayField: 'place', itemField: 'prefab' }, target: { collection: 'prefabs' },
      msg: (v, k) => 'estructura ' + k + ' coloca un prefab inexistente: ' + v },
  ];

  function ruleMaterials({ data, add }) {
    for (const [n, m] of Object.entries(data.materials || {})) {
      const c = m.color;
      if (!Array.isArray(c) || c.length !== 3 || c.some(v => typeof v !== 'number' || v < 0 || v > 255))
        add('error', 'material-color', 'material ' + n + ' tiene color invalido (0..255 x3): ' + JSON.stringify(c));
    }
  }
  function rulePrefabs({ data, add }) {
    for (const [n, p] of Object.entries(data.prefabs || {})) {
      const s = p.size;
      if (!Array.isArray(s) || s.length !== 3 || s.some(v => !(v > 0) || v % 1 !== 0)) {
        add('error', 'prefab-size', 'prefab ' + n + ' tiene size invalido (3 enteros > 0): ' + JSON.stringify(s));
        continue;
      }
      if (!p.fill && !(p.cells && p.cells.length)) add('warn', 'prefab-empty', 'prefab ' + n + ' no tiene fill ni cells');
      for (const c of (p.cells || [])) {
        if ([c.x, c.y, c.z].some(v => typeof v !== 'number' || v % 1 !== 0))
          add('error', 'prefab-cell', 'prefab ' + n + ' tiene una celda con coord no entera: ' + JSON.stringify(c));
        else if (c.x < 0 || c.y < 0 || c.z < 0 || c.x >= s[0] || c.y >= s[1] || c.z >= s[2])
          add('error', 'prefab-cell', 'prefab ' + n + ' tiene una celda fuera del size ' + JSON.stringify(s) + ': ' + JSON.stringify(c));
      }
    }
  }
  function ruleStructures({ data, add }) {
    for (const [n, st] of Object.entries(data.structures || {})) {
      for (const pl of (st.place || [])) {
        if (!Array.isArray(pl.at) || pl.at.length !== 3 || pl.at.some(v => typeof v !== 'number' || v % 1 !== 0))
          add('error', 'structure-at', 'estructura ' + n + ' tiene un place con `at` invalido (3 enteros): ' + JSON.stringify(pl.at));
      }
    }
  }

  // --- COMPILACIÓN: instancia los prefabs en el espacio -> grid canónico neutral de backend ---
  function prefabVoxels(prefab) {
    const [w, h, d] = prefab.size || [0, 0, 0];
    const grid = {}; // "x,y,z" -> material
    if (prefab.fill) for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) grid[x + ',' + y + ',' + z] = prefab.fill;
    for (const c of (prefab.cells || [])) grid[c.x + ',' + c.y + ',' + c.z] = c.m; // overrides
    return grid;
  }

  const derive = [
    { key: 'MATERIALS', from: 'materials' },
    { key: 'PREFABS', from: 'prefabs' },
    { key: 'STRUCTURES', from: 'structures' },
    { key: 'VOXELS', fn: (data) => {
      const prefabs = data.prefabs || {}; const out = {};
      for (const [name, st] of Object.entries(data.structures || {})) {
        const world = {}; // "x,y,z" -> material (los placements posteriores sobrescriben)
        for (const pl of (st.place || [])) {
          const [ox, oy, oz] = pl.at || [0, 0, 0];
          const local = prefabVoxels(prefabs[pl.prefab] || {});
          for (const key of Object.keys(local)) {
            const [lx, ly, lz] = key.split(',').map(Number);
            world[(ox + lx) + ',' + (oy + ly) + ',' + (oz + lz)] = local[key];
          }
        }
        const voxels = Object.keys(world).map(k => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, m: world[k] }; });
        const xs = voxels.map(v => v.x), ys = voxels.map(v => v.y), zs = voxels.map(v => v.z);
        out[name] = {
          count: voxels.length,
          bounds: voxels.length ? { min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)], max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)] } : null,
          voxels,
        };
      }
      return out;
    } },
  ];

  return {
    id: 'voxel',
    specVersion: '0.1',
    sections: ['Overview', 'Materials', 'Prefabs', 'Structures', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [ruleMaterials, rulePrefabs, ruleStructures],
    derive: derive,
  };
});
