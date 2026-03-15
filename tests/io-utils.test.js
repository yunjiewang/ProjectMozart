const test = require("node:test");
const assert = require("node:assert/strict");
const io = require("../io-utils.js");

test("buildGeneratorPresetBundle creates a deep-cloned export payload", function () {
  const presets = [
    { id: "preset-1", name: "Warmup", pinned: true, notes: "keeps notes" },
    { id: "preset-2", name: "Lead", pinned: false, notes: "another note" },
  ];
  const bundle = io.buildGeneratorPresetBundle(presets, "2026-01-02T03:04:05.000Z");

  assert.equal(bundle.version, 1);
  assert.equal(bundle.exportedAt, "2026-01-02T03:04:05.000Z");
  assert.deepEqual(bundle.presets, presets);

  presets[0].name = "Mutated";
  assert.equal(bundle.presets[0].name, "Warmup");
});

test("extractGeneratorPresets normalizes and filters presets", function () {
  const bundle = {
    presets: [
      { id: "a", name: "A", notes: "alpha" },
      { id: "b", name: "B", notes: "beta" },
      { name: "missing id" },
    ],
  };

  const imported = io.extractGeneratorPresets(bundle, function (preset) {
    if (!preset.id) {
      return null;
    }
    return { id: preset.id, title: preset.name, notes: preset.notes };
  });

  assert.deepEqual(imported, [
    { id: "a", title: "A", notes: "alpha" },
    { id: "b", title: "B", notes: "beta" },
  ]);
});

test("parseJsonText parses valid JSON and throws on invalid JSON", function () {
  const parsed = io.parseJsonText('{"ok":true,"count":2}');
  assert.deepEqual(parsed, { ok: true, count: 2 });

  assert.throws(function () {
    io.parseJsonText("not-json");
  });
});


test("extractGeneratorPresets returns cloned entries so source bundle is not mutated", function () {
  const bundle = {
    presets: [{ id: "keep", name: "Original" }],
  };

  const imported = io.extractGeneratorPresets(bundle, function (preset) {
    preset.name = "Changed in mapper";
    return preset;
  });

  assert.equal(imported[0].name, "Changed in mapper");
  assert.equal(bundle.presets[0].name, "Original");
});

test("deepClone returns structurally equal but detached objects", function () {
  const source = { id: "x", nested: { arr: [1, 2, 3] } };
  const cloned = io.deepClone(source);

  assert.deepEqual(cloned, source);
  cloned.nested.arr.push(4);
  assert.deepEqual(source.nested.arr, [1, 2, 3]);
});
