(function () {
  const core = window.MozartCore;
  const STORAGE_KEY = "project-mozart-state-v1";
  const MAX_UNDO_STACK = 40;
  const audioState = {
    context: null,
    voices: [],
  };
  const interactionState = {
    checkpoints: {},
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
    generateBtn: document.getElementById("generateBtn"),
    humanizeBtn: document.getElementById("humanizeBtn"),
    reversePatternBtn: document.getElementById("reversePatternBtn"),
    stretchPatternBtn: document.getElementById("stretchPatternBtn"),
    generationSummary: document.getElementById("generationSummary"),
    logicFormLabel: document.getElementById("logicFormLabel"),
    generationBlocks: document.getElementById("generationBlocks"),
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
    phraseLoopCountSelect: document.getElementById("phraseLoopCountSelect"),
    playPhraseLoopBtn: document.getElementById("playPhraseLoopBtn"),
    clearPhraseBtn: document.getElementById("clearPhraseBtn"),
    motifNameInput: document.getElementById("motifNameInput"),
    motifTagsInput: document.getElementById("motifTagsInput"),
    motifDifficultySelect: document.getElementById("motifDifficultySelect"),
    motifStyleInput: document.getElementById("motifStyleInput"),
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
      phraseLoopCount: 4,
      generator: {
        density: 0.52,
        maxLeap: 5,
        repeatRate: 0.5,
        surprise: 0.24,
        tensionCurve: "arc",
        mode: "new",
      },
      history: [],
      motifSearch: "",
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
    next.undoStack = [];
    next.redoStack = [];
    next.phraseLoopCount = Number(inputState && inputState.phraseLoopCount) || base.phraseLoopCount;
    next.motifLibrary = Array.isArray(inputState && inputState.motifLibrary) ? inputState.motifLibrary : base.motifLibrary;
    next.phrase = inputState && inputState.phrase && Array.isArray(inputState.phrase.blocks) ? inputState.phrase : base.phrase;
    next.phrase.blocks = next.phrase.blocks.map(normalizePhraseBlock);
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
    return Object.assign({}, block, {
      transform: normalizePhraseTransform(block && block.transform),
    });
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
    elements.motifSearchInput.value = state.motifSearch || "";

    elements.practiceModeSelect.value = state.practice.mode;
    elements.practiceDifficultyInput.value = String(state.practice.difficulty);
    elements.practiceLoopsInput.value = String(state.practice.loops);
    elements.practiceTempoLiftInput.value = String(state.practice.tempoLift);
  }

  function bindEvents() {
    registerInteractiveCheckpoint(elements.bpmInput, "tempo", "Adjust tempo");
    registerInteractiveCheckpoint(elements.noteDurationInput, "note-duration", "Edit note duration");
    registerInteractiveCheckpoint(elements.noteVelocityInput, "note-velocity", "Edit note velocity");
    registerInteractiveCheckpoint(elements.noteOffsetInput, "note-offset", "Edit note pitch offset");

    elements.viewMode.addEventListener("change", function () {
      state.viewMode = elements.viewMode.value;
      render();
    });

    elements.instrumentSelect.addEventListener("change", function () {
      recordCheckpoint("Change instrument");
      state.instrumentId = elements.instrumentSelect.value;
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
      hydrateControls();
      render();
    });

    elements.densityInput.addEventListener("input", syncGeneratorSettings);
    elements.maxLeapInput.addEventListener("input", syncGeneratorSettings);
    elements.repeatRateInput.addEventListener("input", syncGeneratorSettings);
    elements.surpriseInput.addEventListener("input", syncGeneratorSettings);
    elements.tensionCurveSelect.addEventListener("change", syncGeneratorSettings);
    elements.generationModeSelect.addEventListener("change", syncGeneratorSettings);
    elements.motifSearchInput.addEventListener("input", function () {
      state.motifSearch = elements.motifSearchInput.value;
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
      render();
    });

    elements.phraseLoopCountSelect.addEventListener("change", function () {
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
      const merged = core.createEmptyPattern({
        name: "Practice Pack",
        grid: state.practice.pack.drills.reduce(function (sum, drill) {
          return sum + drill.pattern.grid;
        }, 0),
      });
      let offset = 0;
      state.practice.pack.drills.forEach(function (drill) {
        drill.pattern.notes.forEach(function (note) {
          const clone = core.deepClone(note);
          clone.id = core.createId("note");
          clone.startStep += offset;
          merged.notes.push(clone);
        });
        offset += drill.pattern.grid;
      });
      playPattern(merged, state.bpm + state.practice.tempoLift);
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
    state.generator.density = Number(elements.densityInput.value);
    state.generator.maxLeap = Number(elements.maxLeapInput.value);
    state.generator.repeatRate = Number(elements.repeatRateInput.value);
    state.generator.surprise = Number(elements.surpriseInput.value);
    state.generator.tensionCurve = elements.tensionCurveSelect.value;
    state.generator.mode = elements.generationModeSelect.value;
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
      state.generator.mode;

    renderGenerationBlocks();
    renderPitchClassGrid();
    renderInstrumentLibrary();
    renderSequencer();
    renderSelectedNoteEditor();
    renderMotifLibrary();
    renderHistory();
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
            state.pattern = core.deepClone(entry.pattern);
            state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
          } else if (action === "motif") {
            recordCheckpoint("Create motif from history");
            state.motifLibrary.unshift(
              core.createMotifFromPattern(entry.pattern, {
                name: entry.label,
                tags: ["history", state.generator.mode],
                difficulty: 3,
                style: "snapshot",
              })
            );
          } else if (action === "phrase") {
            recordCheckpoint("Add history motif to phrase");
            const historyMotif = core.createMotifFromPattern(entry.pattern, {
              name: entry.label,
              tags: ["history"],
              difficulty: 3,
              style: "snapshot",
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

  function renderMotifLibrary() {
    const query = (state.motifSearch || "").trim().toLowerCase();
    const visibleMotifs = state.motifLibrary.filter(function (motif) {
      if (!query) {
        return true;
      }
      const haystack = [motif.name, motif.style].concat(motif.tags).join(" ").toLowerCase();
      return haystack.includes(query);
    });
    elements.motifCount.textContent = visibleMotifs.length + " motifs";
    elements.motifLibrary.innerHTML = "";
    const template = document.getElementById("motifCardTemplate");
    visibleMotifs.forEach(function (motif) {
      const card = template.content.firstElementChild.cloneNode(true);
      card.querySelector(".motif-name").textContent = motif.name;
      card.querySelector(".motif-meta").textContent =
        motif.style + " · diff " + motif.difficulty + " · " + (motif.tags.join(", ") || "untagged");
      card.querySelector(".motif-badge").textContent = core.NOTE_NAMES[motif.sourcePattern.notes[0] ? motif.sourcePattern.notes[0].pitch.pc : state.scale.rootPc];
      card.querySelector(".motif-preview").textContent = core.previewPattern(motif.sourcePattern);
      card.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          const action = button.getAttribute("data-action");
          if (action === "play") {
            playPattern(motif.sourcePattern, state.bpm);
          } else if (action === "load") {
            recordCheckpoint("Load motif");
            state.pattern = core.deepClone(motif.sourcePattern);
            state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
          } else if (action === "phrase") {
            recordCheckpoint("Add motif to phrase");
            core.addMotifToPhrase(state.phrase, motif);
          } else if (action === "transpose") {
            recordCheckpoint("Create transposed motif");
            const transposed = core.createMotifFromPattern(
              core.transposePattern(motif.sourcePattern, 2, currentScale(), currentInstrument()),
              {
                name: motif.name + " +2",
                tags: motif.tags.concat(["sequence"]),
                difficulty: core.clamp(motif.difficulty + 1, 1, 5),
                style: motif.style,
              }
            );
            state.motifLibrary.unshift(transposed);
          } else if (action === "answer") {
            recordCheckpoint("Create response motif");
            const answerPattern = core.generatePattern({
              pattern: core.createEmptyPattern({
                name: motif.name + " Answer",
                grid: motif.sourcePattern.grid,
                numerator: motif.sourcePattern.numerator,
                denominator: motif.sourcePattern.denominator,
              }),
              sourcePattern: motif.sourcePattern,
              scaleDefinition: currentScale(),
              instrumentProfile: currentInstrument(),
              density: 0.45,
              maxLeap: 6,
              repeatRate: 0.3,
              surprise: 0.42,
              tensionCurve: "fall",
              mode: "response",
            });
            state.motifLibrary.unshift(
              core.createMotifFromPattern(answerPattern, {
                name: motif.name + " Tail",
                tags: motif.tags.concat(["response"]),
                difficulty: motif.difficulty,
                style: "answer",
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
              })
            );
          } else if (action === "edit") {
            const nextName = window.prompt("Motif name", motif.name);
            if (!nextName) {
              return;
            }
            recordCheckpoint("Edit motif");
            motif.name = nextName.trim() || motif.name;
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
              return block.motifId !== motif.id;
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

  function renderPhraseTimeline() {
    elements.phraseTimeline.innerHTML = "";
    const template = document.getElementById("phraseBlockTemplate");
    state.phrase.blocks.forEach(function (block, index) {
      block.transform = normalizePhraseTransform(block.transform);
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".phrase-block-name").textContent = block.motifName;
      item.querySelector(".phrase-block-meta").textContent =
        "顺阶 " +
        (block.transform.diatonicShift >= 0 ? "+" : "") +
        block.transform.diatonicShift +
        " · 半音 " +
        (block.transform.chromaticShift >= 0 ? "+" : "") +
        block.transform.chromaticShift +
        " · reverse " +
        (block.transform.reverse ? "yes" : "no") +
        " · stretch x" +
        block.transform.stretch;
      item.querySelectorAll("button").forEach(function (button) {
        button.addEventListener("click", function () {
          recordCheckpoint("Edit phrase block");
          const action = button.getAttribute("data-action");
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
      elements.phraseTimeline.appendChild(item);
    });

    if (!state.phrase.blocks.length) {
      elements.phraseTimeline.innerHTML =
        '<article class="phrase-block"><h4>Phrase 还是空的</h4><p class="phrase-block-meta">在 Motif Library 里把喜欢的块加入这里，就能像积木一样拼成长句。</p></article>';
    }
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
            state.pattern = core.deepClone(drill.pattern);
            state.selectedNoteId = state.pattern.notes[0] ? state.pattern.notes[0].id : null;
            state.viewMode = "compose";
            elements.viewMode.value = "compose";
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
