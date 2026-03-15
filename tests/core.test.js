const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../core.js");

test("generatePattern creates monophonic notes within the enabled scale", function () {
  const scale = core.createScaleDefinition(0, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.7,
    maxLeap: 5,
    repeatRate: 0.4,
    surprise: 0.25,
    tensionCurve: "arc",
    mode: "new",
  });

  assert.ok(pattern.notes.length > 0);
  for (let i = 0; i < pattern.notes.length; i += 1) {
    const note = pattern.notes[i];
    const midi = core.pitchSpecToMidi(note.pitch);
    assert.equal(scale.enabledMask[core.normalizePc(midi)], true);
    for (let j = i + 1; j < pattern.notes.length; j += 1) {
      const other = pattern.notes[j];
      const overlaps =
        note.startStep < other.startStep + other.durationSteps &&
        note.startStep + note.durationSteps > other.startStep;
      assert.equal(overlaps, false);
    }
  }
});

test("transposePattern keeps notes in the instrument range", function () {
  const scale = core.createScaleDefinition(7, "mixolydian");
  const instrument = core.INSTRUMENT_PRESETS[1];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.5,
    maxLeap: 4,
    repeatRate: 0.5,
    surprise: 0.2,
    tensionCurve: "rise",
    mode: "new",
  });
  const transposed = core.transposePattern(pattern, 5, scale, instrument);
  transposed.notes.forEach(function (note) {
    const midi = core.pitchSpecToMidi(note.pitch);
    assert.ok(midi >= instrument.minMidi);
    assert.ok(midi <= instrument.maxMidi);
  });
});

test("diatonic and chromatic transposition stay distinct", function () {
  const scale = core.createScaleDefinition(0, "ionian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.createEmptyPattern({ name: "Cell", grid: 4 });
  core.upsertNote(pattern, 0, 60, { durationSteps: 1 });
  core.upsertNote(pattern, 1, 64, { durationSteps: 1 });

  const diatonic = core.diatonicTransposePattern(pattern, 1, scale, instrument);
  const chromatic = core.chromaticTransposePattern(pattern, 1, instrument);

  assert.deepEqual(
    diatonic.notes.map(function (note) {
      return core.pitchSpecToMidi(note.pitch);
    }),
    [62, 65]
  );
  assert.deepEqual(
    chromatic.notes.map(function (note) {
      return core.pitchSpecToMidi(note.pitch);
    }),
    [61, 65]
  );
});

test("fitPatternToInstrument clamps notes into the active instrument register", function () {
  const scale = core.createScaleDefinition(0, "ionian");
  const instrument = { id: "narrow", name: "Narrow", minMidi: 60, maxMidi: 67, waveform: "sine", midiProgram: 81 };
  const pattern = core.createEmptyPattern({ name: "Wide", grid: 4 });
  core.upsertNote(pattern, 0, 52, { durationSteps: 1 });
  core.upsertNote(pattern, 1, 76, { durationSteps: 1 });

  const fitted = core.fitPatternToInstrument(pattern, instrument, scale);

  assert.deepEqual(
    fitted.notes.map(function (note) {
      return core.pitchSpecToMidi(note.pitch);
    }),
    [60, 67]
  );
});

test("tail mode trends toward a lower closing register", function () {
  const scale = core.createScaleDefinition(7, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const source = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.55,
    maxLeap: 5,
    repeatRate: 0.35,
    surprise: 0.18,
    tensionCurve: "arc",
    mode: "new",
  });
  const tail = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    sourcePattern: source,
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.45,
    maxLeap: 5,
    repeatRate: 0.25,
    surprise: 0.12,
    tensionCurve: "fall",
    mode: "tail",
  });

  const mids = tail.notes.map(function (note) {
    return core.pitchSpecToMidi(note.pitch);
  });
  assert.ok(mids.length > 1);
  assert.ok(mids[mids.length - 1] <= mids[0], "expected tail to close at or below its opening pitch");
});

test("cadence mode closes on a stable chord tone", function () {
  const scale = core.createScaleDefinition(0, "ionian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const source = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.55,
    maxLeap: 5,
    repeatRate: 0.35,
    surprise: 0.18,
    tensionCurve: "rise",
    mode: "new",
  });
  const cadence = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    sourcePattern: source,
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.35,
    maxLeap: 4,
    repeatRate: 0.2,
    surprise: 0.08,
    tensionCurve: "fall",
    mode: "cadence",
  });

  const lastMidi = core.pitchSpecToMidi(cadence.notes[cadence.notes.length - 1].pitch);
  const lastPc = core.normalizePc(lastMidi);
  assert.ok(lastPc === scale.rootPc || lastPc === core.normalizePc(scale.rootPc + 7));
});

