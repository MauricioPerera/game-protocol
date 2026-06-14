/**
 * profiles/papers-please.js — Perfil "inspección de documentos" (estilo Papers, Please).
 * Mismo core: ni tiles, ni sprites, ni mapas. Solo documentos, reglas, días y solicitantes.
 *
 * Frontera dato/lógica: el perfil declara QUÉ reglas existen (con un vocabulario fijo de
 * `type`); el MOTOR implementa CÓMO detectar la discrepancia para cada `type`. Un type nuevo
 * de regla exige soporte en el motor — eso es lógica, no dato.
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') (window.GameProfiles = window.GameProfiles || {})['papers-please'] = api;
})(function () {

  const RULE_TYPES = new Set(['require-document', 'ban-country', 'require-field-match', 'not-expired']);
  const DECISIONS = new Set(['approve', 'deny', 'detain']);

  const refs = [
    { rule: 'day-entrant-ref', level: 'error',
      src: { collection: 'days', arrayField: 'entrants' }, target: { collection: 'entrants' },
      msg: (v, k) => 'día ' + k + ' referencia un solicitante inexistente: ' + v },
    { rule: 'day-rule-ref', level: 'error',
      src: { collection: 'days', arrayField: 'rules' }, target: { collection: 'rules' },
      msg: (v, k) => 'día ' + k + ' referencia una regla inexistente: ' + v },
    { rule: 'rule-doc-ref', level: 'error', optional: true,
      src: { collection: 'rules', field: 'document' }, target: { collection: 'documents' },
      msg: (v, k) => 'regla ' + k + ' referencia un documento inexistente: ' + v },
    { rule: 'rule-country-ref', level: 'error', optional: true,
      src: { collection: 'rules', field: 'country' }, target: { collection: 'countries' },
      msg: (v, k) => 'regla ' + k + ' referencia un país inexistente: ' + v },
    { rule: 'rule-docs-ref', level: 'error',
      src: { collection: 'rules', arrayField: 'documents' }, target: { collection: 'documents' },
      msg: (v, k) => 'regla ' + k + ' referencia un documento inexistente: ' + v },
  ];

  function ruleRuleType({ data, add }) {
    for (const [k, r] of Object.entries(data.rules || {}))
      if (!RULE_TYPES.has(r.type))
        add('error', 'rule-type-valid', 'regla ' + k + ' tiene un type no soportado por el motor: ' + r.type);
  }

  function ruleEntrants({ data, add }) {
    const documents = data.documents || {};
    for (const [k, e] of Object.entries(data.entrants || {})) {
      if (e.decision && !DECISIONS.has(e.decision))
        add('error', 'entrant-decision', 'solicitante ' + k + ' tiene decisión inválida: ' + e.decision);
      const docs = e.docs || {};
      for (const [docType, fields] of Object.entries(docs)) {
        if (!(docType in documents)) { add('error', 'entrant-doc-ref', 'solicitante ' + k + ' porta un documento inexistente: ' + docType); continue; }
        const valid = new Set(documents[docType].fields || []);
        for (const f of Object.keys(fields || {}))
          if (!valid.has(f)) add('warn', 'entrant-doc-field', 'solicitante ' + k + ': el documento ' + docType + ' tiene un campo no declarado: ' + f);
      }
    }
  }

  function ruleEconomy({ data, add }) {
    const eco = data.economy || {};
    for (const k of ['salary', 'rent', 'penaltyFee'])
      if (eco[k] != null && !(eco[k] >= 0)) add('error', 'economy-bounds', 'economy.' + k + ' inválido: ' + eco[k]);
  }

  const derive = [
    { key: 'COUNTRIES', from: 'countries' },
    { key: 'DOCUMENTS', from: 'documents' },
    { key: 'RULES', from: 'rules' },
    { key: 'ENTRANTS', from: 'entrants' },
    // DAYS expandido: resuelve ids de reglas y solicitantes a sus objetos completos.
    { key: 'DAYS', fn: (data) => {
      const rules = data.rules || {}, entrants = data.entrants || {}; const out = {};
      for (const [d, def] of Object.entries(data.days || {})) {
        out[d] = {
          rules: (def.rules || []).map(id => Object.assign({ id }, rules[id])),
          entrants: (def.entrants || []).map(id => Object.assign({ id }, entrants[id])),
        };
      }
      return out;
    } },
    { key: 'ECONOMY', from: 'economy' },
    { key: 'TEXT', from: 'text' },
  ];

  return {
    id: 'papers-please',
    specVersion: '0.1',
    sections: ['Overview', 'Countries', 'Documents', 'Rules', 'Entrants', 'Days', 'Economy & Balance', "Do's and Don'ts"],
    required: ['version', 'name'],
    refs: refs,
    rules: [ruleRuleType, ruleEntrants, ruleEconomy],
    derive: derive,
  };
});
