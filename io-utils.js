(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MozartIO = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  function toPrettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function parseJsonText(text) {
    return JSON.parse(String(text));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildGeneratorPresetBundle(presets, exportedAt) {
    return {
      version: 1,
      exportedAt: exportedAt || new Date().toISOString(),
      presets: Array.isArray(presets)
        ? presets.map(function (preset) {
            return deepClone(preset);
          })
        : [],
    };
  }

  function extractGeneratorPresets(bundle, normalizePreset) {
    if (!bundle || !Array.isArray(bundle.presets)) {
      return [];
    }
    const mapper = typeof normalizePreset === "function" ? normalizePreset : function (value) { return value; };
    return bundle.presets
      .map(function (preset) {
        return mapper(deepClone(preset));
      })
      .filter(Boolean);
  }

  return {
    toPrettyJson: toPrettyJson,
    parseJsonText: parseJsonText,
    deepClone: deepClone,
    buildGeneratorPresetBundle: buildGeneratorPresetBundle,
    extractGeneratorPresets: extractGeneratorPresets,
  };
});