test("generator respects locked form and melodic cell", function () {
  const scale = core.createScaleDefinition(7, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.52,
    maxLeap: 5,
    repeatRate: 0.3,
    surprise: 0.12,
    tensionCurve: "arc",
    mode: "new",
    preferredFormId: "a-b-release",
    preferredCellId: "pendulum-climb",
  });

  assert.equal(pattern.generationMeta.form, "A -> B -> Release");
  assert.ok(pattern.generationMeta.blocks.length >= 3);
  pattern.generationMeta.blocks.forEach(function (block) {
    assert.equal(block.melodicCellId, "pendulum-climb");
  });
});

test("ending surprise zone weights the closing block more heavily", function () {
  const scale = core.createScaleDefinition(7, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.52,
    maxLeap: 5,
    repeatRate: 0.3,
    surprise: 0.3,
    tensionCurve: "arc",
    mode: "new",
    preferredFormId: "a-b-release",
    surpriseZone: "ending",
  });

  assert.equal(pattern.generationMeta.surpriseZone, "ending");
  assert.ok(pattern.generationMeta.blocks.length >= 3);
  assert.ok(pattern.generationMeta.blocks[2].surpriseBias > pattern.generationMeta.blocks[0].surpriseBias);
});

test("practice drill creates the requested number of drills", function () {
  const scale = core.createScaleDefinition(9, "minorPentatonic");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const sourcePattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.55,
    maxLeap: 5,
    repeatRate: 0.42,
    surprise: 0.3,
    tensionCurve: "wave",
    mode: "new",
  });
  const practice = core.generatePracticeDrill({
    sourcePattern: sourcePattern,
    scaleDefinition: scale,
    instrumentProfile: instrument,
    mode: "progression",
    difficulty: 3,
    loops: 5,
    tempoLift: 10,
  });

  assert.equal(practice.drills.length, 5);
  practice.drills.forEach(function (drill) {
    assert.ok(drill.pattern.notes.length > 0);
  });
});

test("generatePattern does not collapse into a single repeated pitch", function () {
  const scale = core.createScaleDefinition(7, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];

  for (let run = 0; run < 6; run += 1) {
    const pattern = core.generatePattern({
      pattern: core.createEmptyPattern({ grid: 16 }),
      scaleDefinition: scale,
      instrumentProfile: instrument,
      density: 0.52,
      maxLeap: 5,
      repeatRate: 0.5,
      surprise: 0.24,
      tensionCurve: "arc",
      mode: "new",
    });
    const uniqueMidis = new Set(
      pattern.notes.map(function (note) {
        return core.pitchSpecToMidi(note.pitch);
      })
    );
    assert.ok(uniqueMidis.size > 1, "expected more than one pitch in run " + run);
  }
});

test("fall tension curve trends downward", function () {
  const scale = core.createScaleDefinition(0, "ionian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.55,
    maxLeap: 5,
    repeatRate: 0.2,
    surprise: 0.05,
    tensionCurve: "fall",
    mode: "new",
  });

  const mids = pattern.notes.map(function (note) {
    return core.pitchSpecToMidi(note.pitch);
  });
  assert.ok(mids.length > 1);
  assert.ok(mids[0] >= mids[mids.length - 1], "expected first pitch to be >= last pitch");
});

test("generatePattern exposes logic blocks metadata", function () {
  const scale = core.createScaleDefinition(7, "dorian");
  const instrument = core.INSTRUMENT_PRESETS[0];
  const pattern = core.generatePattern({
    pattern: core.createEmptyPattern({ grid: 16 }),
    scaleDefinition: scale,
    instrumentProfile: instrument,
    density: 0.55,
    maxLeap: 5,
    repeatRate: 0.35,
    surprise: 0.18,
    tensionCurve: "arc",
    mode: "new",
  });

  assert.ok(pattern.generationMeta);
  assert.ok(typeof pattern.generationMeta.form === "string");
  assert.ok(Array.isArray(pattern.generationMeta.blocks));
  assert.ok(pattern.generationMeta.blocks.length >= 1);
  assert.ok(pattern.generationMeta.blocks[0].melodicCellId);
});
