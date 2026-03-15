(function () {
  const core = window.MozartCore;
  const STORAGE_KEY = "project-mozart-state-v1";
  const MAX_UNDO_STACK = 40;
  const MAX_MORPH_TRAIL = 6;
  const audioState = {
    context: null,
    voices: [],
  };
  const interactionState = {
    checkpoints: {},
    phraseDrag: null,
    phraseDragAutoScrollRAF: null,
    phraseDragAutoScrollSpeed: 0,
    phraseDragAutoScrollSpeedX: 0,
    lastGeneratorMode: null,
    generatorModeHintUntil: 0,
    dismissGeneratorModeHint: false,
    muteGeneratorModeHintsSession: false,
  };
  const GENERATION_MODE_LABELS = {
    new: "新 Motif",
    variation: "局部变体",
    continuation: "续写后半句",
    response: "回答句",
    tail: "收尾句",
    cadence: "终止句",
  };
  const GENERATION_MODE_PREVIEWS = {
    new: {
      family: "Build",
      tagline: "从零起句，重心均衡，适合开新方向。",
      contour: [0.35, 0.52, 0.62, 0.48, 0.68, 0.58],
      traits: ["新主题", "中等开放", "允许惊喜扩展"],
    },
    variation: {
      family: "Morph",
      tagline: "保留原型轮廓，只在局部做偏移和装饰。",
      contour: [0.45, 0.5, 0.56, 0.5, 0.6, 0.54],
      traits: ["贴近原句", "局部改写", "适合 sequence"],
    },
    continuation: {
      family: "Extend",
      tagline: "承接现有前半句，把逻辑往后推进。",
      contour: [0.42, 0.46, 0.55, 0.62, 0.66, 0.7],
      traits: ["后半续写", "方向延伸", "尾部仍开放"],
    },
    response: {
      family: "Reply",
      tagline: "保留呼应感，但不急着完全落地。",
      contour: [0.62, 0.57, 0.5, 0.54, 0.46, 0.4],
      traits: ["呼应原句", "轻微回摆", "保留后续空间"],
    },
    tail: {
      family: "Release",
      tagline: "明显收束和释放，适合把段落往下带。",
      contour: [0.7, 0.62, 0.56, 0.48, 0.38, 0.28],
      traits: ["下降释放", "更像句尾", "惊喜集中在连接处"],
    },
    cadence: {
      family: "Land",
      tagline: "强终止感，优先落到稳定 chord tone。",
      contour: [0.68, 0.58, 0.46, 0.36, 0.24, 0.16],
      traits: ["稳定落点", "结束感最强", "适合段落终止"],
    },
  };
  const GENERATION_FORM_LABELS = {
    auto: "自动",
    "a-b": "A -> B",
    "a-b-release": "A -> B -> Release",
    "a-a1-b-tag": "A -> A' -> B -> Tag",
    "statement-sequence-release": "Statement -> Sequence -> Release",
    "echo-answer": "Echo -> Answer",
    "setup-answer-tag": "Setup -> Answer -> Tag",
    "release-tail": "Release -> Tail",
    "approach-cadence": "Approach -> Cadence",
    cadence: "Cadence",
  };
  const GENERATION_CELL_LABELS = {
    auto: "自动",
    "third-weave-up": "Third Weave Up",
    "step-crest": "Step Crest",
    "pendulum-climb": "Pendulum Climb",
    "neighbor-bloom": "Neighbor Bloom",
    "answer-fall": "Answer Fall",
    "arc-return": "Arc Return",
    "skip-sequence": "Skip Sequence",
    "release-turn": "Release Turn",
  };
  const GENERATION_SURPRISE_ZONE_LABELS = {
    auto: "自动",
    balanced: "均匀分布",
    middle: "中段发展",
    ending: "句尾连接",
    opening: "起句点火",
    minimal: "尽量克制",
  };
  const GENERATION_CADENCE_TARGET_LABELS = {
    auto: "自动（主音/五度）",
    root: "主音",
    third: "三度",
    fifth: "五度",
    color: "色彩音（二度/六度）",
  };
  const MORPH_MODE_LABELS = {
    "a-heavy": "A-heavy",
    balanced: "Balanced",
    "b-heavy": "B-heavy",
  };
  const MOTIF_PROVENANCE_LABELS = {
    generator: "Generator",
    pattern: "Hand-saved Pattern",
    history: "History Snapshot",
    "morph-trail": "Morph Trail",
    "motif-derived": "Derived from Motif",
    legacy: "Legacy Motif",
  };

  let state = normalizeState(loadState() || createInitialState());

  const elements = {
    viewMode: document.getElementById("viewMode"),
    composeView: document.getElementById("composeView"),
    practiceView: document.getElementById("practiceView"),
    instrumentSelect: document.getElementById("instrumentSelect"),
    rootSelect: document.getElementById("rootSelect"),
    modeSelect: document.getElementById("modeSelect"),
    signatureSelect: document.getElementById("signatureSelect"),
    gridSelect: document.getElementById("gridSelect"),
    bpmInput: document.getElementById("bpmInput"),
    bpmValue: document.getElementById("bpmValue"),
    customInstrumentName: document.getElementById("customInstrumentName"),
    customInstrumentMin: document.getElementById("customInstrumentMin"),
    customInstrumentMax: document.getElementById("customInstrumentMax"),
    customInstrumentWave: document.getElementById("customInstrumentWave"),
    addInstrumentBtn: document.getElementById("addInstrumentBtn"),
    instrumentCount: document.getElementById("instrumentCount"),
    instrumentLibrary: document.getElementById("instrumentLibrary"),
    applyModeMaskBtn: document.getElementById("applyModeMaskBtn"),
    pitchClassGrid: document.getElementById("pitchClassGrid"),
    densityInput: document.getElementById("densityInput"),
    densityValue: document.getElementById("densityValue"),
    maxLeapInput: document.getElementById("maxLeapInput"),
    maxLeapValue: document.getElementById("maxLeapValue"),
    repeatRateInput: document.getElementById("repeatRateInput"),
    repeatRateValue: document.getElementById("repeatRateValue"),
    surpriseInput: document.getElementById("surpriseInput"),
    surpriseValue: document.getElementById("surpriseValue"),
    tensionCurveSelect: document.getElementById("tensionCurveSelect"),
    generationModeSelect: document.getElementById("generationModeSelect"),
    generationFormLockSelect: document.getElementById("generationFormLockSelect"),
    generationCellLockSelect: document.getElementById("generationCellLockSelect"),
    generationSurpriseZoneSelect: document.getElementById("generationSurpriseZoneSelect"),
    generationCadenceTargetSelect: document.getElementById("generationCadenceTargetSelect"),
    generationCadenceTargetControl: document.getElementById("generationCadenceTargetControl"),
    generatorPresetSelect: document.getElementById("generatorPresetSelect"),
    generatorPresetSearchInput: document.getElementById("generatorPresetSearchInput"),
    generatorPresetTagFilter: document.getElementById("generatorPresetTagFilter"),
    generatorPresetQuickTags: document.getElementById("generatorPresetQuickTags"),
    saveGeneratorPresetBtn: document.getElementById("saveGeneratorPresetBtn"),
    applyGeneratorPresetBtn: document.getElementById("applyGeneratorPresetBtn"),
    duplicateGeneratorPresetBtn: document.getElementById("duplicateGeneratorPresetBtn"),
    editGeneratorPresetBtn: document.getElementById("editGeneratorPresetBtn"),
    pinGeneratorPresetBtn: document.getElementById("pinGeneratorPresetBtn"),
    overwriteGeneratorPresetBtn: document.getElementById("overwriteGeneratorPresetBtn"),
    deleteGeneratorPresetBtn: document.getElementById("deleteGeneratorPresetBtn"),
    exportGeneratorPresetsBtn: document.getElementById("exportGeneratorPresetsBtn"),
    importGeneratorPresetsBtn: document.getElementById("importGeneratorPresetsBtn"),
    importGeneratorPresetsInput: document.getElementById("importGeneratorPresetsInput"),
    generatorPresetSummary: document.getElementById("generatorPresetSummary"),
    generatorPresetNotes: document.getElementById("generatorPresetNotes"),
    generatorPresetDiff: document.getElementById("generatorPresetDiff"),
    generatorSelectionStatus: document.getElementById("generatorSelectionStatus"),
    generateBtn: document.getElementById("generateBtn"),
    humanizeBtn: document.getElementById("humanizeBtn"),
    reversePatternBtn: document.getElementById("reversePatternBtn"),
    stretchPatternBtn: document.getElementById("stretchPatternBtn"),
    generationSummary: document.getElementById("generationSummary"),
    generationModeHint: document.getElementById("generationModeHint"),
    alwaysShowModeHintsInput: document.getElementById("alwaysShowModeHintsInput"),
    dismissModeHintBtn: document.getElementById("dismissModeHintBtn"),
    muteModeHintsSessionInput: document.getElementById("muteModeHintsSessionInput"),
    generationModePreview: document.getElementById("generationModePreview"),
    logicFormLabel: document.getElementById("logicFormLabel"),
    generationBlocks: document.getElementById("generationBlocks"),
    generatorSelectionLabel: document.getElementById("generatorSelectionLabel"),
    duplicatePatternBtn: document.getElementById("duplicatePatternBtn"),
    clearPatternBtn: document.getElementById("clearPatternBtn"),
    saveMotifBtn: document.getElementById("saveMotifBtn"),
    patternTitle: document.getElementById("patternTitle"),
    patternSubtitle: document.getElementById("patternSubtitle"),
    pitchLabels: document.getElementById("pitchLabels"),
    sequencerGrid: document.getElementById("sequencerGrid"),
    selectedNoteLabel: document.getElementById("selectedNoteLabel"),
    noteDurationInput: document.getElementById("noteDurationInput"),
    noteDurationValue: document.getElementById("noteDurationValue"),
    noteVelocityInput: document.getElementById("noteVelocityInput"),
    noteVelocityValue: document.getElementById("noteVelocityValue"),
    noteOffsetInput: document.getElementById("noteOffsetInput"),
    noteOffsetValue: document.getElementById("noteOffsetValue"),
    noteArticulationSelect: document.getElementById("noteArticulationSelect"),
    deleteNoteBtn: document.getElementById("deleteNoteBtn"),
    transposeUpBtn: document.getElementById("transposeUpBtn"),
    transposeDownBtn: document.getElementById("transposeDownBtn"),
    phraseTimeline: document.getElementById("phraseTimeline"),
    phraseSnapshotPanel: document.getElementById("phraseSnapshotPanel"),
    phraseSnapshotDiff: document.getElementById("phraseSnapshotDiff"),
    phraseMorphTrail: document.getElementById("phraseMorphTrail"),
    phraseLoopCountSelect: document.getElementById("phraseLoopCountSelect"),
    playPhraseSelectionBtn: document.getElementById("playPhraseSelectionBtn"),
    playPhraseLoopBtn: document.getElementById("playPhraseLoopBtn"),
    clearPhraseBtn: document.getElementById("clearPhraseBtn"),
    motifNameInput: document.getElementById("motifNameInput"),
    motifTagsInput: document.getElementById("motifTagsInput"),
    motifDifficultySelect: document.getElementById("motifDifficultySelect"),
    motifStyleInput: document.getElementById("motifStyleInput"),
    motifProvenanceFilter: document.getElementById("motifProvenanceFilter"),
    motifStyleFilter: document.getElementById("motifStyleFilter"),
    motifDifficultyFilter: document.getElementById("motifDifficultyFilter"),
    motifFilterSummary: document.getElementById("motifFilterSummary"),
    clearMotifFiltersBtn: document.getElementById("clearMotifFiltersBtn"),
    motifLibrary: document.getElementById("motifLibrary"),
    motifCount: document.getElementById("motifCount"),
    practiceModeSelect: document.getElementById("practiceModeSelect"),
    practiceDifficultyInput: document.getElementById("practiceDifficultyInput"),
    practiceDifficultyValue: document.getElementById("practiceDifficultyValue"),
    practiceLoopsInput: document.getElementById("practiceLoopsInput"),
    practiceLoopsValue: document.getElementById("practiceLoopsValue"),
    practiceTempoLiftInput: document.getElementById("practiceTempoLiftInput"),
    practiceTempoLiftValue: document.getElementById("practiceTempoLiftValue"),
    buildPracticeBtn: document.getElementById("buildPracticeBtn"),
    playPracticeBtn: document.getElementById("playPracticeBtn"),
    practiceSummary: document.getElementById("practiceSummary"),
    practiceList: document.getElementById("practiceList"),
    playPatternBtn: document.getElementById("playPatternBtn"),
    playPhraseBtn: document.getElementById("playPhraseBtn"),
    stopPlaybackBtn: document.getElementById("stopPlaybackBtn"),
    exportMidiBtn: document.getElementById("exportMidiBtn"),
    exportProjectBtn: document.getElementById("exportProjectBtn"),
    importProjectBtn: document.getElementById("importProjectBtn"),
    importProjectInput: document.getElementById("importProjectInput"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    stateStatus: document.getElementById("stateStatus"),
    resetProjectBtn: document.getElementById("resetProjectBtn"),
    historyCount: document.getElementById("historyCount"),
    historyList: document.getElementById("historyList"),
    phraseInspector: document.getElementById("phraseInspector"),
    phraseSelectionLabel: document.getElementById("phraseSelectionLabel"),
    motifSearchInput: document.getElementById("motifSearchInput"),
  };

  hydrateControls();
  bindEvents();
  render();

  function createInitialState() {
    const instrument = core.deepClone(core.INSTRUMENT_PRESETS[0]);
    const scale = core.createScaleDefinition(7, "dorian");
    const pattern = core.generatePattern({
      pattern: core.createEmptyPattern({ name: "Starter Groove", grid: 16 }),
      scaleDefinition: scale,
      instrumentProfile: instrument,
      density: 0.52,
      maxLeap: 5,
      repeatRate: 0.5,
      surprise: 0.24,
      tensionCurve: "arc",
      mode: "new",
    });
    const starterMotif = core.createMotifFromPattern(pattern, {
      name: "Starter Glide",
      tags: ["dorian", "airy"],
      difficulty: 2,
      style: "lyrical",
      provenance: "generator",
    });
    const phrase = core.createEmptyPhraseSequence();
    core.addMotifToPhrase(phrase, starterMotif);
    return {
      viewMode: "compose",
      bpm: 96,
      instrumentId: instrument.id,
      instruments: core.deepClone(core.INSTRUMENT_PRESETS),
      scale: scale,
      pattern: pattern,
      selectedNoteId: pattern.notes[0] ? pattern.notes[0].id : null,
      motifLibrary: [starterMotif],
      phrase: phrase,
      phraseSelection: { start: null, end: null },
      phraseSnapshots: { a: null, b: null },
      phraseMorphMode: "balanced",
      phraseMorphTrail: [],
      phraseLoopCount: 4,
      generator: {
        density: 0.52,
        maxLeap: 5,
        repeatRate: 0.5,
        surprise: 0.24,
        tensionCurve: "arc",
        mode: "new",
        preferredFormId: "auto",
        preferredCellId: "auto",
        surpriseZone: "auto",
        cadenceTarget: "auto",
      },
      generatorPresets: [
        {
          id: core.createId("preset"),
          name: "Organic Dorian Builder",
          pinned: true,
          notes: "Balanced default for organic single-line exploration.",
          tags: ["build", "dorian", "organic"],
          instrumentId: instrument.id,
          scale: core.deepClone(scale),
          generator: {
            density: 0.52,
            maxLeap: 5,
            repeatRate: 0.5,
            surprise: 0.24,
            tensionCurve: "arc",
            mode: "new",
            preferredFormId: "auto",
            preferredCellId: "auto",
            surpriseZone: "auto",
            cadenceTarget: "auto",
          },
        },
      ],
      selectedGeneratorPresetId: null,
      generatorPresetSearch: "",
      generatorPresetTagFilter: "all",
      generatorBridgeHint: "",
      alwaysShowModeHints: false,
      history: [],
      motifSearch: "",
      motifFilters: {
        provenance: "all",
        style: "all",
        difficulty: "all",
      },
      undoStack: [],
      redoStack: [],
      practice: {
        mode: "progression",
        difficulty: 3,
        loops: 4,
        tempoLift: 10,
        pack: null,
      },
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function normalizeState(inputState) {
    const base = createInitialState();
    const next = Object.assign({}, base, inputState || {});
    next.generator = Object.assign({}, base.generator, inputState && inputState.generator ? inputState.generator : {});
    next.practice = Object.assign({}, base.practice, inputState && inputState.practice ? inputState.practice : {});
    next.history = Array.isArray(inputState && inputState.history) ? inputState.history : [];
    next.motifSearch = typeof (inputState && inputState.motifSearch) === "string" ? inputState.motifSearch : "";
    next.motifFilters = normalizeMotifFilters(inputState && inputState.motifFilters ? inputState.motifFilters : base.motifFilters);
    next.generatorPresets = normalizeGeneratorPresets(
      inputState && inputState.generatorPresets ? inputState.generatorPresets : base.generatorPresets
    );
    next.selectedGeneratorPresetId = normalizeGeneratorPresetId(
      inputState && inputState.selectedGeneratorPresetId ? inputState.selectedGeneratorPresetId : base.selectedGeneratorPresetId,
      next.generatorPresets
    );
    next.generatorPresetSearch = typeof (inputState && inputState.generatorPresetSearch) === "string" ? inputState.generatorPresetSearch : "";
    next.generatorPresetTagFilter = typeof (inputState && inputState.generatorPresetTagFilter) === "string" ? inputState.generatorPresetTagFilter : "all";
    next.generatorBridgeHint = typeof (inputState && inputState.generatorBridgeHint) === "string" ? inputState.generatorBridgeHint : "";
    next.alwaysShowModeHints = Boolean(inputState && inputState.alwaysShowModeHints);
    next.undoStack = [];
    next.redoStack = [];
    next.phraseLoopCount = Number(inputState && inputState.phraseLoopCount) || base.phraseLoopCount;
    next.motifLibrary = Array.isArray(inputState && inputState.motifLibrary)
      ? inputState.motifLibrary.map(normalizeMotifEntry)
      : base.motifLibrary;
    next.phrase = inputState && inputState.phrase && Array.isArray(inputState.phrase.blocks) ? inputState.phrase : base.phrase;
    next.phrase.blocks = next.phrase.blocks.map(normalizePhraseBlock);
    next.phraseSelection = normalizePhraseSelection(
      inputState && inputState.phraseSelection ? inputState.phraseSelection : base.phraseSelection,
      next.phrase.blocks.length
    );
    next.phraseSnapshots = normalizePhraseSnapshots(
      inputState && inputState.phraseSnapshots ? inputState.phraseSnapshots : base.phraseSnapshots
    );
    next.phraseMorphMode = MORPH_MODE_LABELS[inputState && inputState.phraseMorphMode] ? inputState.phraseMorphMode : base.phraseMorphMode;
    next.phraseMorphTrail = normalizePhraseMorphTrail(
      inputState && inputState.phraseMorphTrail ? inputState.phraseMorphTrail : base.phraseMorphTrail
    );
    if (!Array.isArray(next.instruments) || !next.instruments.length) {
      next.instruments = core.deepClone(core.INSTRUMENT_PRESETS);
    }
    if (!next.instrumentId) {
      next.instrumentId = next.instruments[0].id;
    }
    return next;
  }

  function normalizePhraseTransform(transform) {
    const normalized = Object.assign(
      { diatonicShift: 0, chromaticShift: 0, reverse: false, stretch: 1 },
      transform || {}
    );
    if (normalized.chromaticShift === 0 && normalized.transpose) {
      normalized.chromaticShift = normalized.transpose;
    }
    normalized.diatonicShift = Number(normalized.diatonicShift) || 0;
    normalized.chromaticShift = Number(normalized.chromaticShift) || 0;
    normalized.stretch = normalized.stretch === 2 ? 2 : 1;
    normalized.reverse = Boolean(normalized.reverse);
    delete normalized.transpose;
    return normalized;
  }

  function normalizePhraseBlock(block) {
    const relationMode = block && (block.relationMode === "frozen" || block.relationMode === "reference")
      ? block.relationMode
      : "reference";
    const frozenPattern = block && block.frozenPattern && Array.isArray(block.frozenPattern.notes)
      ? core.deepClone(block.frozenPattern)
      : null;
    return Object.assign({}, block, {
      relationMode: relationMode,
      frozenPattern: frozenPattern,
      transform: normalizePhraseTransform(block && block.transform),
    });
  }

  function normalizeMotifEntry(motif) {
    return Object.assign({}, motif, {
      provenance: MOTIF_PROVENANCE_LABELS[motif && motif.provenance] ? motif.provenance : "legacy",
    });
  }

  function normalizeMotifFilters(filters) {
    const next = Object.assign({ provenance: "all", style: "all", difficulty: "all" }, filters || {});
    return {
      provenance: MOTIF_PROVENANCE_LABELS[next.provenance] ? next.provenance : "all",
      style: typeof next.style === "string" && next.style ? next.style : "all",
      difficulty: ["all", "1", "2", "3", "4", "5"].includes(String(next.difficulty)) ? String(next.difficulty) : "all",
    };
  }

  function normalizePresetTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }
    return Array.from(new Set(tags
      .map(function (tag) {
        return String(tag || "").trim().toLowerCase();
      })
      .filter(Boolean)));
  }

  function derivePresetTagsFromState() {
    const modeTag = state.generator && state.generator.mode ? state.generator.mode : "new";
    const modeName = state.scale && state.scale.modeName ? state.scale.modeName : "";
    return normalizePresetTags([modeTag, modeName]);
  }

  function getGeneratorPresetTagOptions() {
    return Array.from(new Set(state.generatorPresets
      .reduce(function (all, preset) {
        return all.concat(Array.isArray(preset.tags) ? preset.tags : []);
      }, [])))
      .sort();
  }

  function getVisibleGeneratorPresets() {
    const query = (state.generatorPresetSearch || "").trim().toLowerCase();
    const tagFilter = state.generatorPresetTagFilter || "all";
    return state.generatorPresets.filter(function (preset) {
      const tags = Array.isArray(preset.tags) ? preset.tags : [];
      const matchesTag = tagFilter === "all" || tags.includes(tagFilter);
      if (!matchesTag) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [preset.name, preset.notes, tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function normalizeGeneratorPreset(preset) {
    if (!preset || !preset.generator || !preset.scale) {
      return null;
    }
    return {
      id: preset.id || core.createId("preset"),
      name: preset.name || "Generator Preset",
      pinned: Boolean(preset.pinned),
      notes: typeof preset.notes === "string" ? preset.notes : "",
      tags: normalizePresetTags(preset.tags),
      instrumentId: preset.instrumentId || null,
      scale: core.deepClone(preset.scale),
      generator: Object.assign(
        {
          density: 0.52,
          maxLeap: 5,
          repeatRate: 0.5,
          surprise: 0.24,
          tensionCurve: "arc",
          mode: "new",
          preferredFormId: "auto",
          preferredCellId: "auto",
          surpriseZone: "auto",
          cadenceTarget: "auto",
        },
        preset.generator
      ),
    };
  }

  function normalizeGeneratorPresets(presets) {
    if (!Array.isArray(presets)) {
      return [];
    }
    return sortGeneratorPresets(presets.map(normalizeGeneratorPreset).filter(Boolean));
  }

  function sortGeneratorPresets(presets) {
    return presets
      .slice()
      .sort(function (left, right) {
        if (Boolean(left.pinned) !== Boolean(right.pinned)) {
          return left.pinned ? -1 : 1;
        }
        return String(left.name).localeCompare(String(right.name));
      });
  }

  function normalizeGeneratorPresetId(presetId, presets) {
    if (!presetId) {
      return presets[0] ? presets[0].id : null;
    }
    return presets.some(function (preset) {
      return preset.id === presetId;
    })
      ? presetId
      : presets[0]
        ? presets[0].id
        : null;
  }

  function cloneImportedGeneratorPreset(preset) {
    const cloned = normalizeGeneratorPreset(preset);
    if (!cloned) {
      return null;
    }
    cloned.id = core.createId("preset");
    return cloned;
  }

  function normalizePhraseSelection(selection, blockCount) {
    const next = Object.assign({ start: null, end: null }, selection || {});
    if (next.start == null || next.end == null || blockCount <= 0) {
      return { start: null, end: null };
    }
    const start = core.clamp(Number(next.start), 0, blockCount - 1);
    const end = core.clamp(Number(next.end), 0, blockCount - 1);
    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
    };
  }

  function normalizePhraseSnapshot(snapshot) {
    if (!snapshot || !snapshot.sequence || !Array.isArray(snapshot.sequence.blocks)) {
      return null;
    }
    return {
      label: snapshot.label || "Untitled",
      savedAt: snapshot.savedAt || new Date().toISOString(),
      sequence: {
        id: snapshot.sequence.id || core.createId("phrase"),
        blocks: snapshot.sequence.blocks.map(normalizePhraseBlock),
      },
    };
  }

  function normalizePhraseSnapshots(snapshots) {
    const next = snapshots || {};
    return {
      a: normalizePhraseSnapshot(next.a),
      b: normalizePhraseSnapshot(next.b),
    };
  }

  function normalizePhraseMorphEntry(entry) {
    if (!entry || !entry.sequence || !Array.isArray(entry.sequence.blocks)) {
      return null;
    }
    return {
      id: entry.id || core.createId("morph"),
      label: entry.label || "Morph",
      notes: typeof entry.notes === "string" ? entry.notes : "",
      savedAt: entry.savedAt || new Date().toISOString(),
      mode: MORPH_MODE_LABELS[entry.mode] ? entry.mode : "balanced",
      pinned: Boolean(entry.pinned),
      sequence: {
        id: entry.sequence.id || core.createId("phrase"),
        blocks: entry.sequence.blocks.map(normalizePhraseBlock),
      },
    };
  }

  function sortPhraseMorphTrail(trail) {
    return trail
      .slice()
      .sort(function (left, right) {
        if (Boolean(left.pinned) !== Boolean(right.pinned)) {
          return left.pinned ? -1 : 1;
        }
        return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
      });
  }

  function normalizePhraseMorphTrail(trail) {
    if (!Array.isArray(trail)) {
      return [];
    }
    return sortPhraseMorphTrail(
      trail
      .map(normalizePhraseMorphEntry)
      .filter(Boolean)
    ).slice(0, MAX_MORPH_TRAIL);
  }

  function trimPhraseMorphTrail(trail) {
    const normalized = sortPhraseMorphTrail((trail || []).map(normalizePhraseMorphEntry).filter(Boolean));
    const pinned = normalized.filter(function (entry) {
      return entry.pinned;
    });
    const unpinned = normalized.filter(function (entry) {
      return !entry.pinned;
    });
    return pinned.concat(unpinned.slice(0, Math.max(0, MAX_MORPH_TRAIL - pinned.length)));
  }

  function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSerializableSnapshot(state)));
  }

  function createSerializableSnapshot(source) {
    const snapshot = core.deepClone(source);
    snapshot.undoStack = [];
    snapshot.redoStack = [];
    return snapshot;
  }

  function restoreState(nextState, options) {
    const opts = options || {};
    stopPlayback();
    state = normalizeState(nextState);
    state.undoStack = opts.undoStack || [];
    state.redoStack = opts.redoStack || [];
    hydrateControls();
    render();
  }

  function recordCheckpoint(label) {
    const snapshot = createSerializableSnapshot(state);
    snapshot.__label = label || "";
    state.undoStack.push(snapshot);
    if (state.undoStack.length > MAX_UNDO_STACK) {
      state.undoStack.shift();
    }
    state.redoStack = [];
  }

  function beginCheckpointSession(key, label) {
    if (interactionState.checkpoints[key]) {
      return;
    }
    interactionState.checkpoints[key] = true;
    recordCheckpoint(label);
  }

  function endCheckpointSession(key) {
    delete interactionState.checkpoints[key];
  }

  function registerInteractiveCheckpoint(element, key, label) {
    if (!element) {
      return;
    }
    element.addEventListener("pointerdown", function () {
      beginCheckpointSession(key, label);
    });
    element.addEventListener("keydown", function () {
      beginCheckpointSession(key, label);
    });
    element.addEventListener("change", function () {
      endCheckpointSession(key);
    });
    element.addEventListener("blur", function () {
      endCheckpointSession(key);
    });
  }

  function undo() {
    if (!state.undoStack.length) {
      return;
    }
    const undoStack = state.undoStack.slice();
    const redoStack = state.redoStack.slice();
    const previous = undoStack.pop();
    redoStack.push(createSerializableSnapshot(state));
    restoreState(previous, {
      undoStack: undoStack,
      redoStack: redoStack.slice(-MAX_UNDO_STACK),
    });
  }

  function redo() {
    if (!state.redoStack.length) {
      return;
    }
    const undoStack = state.undoStack.slice();
    const redoStack = state.redoStack.slice();
    const next = redoStack.pop();
    undoStack.push(createSerializableSnapshot(state));
    restoreState(next, {
      undoStack: undoStack.slice(-MAX_UNDO_STACK),
      redoStack: redoStack,
    });
  }

  function currentInstrument() {
    return (
      state.instruments.find(function (instrument) {
        return instrument.id === state.instrumentId;
      }) || state.instruments[0]
    );
  }

  function currentScale() {
    return state.scale;
  }

  function buildPhrasePattern() {
    return core.flattenPhraseSequence(state.phrase, state.motifLibrary, currentScale(), currentInstrument());
  }

  function buildPhrasePatternFromSequence(sequence) {
    return core.flattenPhraseSequence(sequence, state.motifLibrary, currentScale(), currentInstrument());
  }

  function buildPhrasePatternFromSelection() {
    const selection = normalizePhraseSelection(state.phraseSelection, state.phrase.blocks.length);
    if (selection.start == null) {
      return null;
    }
    const pattern = core.createEmptyPattern({ name: "Phrase Section", grid: 0 });
    let offset = 0;
    for (let blockIndex = selection.start; blockIndex <= selection.end; blockIndex += 1) {
      const blockPattern = buildPhraseBlockPattern(state.phrase.blocks[blockIndex]);
      if (!blockPattern) {
        continue;
      }
      blockPattern.notes.forEach(function (note) {
        const clone = core.deepClone(note);
        clone.id = core.createId("note");
        clone.startStep += offset;
        pattern.notes.push(clone);
      });
      offset += blockPattern.grid;
    }
    pattern.grid = Math.max(offset, 1);
    return core.ensureMonophonic(pattern);
  }

  function createPhraseSnapshot(slot, sequence, label) {
    const snapshotLabel = label || "Phrase " + slot.toUpperCase();
    state.phraseSnapshots[slot] = {
      label: snapshotLabel,
      savedAt: new Date().toISOString(),
      sequence: core.deepClone(sequence || state.phrase),
    };
  }

  function summarizePhraseSequence(sequence) {
    const pattern = buildPhrasePatternFromSequence(sequence);
    const uniquePcs = new Set(
      pattern.notes.map(function (note) {
        return note.pitch.pc;
      })
    );
    const blockLabels = sequence.blocks.map(function (block) {
      return block.motifName;
    });
    const lastNote = pattern.notes.length ? pattern.notes[pattern.notes.length - 1] : null;
    return {
      pattern: pattern,
      blockCount: sequence.blocks.length,
      stepCount: pattern.grid,
      noteCount: pattern.notes.length,
      pitchClassCount: uniquePcs.size,
      lastLabel: lastNote ? core.pitchSpecToLabel(lastNote.pitch) : "None",
      blockLabels: blockLabels,
    };
  }

  function getNormalizedBlock(sequence, position, total) {
    if (!sequence.blocks.length) {
      return null;
    }
    if (total <= 1) {
      return sequence.blocks[0];
    }
    const ratio = position / Math.max(total - 1, 1);
    const index = Math.round(ratio * (sequence.blocks.length - 1));
    return sequence.blocks[core.clamp(index, 0, sequence.blocks.length - 1)];
  }

  function mergePhraseBlocks(primaryBlock, secondaryBlock, slotLabel, morphMode) {
    const primary = primaryBlock || secondaryBlock;
    const secondary = secondaryBlock || primaryBlock;
    const blendMap = {
      "a-heavy": 0.25,
      balanced: 0.5,
      "b-heavy": 0.75,
    };
    const blend = blendMap[morphMode] == null ? 0.5 : blendMap[morphMode];
    const merged = core.deepClone(primary);
    const favored = blend >= 0.5 ? secondary : primary;
    merged.id = core.createId("block");
    merged.motifId = favored.motifId;
    merged.motifName = favored.motifName;
    merged.transform = {
      diatonicShift: Math.round((primary.transform.diatonicShift || 0) * (1 - blend) + (secondary.transform.diatonicShift || 0) * blend),
      chromaticShift: Math.round((primary.transform.chromaticShift || 0) * (1 - blend) + (secondary.transform.chromaticShift || 0) * blend),
      reverse:
        slotLabel === "pivot"
          ? blend >= 0.5
            ? secondary.transform.reverse || primary.transform.reverse
            : primary.transform.reverse || secondary.transform.reverse
          : favored.transform.reverse,
      stretch: blend >= 0.5 ? Math.max(secondary.transform.stretch || 1, primary.transform.stretch || 1) : Math.max(primary.transform.stretch || 1, secondary.transform.stretch || 1),
    };
    return merged;
  }

  function createMorphPhraseSequence(sequenceA, sequenceB, morphMode) {
    const length = Math.max(sequenceA.blocks.length, sequenceB.blocks.length);
    const hybrid = core.createEmptyPhraseSequence();
    if (!length) {
      return hybrid;
    }
    for (let index = 0; index < length; index += 1) {
      const blockA = getNormalizedBlock(sequenceA, index, length);
      const blockB = getNormalizedBlock(sequenceB, index, length);
      let block = null;
      if (index === 0) {
        block = mergePhraseBlocks(blockA, blockB, "head", morphMode);
      } else if (index === length - 1) {
        block = morphMode === "a-heavy"
          ? mergePhraseBlocks(blockA, blockB, "tail", morphMode)
          : mergePhraseBlocks(blockB, blockA, "tail", morphMode);
      } else if (index % 2 === 0 || morphMode === "a-heavy") {
        block = mergePhraseBlocks(blockA, blockB, "pivot", morphMode);
      } else {
        block = mergePhraseBlocks(blockB, blockA, "pivot", morphMode);
      }
      hybrid.blocks.push(block);
    }
    return hybrid;
  }

  function commitCurrentMorph(sequence, morphMode) {
    const mode = MORPH_MODE_LABELS[morphMode] ? morphMode : "balanced";
    state.phraseMorphTrail.unshift({
      id: core.createId("morph"),
      label: "Morph " + MORPH_MODE_LABELS[mode],
      notes: "",
      savedAt: new Date().toISOString(),
      mode: mode,
      pinned: false,
      sequence: core.deepClone(sequence),
    });
    state.phraseMorphTrail = trimPhraseMorphTrail(state.phraseMorphTrail);
  }

  function updateMorphTrailEntry(entryId, updater) {
    state.phraseMorphTrail = trimPhraseMorphTrail(
      state.phraseMorphTrail.map(function (entry) {
        if (entry.id !== entryId) {
          return entry;
        }
        return normalizePhraseMorphEntry(updater(core.deepClone(entry)));
      })
    );
  }

  function createMotifFromMorphEntry(entry, pattern) {
    const summaryPattern = pattern || buildPhrasePatternFromSequence(entry.sequence);
    const tags = ["morph", entry.mode];
    if (entry.pinned) {
      tags.push("pinned");
    }
    return core.createMotifFromPattern(summaryPattern, {
      name: entry.label,
      tags: Array.from(new Set(tags)),
      difficulty: core.clamp(entry.sequence.blocks.length || 1, 1, 5),
      style: "morph-" + entry.mode,
      recommendedUse: entry.notes || "morph trail",
      provenance: "morph-trail",
    });
  }

  function isSameTransform(left, right) {
    const a = normalizePhraseTransform(left);
    const b = normalizePhraseTransform(right);
    return (
      a.diatonicShift === b.diatonicShift &&
      a.chromaticShift === b.chromaticShift &&
      a.reverse === b.reverse &&
      a.stretch === b.stretch
    );
  }

  function getBlockDiffKind(referenceBlock, currentBlock) {
    if (referenceBlock && currentBlock) {
      if (referenceBlock.motifId === currentBlock.motifId && isSameTransform(referenceBlock.transform, currentBlock.transform)) {
        return "same";
      }
      if (referenceBlock.motifId === currentBlock.motifId) {
        return "shifted";
      }
      return "replaced";
    }
    if (referenceBlock) {
      return "removed";
    }
    return "added";
  }

  function labelBlockDiff(kind, referenceBlock, currentBlock) {
    const currentName = currentBlock ? currentBlock.motifName : "None";
    const referenceName = referenceBlock ? referenceBlock.motifName : "None";
    if (kind === "same") {
      return referenceName;
    }
    if (kind === "shifted") {
      return currentName + " tweaked";
    }
    if (kind === "replaced") {
      return referenceName + " -> " + currentName;
    }
    if (kind === "removed") {
      return referenceName + " removed";
    }
    return currentName + " added";
  }

  function summarizeMorphDiff(referenceSequence, currentSequence) {
    const current = currentSequence || core.createEmptyPhraseSequence();
    const length = Math.max(referenceSequence.blocks.length, current.blocks.length);
    const items = [];
    const counts = {
      same: 0,
      shifted: 0,
      replaced: 0,
      added: 0,
      removed: 0,
    };
    for (let index = 0; index < length; index += 1) {
      const referenceBlock = referenceSequence.blocks[index] || null;
      const currentBlock = current.blocks[index] || null;
      const kind = getBlockDiffKind(referenceBlock, currentBlock);
      counts[kind] += 1;
      items.push({
        index: index,
        kind: kind,
        label: labelBlockDiff(kind, referenceBlock, currentBlock),
      });
    }
    return {
      counts: counts,
      items: items,
    };
  }

  function renderPhraseSnapshots() {
    elements.phraseSnapshotPanel.innerHTML = "";
    const template = document.getElementById("phraseSnapshotTemplate");
    ["a", "b"].forEach(function (slot) {
      const snapshot = state.phraseSnapshots[slot];
      const summary = snapshot ? summarizePhraseSequence(snapshot.sequence) : null;
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".phrase-snapshot-name").textContent = "Snapshot " + slot.toUpperCase();
      item.querySelector(".phrase-snapshot-badge").textContent = snapshot ? "Ready" : "Empty";
      item.querySelector(".phrase-snapshot-meta").textContent = summary
        ? summary.blockCount +
          " blocks · " +
          summary.stepCount +
          " steps · " +
          new Date(snapshot.savedAt).toLocaleTimeString()
        : "Save the current phrase here for A/B comparison.";
      item.querySelector(".phrase-snapshot-preview").textContent = summary
        ? core.previewPattern(summary.pattern)
        : "No snapshot yet.";
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "save") {
            recordCheckpoint("Save phrase snapshot " + slot.toUpperCase());
            createPhraseSnapshot(slot);
          } else if (action === "play") {
            if (!snapshot) {
              return;
            }
            playPattern(summary.pattern, state.bpm);
            return;
          } else if (action === "load") {
            if (!snapshot) {
              return;
            }
            recordCheckpoint("Load phrase snapshot " + slot.toUpperCase());
            state.phrase = core.deepClone(snapshot.sequence);
            state.phraseSelection = { start: null, end: null };
          } else if (action === "clear") {
            if (!snapshot) {
              return;
            }
            recordCheckpoint("Clear phrase snapshot " + slot.toUpperCase());
            state.phraseSnapshots[slot] = null;
          }
          render();
        });
        if ((button.getAttribute("data-action") === "play" || button.getAttribute("data-action") === "load" || button.getAttribute("data-action") === "clear") && !snapshot) {
          button.disabled = true;
        }
      });
      elements.phraseSnapshotPanel.appendChild(item);
    });
  }

  function renderPhraseSnapshotDiff() {
    const snapshotA = state.phraseSnapshots.a;
    const snapshotB = state.phraseSnapshots.b;
    elements.phraseSnapshotDiff.innerHTML = "";
    elements.phraseSnapshotDiff.classList.toggle("empty", !(snapshotA && snapshotB));
    if (!(snapshotA && snapshotB)) {
      elements.phraseSnapshotDiff.innerHTML =
        "<strong>A/B Diff</strong><p class=\"phrase-diff-copy\">Save both Snapshot A and Snapshot B to see a direct phrase diff.</p>";
      return;
    }

    const summaryA = summarizePhraseSequence(snapshotA.sequence);
    const summaryB = summarizePhraseSequence(snapshotB.sequence);
    const morphSequence = createMorphPhraseSequence(snapshotA.sequence, snapshotB.sequence, state.phraseMorphMode);
    const morphSummary = summarizePhraseSequence(morphSequence);
    const blockDelta = summaryB.blockCount - summaryA.blockCount;
    const stepDelta = summaryB.stepCount - summaryA.stepCount;
    const noteDelta = summaryB.noteCount - summaryA.noteCount;
    const pcDelta = summaryB.pitchClassCount - summaryA.pitchClassCount;
    const sameEnding = summaryA.lastLabel === summaryB.lastLabel;
    const blockSequenceA = summaryA.blockLabels.join(" -> ") || "Empty";
    const blockSequenceB = summaryB.blockLabels.join(" -> ") || "Empty";

    elements.phraseSnapshotDiff.innerHTML =
      "<strong>A/B Diff</strong>" +
      '<p class="phrase-diff-copy">A 更适合保守复用，B 更适合扩展探索。下面是当前两版 phrase 的关键差异。</p>' +
      '<div class="phrase-diff-grid">' +
      '<div class="phrase-diff-metric"><strong>' + summaryA.blockCount + " / " + summaryB.blockCount + '</strong><span>Blocks (A/B)</span></div>' +
      '<div class="phrase-diff-metric"><strong>' + summaryA.stepCount + " / " + summaryB.stepCount + '</strong><span>Steps (A/B)</span></div>' +
      '<div class="phrase-diff-metric"><strong>' + summaryA.noteCount + " / " + summaryB.noteCount + '</strong><span>Notes (A/B)</span></div>' +
      '<div class="phrase-diff-metric"><strong>' + summaryA.pitchClassCount + " / " + summaryB.pitchClassCount + '</strong><span>Pitch Classes (A/B)</span></div>' +
      '<div class="phrase-diff-metric"><strong>' + (sameEnding ? "Same" : "Different") + '</strong><span>Ending Tone</span></div>' +
      "</div>" +
      '<div class="phrase-diff-row">' +
      '<p class="phrase-diff-copy">Delta: blocks ' + formatSigned(blockDelta) + " · steps " + formatSigned(stepDelta) + " · notes " + formatSigned(noteDelta) + " · pitch classes " + formatSigned(pcDelta) + "</p>" +
      '<p class="phrase-diff-copy">A: ' + blockSequenceA + "</p>" +
      '<p class="phrase-diff-copy">B: ' + blockSequenceB + "</p>" +
      '<p class="phrase-diff-copy">Ending: A ' + summaryA.lastLabel + " · B " + summaryB.lastLabel + "</p>" +
      '<p class="phrase-diff-copy">Morph (' + MORPH_MODE_LABELS[state.phraseMorphMode] + '): ' + morphSummary.blockCount + " blocks · " + morphSummary.stepCount + " steps · ending " + morphSummary.lastLabel + "</p>" +
      "</div>" +
      '<div class="button-row compact-actions phrase-diff-morph-modes">' +
      Object.keys(MORPH_MODE_LABELS)
        .map(function (mode) {
          return '<button data-action="set-morph-mode" data-mode="' + mode + '" class="' + (mode === state.phraseMorphMode ? "active" : "") + '">' + MORPH_MODE_LABELS[mode] + "</button>";
        })
        .join("") +
      "</div>" +
      '<div class="button-row compact-actions phrase-diff-actions">' +
      '<button data-action="play-morph">试听 Morph</button>' +
      '<button data-action="load-morph">载入 Morph</button>' +
      '<button data-action="commit-morph">Commit Morph</button>' +
      "</div>";
    elements.phraseSnapshotDiff.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.getAttribute("data-action");
        if (action === "set-morph-mode") {
          state.phraseMorphMode = button.getAttribute("data-mode") || "balanced";
          render();
          return;
        }
        if (action === "play-morph") {
          playPattern(morphSummary.pattern, state.bpm);
          return;
        }
        if (action === "load-morph") {
          recordCheckpoint("Load phrase morph");
          state.phrase = core.deepClone(morphSequence);
          state.phraseSelection = { start: null, end: null };
          render();
          return;
        }
        if (action === "commit-morph") {
          recordCheckpoint("Commit phrase morph");
          commitCurrentMorph(morphSequence, state.phraseMorphMode);
          render();
        }
      });
    });
  }

  function renderPhraseMorphTrail() {
    elements.phraseMorphTrail.innerHTML = "";
    elements.phraseMorphTrail.classList.toggle("empty", state.phraseMorphTrail.length === 0);
    if (!state.phraseMorphTrail.length) {
      elements.phraseMorphTrail.innerHTML =
        "<strong>Morph Trail</strong><p class=\"phrase-morph-trail-copy\">Commit Morph from the A/B diff panel to keep multiple in-between versions available for preview and branching.</p>";
      return;
    }

    const template = document.getElementById("phraseMorphTrailTemplate");
    const head = document.createElement("div");
    head.className = "phrase-morph-trail-head";
    const pinnedCount = state.phraseMorphTrail.filter(function (entry) {
      return entry.pinned;
    }).length;
    head.innerHTML =
      "<div><strong>Morph Trail</strong><p class=\"phrase-morph-trail-copy\">Committed morphs stay here even while you keep changing A, B, or the current phrase. Pinned entries stay at the top and are protected from trail rollover. (" +
      pinnedCount +
      " pinned)</p></div>" +
      '<div class="button-row compact-actions"><button data-action="clear-all">Clear Trail</button></div>';
    head.querySelector("button").addEventListener("click", function () {
      recordCheckpoint("Clear morph trail");
      state.phraseMorphTrail = [];
      render();
    });
    elements.phraseMorphTrail.appendChild(head);

    const list = document.createElement("div");
    list.className = "phrase-morph-trail-list";
    const currentPattern = buildPhrasePattern();
    sortPhraseMorphTrail(state.phraseMorphTrail).forEach(function (entry) {
      const summary = summarizePhraseSequence(entry.sequence);
      const diff = summarizeMorphDiff(entry.sequence, state.phrase);
      const item = template.content.firstElementChild.cloneNode(true);
      item.classList.toggle("pinned", Boolean(entry.pinned));
      item.querySelector(".phrase-morph-name").textContent = entry.label;
      item.querySelector(".phrase-morph-meta").textContent =
        (MORPH_MODE_LABELS[entry.mode] || entry.mode) +
        " | " +
        summary.blockCount +
        " blocks | " +
        summary.stepCount +
        " steps | " +
        new Date(entry.savedAt).toLocaleTimeString();
      item.querySelector(".phrase-morph-badge").textContent = entry.pinned
        ? "Pinned · " + (MORPH_MODE_LABELS[entry.mode] || entry.mode)
        : MORPH_MODE_LABELS[entry.mode] || entry.mode;
      item.querySelector(".phrase-morph-preview").textContent = core.previewPattern(summary.pattern);
      item.querySelector(".phrase-morph-notes").textContent = entry.notes
        ? "Note: " + entry.notes
        : "No notes yet. Use Edit to add a use-case or reminder.";
      item.querySelector(".phrase-morph-notes").classList.toggle("empty", !entry.notes);
      item.querySelector(".phrase-morph-diff-summary").textContent =
        "Vs current: " +
        diff.counts.same +
        " same | " +
        diff.counts.shifted +
        " shifted | " +
        diff.counts.replaced +
        " replaced | " +
        diff.counts.added +
        " added | " +
        diff.counts.removed +
        " removed";
      const lane = item.querySelector(".phrase-morph-diff-lane");
      diff.items.forEach(function (diffItem) {
        const chip = document.createElement("span");
        chip.className = "phrase-morph-diff-chip " + diffItem.kind;
        const indexBadge = document.createElement("span");
        indexBadge.className = "phrase-morph-diff-index";
        indexBadge.textContent = String(diffItem.index + 1);
        const label = document.createElement("span");
        label.textContent = diffItem.label;
        chip.appendChild(indexBadge);
        chip.appendChild(label);
        lane.appendChild(chip);
      });
      renderMiniRollOverlay(item.querySelector('[data-role="compare-roll"]'), summary.pattern, currentPattern);
      item.querySelectorAll("button").forEach(function (button) {
        if (button.getAttribute("data-action") === "pin") {
          button.textContent = entry.pinned ? "Unpin" : "Pin";
        }
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "edit") {
            const nextLabel = window.prompt("Rename this morph", entry.label);
            if (nextLabel == null) {
              return;
            }
            const nextNotes = window.prompt(
              "Add a short note for when or why to use this morph",
              entry.notes || ""
            );
            if (nextNotes == null) {
              return;
            }
            recordCheckpoint("Edit morph trail entry");
            updateMorphTrailEntry(entry.id, function (candidate) {
              candidate.label = nextLabel.trim() || candidate.label;
              candidate.notes = nextNotes.trim();
              return candidate;
            });
            render();
            return;
          }
          if (action === "pin") {
            recordCheckpoint((entry.pinned ? "Unpin " : "Pin ") + "morph trail entry");
            updateMorphTrailEntry(entry.id, function (candidate) {
              candidate.pinned = !candidate.pinned;
              return candidate;
            });
            render();
            return;
          }
          if (action === "play") {
            playPattern(summary.pattern, state.bpm);
            return;
          }
          if (action === "load") {
            recordCheckpoint("Load morph trail entry");
            state.phrase = core.deepClone(entry.sequence);
            state.phraseSelection = { start: null, end: null };
            render();
            return;
          }
          if (action === "motif") {
            recordCheckpoint("Create motif from morph trail");
            state.motifLibrary.unshift(createMotifFromMorphEntry(entry, summary.pattern));
            render();
            return;
          }
          if (action === "save-a" || action === "save-b") {
            const slot = action === "save-a" ? "a" : "b";
            recordCheckpoint("Save morph to snapshot " + slot.toUpperCase());
            createPhraseSnapshot(slot, entry.sequence, entry.label);
            render();
            return;
          }
          if (action === "delete") {
            recordCheckpoint("Delete morph trail entry");
            state.phraseMorphTrail = state.phraseMorphTrail.filter(function (candidate) {
              return candidate.id !== entry.id;
            });
            render();
          }
        });
      });
      list.appendChild(item);
    });
    elements.phraseMorphTrail.appendChild(list);
  }

  function formatSigned(value) {
    return value > 0 ? "+" + value : String(value);
  }

  function getPhraseBlockSourcePattern(block) {
    const motif = state.motifLibrary.find(function (item) {
      return item.id === block.motifId;
    }) || null;
    if (block.relationMode === "frozen" && block.frozenPattern && Array.isArray(block.frozenPattern.notes)) {
      return {
        pattern: core.deepClone(block.frozenPattern),
        motif: motif,
      };
    }
    if (!motif) {
      return {
        pattern: null,
        motif: null,
      };
    }
    return {
      pattern: core.deepClone(motif.sourcePattern),
      motif: motif,
    };
  }

  function setPhraseBlockRelationMode(block, mode) {
    if (!block) {
      return;
    }
    if (mode === "frozen") {
      const source = getPhraseBlockSourcePattern(Object.assign({}, block, { relationMode: "reference" }));
      if (!source.pattern) {
        return;
      }
      block.relationMode = "frozen";
      block.frozenPattern = core.deepClone(source.pattern);
      return;
    }
    block.relationMode = "reference";
    block.frozenPattern = null;
  }

  function refreshFrozenPhraseBlock(block) {
    if (!block || block.relationMode !== "frozen") {
      return;
    }
    const motif = state.motifLibrary.find(function (item) {
      return item.id === block.motifId;
    });
    if (!motif) {
      return;
    }
    block.frozenPattern = core.deepClone(motif.sourcePattern);
  }

  function buildPhraseBlockPattern(block) {
    const source = getPhraseBlockSourcePattern(block);
    if (!source.pattern) {
      return null;
    }
    return core.transformPattern(source.pattern, block.transform, currentScale(), currentInstrument());
  }

  function renderMiniRoll(target, pattern, options) {
    const opts = options || {};
    target.innerHTML = "";
    if (!pattern || !pattern.notes.length) {
      target.classList.add("empty");
      target.textContent = "No notes";
      return;
    }

    target.classList.remove("empty");
    target.textContent = "";
    const notes = pattern.notes
      .slice()
      .sort(function (a, b) {
        if (a.startStep !== b.startStep) {
          return a.startStep - b.startStep;
        }
        return core.pitchSpecToMidi(b.pitch) - core.pitchSpecToMidi(a.pitch);
      });
    const pitchValues = notes.map(function (note) {
      return core.pitchSpecToMidi(note.pitch);
    });
    const maxMidi = Math.max.apply(null, pitchValues);
    const minMidi = Math.min.apply(null, pitchValues);
    const rowCount = Math.max(1, maxMidi - minMidi + 1);
    const stepCount = Math.max(
      pattern.grid,
      notes.reduce(function (max, note) {
        return Math.max(max, note.startStep + note.durationSteps);
      }, 1)
    );

    target.style.gridTemplateColumns = "repeat(" + stepCount + ", minmax(0, 1fr))";
    target.style.gridTemplateRows = "repeat(" + rowCount + ", minmax(0, 1fr))";

    notes.forEach(function (note) {
      const midi = core.pitchSpecToMidi(note.pitch);
      const pill = document.createElement("span");
      pill.className = "phrase-mini-note" + (opts.ghost ? " ghost" : "");
      pill.style.gridColumn = note.startStep + 1 + " / span " + Math.max(1, note.durationSteps);
      pill.style.gridRow = maxMidi - midi + 1;
      target.appendChild(pill);
    });
  }

  function calculateRollMetrics(patterns) {
    const notePool = [];
    (patterns || []).forEach(function (pattern) {
      if (pattern && Array.isArray(pattern.notes) && pattern.notes.length) {
        pattern.notes.forEach(function (note) {
          notePool.push(note);
        });
      }
    });
    if (!notePool.length) {
      return null;
    }
    const pitchValues = notePool.map(function (note) {
      return core.pitchSpecToMidi(note.pitch);
    });
    const maxMidi = Math.max.apply(null, pitchValues);
    const minMidi = Math.min.apply(null, pitchValues);
    const stepCount = Math.max(
      1,
      notePool.reduce(function (max, note) {
        return Math.max(max, note.startStep + note.durationSteps);
      }, 1)
    );
    return {
      maxMidi: maxMidi,
      rowCount: Math.max(1, maxMidi - minMidi + 1),
      stepCount: stepCount,
    };
  }

  function renderMiniRollOverlay(target, referencePattern, currentPattern) {
    target.innerHTML = "";
    const metrics = calculateRollMetrics([referencePattern, currentPattern]);
    if (!metrics) {
      target.classList.add("empty");
      target.textContent = "No notes";
      return;
    }

    target.classList.remove("empty");
    target.textContent = "";
    target.style.gridTemplateColumns = "repeat(" + metrics.stepCount + ", minmax(0, 1fr))";
    target.style.gridTemplateRows = "repeat(" + metrics.rowCount + ", minmax(0, 1fr))";

    [
      { pattern: referencePattern, className: "compare-reference" },
      { pattern: currentPattern, className: "compare-current" },
    ].forEach(function (layer) {
      if (!layer.pattern || !Array.isArray(layer.pattern.notes)) {
        return;
      }
      layer.pattern.notes
        .slice()
        .sort(function (a, b) {
          if (a.startStep !== b.startStep) {
            return a.startStep - b.startStep;
          }
          return core.pitchSpecToMidi(a.pitch) - core.pitchSpecToMidi(b.pitch);
        })
        .forEach(function (note) {
          const midi = core.pitchSpecToMidi(note.pitch);
          const pill = document.createElement("span");
          pill.className = "phrase-mini-note " + layer.className;
          pill.style.gridColumn = note.startStep + 1 + " / span " + Math.max(1, note.durationSteps);
          pill.style.gridRow = metrics.maxMidi - midi + 1;
          target.appendChild(pill);
        });
    });
  }

  function hydrateMotifFilterControls() {
    const styles = Array.from(
      new Set(
        state.motifLibrary
          .map(function (motif) {
            return motif.style;
          })
          .filter(Boolean)
      )
    ).sort();
    elements.motifProvenanceFilter.innerHTML =
      '<option value="all">All Sources</option>' +
      Object.keys(MOTIF_PROVENANCE_LABELS)
        .filter(function (key) {
          return key !== "legacy";
        })
        .map(function (key) {
          return '<option value="' + key + '">' + MOTIF_PROVENANCE_LABELS[key] + "</option>";
        })
        .join("");
    elements.motifStyleFilter.innerHTML =
      '<option value="all">All Styles</option>' +
      styles
        .map(function (style) {
          return '<option value="' + style + '">' + style + "</option>";
        })
        .join("");
    elements.motifProvenanceFilter.value = state.motifFilters.provenance;
    elements.motifStyleFilter.value = styles.includes(state.motifFilters.style) ? state.motifFilters.style : "all";
    elements.motifDifficultyFilter.value = state.motifFilters.difficulty;
  }

  function renderGeneratorPresetQuickTags(tagOptions) {
    const tags = ["all"].concat(tagOptions || []);
    elements.generatorPresetQuickTags.innerHTML = tags
      .map(function (tag) {
        const active = (state.generatorPresetTagFilter || "all") === tag;
        const label = tag === "all" ? "全部" : ("#" + tag);
        return '<button type="button" class="quick-tag-chip' + (active ? ' active' : '') + '" data-tag="' + tag + '">' + label + '</button>';
      })
      .join('');
    elements.generatorPresetQuickTags.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        state.generatorPresetTagFilter = button.getAttribute('data-tag') || 'all';
        render();
      });
    });
  }

  function hydrateGeneratorPresetControls() {
    const visiblePresets = getVisibleGeneratorPresets();
    const tagOptions = getGeneratorPresetTagOptions();
    elements.generatorPresetTagFilter.innerHTML =
      '<option value="all">All Tags</option>' +
      tagOptions
        .map(function (tag) {
          return '<option value="' + tag + '">' + tag + '</option>';
        })
        .join('');
    elements.generatorPresetTagFilter.value = tagOptions.includes(state.generatorPresetTagFilter)
      ? state.generatorPresetTagFilter
      : 'all';
    state.generatorPresetTagFilter = elements.generatorPresetTagFilter.value;
    elements.generatorPresetSearchInput.value = state.generatorPresetSearch || "";
    renderGeneratorPresetQuickTags(tagOptions);

    elements.generatorPresetSelect.innerHTML = visiblePresets.length
      ? visiblePresets
          .map(function (preset) {
            const tags = Array.isArray(preset.tags) && preset.tags.length ? ' · #' + preset.tags.join(' #') : '';
            return '<option value="' + preset.id + '">' + (preset.pinned ? "★ " : "") + preset.name + tags + "</option>";
          })
          .join("")
      : '<option value="">No matching presets</option>';
    const selectedVisible = visiblePresets.some(function (preset) { return preset.id === state.selectedGeneratorPresetId; });
    state.selectedGeneratorPresetId = selectedVisible
      ? state.selectedGeneratorPresetId
      : (visiblePresets[0] ? visiblePresets[0].id : normalizeGeneratorPresetId(state.selectedGeneratorPresetId, state.generatorPresets));
    elements.generatorPresetSelect.value = state.selectedGeneratorPresetId || "";
    const hasAnyPresets = state.generatorPresets.length > 0;
    const hasVisiblePresets = visiblePresets.length > 0;
    elements.applyGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.duplicateGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.editGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.pinGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.overwriteGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.deleteGeneratorPresetBtn.disabled = !hasVisiblePresets;
    elements.exportGeneratorPresetsBtn.disabled = !hasAnyPresets;
    const preset = getSelectedGeneratorPreset();
    elements.pinGeneratorPresetBtn.textContent = preset && preset.pinned ? "Unpin" : "Pin";
  }

  function createGeneratorPresetFromState(name) {
    return {
      id: core.createId("preset"),
      name: name || "Generator Preset",
      pinned: false,
      notes: "",
      tags: derivePresetTagsFromState(),
      instrumentId: state.instrumentId,
      scale: core.deepClone(state.scale),
      generator: core.deepClone(state.generator),
    };
  }

  function duplicateGeneratorPreset(preset) {
    if (!preset) {
      return null;
    }
    const copy = normalizeGeneratorPreset(core.deepClone(preset));
    copy.id = core.createId("preset");
    copy.name = preset.name + " Copy";
    copy.pinned = false;
    return copy;
  }

  function getSelectedGeneratorPreset() {
    return state.generatorPresets.find(function (preset) {
      return preset.id === state.selectedGeneratorPresetId;
    }) || null;
  }

  function applyGeneratorPreset(preset) {
    if (!preset) {
      return;
    }
    state.generator = Object.assign({}, state.generator, core.deepClone(preset.generator));
    state.scale = core.deepClone(preset.scale);
    if (preset.instrumentId && state.instruments.some(function (instrument) { return instrument.id === preset.instrumentId; })) {
      state.instrumentId = preset.instrumentId;
      state.pattern = fitPatternForCurrentInstrument(state.pattern);
    }
  }

  function getCurrentGeneratorContext() {
    return {
      instrumentId: state.instrumentId,
      scale: core.deepClone(state.scale),
      generator: core.deepClone(state.generator),
    };
  }

  function getGeneratorPresetDiff(preset) {
    if (!preset) {
      return [];
    }
    const current = getCurrentGeneratorContext();
    const diffs = [];
    if (current.instrumentId !== preset.instrumentId) {
      diffs.push("Instrument");
    }
    if (current.scale.rootPc !== preset.scale.rootPc || current.scale.modeName !== preset.scale.modeName) {
      diffs.push("Scale");
    }
    [
      ["density", "Density"],
      ["maxLeap", "Max Leap"],
      ["repeatRate", "Repeat Rate"],
      ["surprise", "Surprise"],
      ["tensionCurve", "Curve"],
      ["mode", "Mode"],
      ["preferredFormId", "Form"],
      ["preferredCellId", "Cell"],
      ["surpriseZone", "Surprise Zone"],
      ["cadenceTarget", "Cadence Target"],
    ].forEach(function (pair) {
      const key = pair[0];
      const label = pair[1];
      if (String(current.generator[key]) !== String(preset.generator[key])) {
        diffs.push(label);
      }
    });
    return diffs;
  }

  function overwriteGeneratorPreset(presetId) {
    const nextPreset = createGeneratorPresetFromState(
      (state.generatorPresets.find(function (preset) {
        return preset.id === presetId;
      }) || {}).name || "Generator Preset"
    );
    state.generatorPresets = state.generatorPresets.map(function (preset) {
      if (preset.id !== presetId) {
        return preset;
      }
      nextPreset.id = preset.id;
      nextPreset.pinned = preset.pinned;
      nextPreset.notes = preset.notes;
      return nextPreset;
    });
    state.generatorPresets = sortGeneratorPresets(state.generatorPresets);
  }

  function toggleGeneratorPresetPin(presetId) {
    state.generatorPresets = sortGeneratorPresets(
      state.generatorPresets.map(function (preset) {
        if (preset.id !== presetId) {
          return preset;
        }
        return Object.assign({}, preset, {
          pinned: !preset.pinned,
        });
      })
    );
  }

  function updateGeneratorPreset(presetId, updater) {
    state.generatorPresets = sortGeneratorPresets(
      state.generatorPresets.map(function (preset) {
        if (preset.id !== presetId) {
          return preset;
        }
        return normalizeGeneratorPreset(updater(core.deepClone(preset)));
      })
    );
  }

  function exportGeneratorPresets() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: state.generatorPresets.map(function (preset) {
        return core.deepClone(preset);
      }),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project-mozart-generator-presets-" + Date.now() + ".json";
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  function importGeneratorPresets(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = Array.isArray(parsed && parsed.presets) ? parsed.presets.map(cloneImportedGeneratorPreset).filter(Boolean) : [];
        if (!imported.length) {
          throw new Error("No presets");
        }
        recordCheckpoint("Import generator presets");
        state.generatorPresets = sortGeneratorPresets(imported.concat(state.generatorPresets));
        state.selectedGeneratorPresetId = imported[0].id;
        hydrateControls();
        render();
      } catch (error) {
        window.alert("Preset import failed: invalid preset bundle.");
      } finally {
        elements.importGeneratorPresetsInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function fitPatternForCurrentInstrument(pattern) {
    return core.fitPatternToInstrument(pattern, currentInstrument(), currentScale());
  }

  function adoptPattern(pattern, options) {
    const opts = options || {};
    state.pattern = fitPatternForCurrentInstrument(core.deepClone(pattern));
    state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
    if (opts.viewMode) {
      state.viewMode = opts.viewMode;
      elements.viewMode.value = opts.viewMode;
    }
  }

  function hydrateControls() {
    elements.instrumentSelect.innerHTML = state.instruments
      .map(function (instrument) {
        return '<option value="' + instrument.id + '">' + instrument.name + "</option>";
      })
      .join("");
    elements.instrumentSelect.value = state.instrumentId;

    elements.rootSelect.innerHTML = core.NOTE_NAMES.map(function (name, index) {
      return '<option value="' + index + '">' + name + "</option>";
    }).join("");
    elements.rootSelect.value = String(state.scale.rootPc);

    elements.modeSelect.innerHTML = Object.keys(core.MODE_INTERVALS)
      .map(function (modeName) {
        return '<option value="' + modeName + '">' + modeName + "</option>";
      })
      .join("");
    elements.modeSelect.value = state.scale.modeName;
    elements.generationFormLockSelect.innerHTML = Object.keys(GENERATION_FORM_LABELS)
      .map(function (formId) {
        return '<option value="' + formId + '">' + GENERATION_FORM_LABELS[formId] + "</option>";
      })
      .join("");
    elements.generationCellLockSelect.innerHTML = Object.keys(GENERATION_CELL_LABELS)
      .map(function (cellId) {
        return '<option value="' + cellId + '">' + GENERATION_CELL_LABELS[cellId] + "</option>";
      })
      .join("");
    elements.generationSurpriseZoneSelect.innerHTML = Object.keys(GENERATION_SURPRISE_ZONE_LABELS)
      .map(function (zoneId) {
        return '<option value="' + zoneId + '">' + GENERATION_SURPRISE_ZONE_LABELS[zoneId] + "</option>";
      })
      .join("");
    elements.generationCadenceTargetSelect.innerHTML = Object.keys(GENERATION_CADENCE_TARGET_LABELS)
      .map(function (targetId) {
        return '<option value="' + targetId + '">' + GENERATION_CADENCE_TARGET_LABELS[targetId] + "</option>";
      })
      .join("");

    elements.signatureSelect.value = state.pattern.numerator + "/" + state.pattern.denominator;
    elements.gridSelect.value = String(state.pattern.grid);
    elements.bpmInput.value = String(state.bpm);
    elements.viewMode.value = state.viewMode;
    elements.phraseLoopCountSelect.value = String(state.phraseLoopCount || 4);

    elements.densityInput.value = String(state.generator.density);
    elements.maxLeapInput.value = String(state.generator.maxLeap);
    elements.repeatRateInput.value = String(state.generator.repeatRate);
    elements.surpriseInput.value = String(state.generator.surprise);
    elements.tensionCurveSelect.value = state.generator.tensionCurve;
    elements.generationModeSelect.value = state.generator.mode;
    elements.generationFormLockSelect.value = state.generator.preferredFormId || "auto";
    elements.generationCellLockSelect.value = state.generator.preferredCellId || "auto";
    elements.generationSurpriseZoneSelect.value = state.generator.surpriseZone || "auto";
    elements.generationCadenceTargetSelect.value = state.generator.cadenceTarget || "auto";
    updateGeneratorModeConditionalControls();
    elements.motifSearchInput.value = state.motifSearch || "";
    hydrateMotifFilterControls();
    hydrateGeneratorPresetControls();

    elements.alwaysShowModeHintsInput.checked = Boolean(state.alwaysShowModeHints);
    elements.muteModeHintsSessionInput.checked = Boolean(interactionState.muteGeneratorModeHintsSession);

    elements.practiceModeSelect.value = state.practice.mode;
    elements.practiceDifficultyInput.value = String(state.practice.difficulty);
    elements.practiceLoopsInput.value = String(state.practice.loops);
    elements.practiceTempoLiftInput.value = String(state.practice.tempoLift);
  }


  function updateGeneratorModeConditionalControls() {
    const showCadenceTarget = state.generator.mode === "cadence";
    if (elements.generationCadenceTargetControl) {
      elements.generationCadenceTargetControl.classList.toggle("hidden", !showCadenceTarget);
    }
    elements.generationCadenceTargetSelect.disabled = !showCadenceTarget;
  }

  function buildGeneratorModeContextHint(mode) {
    const cadenceVisibility = mode === "cadence"
      ? "Cadence 目标已显示，可指定落点音级。"
      : "Cadence 目标已隐藏，避免非终止模式干扰。";
    const preview = GENERATION_MODE_PREVIEWS[mode] || null;
    const tagline = preview ? preview.tagline : "";
    return (tagline ? tagline + " · " : "") + cadenceVisibility;
  }

  function bindEvents() {
    registerInteractiveCheckpoint(elements.bpmInput, "tempo", "Adjust tempo");
    registerInteractiveCheckpoint(elements.noteDurationInput, "note-duration", "Edit note duration");
    registerInteractiveCheckpoint(elements.noteVelocityInput, "note-velocity", "Edit note velocity");
    registerInteractiveCheckpoint(elements.noteOffsetInput, "note-offset", "Edit note pitch offset");
    registerInteractiveCheckpoint(elements.densityInput, "generator-density", "Adjust generator density");
    registerInteractiveCheckpoint(elements.maxLeapInput, "generator-max-leap", "Adjust max leap");
    registerInteractiveCheckpoint(elements.repeatRateInput, "generator-repeat-rate", "Adjust repeat rate");
    registerInteractiveCheckpoint(elements.surpriseInput, "generator-surprise", "Adjust surprise");
    registerInteractiveCheckpoint(elements.practiceDifficultyInput, "practice-difficulty", "Adjust practice difficulty");
    registerInteractiveCheckpoint(elements.practiceLoopsInput, "practice-loops", "Adjust practice loops");
    registerInteractiveCheckpoint(elements.practiceTempoLiftInput, "practice-tempo-lift", "Adjust practice tempo lift");

    elements.alwaysShowModeHintsInput.addEventListener("change", function () {
      state.alwaysShowModeHints = elements.alwaysShowModeHintsInput.checked;
      render();
    });

    elements.dismissModeHintBtn.addEventListener("click", function () {
      interactionState.dismissGeneratorModeHint = true;
      render();
    });

    elements.muteModeHintsSessionInput.addEventListener("change", function () {
      interactionState.muteGeneratorModeHintsSession = elements.muteModeHintsSessionInput.checked;
      render();
    });

    elements.viewMode.addEventListener("change", function () {
      state.viewMode = elements.viewMode.value;
      render();
    });

    elements.instrumentSelect.addEventListener("change", function () {
      recordCheckpoint("Change instrument");
      state.instrumentId = elements.instrumentSelect.value;
      state.pattern = fitPatternForCurrentInstrument(state.pattern);
      render();
    });

    elements.rootSelect.addEventListener("change", rebuildScaleFromControls);
    elements.modeSelect.addEventListener("change", function () {
      rebuildScaleFromControls(true);
    });
    elements.applyModeMaskBtn.addEventListener("click", function () {
      rebuildScaleFromControls(true);
    });

    elements.signatureSelect.addEventListener("change", function () {
      recordCheckpoint("Change signature");
      const parts = elements.signatureSelect.value.split("/");
      state.pattern.numerator = Number(parts[0]);
      state.pattern.denominator = Number(parts[1]);
      render();
    });

    elements.gridSelect.addEventListener("change", function () {
      recordCheckpoint("Change grid");
      state.pattern.grid = Number(elements.gridSelect.value);
      state.pattern.notes = state.pattern.notes.filter(function (note) {
        return note.startStep < state.pattern.grid;
      });
      state.pattern.notes.forEach(function (note) {
        note.durationSteps = core.clamp(note.durationSteps, 1, state.pattern.grid - note.startStep);
      });
      render();
    });

    elements.bpmInput.addEventListener("input", function () {
      state.bpm = Number(elements.bpmInput.value);
      render();
    });

    elements.addInstrumentBtn.addEventListener("click", function () {
      const name = elements.customInstrumentName.value.trim();
      if (!name) {
        return;
      }
      recordCheckpoint("Add instrument");
      const instrument = {
        id: core.createId("instrument"),
        name: name,
        minMidi: Number(elements.customInstrumentMin.value),
        maxMidi: Number(elements.customInstrumentMax.value),
        waveform: elements.customInstrumentWave.value,
        midiProgram: 81,
      };
      state.instruments.push(instrument);
      state.instrumentId = instrument.id;
      state.pattern = fitPatternForCurrentInstrument(state.pattern);
      hydrateControls();
      render();
    });

    elements.densityInput.addEventListener("input", syncGeneratorSettings);
    elements.maxLeapInput.addEventListener("input", syncGeneratorSettings);
    elements.repeatRateInput.addEventListener("input", syncGeneratorSettings);
    elements.surpriseInput.addEventListener("input", syncGeneratorSettings);
    elements.tensionCurveSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationModeSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationFormLockSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationCellLockSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationSurpriseZoneSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationCadenceTargetSelect.addEventListener("change", syncGeneratorSettings);
    elements.generatorPresetSelect.addEventListener("change", function () {
      state.selectedGeneratorPresetId = elements.generatorPresetSelect.value || null;
      render();
    });
    elements.generatorPresetSearchInput.addEventListener("input", function () {
      state.generatorPresetSearch = elements.generatorPresetSearchInput.value;
      hydrateGeneratorPresetControls();
      render();
    });
    elements.generatorPresetTagFilter.addEventListener("change", function () {
      state.generatorPresetTagFilter = elements.generatorPresetTagFilter.value;
      hydrateGeneratorPresetControls();
      render();
    });
    elements.saveGeneratorPresetBtn.addEventListener("click", function () {
      const suggestedName =
        core.NOTE_NAMES[state.scale.rootPc] +
        " " +
        state.scale.modeName +
        " " +
        (GENERATION_MODE_LABELS[state.generator.mode] || state.generator.mode);
      const name = window.prompt("Preset name", suggestedName);
      if (!name) {
        return;
      }
      recordCheckpoint("Save generator preset");
      const preset = createGeneratorPresetFromState(name.trim() || suggestedName);
      state.generatorPresets = sortGeneratorPresets([preset].concat(state.generatorPresets));
      state.selectedGeneratorPresetId = preset.id;
      hydrateControls();
      render();
    });
    elements.applyGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      recordCheckpoint("Apply generator preset");
      applyGeneratorPreset(preset);
      hydrateControls();
      render();
    });
    elements.duplicateGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      recordCheckpoint("Duplicate generator preset");
      const copy = duplicateGeneratorPreset(preset);
      if (!copy) {
        return;
      }
      state.generatorPresets = sortGeneratorPresets([copy].concat(state.generatorPresets));
      state.selectedGeneratorPresetId = copy.id;
      hydrateControls();
      render();
    });
    elements.editGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      const nextName = window.prompt("Preset name", preset.name);
      if (nextName == null) {
        return;
      }
      const nextNotes = window.prompt(
        "Preset notes",
        preset.notes || ""
      );
      if (nextNotes == null) {
        return;
      }
      const nextTags = window.prompt(
        "Preset tags (comma separated)",
        (preset.tags || []).join(", ")
      );
      if (nextTags == null) {
        return;
      }
      recordCheckpoint("Edit generator preset");
      updateGeneratorPreset(preset.id, function (candidate) {
        candidate.name = nextName.trim() || candidate.name;
        candidate.notes = nextNotes.trim();
        candidate.tags = normalizePresetTags(nextTags.split(","));
        return candidate;
      });
      hydrateControls();
      render();
    });
    elements.pinGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      recordCheckpoint((preset.pinned ? "Unpin " : "Pin ") + "generator preset");
      toggleGeneratorPresetPin(preset.id);
      hydrateControls();
      render();
    });
    elements.overwriteGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      recordCheckpoint("Overwrite generator preset");
      overwriteGeneratorPreset(preset.id);
      hydrateControls();
      render();
    });
    elements.deleteGeneratorPresetBtn.addEventListener("click", function () {
      const preset = getSelectedGeneratorPreset();
      if (!preset) {
        return;
      }
      recordCheckpoint("Delete generator preset");
      state.generatorPresets = state.generatorPresets.filter(function (entry) {
        return entry.id !== preset.id;
      });
      state.generatorPresets = sortGeneratorPresets(state.generatorPresets);
      state.selectedGeneratorPresetId = normalizeGeneratorPresetId(null, state.generatorPresets);
      hydrateControls();
      render();
    });
    elements.exportGeneratorPresetsBtn.addEventListener("click", function () {
      if (!state.generatorPresets.length) {
        return;
      }
      exportGeneratorPresets();
    });
    elements.importGeneratorPresetsBtn.addEventListener("click", function () {
      elements.importGeneratorPresetsInput.click();
    });
    elements.importGeneratorPresetsInput.addEventListener("change", importGeneratorPresets);
    elements.motifSearchInput.addEventListener("input", function () {
      state.motifSearch = elements.motifSearchInput.value;
      render();
    });
    elements.motifProvenanceFilter.addEventListener("change", function () {
      state.motifFilters.provenance = elements.motifProvenanceFilter.value;
      render();
    });
    elements.motifStyleFilter.addEventListener("change", function () {
      state.motifFilters.style = elements.motifStyleFilter.value;
      render();
    });
    elements.motifDifficultyFilter.addEventListener("change", function () {
      state.motifFilters.difficulty = elements.motifDifficultyFilter.value;
      render();
    });
    elements.clearMotifFiltersBtn.addEventListener("click", function () {
      state.motifSearch = "";
      state.motifFilters = normalizeMotifFilters();
      render();
    });

    elements.generateBtn.addEventListener("click", function () {
      recordCheckpoint("Generate pattern");
      state.pattern = core.generatePattern({
        pattern: core.createEmptyPattern({
          name: "Generated Pattern",
          grid: state.pattern.grid,
          numerator: state.pattern.numerator,
          denominator: state.pattern.denominator,
        }),
        sourcePattern: state.pattern.notes.length ? state.pattern : null,
        scaleDefinition: currentScale(),
        instrumentProfile: currentInstrument(),
        density: state.generator.density,
        maxLeap: state.generator.maxLeap,
        repeatRate: state.generator.repeatRate,
        surprise: state.generator.surprise,
        tensionCurve: state.generator.tensionCurve,
        mode: state.generator.mode,
        preferredFormId: state.generator.preferredFormId,
        preferredCellId: state.generator.preferredCellId,
        surpriseZone: state.generator.surpriseZone,
        cadenceTarget: state.generator.cadenceTarget,
      });
      pushHistory(state.pattern, "Generate");
      state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
      render();
    });

    elements.humanizeBtn.addEventListener("click", function () {
      recordCheckpoint("Humanize pattern");
      state.pattern = core.organicHumanize(state.pattern, currentScale());
      pushHistory(state.pattern, "Humanize");
      state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
      render();
    });

    elements.reversePatternBtn.addEventListener("click", function () {
      recordCheckpoint("Reverse pattern");
      state.pattern = core.reversePattern(state.pattern);
      pushHistory(state.pattern, "Reverse");
      state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
      render();
    });

    elements.stretchPatternBtn.addEventListener("click", function () {
      recordCheckpoint("Stretch pattern");
      state.pattern = core.stretchPattern(state.pattern, 2);
      pushHistory(state.pattern, "Stretch");
      elements.gridSelect.value = String(state.pattern.grid);
      render();
    });

    elements.clearPatternBtn.addEventListener("click", function () {
      recordCheckpoint("Clear pattern");
      state.pattern.notes = [];
      state.pattern.generationMeta = null;
      state.selectedNoteId = null;
      render();
    });

    elements.duplicatePatternBtn.addEventListener("click", function () {
      recordCheckpoint("Load phrase into pattern");
      const phrasePattern = buildPhrasePattern();
      state.pattern = core.deepClone(phrasePattern);
      state.pattern.id = core.createId("pattern");
      state.pattern.name = "Phrase Bounce";
      state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
      render();
    });

    elements.saveMotifBtn.addEventListener("click", saveCurrentPatternAsMotif);

    elements.noteDurationInput.addEventListener("input", function () {
      updateSelectedNote(function (note) {
        note.durationSteps = Number(elements.noteDurationInput.value);
      });
    });
    elements.noteVelocityInput.addEventListener("input", function () {
      updateSelectedNote(function (note) {
        note.velocity = Number(elements.noteVelocityInput.value);
      });
    });
    elements.noteOffsetInput.addEventListener("input", function () {
      updateSelectedNote(function (note) {
        note.pitch.offsetCents = Number(elements.noteOffsetInput.value);
      });
    });
    elements.noteArticulationSelect.addEventListener("change", function () {
      recordCheckpoint("Edit articulation");
      updateSelectedNote(function (note) {
        note.articulation = elements.noteArticulationSelect.value;
      });
    });

    elements.deleteNoteBtn.addEventListener("click", function () {
      if (!state.selectedNoteId) {
        return;
      }
      recordCheckpoint("Delete note");
      state.pattern = core.removeNote(state.pattern, state.selectedNoteId);
      state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
      render();
    });

    elements.transposeUpBtn.addEventListener("click", function () {
      transposeSelectedNote(1);
    });
    elements.transposeDownBtn.addEventListener("click", function () {
      transposeSelectedNote(-1);
    });

    elements.clearPhraseBtn.addEventListener("click", function () {
      recordCheckpoint("Clear phrase");
      state.phrase.blocks = [];
      state.phraseSelection = { start: null, end: null };
      render();
    });

    elements.phraseLoopCountSelect.addEventListener("change", function () {
      recordCheckpoint("Change phrase loop count");
      state.phraseLoopCount = Number(elements.phraseLoopCountSelect.value);
      render();
    });

    elements.practiceModeSelect.addEventListener("change", syncPracticeControls);
    elements.practiceDifficultyInput.addEventListener("input", syncPracticeControls);
    elements.practiceLoopsInput.addEventListener("input", syncPracticeControls);
    elements.practiceTempoLiftInput.addEventListener("input", syncPracticeControls);

    elements.buildPracticeBtn.addEventListener("click", function () {
      recordCheckpoint("Build practice pack");
      state.practice.pack = core.generatePracticeDrill({
        sourcePattern: state.pattern.notes.length ? state.pattern : buildPhrasePattern(),
        scaleDefinition: currentScale(),
        instrumentProfile: currentInstrument(),
        mode: state.practice.mode,
        difficulty: state.practice.difficulty,
        loops: state.practice.loops,
        tempoLift: state.practice.tempoLift,
      });
      render();
    });

    elements.playPracticeBtn.addEventListener("click", function () {
      if (!state.practice.pack) {
        return;
      }
      playPracticePack(state.practice.pack);
    });

    elements.playPatternBtn.addEventListener("click", function () {
      playPattern(state.pattern, state.bpm);
    });
    elements.playPhraseBtn.addEventListener("click", function () {
      playPattern(buildPhrasePattern(), state.bpm);
    });
    elements.playPhraseLoopBtn.addEventListener("click", function () {
      playPattern(buildPhrasePattern(), state.bpm, {
        loops: state.phraseLoopCount,
      });
    });
    elements.playPhraseSelectionBtn.addEventListener("click", function () {
      const selectionPattern = buildPhrasePatternFromSelection();
      if (!selectionPattern) {
        return;
      }
      playPattern(selectionPattern, state.bpm, {
        loops: state.phraseLoopCount,
      });
    });
    elements.stopPlaybackBtn.addEventListener("click", stopPlayback);
    elements.exportMidiBtn.addEventListener("click", exportCurrentMidi);
    elements.undoBtn.addEventListener("click", undo);
    elements.redoBtn.addEventListener("click", redo);
    elements.exportProjectBtn.addEventListener("click", exportProjectState);
    elements.importProjectBtn.addEventListener("click", function () {
      elements.importProjectInput.click();
    });
    elements.importProjectInput.addEventListener("change", importProjectState);

    elements.resetProjectBtn.addEventListener("click", function () {
      recordCheckpoint("Reset project");
      restoreState(createInitialState(), {
        undoStack: state.undoStack.slice(),
        redoStack: [],
      });
    });

    document.addEventListener("keydown", function (event) {
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedo =
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z");
      if (isUndo) {
        event.preventDefault();
        undo();
      } else if (isRedo) {
        event.preventDefault();
        redo();
      }
    });
  }

  function rebuildScaleFromControls(resetMask) {
    recordCheckpoint(resetMask ? "Reset scale mask" : "Change scale");
    const rootPc = Number(elements.rootSelect.value);
    const mode = elements.modeSelect.value;
    state.scale = core.createScaleDefinition(
      rootPc,
      mode,
      resetMask ? null : state.scale.enabledMask,
      resetMask ? null : state.scale.pitchOffsets
    );
    render();
  }

  function syncGeneratorSettings() {
    if (
      state.generator.tensionCurve !== elements.tensionCurveSelect.value ||
      state.generator.mode !== elements.generationModeSelect.value ||
      state.generator.preferredFormId !== elements.generationFormLockSelect.value ||
      state.generator.preferredCellId !== elements.generationCellLockSelect.value ||
      state.generator.surpriseZone !== elements.generationSurpriseZoneSelect.value ||
      state.generator.cadenceTarget !== elements.generationCadenceTargetSelect.value
    ) {
      recordCheckpoint("Change generator mode");
    }
    state.generator.density = Number(elements.densityInput.value);
    state.generator.maxLeap = Number(elements.maxLeapInput.value);
    state.generator.repeatRate = Number(elements.repeatRateInput.value);
    state.generator.surprise = Number(elements.surpriseInput.value);
    state.generator.tensionCurve = elements.tensionCurveSelect.value;
    state.generator.mode = elements.generationModeSelect.value;
    state.generator.preferredFormId = elements.generationFormLockSelect.value;
    state.generator.preferredCellId = elements.generationCellLockSelect.value;
    state.generator.surpriseZone = elements.generationSurpriseZoneSelect.value;
    state.generator.cadenceTarget = elements.generationCadenceTargetSelect.value;
    render();
  }

  function syncPracticeControls() {
    state.practice.mode = elements.practiceModeSelect.value;
    state.practice.difficulty = Number(elements.practiceDifficultyInput.value);
    state.practice.loops = Number(elements.practiceLoopsInput.value);
    state.practice.tempoLift = Number(elements.practiceTempoLiftInput.value);
    render();
  }

  function render() {
    elements.composeView.classList.toggle("hidden", state.viewMode !== "compose");
    elements.practiceView.classList.toggle("hidden", state.viewMode !== "practice");
    updateGeneratorModeConditionalControls();

    elements.bpmValue.textContent = state.bpm + " BPM";
    elements.densityValue.textContent = state.generator.density.toFixed(2);
    elements.maxLeapValue.textContent = String(state.generator.maxLeap);
    elements.repeatRateValue.textContent = state.generator.repeatRate.toFixed(2);
    elements.surpriseValue.textContent = state.generator.surprise.toFixed(2);
    elements.practiceDifficultyValue.textContent = String(state.practice.difficulty);
    elements.practiceLoopsValue.textContent = String(state.practice.loops);
    elements.practiceTempoLiftValue.textContent = "+" + state.practice.tempoLift + " BPM";
    elements.undoBtn.disabled = state.undoStack.length === 0;
    elements.redoBtn.disabled = state.redoStack.length === 0;
    elements.playPhraseSelectionBtn.disabled = state.phraseSelection.start == null;
    elements.playPhraseLoopBtn.disabled = state.phrase.blocks.length === 0;
    elements.stateStatus.textContent =
      "Undo " + state.undoStack.length + " · Redo " + state.redoStack.length + " · Autosaved";

    elements.patternTitle.textContent = state.pattern.name;
    elements.patternSubtitle.textContent =
      core.previewPattern(state.pattern) +
      " | " +
      currentInstrument().name +
      " | " +
      core.NOTE_NAMES[state.scale.rootPc] +
      " " +
      state.scale.modeName;

    if (interactionState.lastGeneratorMode !== state.generator.mode) {
      interactionState.lastGeneratorMode = state.generator.mode;
      interactionState.generatorModeHintUntil = Date.now() + 7000;
      interactionState.dismissGeneratorModeHint = false;
    }
    const showModeHint = !interactionState.dismissGeneratorModeHint &&
      !interactionState.muteGeneratorModeHintsSession && (
        state.alwaysShowModeHints || Date.now() < interactionState.generatorModeHintUntil
      );
    elements.generationModeHint.textContent = showModeHint
      ? ("Mode Hint: " + buildGeneratorModeContextHint(state.generator.mode))
      : "";
    elements.dismissModeHintBtn.classList.toggle("hidden", !showModeHint);
    elements.dismissModeHintBtn.disabled = !showModeHint;
    elements.muteModeHintsSessionInput.checked = Boolean(interactionState.muteGeneratorModeHintsSession);

    elements.generationSummary.textContent =
      "密度 " +
      state.generator.density.toFixed(2) +
      " / 跳进上限 " +
      state.generator.maxLeap +
      " / 重复率 " +
      state.generator.repeatRate.toFixed(2) +
      " / 惊喜度 " +
      state.generator.surprise.toFixed(2) +
      " / " +
      (GENERATION_MODE_LABELS[state.generator.mode] || state.generator.mode) +
      " / Form " +
      (GENERATION_FORM_LABELS[state.generator.preferredFormId] || "自动") +
      " / Cell " +
      (GENERATION_CELL_LABELS[state.generator.preferredCellId] || "自动") +
      " / Surprise " +
      (GENERATION_SURPRISE_ZONE_LABELS[state.generator.surpriseZone] || "自动") +
      (state.generator.mode === "cadence"
        ? (" / Cadence " +
          (GENERATION_CADENCE_TARGET_LABELS[state.generator.cadenceTarget] || "自动（主音/五度）"))
        : "") +
      (state.generatorBridgeHint ? " | " + state.generatorBridgeHint : "");
    const selectedPreset = getSelectedGeneratorPreset();
    elements.generatorPresetSummary.textContent = selectedPreset
      ? "Preset: " +
        (selectedPreset.pinned ? "★ " : "") +
        selectedPreset.name +
        " | " +
        core.NOTE_NAMES[selectedPreset.scale.rootPc] +
        " " +
        selectedPreset.scale.modeName +
        " | " +
        (GENERATION_MODE_LABELS[selectedPreset.generator.mode] || selectedPreset.generator.mode) +
        ((selectedPreset.tags && selectedPreset.tags.length) ? " | #" + selectedPreset.tags.join(" #") : "")
      : "Preset: none yet. Save the current generator setup to reuse it later.";
    elements.generatorPresetNotes.textContent = selectedPreset
      ? (selectedPreset.notes
        ? "Notes: " + selectedPreset.notes
        : "Notes: none yet. Use Edit to describe when this preset works best.")
      : "";
    const presetDiff = getGeneratorPresetDiff(selectedPreset);
    elements.generatorPresetDiff.textContent = selectedPreset
      ? (presetDiff.length
        ? "Current differs from preset in: " + presetDiff.join(" | ")
        : "Current matches the selected preset.") +
        " · Showing " + getVisibleGeneratorPresets().length + "/" + state.generatorPresets.length + " presets"
      : (state.generatorPresets.length
        ? "No preset matches current search/filter."
        : "");
    elements.generatorSelectionStatus.textContent = "当前 Preset: " +
      (selectedPreset ? selectedPreset.name : "未选择") +
      " · 标签筛选: " + (state.generatorPresetTagFilter === "all" ? "全部" : ("#" + state.generatorPresetTagFilter));
    elements.generatorSelectionLabel.textContent = selectedPreset
      ? ("Preset " + selectedPreset.name)
      : "规则 + 可控随机";

    renderGenerationModePreview();
    renderGenerationBlocks();
    renderPitchClassGrid();
    renderInstrumentLibrary();
    renderSequencer();
    renderSelectedNoteEditor();
    renderMotifLibrary();
    renderHistory();
    renderPhraseSnapshots();
    renderPhraseSnapshotDiff();
    renderPhraseMorphTrail();
    renderPhraseInspector();
    renderPhraseTimeline();
    renderPracticePanel();
    saveState();
  }

  function renderGenerationBlocks() {
    const meta = state.pattern.generationMeta;
    elements.generationBlocks.innerHTML = "";
    if (!meta || !Array.isArray(meta.blocks) || !meta.blocks.length) {
      elements.logicFormLabel.textContent = "Manual";
      elements.generationBlocks.innerHTML =
        '<article class="history-item"><h3 class="history-item-name">No visible blocks</h3><p class="practice-item-meta">This pattern was edited manually or came from a non-block generator path.</p></article>';
      return;
    }

    elements.logicFormLabel.textContent = meta.form || "Blocks";
    meta.blocks.forEach(function (block) {
      const item = document.createElement("article");
      item.className = "history-item";
      item.innerHTML =
        "<h3 class=\"history-item-name\">" +
        block.slot +
        " · " +
        block.melodicCellId +
        "</h3>" +
        "<p class=\"practice-item-meta\">rhythm " +
        block.rhythmCell +
        " · notes " +
        block.noteCount +
        " · surprise x" +
        block.surpriseBias.toFixed(2) +
        "</p>";
      elements.generationBlocks.appendChild(item);
    });
  }

  function renderHistory() {
    elements.historyCount.textContent = String(state.history.length);
    elements.historyList.innerHTML = "";
    const template = document.getElementById("historyItemTemplate");
    if (!state.history.length) {
      elements.historyList.innerHTML =
        '<article class="history-item"><h3 class="history-item-name">No snapshots yet</h3><p class="practice-item-meta">Generate or transform a pattern and it will appear here for quick comparison.</p></article>';
      return;
    }

    state.history.forEach(function (entry) {
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".history-item-name").textContent = entry.label;
      item.querySelector(".history-item-meta").textContent = entry.meta;
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "play") {
            playPattern(entry.pattern, state.bpm);
          } else if (action === "load") {
            recordCheckpoint("Load history snapshot");
            adoptPattern(entry.pattern);
          } else if (action === "motif") {
            recordCheckpoint("Create motif from history");
            state.motifLibrary.unshift(
              core.createMotifFromPattern(entry.pattern, {
                name: entry.label,
                tags: ["history", state.generator.mode],
                difficulty: 3,
                style: "snapshot",
                provenance: "history",
              })
            );
          } else if (action === "phrase") {
            recordCheckpoint("Add history motif to phrase");
            const historyMotif = core.createMotifFromPattern(entry.pattern, {
              name: entry.label,
              tags: ["history"],
              difficulty: 3,
              style: "snapshot",
              provenance: "history",
            });
            state.motifLibrary.unshift(historyMotif);
            core.addMotifToPhrase(state.phrase, historyMotif);
          }
          render();
        });
      });
      elements.historyList.appendChild(item);
    });
  }

  function renderPhraseInspector() {
    const phrasePattern = buildPhrasePattern();
    const uniquePcs = new Set(
      phrasePattern.notes.map(function (note) {
        return note.pitch.pc;
      })
    );
    const selection = normalizePhraseSelection(state.phraseSelection, state.phrase.blocks.length);
    elements.phraseSelectionLabel.textContent = selection.start == null
      ? "未选择 block"
      : (selection.start === selection.end
        ? ("选中 Block #" + (selection.start + 1))
        : ("选中 Block #" + (selection.start + 1) + "-#" + (selection.end + 1)));
    const metrics = [
      { label: "Blocks", value: state.phrase.blocks.length },
      { label: "Steps", value: phrasePattern.grid },
      { label: "Notes", value: phrasePattern.notes.length },
      { label: "Pitch Classes", value: uniquePcs.size },
    ];
    elements.phraseInspector.innerHTML = metrics
      .map(function (metric) {
        return (
          '<div class="inspector-metric"><strong>' +
          metric.value +
          "</strong><span>" +
          metric.label +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderInstrumentLibrary() {
    elements.instrumentCount.textContent = String(state.instruments.length);
    elements.instrumentLibrary.innerHTML = "";
    const template = document.getElementById("instrumentItemTemplate");
    state.instruments.forEach(function (instrument) {
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".history-item-name").textContent = instrument.name;
      item.querySelector(".history-item-meta").textContent =
        "range " + instrument.minMidi + "-" + instrument.maxMidi + " · " + instrument.waveform;
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "use") {
            recordCheckpoint("Use instrument");
            state.instrumentId = instrument.id;
            state.pattern = fitPatternForCurrentInstrument(state.pattern);
          } else if (action === "edit") {
            const nextName = window.prompt("Instrument name", instrument.name);
            if (!nextName) {
              return;
            }
            recordCheckpoint("Edit instrument");
            instrument.name = nextName.trim() || instrument.name;
            const nextMin = window.prompt("Minimum MIDI", String(instrument.minMidi));
            const nextMax = window.prompt("Maximum MIDI", String(instrument.maxMidi));
            instrument.minMidi = core.clamp(Number(nextMin || instrument.minMidi), 0, 127);
            instrument.maxMidi = core.clamp(Number(nextMax || instrument.maxMidi), instrument.minMidi, 127);
            if (state.instrumentId === instrument.id) {
              state.pattern = fitPatternForCurrentInstrument(state.pattern);
            }
          } else if (action === "delete") {
            if (state.instruments.length === 1) {
              window.alert("At least one instrument must remain in the library.");
              return;
            }
            if (!window.confirm("Delete this instrument from the library?")) {
              return;
            }
            recordCheckpoint("Delete instrument");
            state.instruments = state.instruments.filter(function (entry) {
              return entry.id !== instrument.id;
            });
            if (!state.instruments.some(function (entry) { return entry.id === state.instrumentId; })) {
              state.instrumentId = state.instruments[0] ? state.instruments[0].id : "";
            }
          }
          hydrateControls();
          render();
        });
      });
      elements.instrumentLibrary.appendChild(item);
    });
  }

  function renderPitchClassGrid() {
    elements.pitchClassGrid.innerHTML = "";
    core.NOTE_NAMES.forEach(function (name, pc) {
      const chip = document.createElement("label");
      chip.className = "pitch-chip";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = !!state.scale.enabledMask[pc];
      toggle.addEventListener("change", function () {
        recordCheckpoint("Edit scale mask");
        state.scale.enabledMask[pc] = toggle.checked;
        render();
      });

      const info = document.createElement("div");
      info.innerHTML = "<strong>" + name + '</strong><div class="hint-text">偏移 cents</div>';

      const offsetInput = document.createElement("input");
      offsetInput.type = "number";
      offsetInput.min = "-100";
      offsetInput.max = "100";
      offsetInput.step = "5";
      offsetInput.value = String(state.scale.pitchOffsets[pc] || 0);
      offsetInput.addEventListener("change", function () {
        recordCheckpoint("Edit pitch offset");
        state.scale.pitchOffsets[pc] = Number(offsetInput.value);
        render();
      });

      chip.appendChild(toggle);
      chip.appendChild(info);
      chip.appendChild(offsetInput);
      elements.pitchClassGrid.appendChild(chip);
    });
  }

  function renderSequencer() {
    const instrument = currentInstrument();
    const rows = [];
    for (let midi = instrument.maxMidi; midi >= instrument.minMidi; midi -= 1) {
      rows.push(midi);
    }

    elements.pitchLabels.innerHTML = "";
    rows.forEach(function (midi) {
      const label = document.createElement("div");
      label.className = "pitch-label";
      label.textContent = core.midiToLabel(midi);
      elements.pitchLabels.appendChild(label);
    });

    elements.sequencerGrid.innerHTML = "";
    elements.sequencerGrid.style.gridTemplateColumns = "repeat(" + state.pattern.grid + ", minmax(18px, 1fr))";
    elements.sequencerGrid.style.gridTemplateRows = "repeat(" + rows.length + ", 24px)";

    rows.forEach(function (midi) {
      for (let step = 0; step < state.pattern.grid; step += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "seq-cell";
        const note = findActiveNoteAt(step, midi);
        const noteStarts = note && note.startStep === step;
        if (note) {
          cell.classList.add(noteStarts ? "active" : "held");
          if (note.id === state.selectedNoteId) {
            cell.classList.add("selected");
          }
        }
        if (step % core.stepsPerBar(state.pattern) === 0) {
          cell.classList.add("bar-line");
        }
        cell.addEventListener("click", function (event) {
          if (event.shiftKey) {
            if (note) {
              recordCheckpoint("Delete note from grid");
              state.pattern = core.removeNote(state.pattern, note.id);
              state.pattern.generationMeta = null;
              if (state.selectedNoteId === note.id) {
                state.selectedNoteId = null;
              }
              render();
            }
            return;
          }
          if (note && note.startStep === step) {
            state.selectedNoteId = note.id;
            render();
            return;
          }
          recordCheckpoint("Add note");
          state.pattern = core.upsertNote(state.pattern, step, midi, {
            durationSteps: 1,
            velocity: 92,
            offsetCents: state.scale.pitchOffsets[core.normalizePc(midi)] || 0,
            articulation: "normal",
          });
          state.pattern.generationMeta = null;
          const created = state.pattern.notes.find(function (item) {
            return item.startStep === step;
          });
          state.selectedNoteId = created ? created.id : state.selectedNoteId;
          render();
        });
        elements.sequencerGrid.appendChild(cell);
      }
    });
  }

  function renderSelectedNoteEditor() {
    const note = state.pattern.notes.find(function (item) {
      return item.id === state.selectedNoteId;
    });
    if (!note) {
      elements.selectedNoteLabel.textContent = "未选中";
      elements.noteDurationValue.textContent = "-";
      elements.noteVelocityValue.textContent = "-";
      elements.noteOffsetValue.textContent = "-";
      return;
    }
    elements.selectedNoteLabel.textContent = core.pitchSpecToLabel(note.pitch);
    elements.noteDurationInput.value = String(note.durationSteps);
    elements.noteVelocityInput.value = String(note.velocity);
    elements.noteOffsetInput.value = String(note.pitch.offsetCents || 0);
    elements.noteArticulationSelect.value = note.articulation;
    elements.noteDurationValue.textContent = note.durationSteps + " steps";
    elements.noteVelocityValue.textContent = String(note.velocity);
    elements.noteOffsetValue.textContent = String(note.pitch.offsetCents || 0);
  }

  function bridgeMotifToGenerator(motif) {
    if (!motif) {
      return null;
    }
    const tags = (motif.tags || []).map(function (tag) {
      return String(tag || "").trim().toLowerCase();
    });
    const hasTag = function (name) {
      return tags.includes(name);
    };
    const next = {
      mode: state.generator.mode,
      preferredFormId: "auto",
      preferredCellId: "auto",
      surpriseZone: "balanced",
      tensionCurve: state.generator.tensionCurve,
      cadenceTarget: "auto",
      density: core.clamp(0.45 + motif.difficulty * 0.08, 0.2, 0.85),
      maxLeap: core.clamp(7 - motif.difficulty, 2, 7),
      repeatRate: core.clamp(0.62 - motif.difficulty * 0.08, 0.2, 0.7),
      surprise: core.clamp(0.12 + motif.difficulty * 0.05, 0.05, 0.45),
    };

    if (hasTag("tail") || hasTag("cadence") || motif.style === "tail") {
      next.mode = hasTag("cadence") ? "cadence" : "tail";
      next.preferredFormId = hasTag("cadence") ? "approach-cadence" : "release-tail";
      next.preferredCellId = "release-turn";
      next.surpriseZone = "ending";
      next.tensionCurve = "fall";
      next.cadenceTarget = hasTag("cadence") ? "root" : "auto";
    } else if (hasTag("sequence") || hasTag("continuation")) {
      next.mode = hasTag("continuation") ? "continuation" : "variation";
      next.preferredFormId = "statement-sequence-release";
      next.preferredCellId = "skip-sequence";
      next.surpriseZone = "middle";
      next.tensionCurve = "wave";
    } else if (hasTag("answer") || hasTag("response")) {
      next.mode = "response";
      next.preferredFormId = "echo-answer";
      next.preferredCellId = "answer-fall";
      next.surpriseZone = "middle";
      next.tensionCurve = "fall";
    } else {
      next.mode = "new";
      next.preferredFormId = "a-b-release";
      next.preferredCellId = "arc-return";
      next.surpriseZone = hasTag("fusion") ? "opening" : "balanced";
      next.tensionCurve = hasTag("fusion") ? "rise" : "arc";
    }

    state.generator = Object.assign({}, state.generator, next);
    state.generatorBridgeHint = "Seeded by motif “" + motif.name + "” · Form " +
      (GENERATION_FORM_LABELS[next.preferredFormId] || "自动") + " · Cell " +
      (GENERATION_CELL_LABELS[next.preferredCellId] || "自动");
    return next;
  }

  function renderMotifLibrary() {
    const query = (state.motifSearch || "").trim().toLowerCase();
    const filters = normalizeMotifFilters(state.motifFilters);
    state.motifFilters = filters;
    elements.motifSearchInput.value = state.motifSearch || "";
    hydrateMotifFilterControls();
    const visibleMotifs = state.motifLibrary.filter(function (motif) {
      if (!query) {
        return true;
      }
      const haystack = [motif.name, motif.style, motif.provenance, motif.recommendedUse].concat(motif.tags).join(" ").toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
      return true;
    }).filter(function (motif) {
      if (filters.provenance !== "all" && motif.provenance !== filters.provenance) {
        return false;
      }
      if (filters.style !== "all" && motif.style !== filters.style) {
        return false;
      }
      if (filters.difficulty !== "all" && String(motif.difficulty) !== filters.difficulty) {
        return false;
      }
      return true;
    });
    elements.motifCount.textContent = visibleMotifs.length + " motifs";
    const filterSummaryParts = [];
    if (query) {
      filterSummaryParts.push('Search "' + state.motifSearch + '"');
    }
    if (filters.provenance !== "all") {
      filterSummaryParts.push(MOTIF_PROVENANCE_LABELS[filters.provenance]);
    }
    if (filters.style !== "all") {
      filterSummaryParts.push("Style " + filters.style);
    }
    if (filters.difficulty !== "all") {
      filterSummaryParts.push("Diff " + filters.difficulty);
    }
    elements.motifFilterSummary.textContent = filterSummaryParts.length
      ? "Filters: " + filterSummaryParts.join(" | ")
      : "Filters: All motifs";
    elements.motifLibrary.innerHTML = "";
    const template = document.getElementById("motifCardTemplate");
    visibleMotifs.forEach(function (motif) {
      const card = template.content.firstElementChild.cloneNode(true);
      card.querySelector(".motif-name").textContent = motif.name;
      card.querySelector(".motif-meta").textContent =
        motif.style + " · diff " + motif.difficulty + " · " + (motif.tags.join(", ") || "untagged");
      card.querySelector(".motif-provenance").textContent =
        "From " +
        (MOTIF_PROVENANCE_LABELS[motif.provenance] || MOTIF_PROVENANCE_LABELS.legacy) +
        " · " +
        (motif.recommendedUse || "idea starter");
      card.querySelector(".motif-badge").textContent = core.NOTE_NAMES[motif.sourcePattern.notes[0] ? motif.sourcePattern.notes[0].pitch.pc : state.scale.rootPc];
      card.querySelector(".motif-preview").textContent = core.previewPattern(motif.sourcePattern);
      card.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "play") {
            playPattern(motif.sourcePattern, state.bpm);
          } else if (action === "load") {
            recordCheckpoint("Load motif");
            adoptPattern(motif.sourcePattern);
          } else if (action === "phrase") {
            recordCheckpoint("Add motif to phrase");
            core.addMotifToPhrase(state.phrase, motif);
          } else if (action === "seed-generator") {
            recordCheckpoint("Seed generator from motif");
            bridgeMotifToGenerator(motif);
            hydrateControls();
          } else if (action === "transpose") {
            recordCheckpoint("Create transposed motif");
            const transposed = core.createMotifFromPattern(
              core.transposePattern(motif.sourcePattern, 2, currentScale(), currentInstrument()),
              {
                name: motif.name + " +2",
                tags: motif.tags.concat(["sequence"]),
                difficulty: core.clamp(motif.difficulty + 1, 1, 5),
                style: motif.style,
                provenance: "motif-derived",
              }
            );
            state.motifLibrary.unshift(transposed);
          } else if (action === "answer") {
            recordCheckpoint("Create tail motif");
            const answerPattern = core.generatePattern({
              pattern: core.createEmptyPattern({
                name: motif.name + " Tail",
                grid: motif.sourcePattern.grid,
                numerator: motif.sourcePattern.numerator,
                denominator: motif.sourcePattern.denominator,
              }),
              sourcePattern: motif.sourcePattern,
              scaleDefinition: currentScale(),
              instrumentProfile: currentInstrument(),
              density: 0.45,
              maxLeap: 6,
              repeatRate: 0.26,
              surprise: 0.18,
              tensionCurve: "fall",
              mode: "tail",
            });
            state.motifLibrary.unshift(
              core.createMotifFromPattern(answerPattern, {
                name: motif.name + " Tail",
                tags: motif.tags.concat(["tail"]),
                difficulty: motif.difficulty,
                style: "tail",
                provenance: "motif-derived",
              })
            );
          } else if (action === "duplicate") {
            recordCheckpoint("Duplicate motif");
            state.motifLibrary.unshift(
              core.createMotifFromPattern(motif.sourcePattern, {
                name: motif.name + " Copy",
                tags: motif.tags.slice(),
                difficulty: motif.difficulty,
                style: motif.style,
                provenance: "motif-derived",
              })
            );
          } else if (action === "edit") {
            const nextName = window.prompt("Motif name", motif.name);
            if (!nextName) {
              return;
            }
            recordCheckpoint("Edit motif");
            motif.name = nextName.trim() || motif.name;
            state.phrase.blocks.forEach(function (block) {
              if (block.motifId === motif.id && block.relationMode !== "frozen") {
                block.motifName = motif.name;
              }
            });
            const nextStyle = window.prompt("Motif style", motif.style);
            motif.style = (nextStyle || motif.style).trim() || motif.style;
            const nextTags = window.prompt("Motif tags (comma separated)", motif.tags.join(", "));
            motif.tags = (nextTags || "")
              .split(",")
              .map(function (item) {
                return item.trim();
              })
              .filter(Boolean);
          } else if (action === "delete") {
            if (!window.confirm("Delete this motif from the library?")) {
              return;
            }
            recordCheckpoint("Delete motif");
            state.motifLibrary = state.motifLibrary.filter(function (entry) {
              return entry.id !== motif.id;
            });
            state.phrase.blocks = state.phrase.blocks.filter(function (block) {
              return block.motifId !== motif.id || block.relationMode === "frozen";
            }).map(function (block) {
              if (block.motifId === motif.id && block.relationMode === "frozen") {
                return Object.assign({}, block, {
                  motifName: block.motifName || motif.name,
                  motifId: null,
                });
              }
              return block;
            });
          }
          render();
        });
      });
      elements.motifLibrary.appendChild(card);
    });

    if (!visibleMotifs.length) {
      elements.motifLibrary.innerHTML =
        '<article class="motif-card"><h3 class="motif-name">No motifs match</h3><p class="motif-preview">Try a different search term, or save the current pattern as a new motif.</p></article>';
    }
  }

  function stopPhraseDragAutoScroll() {
    interactionState.phraseDragAutoScrollSpeed = 0;
    interactionState.phraseDragAutoScrollSpeedX = 0;
    if (interactionState.phraseDragAutoScrollRAF != null) {
      window.cancelAnimationFrame(interactionState.phraseDragAutoScrollRAF);
      interactionState.phraseDragAutoScrollRAF = null;
    }
  }

  function ensurePhraseDragAutoScrollLoop() {
    if (interactionState.phraseDragAutoScrollRAF != null) {
      return;
    }
    const tick = function () {
      if (!interactionState.phraseDrag || (interactionState.phraseDragAutoScrollSpeed === 0 && interactionState.phraseDragAutoScrollSpeedX === 0)) {
        interactionState.phraseDragAutoScrollRAF = null;
        return;
      }
      if (interactionState.phraseDragAutoScrollSpeed !== 0) {
        window.scrollBy(0, interactionState.phraseDragAutoScrollSpeed);
      }
      if (interactionState.phraseDragAutoScrollSpeedX !== 0 && elements.phraseTimeline) {
        elements.phraseTimeline.scrollLeft += interactionState.phraseDragAutoScrollSpeedX;
      }
      interactionState.phraseDragAutoScrollRAF = window.requestAnimationFrame(tick);
    };
    interactionState.phraseDragAutoScrollRAF = window.requestAnimationFrame(tick);
  }

  function updatePhraseDragAutoScroll(clientX, clientY) {
    const edgeThreshold = 80;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const topDistance = Math.max(0, clientY);
    const bottomDistance = Math.max(0, viewportHeight - clientY);
    let speed = 0;
    if (topDistance < edgeThreshold) {
      speed = -core.clamp(Math.ceil((edgeThreshold - topDistance) / 10), 2, 12);
    } else if (bottomDistance < edgeThreshold) {
      speed = core.clamp(Math.ceil((edgeThreshold - bottomDistance) / 10), 2, 12);
    }
    interactionState.phraseDragAutoScrollSpeed = speed;

    let speedX = 0;
    if (elements.phraseTimeline) {
      const rect = elements.phraseTimeline.getBoundingClientRect();
      if (elements.phraseTimeline.scrollWidth > elements.phraseTimeline.clientWidth + 4) {
        const leftDistance = Math.max(0, clientX - rect.left);
        const rightDistance = Math.max(0, rect.right - clientX);
        if (leftDistance < edgeThreshold) {
          speedX = -core.clamp(Math.ceil((edgeThreshold - leftDistance) / 10), 2, 12);
        } else if (rightDistance < edgeThreshold) {
          speedX = core.clamp(Math.ceil((edgeThreshold - rightDistance) / 10), 2, 12);
        }
      }
    }
    interactionState.phraseDragAutoScrollSpeedX = speedX;

    if (speed === 0 && speedX === 0) {
      stopPhraseDragAutoScroll();
      return;
    }
    ensurePhraseDragAutoScrollLoop();
  }

  function renderPhraseTimeline() {

    elements.phraseTimeline.innerHTML = "";
    const template = document.getElementById("phraseBlockTemplate");
    state.phraseSelection = normalizePhraseSelection(state.phraseSelection, state.phrase.blocks.length);
    if (!state.phrase.blocks.length) {
      elements.phraseTimeline.innerHTML =
        '<article class="history-item phrase-empty-state"><h3 class="history-item-name">Phrase 还是空的</h3><p class="practice-item-meta">可从 Motif Library 点“加入 Phrase”，或先点击“生成旋律”再保存为 motif。</p></article>';
      return;
    }

    function movePhraseBlockToIndex(blockIndex, insertIndex) {
      const moved = state.phrase.blocks.splice(blockIndex, 1)[0];
      if (!moved) {
        return;
      }
      const targetIndex = blockIndex < insertIndex ? insertIndex - 1 : insertIndex;
      state.phrase.blocks.splice(core.clamp(targetIndex, 0, state.phrase.blocks.length), 0, moved);
    }

    function appendPhraseDropSlot(insertIndex) {
      const slot = document.createElement("div");
      slot.className = "phrase-drop-slot";
      slot.setAttribute("data-insert-index", String(insertIndex));
      slot.textContent = "Drop To Insert";
      slot.addEventListener("dragover", function (event) {
        if (!interactionState.phraseDrag) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = interactionState.phraseDrag.copy ? "copy" : "move";
        }
        updatePhraseDragAutoScroll(event.clientX, event.clientY);
        clearPhraseDropTargets();
        slot.classList.add("active");
      });
      slot.addEventListener("dragleave", function () {
        slot.classList.remove("active");
        stopPhraseDragAutoScroll();
      });
      slot.addEventListener("drop", function (event) {
        if (!interactionState.phraseDrag) {
          return;
        }
        event.preventDefault();
        const dragState = interactionState.phraseDrag;
        interactionState.phraseDrag = null;
        stopPhraseDragAutoScroll();
        clearPhraseDropTargets();
        const dragged = state.phrase.blocks[dragState.index];
        if (!dragged) {
          render();
          return;
        }
        recordCheckpoint(dragState.copy ? "Duplicate phrase block by drop slot" : "Reorder phrase blocks by drop slot");
        if (dragState.copy) {
          const clone = core.deepClone(dragged);
          clone.id = core.createId("block");
          state.phrase.blocks.splice(insertIndex, 0, clone);
        } else {
          movePhraseBlockToIndex(dragState.index, insertIndex);
        }
        render();
      });
      slot.addEventListener("click", function () {
        if (interactionState.phraseDrag) {
          return;
        }
        const selection = normalizePhraseSelection(state.phraseSelection, state.phrase.blocks.length);
        if (selection.start == null || selection.end == null || selection.start !== selection.end) {
          return;
        }
        if (selection.start === insertIndex || selection.start + 1 === insertIndex) {
          return;
        }
        recordCheckpoint("Reorder phrase block by slot tap");
        movePhraseBlockToIndex(selection.start, insertIndex);
        state.phraseSelection = normalizePhraseSelection({ start: core.clamp(insertIndex - 1, 0, state.phrase.blocks.length - 1), end: core.clamp(insertIndex - 1, 0, state.phrase.blocks.length - 1) }, state.phrase.blocks.length);
        render();
      });
      elements.phraseTimeline.appendChild(slot);
    }

    let phraseOffset = 0;
    appendPhraseDropSlot(0);
    state.phrase.blocks.forEach(function (block, index) {
      block.transform = normalizePhraseTransform(block.transform);
      const sourceContext = getPhraseBlockSourcePattern(block);
      const motif = sourceContext.motif;
      const sourcePattern = sourceContext.pattern;
      const transformedPattern = sourcePattern ? buildPhraseBlockPattern(block) : null;
      const blockOffset = phraseOffset;
      const item = template.content.firstElementChild.cloneNode(true);
      item.draggable = true;
      item.dataset.index = String(index);
      if (state.phraseSelection.start != null && index >= state.phraseSelection.start && index <= state.phraseSelection.end) {
        item.classList.add("selected-range");
      }
      if (index === state.phraseSelection.start || index === state.phraseSelection.end) {
        item.classList.add("selection-edge");
      }
      item.querySelector(".phrase-block-name").textContent = motif ? motif.name : block.motifName;
      item.querySelector(".phrase-block-meta").textContent =
        "模式 " +
        (block.relationMode === "frozen" ? "Frozen Copy" : "Reference Motif") +
        " · 顺阶 " +
        (block.transform.diatonicShift >= 0 ? "+" : "") +
        block.transform.diatonicShift +
        " · 半音 " +
        (block.transform.chromaticShift >= 0 ? "+" : "") +
        block.transform.chromaticShift +
        " · reverse " +
        (block.transform.reverse ? "yes" : "no") +
        " · stretch x" +
        block.transform.stretch;
      item.querySelector('[data-role="source-preview"]').textContent = sourcePattern
        ? core.previewPattern(sourcePattern)
        : "原始 motif 已不存在";
      renderMiniRoll(item.querySelector('[data-role="source-roll"]'), sourcePattern, {
        ghost: true,
      });
      item.querySelector('[data-role="block-preview"]').textContent = transformedPattern
        ? core.previewPattern(transformedPattern)
        : "无法生成当前 block";
      renderMiniRoll(item.querySelector('[data-role="block-roll"]'), transformedPattern);
      item.querySelector('[data-role="phrase-preview"]').textContent = transformedPattern
        ? transformedPattern.notes
            .slice()
            .sort(function (a, b) {
              return a.startStep - b.startStep;
            })
            .map(function (note) {
              return core.pitchSpecToLabel(note.pitch) + " @" + (note.startStep + blockOffset);
            })
            .slice(0, 8)
            .join(" · ")
        : "没有落地片段";
      renderMiniRoll(
        item.querySelector('[data-role="phrase-roll"]'),
        transformedPattern
          ? Object.assign({}, transformedPattern, {
              notes: transformedPattern.notes.map(function (note) {
                const clone = core.deepClone(note);
                clone.startStep += blockOffset;
                return clone;
              }),
              grid: transformedPattern.grid + blockOffset,
            })
          : null
      );
      const toggleModeBtn = item.querySelector('[data-action="toggle-mode"]');
      const refreshFrozenBtn = item.querySelector('[data-action="refresh-frozen"]');
      if (toggleModeBtn) {
        toggleModeBtn.textContent = block.relationMode === "frozen" ? "切换为 Reference" : "切换为 Frozen";
      }
      if (refreshFrozenBtn) {
        refreshFrozenBtn.disabled = block.relationMode !== "frozen";
      }
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "play-source") {
            if (motif) {
              playPattern(motif.sourcePattern, state.bpm);
            }
            return;
          }
          if (action === "play-block") {
            if (transformedPattern) {
              playPattern(transformedPattern, state.bpm);
            }
            return;
          }
          if (action === "load-block") {
            if (transformedPattern) {
              recordCheckpoint("Load phrase block");
              adoptPattern(transformedPattern);
              render();
            }
            return;
          }
          if (action === "toggle-mode") {
            recordCheckpoint("Toggle phrase block relation mode");
            setPhraseBlockRelationMode(block, block.relationMode === "frozen" ? "reference" : "frozen");
            render();
            return;
          }
          if (action === "refresh-frozen") {
            if (block.relationMode === "frozen") {
              recordCheckpoint("Refresh frozen phrase block");
              refreshFrozenPhraseBlock(block);
              render();
            }
            return;
          }
          recordCheckpoint("Edit phrase block");
          if (action === "diatonic-down") {
            block.transform.diatonicShift -= 1;
          } else if (action === "diatonic-up") {
            block.transform.diatonicShift += 1;
          } else if (action === "chromatic-down") {
            block.transform.chromaticShift -= 1;
          } else if (action === "chromatic-up") {
            block.transform.chromaticShift += 1;
          } else if (action === "stretch") {
            block.transform.stretch = block.transform.stretch === 1 ? 2 : 1;
          } else if (action === "flip") {
            block.transform.reverse = !block.transform.reverse;
          } else if (action === "left" && index > 0) {
            const moved = state.phrase.blocks.splice(index, 1)[0];
            state.phrase.blocks.splice(index - 1, 0, moved);
          } else if (action === "right" && index < state.phrase.blocks.length - 1) {
            const moved = state.phrase.blocks.splice(index, 1)[0];
            state.phrase.blocks.splice(index + 1, 0, moved);
          } else if (action === "duplicate") {
            const clone = core.deepClone(block);
            clone.id = core.createId("block");
            state.phrase.blocks.splice(index + 1, 0, clone);
          } else if (action === "remove") {
            state.phrase.blocks.splice(index, 1);
          }
          render();
        });
      });
      item.addEventListener("click", function (event) {
        if (event.target.closest("button")) {
          return;
        }
        if (event.shiftKey && state.phraseSelection.start != null) {
          state.phraseSelection = normalizePhraseSelection(
            {
              start: state.phraseSelection.start,
              end: index,
            },
            state.phrase.blocks.length
          );
        } else {
          state.phraseSelection = {
            start: index,
            end: index,
          };
        }
        render();
      });
      item.addEventListener("dragstart", function (event) {
        interactionState.phraseDrag = {
          index: index,
          copy: !!event.altKey,
          side: "after",
        };
        stopPhraseDragAutoScroll();
        item.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = interactionState.phraseDrag.copy ? "copyMove" : "move";
          event.dataTransfer.setData("text/plain", String(index));
        }
      });
      item.addEventListener("dragover", function (event) {
        if (!interactionState.phraseDrag) {
          return;
        }
        event.preventDefault();
        const bounds = item.getBoundingClientRect();
        const side = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
        interactionState.phraseDrag.side = side;
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = interactionState.phraseDrag.copy ? "copy" : "move";
        }
        updatePhraseDragAutoScroll(event.clientX, event.clientY);
        clearPhraseDropTargets();
        item.classList.add("drop-target");
        item.classList.add(side === "before" ? "drop-before" : "drop-after");
      });
      item.addEventListener("dragleave", function () {
        item.classList.remove("drop-target", "drop-before", "drop-after");
        stopPhraseDragAutoScroll();
      });
      item.addEventListener("drop", function (event) {
        if (!interactionState.phraseDrag) {
          return;
        }
        event.preventDefault();
        const dragState = interactionState.phraseDrag;
        interactionState.phraseDrag = null;
        stopPhraseDragAutoScroll();
        clearPhraseDropTargets();
        if (dragState.index === index && !dragState.copy) {
          render();
          return;
        }
        recordCheckpoint(dragState.copy ? "Duplicate phrase block by drag" : "Reorder phrase blocks");
        const dragged = state.phrase.blocks[dragState.index];
        if (!dragged) {
          render();
          return;
        }
        const insertionIndex = index + (dragState.side === "after" ? 1 : 0);
        if (dragState.copy) {
          const clone = core.deepClone(dragged);
          clone.id = core.createId("block");
          state.phrase.blocks.splice(insertionIndex, 0, clone);
        } else {
          const moved = state.phrase.blocks.splice(dragState.index, 1)[0];
          const targetIndex = dragState.index < insertionIndex ? insertionIndex - 1 : insertionIndex;
          state.phrase.blocks.splice(targetIndex, 0, moved);
        }
        render();
      });
      item.addEventListener("dragend", function () {
        interactionState.phraseDrag = null;
        stopPhraseDragAutoScroll();
        item.classList.remove("dragging", "drop-target", "drop-before", "drop-after");
        clearPhraseDropTargets();
      });
      elements.phraseTimeline.appendChild(item);
      phraseOffset += transformedPattern ? transformedPattern.grid : 0;
      appendPhraseDropSlot(index + 1);
    });

    if (!state.phrase.blocks.length) {
      elements.phraseTimeline.innerHTML =
        '<article class="phrase-block"><h4>Phrase 还是空的</h4><p class="phrase-block-meta">在 Motif Library 里把喜欢的块加入这里，就能像积木一样拼成长句。</p></article>';
    }
  }

  function clearPhraseDropTargets() {
    elements.phraseTimeline.querySelectorAll(".phrase-block").forEach(function (node) {
      node.classList.remove("drop-target", "drop-before", "drop-after");
    });
    elements.phraseTimeline.querySelectorAll(".phrase-drop-slot").forEach(function (node) {
      node.classList.remove("active");
    });
  }

  function renderPracticePanel() {
    if (!state.practice.pack) {
      elements.practiceSummary.textContent =
        "从当前 Pattern 或 Phrase 生成练习包，支持难度递进、转调和 call / response。";
      elements.practiceList.innerHTML = "";
      return;
    }

    elements.practiceSummary.textContent =
      state.practice.pack.mode +
      " · " +
      state.practice.pack.drills.length +
      " drills · 难度 " +
      state.practice.pack.difficulty +
      " · loops " +
      state.practice.pack.loops;
    elements.practiceList.innerHTML = "";
    const template = document.getElementById("practiceItemTemplate");
    state.practice.pack.drills.forEach(function (drill) {
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".practice-item-name").textContent = drill.name;
      item.querySelector(".practice-item-meta").textContent =
        drill.bpm + " BPM · " + core.previewPattern(drill.pattern);
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "play") {
            playPattern(drill.pattern, drill.bpm);
          } else if (action === "load") {
            recordCheckpoint("Load practice drill");
            adoptPattern(drill.pattern, { viewMode: "compose" });
          }
          render();
        });
      });
      elements.practiceList.appendChild(item);
    });
  }

  function findActiveNoteAt(step, midi) {
    return state.pattern.notes.find(function (note) {
      const noteMidi = core.pitchSpecToMidi(note.pitch);
      return noteMidi === midi && step >= note.startStep && step < note.startStep + note.durationSteps;
    });
  }

  function updateSelectedNote(mutator) {
    const note = state.pattern.notes.find(function (item) {
      return item.id === state.selectedNoteId;
    });
    if (!note) {
      return;
    }
    mutator(note);
    note.durationSteps = core.clamp(note.durationSteps, 1, state.pattern.grid - note.startStep);
    state.pattern = core.ensureMonophonic(state.pattern);
    state.pattern.generationMeta = null;
    render();
  }

  function transposeSelectedNote(semitones) {
    const note = state.pattern.notes.find(function (item) {
      return item.id === state.selectedNoteId;
    });
    if (!note) {
      return;
    }
    recordCheckpoint("Transpose note");
    const midi = core.pitchSpecToMidi(note.pitch) + semitones;
    const bounded = core.clamp(midi, currentInstrument().minMidi, currentInstrument().maxMidi);
    note.pitch = core.midiToPitchSpec(bounded, note.pitch.offsetCents);
    state.pattern.generationMeta = null;
    render();
  }

  function saveCurrentPatternAsMotif() {
    recordCheckpoint("Save motif");
    const name = elements.motifNameInput.value.trim() || state.pattern.name || "Untitled Motif";
    const tags = elements.motifTagsInput.value
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
    const motif = core.createMotifFromPattern(state.pattern, {
      name: name,
      tags: tags,
      difficulty: Number(elements.motifDifficultySelect.value),
      style: elements.motifStyleInput.value.trim() || "organic",
      recommendedUse: "phrase block",
      provenance: "pattern",
    });
    state.motifLibrary.unshift(motif);
    elements.motifNameInput.value = "";
    elements.motifTagsInput.value = "";
    elements.motifStyleInput.value = "";
    render();
  }

  function pushHistory(pattern, actionLabel) {
    const snapshot = core.deepClone(pattern);
    state.history.unshift({
      id: core.createId("history"),
      label: actionLabel + " · " + new Date().toLocaleTimeString(),
      meta:
        core.previewPattern(snapshot) +
        " | notes " +
        snapshot.notes.length +
        " | grid " +
        snapshot.grid,
      pattern: snapshot,
    });
    state.history = state.history.slice(0, 8);
  }

  function exportProjectState() {
    const blob = new Blob([JSON.stringify(createSerializableSnapshot(state), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project-mozart-state-" + Date.now() + ".json";
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  function importProjectState(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        const undoStack = state.undoStack.concat([createSerializableSnapshot(state)]).slice(-MAX_UNDO_STACK);
        restoreState(parsed, {
          undoStack: undoStack,
          redoStack: [],
        });
      } catch (error) {
        window.alert("Project import failed: invalid JSON file.");
      } finally {
        elements.importProjectInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function ensureAudioContext() {
    if (!audioState.context) {
      audioState.context = new window.AudioContext();
    }
    return audioState.context;
  }

  function stopPlayback() {
    audioState.voices.forEach(function (voice) {
      try {
        voice.osc.stop();
      } catch (error) {
      }
      try {
        voice.gain.disconnect();
        voice.osc.disconnect();
      } catch (error) {
      }
    });
    audioState.voices = [];
  }

  function schedulePatternPlayback(ctx, pattern, bpm, startAt, loopIndex) {
    const instrument = currentInstrument();
    const stepDuration = core.stepDurationSeconds(bpm);
    pattern.notes
      .slice()
      .sort(function (a, b) {
        return a.startStep - b.startStep;
      })
      .forEach(function (note) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = instrument.waveform || "triangle";
        const midi = core.pitchSpecToMidi(note.pitch);
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        osc.detune.value = note.pitch.offsetCents || 0;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);

        const start = startAt + note.startStep * stepDuration;
        const articulationFactor = note.articulation === "staccato" ? 0.55 : note.articulation === "legato" ? 0.98 : 0.84;
        const end = start + note.durationSteps * stepDuration * articulationFactor;
        const peak = core.clamp(note.velocity / 150, 0.08, 0.68) * (note.articulation === "accent" ? 1.2 : 1);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.72), end);
        gain.gain.linearRampToValueAtTime(0.0001, end + 0.03);
        osc.start(start);
        osc.stop(end + 0.05);
        audioState.voices.push({ osc: osc, gain: gain, loopIndex: loopIndex });
      });
  }

  function getPatternPlaybackDuration(pattern, bpm) {
    return Math.max(pattern.grid, 1) * core.stepDurationSeconds(bpm) + 0.08;
  }

  function renderGenerationModePreview() {
    elements.generationModePreview.innerHTML = "";
    Object.keys(GENERATION_MODE_LABELS).forEach(function (mode) {
      const preview = GENERATION_MODE_PREVIEWS[mode];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "mode-preview-card";
      if (mode === state.generator.mode) {
        card.classList.add("active");
      }
      card.innerHTML =
        '<div class="mode-preview-head"><strong>' +
        GENERATION_MODE_LABELS[mode] +
        '</strong><span class="panel-tag small-tag">' +
        preview.family +
        "</span></div>" +
        '<div class="mode-preview-curve">' +
        preview.contour
          .map(function (value) {
            return (
              '<span class="mode-preview-bar" style="height:' +
              Math.round(24 + value * 34) +
              'px"></span>'
            );
          })
          .join("") +
        "</div>" +
        '<p class="mode-preview-copy">' +
        preview.tagline +
        "</p>" +
        '<p class="mode-preview-traits">' +
        preview.traits.join(" · ") +
        "</p>";
      card.addEventListener("click", function () {
        if (state.generator.mode === mode) {
          return;
        }
        recordCheckpoint("Switch generator preview mode");
        state.generator.mode = mode;
        elements.generationModeSelect.value = mode;
        render();
      });
      elements.generationModePreview.appendChild(card);
    });
  }

  function playPracticePack(pack) {
    stopPlayback();
    const ctx = ensureAudioContext();
    let cursor = ctx.currentTime + 0.05;
    pack.drills.forEach(function (drill, index) {
      schedulePatternPlayback(ctx, drill.pattern, drill.bpm, cursor, index);
      cursor += getPatternPlaybackDuration(drill.pattern, drill.bpm);
    });
  }

  function playPattern(pattern, bpm, options) {
    stopPlayback();
    const ctx = ensureAudioContext();
    const opts = options || {};
    const loops = Math.max(1, Number(opts.loops) || 1);
    const startAt = ctx.currentTime + 0.05;
    const loopDuration = getPatternPlaybackDuration(pattern, bpm);

    for (let loopIndex = 0; loopIndex < loops; loopIndex += 1) {
      schedulePatternPlayback(ctx, pattern, bpm, startAt + loopIndex * loopDuration, loopIndex);
    }
  }

  function exportCurrentMidi() {
    const sourcePattern = state.phrase.blocks.length ? buildPhrasePattern() : state.pattern;
    const bytes = core.createMidiBytes(sourcePattern, currentInstrument());
    const blob = new Blob([bytes], { type: "audio/midi" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project-mozart-" + Date.now() + ".mid";
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }
})();
