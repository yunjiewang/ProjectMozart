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
