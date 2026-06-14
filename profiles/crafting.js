/**
 * profiles/crafting.js — Perfil "crafteo" del Protocolo GAME.
 * Mismo core, vocabulario distinto: materiales, items, estaciones, recetas.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['crafting'] = api;
})(function () {

  const refs = [
    { rule: 'recipe-output', level: 'error',
      src: { collection: 'recipes', field: 'output' }, target: { collection: 'items' },
      msg: (v, k) => 'receta ' + k + ' produce un item inexistente: ' + v },
    { rule: 'recipe-station', level: 'error', optional: true,
      src: { collection: 'recipes', field: 'station' }, target: { collection: 'stations' },
      msg: (v, k) => 'receta ' + k + ' usa una estacion inexistente: ' + v },
  ];

  // inputs es un mapa por receta (recipes[k].inputs = { MATERIAL: qty }); se valida con regla propia.
  function ruleRecipeInputs({ data, add }) {
    const materials = data.materials || {};
    for (const [k, r] of Object.entries(data.recipes || {})) {
      const inputs = r.inputs || {};
      if (Object.keys(inputs).length === 0) add('warn', 'recipe-inputs', 'receta ' + k + ' no tiene inputs');
      for (const [mat, qty] of Object.entries(inputs)) {
        if (!(mat in materials)) add('error', 'recipe-inputs', 'receta ' + k + ' usa material inexistente: ' + mat);
        if (!(qty > 0)) add('error', 'recipe-inputs', 'receta ' + k + ' input ' + mat + ' con cantidad invalida: ' + qty);
      }
    }
  }
  function ruleMaterials({ data, add }) {
    for (const [n, m] of Object.entries(data.materials || {}))
      if (m.stack != null && !(m.stack > 0)) add('error', 'material-bounds', 'material ' + n + ' tiene stack invalido: ' + m.stack);
  }

  const derive = [
    { key: 'MATERIALS', from: 'materials' },
    { key: 'ITEMS', from: 'items' },
    { key: 'STATIONS', from: 'stations' },
    // RECIPES expandido: aplana inputs a lista y resuelve valor del output desde items.
    { key: 'RECIPES', fn: (data) => {
      const items = data.items || {}; const out = {};
      for (const [k, r] of Object.entries(data.recipes || {})) {
        out[k] = {
          output: r.output, qty: r.qty || 1, station: r.station,
          outputValue: (items[r.output] || {}).value,
          inputs: Object.entries(r.inputs || {}).map(([mat, q]) => ({ material: mat, qty: q })),
        };
      }
      return out;
    } },
    { key: 'TEXT', from: 'text' },
  ];

  return {
    id: 'crafting',
    specVersion: '0.1',
    sections: ['Overview', 'Materials', 'Items', 'Stations', 'Recipes', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [ruleRecipeInputs, ruleMaterials],
    derive: derive,
  };
});
