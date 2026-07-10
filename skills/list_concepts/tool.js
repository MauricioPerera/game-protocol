// list_concepts — enumerate this origin's published knowledge concepts.
// The list is embedded at build time (content-addressed via tool_sha256).
var CONCEPTS = [{"id":"CHANGELOG.md","type":"Documentation","title":"Changelog","description":""},{"id":"MIGRATION.md","type":"Documentation","title":"Migration Guide — GAME Protocol","description":""},{"id":"README.md","type":"Documentation","title":"GAME Protocol — *Gameplay as Data*","description":""},{"id":"RULE-SPLIT.md","type":"Documentation","title":"The 28 rules: core vs. profile","description":""},{"id":"SPEC.md","type":"Documentation","title":"GAME Protocol — Core Specification","description":""}];
registerTool({
  name: "list_concepts",
  description: "List all knowledge concepts published by this origin (id, type, title, description).",
  inputSchema: { type: "object", properties: {} },
  handler: function () { return { concepts: CONCEPTS }; }
});
