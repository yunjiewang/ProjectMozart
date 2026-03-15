(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MozartCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const MODE_INTERVALS = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  };

  const INSTRUMENT_PRESETS = [
    { id: "guitar", name: "Sky Guitar", minMidi: 40, maxMidi: 88, waveform: "triangle", midiProgram: 29 },
    { id: "bass", name: "Bubble Bass", minMidi: 28, maxMidi: 60, waveform: "square", midiProgram: 34 },
    { id: "lead", name: "Cloud Lead", minMidi: 48, maxMidi: 96, waveform: "sawtooth", midiProgram: 81 },
    { id: "flute", name: "Fairy Flute", minMidi: 60, maxMidi: 96, waveform: "sine", midiProgram: 73 },
  ];

  const MELODIC_CELLS = [
    { id: "third-weave-up", offsets: [0, 2, 3, 1, 2, 4, 5, 3], preferred: ["rise", "arc"] },
    { id: "step-crest", offsets: [0, 1, 2, 3, 2], preferred: ["rise", "wave"] },
    { id: "pendulum-climb", offsets: [0, 1, 0, 2, 1, 3], preferred: ["wave", "arc"] },
    { id: "neighbor-bloom", offsets: [0, 1, 2, 1, 0, 2, 3], preferred: ["arc", "wave"] },
    { id: "answer-fall", offsets: [0, -1, 1, 0, -2], preferred: ["fall", "arc"] },
    { id: "arc-return", offsets: [0, 2, 1, 3, 4, 2], preferred: ["arc", "fall"] },
    { id: "skip-sequence", offsets: [0, 2, 1, 3], preferred: ["rise", "arc"] },
    { id: "release-turn", offsets: [0, 1, -1, 0, -2, -1], preferred: ["fall", "wave"] },
  ];

  const RHYTHM_CELLS = {
    dense: [
      [1, 1, 1, 1, 2],
      [1, 1, 2, 1, 1],
      [1, 2, 1, 1, 1],
      [2, 1, 1, 2],
    ],
    medium: [
      [1, 1, 2, 2],
      [2, 1, 1, 2],
      [1, 2, 1, 2],
      [2, 2, 1, 1],
    ],
    sparse: [
      [2, 2, 2, 2],
      [3, 1, 2, 2],
      [2, 3, 1, 2],
      [4, 2, 2],
    ],
  };
  const LOGIC_FORM_PRESETS = {
    auto: null,
    "a-b": ["A", "B"],
    "a-b-release": ["A", "B", "Release"],
    "a-a1-b-tag": ["A", "A'", "B", "Tag"],
    "statement-sequence-release": ["Statement", "Sequence", "Release"],
    "echo-answer": ["Echo", "Answer"],
    "setup-answer-tag": ["Setup", "Answer", "Tag"],
    "release-tail": ["Release", "Tail"],
    "approach-cadence": ["Approach", "Cadence"],
    cadence: ["Cadence"],
  };
  const SURPRISE_ZONE_PRESETS = {
    auto: "auto",
    balanced: "balanced",
    middle: "middle",
    ending: "ending",
    opening: "opening",
    minimal: "minimal",
  };

  function isResponseLikeMode(mode) {
    return mode === "response" || mode === "tail" || mode === "cadence";
  }

  function isClosingMode(mode) {
    return mode === "tail" || mode === "cadence";
  }

  function createId(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizePc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function midiToPitchSpec(midi, offsetCents) {
    const normalized = clamp(Math.round(midi), 0, 127);
    return {
      pc: normalizePc(normalized % 12),
      octave: Math.floor(normalized / 12) - 1,
      offsetCents: offsetCents || 0,
      tie: false,
      slur: false,
    };
  }

  function pitchSpecToMidi(pitch) {
    return clamp((pitch.octave + 1) * 12 + normalizePc(pitch.pc), 0, 127);
  }

  function midiToLabel(midi) {
    const pitch = midiToPitchSpec(midi, 0);
    return NOTE_NAMES[pitch.pc] + pitch.octave;
  }

  function pitchSpecToLabel(pitch) {
    return NOTE_NAMES[pitch.pc] + pitch.octave + (pitch.offsetCents ? " " + pitch.offsetCents + "c" : "");
  }

  function createScaleDefinition(rootPc, modeName, customMask, pitchOffsets) {
    const mask = new Array(12).fill(false);
    const intervals = MODE_INTERVALS[modeName] || MODE_INTERVALS.ionian;
    intervals.forEach(function (interval) {
      mask[normalizePc(rootPc + interval)] = true;
    });

    return {
      rootPc: normalizePc(rootPc),
      modeName: modeName,
      enabledMask: Array.isArray(customMask) && customMask.length === 12 ? customMask.slice() : mask,
      pitchOffsets: Array.isArray(pitchOffsets) && pitchOffsets.length === 12 ? pitchOffsets.slice() : new Array(12).fill(0),
    };
  }

  function createEmptyPattern(options) {
    const opts = options || {};
    return {
      id: createId("pattern"),
      name: opts.name || "New Pattern",
      numerator: opts.numerator || 4,
      denominator: opts.denominator || 4,
      grid: opts.grid || 16,
      notes: [],
    };
  }

  function sortNotes(notes) {
    return notes.slice().sort(function (a, b) {
      if (a.startStep !== b.startStep) {
        return a.startStep - b.startStep;
      }
      return pitchSpecToMidi(b.pitch) - pitchSpecToMidi(a.pitch);
    });
  }

  function ensureMonophonic(pattern) {
    const sorted = sortNotes(pattern.notes);
    const monophonic = [];
    sorted.forEach(function (note) {
      const start = note.startStep;
      const end = note.startStep + note.durationSteps;
      const overlapIndex = monophonic.findIndex(function (existing) {
        const existingStart = existing.startStep;
        const existingEnd = existing.startStep + existing.durationSteps;
        return start < existingEnd && end > existingStart;
      });
      if (overlapIndex >= 0) {
        const overlapping = monophonic[overlapIndex];
        if (start <= overlapping.startStep) {
          monophonic.splice(overlapIndex, 1);
        } else {
          overlapping.durationSteps = Math.max(1, start - overlapping.startStep);
        }
      }
      monophonic.push(note);
    });
    pattern.notes = sortNotes(monophonic);
    return pattern;
  }

  function upsertNote(pattern, step, midi, options) {
    const opts = options || {};
    const existing = pattern.notes.find(function (note) {
      return note.startStep === step;
    });
    const pitch = midiToPitchSpec(midi, opts.offsetCents || 0);
    const nextNote = {
      id: existing ? existing.id : createId("note"),
      pitch: pitch,
      startStep: step,
      durationSteps: clamp(opts.durationSteps || (existing ? existing.durationSteps : 1), 1, pattern.grid),
      velocity: clamp(opts.velocity || (existing ? existing.velocity : 92), 1, 127),
      articulation: opts.articulation || (existing ? existing.articulation : "normal"),
    };

    pattern.notes = pattern.notes.filter(function (note) {
      return note.id !== nextNote.id;
    });
    pattern.notes.push(nextNote);
    return ensureMonophonic(pattern);
  }

  function removeNote(pattern, noteId) {
    pattern.notes = pattern.notes.filter(function (note) {
      return note.id !== noteId;
    });
    return pattern;
  }

  function getAllowedMidiNotes(scaleDefinition, instrumentProfile) {
    const list = [];
    for (let midi = instrumentProfile.minMidi; midi <= instrumentProfile.maxMidi; midi += 1) {
      if (scaleDefinition.enabledMask[normalizePc(midi)]) {
        list.push(midi);
      }
    }
    return list;
  }

  function chooseDuration(available, surprise) {
    const pool = [1, 1, 1, 2, 2, 3, 4];
    if (surprise > 0.55) {
      pool.push(1, 3, 4, 4);
    }
    let duration = pool[Math.floor(Math.random() * pool.length)];
    if (Math.random() < surprise * 0.35) {
      duration += 1;
    }
    return clamp(duration, 1, available);
  }

  function buildContourValue(mode, progress) {
    if (mode === "rise") {
      return progress;
    }
    if (mode === "fall") {
      return 1 - progress;
    }
    if (mode === "wave") {
      return (Math.sin(progress * Math.PI * 2) + 1) / 2;
    }
    return Math.sin(progress * Math.PI);
  }

  function stepsPerBeat(pattern) {
    return Math.max(1, Math.round(16 / pattern.denominator));
  }

  function stepsPerBar(pattern) {
    return Math.max(1, pattern.numerator * stepsPerBeat(pattern));
  }

  function stepDurationSeconds(bpm) {
    return (60 / bpm) / 4;
  }

  function buildScaleLadder(scaleDefinition, instrumentProfile) {
    return getAllowedMidiNotes(scaleDefinition, instrumentProfile).slice().sort(function (a, b) {
      return a - b;
    });
  }

  function findClosestLadderIndex(scaleLadder, midi) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    scaleLadder.forEach(function (candidate, index) {
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function pickRhythmCell(settings) {
    const bucket = settings.density > 0.72 ? "dense" : settings.density < 0.4 ? "sparse" : "medium";
    const pool = RHYTHM_CELLS[bucket];
    return pool[Math.floor(Math.random() * pool.length)].slice();
  }

  function buildRhythmPlan(totalSteps, settings) {
    const plan = [];
    let used = 0;

    while (used < totalSteps) {
      const cell = pickRhythmCell(settings);
      for (let index = 0; index < cell.length && used < totalSteps; index += 1) {
        let duration = cell[index];
        if (Math.random() < settings.surprise * 0.12) {
          duration += Math.random() > 0.5 ? 1 : 0;
        }
        duration = clamp(duration, 1, totalSteps - used);
        plan.push(duration);
        used += duration;
      }
    }

    if (plan.length && used > totalSteps) {
      plan[plan.length - 1] -= used - totalSteps;
    }

    return plan.filter(function (duration) {
      return duration > 0;
    });
  }

  function pickMelodicCell(settings, mode) {
    const preferredPool = MELODIC_CELLS.filter(function (cell) {
      if (!isResponseLikeMode(mode) && settings.tensionCurve !== "fall" && cell.id === "answer-fall") {
        return false;
      }
      return cell.preferred.indexOf(settings.tensionCurve) >= 0;
    });
    const responsePool = isResponseLikeMode(mode)
      ? preferredPool.filter(function (cell) {
          return cell.id === "answer-fall" || cell.id === "arc-return" || cell.id === "release-turn";
        })
      : preferredPool;
    const pool = responsePool.length ? responsePool : preferredPool.length ? preferredPool : MELODIC_CELLS;
    return deepClone(pool[Math.floor(Math.random() * pool.length)]);
  }

  function getMelodicCellById(cellId) {
    return MELODIC_CELLS.find(function (cell) {
      return cell.id === cellId;
    }) || null;
  }

  function resolveSurpriseZone(mode, preferredZone) {
    if (preferredZone && preferredZone !== "auto") {
      return preferredZone;
    }
    if (mode === "tail" || mode === "cadence") {
      return "ending";
    }
    if (mode === "continuation") {
      return "middle";
    }
    return "balanced";
  }

  function getSurpriseBiasForSlot(zone, slot, blockIndex, blockCount) {
    const isOpening = blockIndex === 0;
    const isEnding = blockIndex === blockCount - 1;
    const isMiddle = blockIndex > 0 && blockIndex < blockCount - 1;
    const slotWeights = {
      Sequence: 1.2,
      Bridge: 1.15,
      B: 1.05,
      C: 1.1,
      Answer: 1.05,
      Release: 0.95,
      Tail: 0.9,
      Cadence: 0.82,
      Tag: 0.92,
      Approach: 0.98,
    };
    const slotWeight = slotWeights[slot] == null ? 1 : slotWeights[slot];

    if (zone === "minimal") {
      return 0.28 * slotWeight;
    }
    if (zone === "opening") {
      return (isOpening ? 1.18 : isMiddle ? 0.72 : 0.52) * slotWeight;
    }
    if (zone === "middle") {
      return (isMiddle ? 1.22 : isEnding ? 0.58 : 0.68) * slotWeight;
    }
    if (zone === "ending") {
      return (isEnding ? 1.28 : isMiddle ? 0.72 : 0.45) * slotWeight;
    }
    return 1 * slotWeight;
  }

  function transformMelodicCell(cell, settings, mode) {
    const offsets = cell.offsets.slice();
    if (mode === "cadence") {
      return offsets.map(function (offset, index) {
        const downward = offset > 0 ? -offset : offset;
        if (index === offsets.length - 1) {
          return Math.min(downward, -2);
        }
        return downward;
      });
    }
    if (mode === "tail") {
      return offsets.map(function (offset, index) {
        const downward = offset > 0 ? -offset : offset;
        return index % 3 === 1 ? downward + 1 : downward;
      });
    }
    if (mode === "response") {
      return offsets.map(function (offset) {
        return offset > 0 ? -offset : offset;
      });
    }
    if (settings.tensionCurve === "fall") {
      return offsets.map(function (offset) {
        return -offset;
      });
    }
    if (Math.random() < settings.surprise * 0.18) {
      return offsets.slice().reverse();
    }
    if (Math.random() < settings.surprise * 0.14) {
      return offsets.map(function (offset, index) {
        return index % 2 === 0 ? offset : offset + 1;
      });
    }
    return offsets;
  }

  function chooseAnchorShift(settings, mode) {
    if (mode === "cadence") {
      return -2;
    }
    if (mode === "tail") {
      return -1;
    }
    if (mode === "response") {
      return -1;
    }
    if (settings.tensionCurve === "rise") {
      return 1;
    }
    if (settings.tensionCurve === "fall") {
      return -1;
    }
    if (settings.tensionCurve === "wave") {
      return Math.random() > 0.5 ? 1 : -1;
    }
    return 0;
  }

  function buildDegreePlan(scaleLadder, noteCount, settings, mode, seedMidi) {
    if (!scaleLadder.length || noteCount <= 0) {
      return [];
    }

    const anchorBiasMap = {
      rise: 0.28,
      fall: 0.72,
      wave: 0.5,
      arc: 0.38,
    };
    const anchorBias = anchorBiasMap[settings.tensionCurve] == null ? 0.42 : anchorBiasMap[settings.tensionCurve];
    const midIndex = Math.floor(scaleLadder.length * anchorBias);
    let anchorIndex = seedMidi == null ? clamp(midIndex, 0, scaleLadder.length - 1) : findClosestLadderIndex(scaleLadder, seedMidi);
    const plan = [];

    while (plan.length < noteCount) {
      const cell = pickMelodicCell(settings, mode);
      const offsets = transformMelodicCell(cell, settings, mode);
      for (let index = 0; index < offsets.length && plan.length < noteCount; index += 1) {
        const degreeIndex = clamp(anchorIndex + offsets[index], 0, scaleLadder.length - 1);
        if (!plan.length || degreeIndex !== plan[plan.length - 1] || Math.random() < settings.surprise * 0.08) {
          plan.push(degreeIndex);
        }
      }
      anchorIndex = clamp(
        (plan.length ? plan[plan.length - 1] : anchorIndex) + chooseAnchorShift(settings, mode),
        0,
        scaleLadder.length - 1
      );
    }

    return plan.slice(0, noteCount);
  }

  function chooseLogicForm(remainingSteps, mode, preferredFormId) {
    if (preferredFormId && preferredFormId !== "auto" && LOGIC_FORM_PRESETS[preferredFormId]) {
      return deepClone(LOGIC_FORM_PRESETS[preferredFormId]);
    }
    if (mode === "cadence") {
      return remainingSteps >= 12 ? ["Approach", "Cadence"] : ["Cadence"];
    }
    if (mode === "tail") {
      return remainingSteps >= 12 ? ["Release", "Tail"] : ["Tail"];
    }
    if (mode === "response") {
      return Math.random() > 0.5 ? ["Echo", "Answer"] : ["Setup", "Answer", "Tag"];
    }
    if (remainingSteps >= 18) {
      return deepClone([
        ["A", "B", "C"],
        ["A", "A'", "B", "Tag"],
        ["A", "Bridge", "B"],
        ["Statement", "Sequence", "Release"],
      ][Math.floor(Math.random() * 4)]);
    }
    if (remainingSteps >= 12) {
      return deepClone([
        ["A", "B"],
        ["A", "B", "Release"],
        ["A", "A'", "Release"],
        ["Statement", "Sequence", "Release"],
      ][Math.floor(Math.random() * 4)]);
    }
    return Math.random() > 0.5 ? ["A", "Release"] : ["Statement", "Release"];
  }

  function splitStepsAcrossBlocks(totalSteps, form) {
    const blockCount = Math.max(1, form.length);
    const base = Math.floor(totalSteps / blockCount);
    const remainder = totalSteps % blockCount;
    return form.map(function (_, index) {
      return base + (index < remainder ? 1 : 0);
    });
  }

  function chooseSecondaryCell(primaryCell, settings, mode) {
    const fallback = pickMelodicCell(settings, mode);
    const differentCell = MELODIC_CELLS.find(function (cell) {
      return cell.id !== primaryCell.id && cell.preferred.indexOf(settings.tensionCurve) >= 0;
    });
    return deepClone(differentCell || fallback);
  }

  function buildBlockDurations(targetSteps, rhythmSeed, settings, variant) {
    const durations = [];
    let used = 0;
    let pointer = 0;
    while (used < targetSteps) {
      let duration = rhythmSeed[pointer % rhythmSeed.length];
      if ((variant === "A'" || variant === "Sequence") && pointer % 3 === 1) {
        duration = Math.max(1, duration - 1);
      }
      if ((variant === "Answer" || variant === "Release" || variant === "Tag") && pointer === rhythmSeed.length - 1) {
        duration += 1;
      }
      if ((variant === "Tail" || variant === "Cadence") && used + duration >= targetSteps) {
        duration = Math.max(duration, Math.min(4, targetSteps - used));
      }
      if (variant === "Approach" && pointer % 2 === 0) {
        duration = Math.max(1, duration - 1);
      }
      if (variant === "Bridge" && pointer % 2 === 0) {
        duration = Math.min(duration + 1, targetSteps - used);
      }
      if (Math.random() < settings.surprise * 0.08) {
        duration += Math.random() > 0.5 ? 1 : 0;
      }
      duration = clamp(duration, 1, targetSteps - used);
      durations.push(duration);
      used += duration;
      pointer += 1;
    }
    return durations;
  }

  function buildBlockOffsets(cell, count, variant, settings, mode) {
    const transformed = transformMelodicCell(cell, settings, mode);
    const offsets = [];
    for (let index = 0; index < count; index += 1) {
      const cycleIndex = Math.floor(index / transformed.length);
      let offset = transformed[index % transformed.length] + cycleIndex * chooseAnchorShift(settings, mode);
      if ((variant === "A'" || variant === "Sequence") && index % 4 === 1) {
        offset += settings.tensionCurve === "fall" ? -1 : 1;
      }
      if (variant === "Tail") {
        offset = Math.min(offset, 0) - (index === count - 1 ? 1 : 0);
      }
      if (variant === "Cadence") {
        offset = Math.min(offset, -Math.floor(index / 2));
      }
      if (variant === "Approach" && index === count - 1) {
        offset = Math.min(offset, -1);
      }
      if (variant === "Bridge" && index % 3 === 2) {
        offset += settings.tensionCurve === "fall" ? -2 : 2;
      }
      if (variant === "Answer" || variant === "Release" || variant === "Tag" || variant === "Tail" || variant === "Cadence") {
        offset = Math.min(offset, transformed[Math.min(index % transformed.length, transformed.length - 1)]);
      }
      offsets.push(offset);
    }
    return offsets;
  }

  function buildLogicBlocks(totalSteps, settings, mode, scaleLadder, seedMidi) {
    const form = chooseLogicForm(totalSteps, mode, settings.preferredFormId);
    const surpriseZone = resolveSurpriseZone(mode, settings.surpriseZone);
    const sectionSteps = splitStepsAcrossBlocks(totalSteps, form);
    const lockedCell = settings.preferredCellId ? getMelodicCellById(settings.preferredCellId) : null;
    const primaryCell = lockedCell ? deepClone(lockedCell) : pickMelodicCell(settings, mode);
    const secondaryCell = lockedCell ? deepClone(lockedCell) : chooseSecondaryCell(primaryCell, settings, mode);
    const tertiaryCell = lockedCell ? deepClone(lockedCell) : chooseSecondaryCell(secondaryCell, settings, mode);
    const primaryRhythm = pickRhythmCell(settings);
    const secondaryRhythm = pickRhythmCell(settings);
    const tertiaryRhythm = pickRhythmCell(settings);
    const blocks = [];
    let anchorIndex =
      seedMidi == null
        ? clamp(Math.floor(scaleLadder.length * (settings.tensionCurve === "fall" ? 0.72 : 0.36)), 0, scaleLadder.length - 1)
        : findClosestLadderIndex(scaleLadder, seedMidi);

    form.forEach(function (slot, index) {
      let cell = primaryCell;
      let rhythm = primaryRhythm;
      if (slot === "B" || slot === "Answer" || slot === "Release" || slot === "Tag") {
        cell = secondaryCell;
        rhythm = secondaryRhythm;
      } else if (slot === "C" || slot === "Bridge" || slot === "Sequence") {
        cell = tertiaryCell;
        rhythm = tertiaryRhythm;
      }
      const surpriseBias = getSurpriseBiasForSlot(surpriseZone, slot, index, form.length);
      const blockSettings = Object.assign({}, settings, {
        surprise: clamp(settings.surprise * surpriseBias, 0, 1),
      });
      const durations = buildBlockDurations(sectionSteps[index], rhythm, blockSettings, slot);
      const offsets = buildBlockOffsets(cell, durations.length, slot, blockSettings, mode);
      const blockDegrees = [];

      offsets.forEach(function (offset) {
        const degreeIndex = clamp(anchorIndex + offset, 0, scaleLadder.length - 1);
        blockDegrees.push(degreeIndex);
      });

      anchorIndex = clamp(
        (blockDegrees.length ? blockDegrees[blockDegrees.length - 1] : anchorIndex) + chooseAnchorShift(settings, mode),
        0,
        scaleLadder.length - 1
      );

      blocks.push({
        slot: slot,
        melodicCellId: cell.id,
        melodicOffsets: offsets,
        rhythmCell: rhythm.slice(),
        durations: durations,
        degreeIndexes: blockDegrees,
        surpriseBias: surpriseBias,
      });
    });

    return {
      form: form.join(" -> "),
      surpriseZone: surpriseZone,
      blocks: blocks,
    };
  }

  function pickCandidate(candidates, previousMidi, motifMemory, settings, tensionValue, usageCounts) {
    const recentMemory = motifMemory.slice(-4);
    const scored = candidates.map(function (midi) {
      const distance = previousMidi == null ? 0 : Math.abs(midi - previousMidi);
      const memoryHit = recentMemory.includes(normalizePc(midi)) ? 1 : 0;
      const registerBias = midi / 127;
      const tensionBias = Math.abs(registerBias - tensionValue);
      const repeatBias = previousMidi != null && midi === previousMidi ? 1 : 0;
      const usageCount = usageCounts[midi] || 0;
      const motionPreference =
        previousMidi == null
          ? 0.25
          : 1 - Math.abs(distance - Math.max(2, Math.floor(settings.maxLeap * 0.5))) / Math.max(settings.maxLeap, 1);
      const score =
        clamp(motionPreference, 0, 1) * 0.32 +
        memoryHit * settings.repeatRate * 0.1 +
        (1 - tensionBias) * 0.28 +
        (previousMidi != null && distance > 0 ? 0.16 : 0) -
        repeatBias * (0.34 + settings.repeatRate * 0.12) -
        usageCount * 0.1 +
        Math.random() * (0.18 + settings.surprise * 0.28);
      return { midi: midi, score: score };
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    const topCount = clamp(1 + Math.floor(settings.surprise * 4), 1, scored.length);
    return scored[Math.floor(Math.random() * topCount)].midi;
  }

  function enforceMelodicVariety(notes, allowedMidis) {
    if (notes.length < 2) {
      return notes;
    }

    const uniqueMidis = Array.from(new Set(notes.map(function (note) {
      return pitchSpecToMidi(note.pitch);
    })));
    if (uniqueMidis.length >= 2) {
      return notes;
    }

    const pivot = uniqueMidis[0];
    const alternatives = allowedMidis
      .filter(function (midi) {
        return midi !== pivot;
      })
      .sort(function (a, b) {
        return Math.abs(a - pivot) - Math.abs(b - pivot);
      });

    if (!alternatives.length) {
      return notes;
    }

    for (let index = 1; index < notes.length; index += 2) {
      const nextMidi = alternatives[Math.min(alternatives.length - 1, Math.floor(index / 2))];
      notes[index].pitch = midiToPitchSpec(nextMidi, notes[index].pitch.offsetCents);
    }

    return notes;
  }

  function noteOffsetForPc(scaleDefinition, midi) {
    return scaleDefinition.pitchOffsets[normalizePc(midi)] || 0;
  }

  function createPatternFromNotes(basePattern, notes, name, generationMeta) {
    return ensureMonophonic({
      id: createId("pattern"),
      name: name || basePattern.name,
      numerator: basePattern.numerator,
      denominator: basePattern.denominator,
      grid: basePattern.grid,
      notes: notes,
      generationMeta: generationMeta == null ? basePattern.generationMeta || null : generationMeta,
    });
  }

  function findNearestMidi(candidates, targetMidi) {
    if (!candidates.length) {
      return targetMidi;
    }
    return candidates.reduce(function (best, candidate) {
      if (Math.abs(candidate - targetMidi) < Math.abs(best - targetMidi)) {
        return candidate;
      }
      return best;
    }, candidates[0]);
  }

  function fitPatternToInstrument(pattern, instrumentProfile, scaleDefinition) {
    const allowed = scaleDefinition ? getAllowedMidiNotes(scaleDefinition, instrumentProfile) : [];
    const notes = pattern.notes.map(function (note) {
      const rawMidi = pitchSpecToMidi(note.pitch);
      let targetMidi = clamp(rawMidi, instrumentProfile.minMidi, instrumentProfile.maxMidi);
      if (allowed.length) {
        targetMidi = findNearestMidi(allowed, targetMidi);
      }
      return {
        id: note.id || createId("note"),
        pitch: midiToPitchSpec(targetMidi, note.pitch.offsetCents),
        startStep: note.startStep,
        durationSteps: note.durationSteps,
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name, pattern.generationMeta || null);
  }

  function createSeedNotes(sourcePattern, mode, settings) {
    const sourceNotes = sortNotes(sourcePattern.notes);
    if (!sourceNotes.length) {
      return [];
    }

    if (mode === "variation") {
      return sourceNotes.map(function (note, index) {
        const shift = Math.random() < settings.surprise ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const durationShift = Math.random() < settings.surprise * 0.45 ? 1 : 0;
        return {
          id: createId("note"),
          pitch: midiToPitchSpec(pitchSpecToMidi(note.pitch) + shift, note.pitch.offsetCents),
          startStep: clamp(note.startStep + (index % 2 === 0 ? 0 : shift), 0, sourcePattern.grid - 1),
          durationSteps: clamp(note.durationSteps + durationShift, 1, sourcePattern.grid),
          velocity: clamp(note.velocity + (Math.random() < 0.4 ? 6 : -3), 40, 127),
          articulation: note.articulation,
        };
      });
    }

    if (mode === "continuation") {
      const half = Math.floor(sourcePattern.grid / 2);
      return sourceNotes
        .filter(function (note) {
          return note.startStep < half;
        })
        .map(function (note) {
          return deepClone(note);
        });
    }

    return [];
  }

  function deriveResponseSeedMidi(sourcePattern, instrumentProfile) {
    const sourceNotes = sortNotes(sourcePattern.notes);
    if (!sourceNotes.length) {
      return Math.round((instrumentProfile.minMidi + instrumentProfile.maxMidi) / 2);
    }
    const pivotIndex = Math.max(0, Math.floor(sourceNotes.length / 2) - 1);
    return pitchSpecToMidi(sourceNotes[pivotIndex].pitch);
  }

  function deriveModeSeedMidi(sourcePattern, instrumentProfile, mode) {
    const sourceNotes = sortNotes(sourcePattern.notes);
    if (!sourceNotes.length) {
      return Math.round((instrumentProfile.minMidi + instrumentProfile.maxMidi) / 2);
    }
    if (mode === "cadence") {
      return pitchSpecToMidi(sourceNotes[sourceNotes.length - 1].pitch);
    }
    if (mode === "tail") {
      return pitchSpecToMidi(sourceNotes[sourceNotes.length - 1].pitch);
    }
    if (mode === "response") {
      return deriveResponseSeedMidi(sourcePattern, instrumentProfile);
    }
    return pitchSpecToMidi(sourceNotes[sourceNotes.length - 1].pitch);
  }

  function finalizeClosingNote(notes, mode, allowedMidis, scaleDefinition, patternGrid) {
    if (!notes.length || !allowedMidis.length || !isClosingMode(mode)) {
      return;
    }
    const last = notes[notes.length - 1];
    const rootPc = scaleDefinition.rootPc;
    const fifthPc = normalizePc(scaleDefinition.rootPc + 7);
    const thirdPc = normalizePc(scaleDefinition.rootPc + 4);
    const targets = allowedMidis.filter(function (midi) {
      const pc = normalizePc(midi);
      if (mode === "cadence") {
        return pc === rootPc || pc === fifthPc;
      }
      return pc === rootPc || pc === thirdPc || pc === fifthPc;
    });
    if (!targets.length) {
      return;
    }
    const nearest = findNearestMidi(targets, pitchSpecToMidi(last.pitch));
    last.pitch = midiToPitchSpec(nearest, last.pitch.offsetCents);
    last.durationSteps = clamp(
      Math.max(last.durationSteps, Math.min(4, 1 + Math.floor(notes.length / 3))),
      1,
      Math.max(1, patternGrid - last.startStep)
    );
    if (mode === "cadence") {
      last.articulation = "legato";
      last.velocity = clamp(last.velocity + 6, 48, 124);
    }
  }

  function enforceFallContour(notes, allowedMidis) {
    if (notes.length < 2 || !allowedMidis.length) {
      return;
    }
    const firstMidi = pitchSpecToMidi(notes[0].pitch);
    const last = notes[notes.length - 1];
    const lastMidi = pitchSpecToMidi(last.pitch);
    if (lastMidi <= firstMidi) {
      return;
    }
    const lowerTargets = allowedMidis.filter(function (midi) {
      return midi <= firstMidi;
    });
    if (!lowerTargets.length) {
      return;
    }
    const targetMidi = findNearestMidi(lowerTargets, Math.min(lastMidi, firstMidi));
    last.pitch = midiToPitchSpec(targetMidi, last.pitch.offsetCents);
  }

  function generatePattern(config) {
    const sourcePattern = config.sourcePattern || null;
    const patternTemplate = config.pattern || createEmptyPattern();
    const settings = {
      density: clamp(config.density == null ? 0.55 : config.density, 0.1, 1),
      maxLeap: clamp(config.maxLeap || 5, 1, 12),
      repeatRate: clamp(config.repeatRate == null ? 0.45 : config.repeatRate, 0, 0.95),
      surprise: clamp(config.surprise == null ? 0.25 : config.surprise, 0, 1),
      tensionCurve: config.tensionCurve || "arc",
      preferredFormId: config.preferredFormId || "auto",
      preferredCellId: config.preferredCellId || "auto",
      surpriseZone: config.surpriseZone || "auto",
    };
    const mode = config.mode || "new";
    const allowedMidis = getAllowedMidiNotes(config.scaleDefinition, config.instrumentProfile);
    const scaleLadder = buildScaleLadder(config.scaleDefinition, config.instrumentProfile);
    const notes = createSeedNotes(sourcePattern || patternTemplate, mode, settings);
    const seedMidi =
      isResponseLikeMode(mode) ? deriveModeSeedMidi(sourcePattern || patternTemplate, config.instrumentProfile, mode) : null;
    let step = notes.reduce(function (max, note) {
      return Math.max(max, note.startStep + note.durationSteps);
    }, 0);
    let previousMidi = notes.length ? pitchSpecToMidi(notes[notes.length - 1].pitch) : seedMidi;
    const remainingSteps = Math.max(0, patternTemplate.grid - step);
    const logicPlan = buildLogicBlocks(remainingSteps, settings, mode, scaleLadder, previousMidi);

    logicPlan.blocks.forEach(function (block) {
      block.degreeIndexes.forEach(function (degreeIndex, noteIndex) {
        if (step >= patternTemplate.grid) {
          return;
        }

        const duration = block.durations[noteIndex];
        const progress = step / Math.max(patternTemplate.grid - 1, 1);
        const tensionValue = buildContourValue(settings.tensionCurve, progress);
        let midi = scaleLadder[degreeIndex];

        if (previousMidi != null) {
          const leap = Math.abs(midi - previousMidi);
          if (leap > settings.maxLeap + settings.surprise * 2) {
            const constrained = scaleLadder.filter(function (candidate) {
              return candidate !== previousMidi && Math.abs(candidate - previousMidi) <= settings.maxLeap + 1;
            });
            if (constrained.length) {
              midi = constrained[0];
            }
          }
        }

        if (Math.random() < settings.surprise * 0.08) {
          const ladderIndex = findClosestLadderIndex(scaleLadder, midi);
          midi = scaleLadder[clamp(ladderIndex + (Math.random() > 0.5 ? 1 : -1), 0, scaleLadder.length - 1)];
        }

        const offsetCents =
          noteOffsetForPc(config.scaleDefinition, midi) +
          (Math.random() < settings.surprise * 0.12 ? (Math.random() > 0.5 ? 10 : -10) : 0);

        notes.push({
          id: createId("note"),
          pitch: midiToPitchSpec(midi, offsetCents),
          startStep: step,
          durationSteps: clamp(duration, 1, patternTemplate.grid - step),
          velocity: clamp(76 + Math.round(tensionValue * 30) + Math.round(Math.random() * 10), 48, 124),
          articulation: noteIndex === 0 ? "accent" : "normal",
        });
        previousMidi = midi;
        step += duration;
      });
    });

    if (mode === "response" && notes.length) {
      const cadence = allowedMidis.filter(function (midi) {
        const pc = normalizePc(midi);
        return pc === config.scaleDefinition.rootPc || pc === normalizePc(config.scaleDefinition.rootPc + 4);
      });
      if (cadence.length) {
        const last = notes[notes.length - 1];
        last.pitch = midiToPitchSpec(cadence[Math.floor(Math.random() * cadence.length)], last.pitch.offsetCents);
      }
    }

    finalizeClosingNote(notes, mode, allowedMidis, config.scaleDefinition, patternTemplate.grid);
    if (settings.tensionCurve === "fall") {
      enforceFallContour(notes, allowedMidis);
    }

    enforceMelodicVariety(notes, allowedMidis);

    return createPatternFromNotes(
      patternTemplate,
      notes,
      mode === "new" ? "Generated Pattern" : "Generated " + mode,
      {
        form: logicPlan.form,
        preferredFormId: settings.preferredFormId,
        preferredCellId: settings.preferredCellId,
        surpriseZone: logicPlan.surpriseZone,
        blocks: logicPlan.blocks.map(function (block) {
          return {
            slot: block.slot,
            melodicCellId: block.melodicCellId,
            rhythmCell: block.rhythmCell.join("-"),
            noteCount: block.degreeIndexes.length,
            surpriseBias: block.surpriseBias,
          };
        }),
      }
    );
  }

  function transposePattern(pattern, semitones, scaleDefinition, instrumentProfile) {
    const allowed = getAllowedMidiNotes(scaleDefinition, instrumentProfile);
    const allowedSet = new Set(allowed);
    const notes = pattern.notes.map(function (note) {
      let target = pitchSpecToMidi(note.pitch) + semitones;
      while (!allowedSet.has(target) && target > instrumentProfile.minMidi && target < instrumentProfile.maxMidi) {
        target += semitones >= 0 ? 1 : -1;
      }
      target = clamp(target, instrumentProfile.minMidi, instrumentProfile.maxMidi);
      return {
        id: createId("note"),
        pitch: midiToPitchSpec(target, note.pitch.offsetCents),
        startStep: note.startStep,
        durationSteps: note.durationSteps,
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name + " +" + semitones);
  }

  function chromaticTransposePattern(pattern, semitones, instrumentProfile) {
    const notes = pattern.notes.map(function (note) {
      const target = clamp(pitchSpecToMidi(note.pitch) + semitones, instrumentProfile.minMidi, instrumentProfile.maxMidi);
      return {
        id: createId("note"),
        pitch: midiToPitchSpec(target, note.pitch.offsetCents),
        startStep: note.startStep,
        durationSteps: note.durationSteps,
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name + " chromatic " + semitones);
  }

  function diatonicTransposePattern(pattern, degreeSteps, scaleDefinition, instrumentProfile) {
    const scaleLadder = buildScaleLadder(scaleDefinition, instrumentProfile);
    const notes = pattern.notes.map(function (note) {
      const currentMidi = pitchSpecToMidi(note.pitch);
      const currentIndex = findClosestLadderIndex(scaleLadder, currentMidi);
      const targetIndex = clamp(currentIndex + degreeSteps, 0, scaleLadder.length - 1);
      const targetMidi = scaleLadder[targetIndex];
      return {
        id: createId("note"),
        pitch: midiToPitchSpec(targetMidi, note.pitch.offsetCents),
        startStep: note.startStep,
        durationSteps: note.durationSteps,
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name + " degree " + degreeSteps);
  }

  function reversePattern(pattern) {
    const notes = pattern.notes.map(function (note) {
      return {
        id: createId("note"),
        pitch: deepClone(note.pitch),
        startStep: clamp(pattern.grid - (note.startStep + note.durationSteps), 0, pattern.grid - 1),
        durationSteps: note.durationSteps,
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name + " Reverse");
  }

  function stretchPattern(pattern, factor) {
    const nextGrid = clamp(pattern.grid * factor, pattern.grid, 64);
    const notes = pattern.notes.map(function (note) {
      return {
        id: createId("note"),
        pitch: deepClone(note.pitch),
        startStep: note.startStep * factor,
        durationSteps: clamp(note.durationSteps * factor, 1, nextGrid),
        velocity: note.velocity,
        articulation: note.articulation,
      };
    });
    return ensureMonophonic({
      id: createId("pattern"),
      name: pattern.name + " x" + factor,
      numerator: pattern.numerator,
      denominator: pattern.denominator,
      grid: nextGrid,
      notes: notes,
    });
  }

  function organicHumanize(pattern, scaleDefinition) {
    const notes = pattern.notes.map(function (note, index) {
      const swing = index % 2 === 1 ? 1 : 0;
      const baseMidi = pitchSpecToMidi(note.pitch);
      const pcOffset = scaleDefinition.pitchOffsets[normalizePc(baseMidi)] || 0;
      return {
        id: createId("note"),
        pitch: midiToPitchSpec(baseMidi, clamp(note.pitch.offsetCents + pcOffset + (Math.random() > 0.5 ? 5 : -5), -100, 100)),
        startStep: clamp(note.startStep + swing, 0, pattern.grid - 1),
        durationSteps: note.durationSteps,
        velocity: clamp(note.velocity + (Math.random() > 0.5 ? 8 : -8), 40, 127),
        articulation: index % 3 === 0 ? "accent" : note.articulation,
      };
    });
    return createPatternFromNotes(pattern, notes, pattern.name + " Organic");
  }

  function createMotifFromPattern(pattern, metadata) {
    const meta = metadata || {};
    return {
      id: createId("motif"),
      name: meta.name || pattern.name,
      tags: meta.tags || [],
      difficulty: meta.difficulty || 2,
      style: meta.style || "lyrical",
      sourcePattern: deepClone(pattern),
      recommendedUse: meta.recommendedUse || "idea starter",
      provenance: meta.provenance || "generator",
    };
  }

  function createEmptyPhraseSequence() {
    return {
      id: createId("phrase"),
      blocks: [],
    };
  }

  function addMotifToPhrase(sequence, motif, transform) {
    sequence.blocks.push({
      id: createId("block"),
      motifId: motif.id,
      motifName: motif.name,
      transform: Object.assign({ diatonicShift: 0, chromaticShift: 0, reverse: false, stretch: 1 }, transform || {}),
    });
    return sequence;
  }

  function transformPattern(pattern, transform, scaleDefinition, instrumentProfile) {
    const normalizedTransform = Object.assign(
      { diatonicShift: 0, chromaticShift: 0, reverse: false, stretch: 1 },
      transform || {}
    );
    if (normalizedTransform.chromaticShift === 0 && normalizedTransform.transpose) {
      normalizedTransform.chromaticShift = normalizedTransform.transpose;
    }
    let next = deepClone(pattern);
    if (normalizedTransform.diatonicShift) {
      next = diatonicTransposePattern(next, normalizedTransform.diatonicShift, scaleDefinition, instrumentProfile);
    }
    if (normalizedTransform.chromaticShift) {
      next = chromaticTransposePattern(next, normalizedTransform.chromaticShift, instrumentProfile);
    }
    if (normalizedTransform.reverse) {
      next = reversePattern(next);
    }
    if (normalizedTransform.stretch && normalizedTransform.stretch !== 1) {
      next = stretchPattern(next, normalizedTransform.stretch);
    }
    return next;
  }

  function flattenPhraseSequence(sequence, motifLibrary, scaleDefinition, instrumentProfile) {
    const template = createEmptyPattern({ name: "Phrase", grid: 0 });
    let offset = 0;
    const notes = [];
    sequence.blocks.forEach(function (block) {
      const motif = motifLibrary.find(function (item) {
        return item.id === block.motifId;
      });
      if (!motif) {
        return;
      }
      const transformed = transformPattern(motif.sourcePattern, block.transform, scaleDefinition, instrumentProfile);
      transformed.notes.forEach(function (note) {
        const clone = deepClone(note);
        clone.id = createId("note");
        clone.startStep += offset;
        notes.push(clone);
      });
      offset += transformed.grid;
    });
    template.grid = Math.max(offset, 1);
    template.notes = notes;
    return fitPatternToInstrument(ensureMonophonic(template), instrumentProfile, scaleDefinition);
  }

  function generatePracticeDrill(options) {
    const sourcePattern = options.sourcePattern;
    const scaleDefinition = options.scaleDefinition;
    const instrumentProfile = options.instrumentProfile;
    const mode = options.mode || "progression";
    const difficulty = clamp(options.difficulty || 2, 1, 5);
    const loops = clamp(options.loops || 3, 1, 8);
    const tempoLift = clamp(options.tempoLift || 10, 0, 40);
    const drills = [];

    for (let i = 0; i < loops; i += 1) {
      let pattern = deepClone(sourcePattern);
      let name = "Drill " + (i + 1);
      if (mode === "progression") {
        pattern = generatePattern({
          pattern: sourcePattern,
          sourcePattern: sourcePattern,
          scaleDefinition: scaleDefinition,
          instrumentProfile: instrumentProfile,
          density: clamp(0.4 + i * 0.12, 0.1, 1),
          maxLeap: clamp(3 + difficulty + i, 1, 12),
          repeatRate: clamp(0.65 - i * 0.08, 0, 0.9),
          surprise: clamp(0.12 + i * 0.15, 0, 1),
          tensionCurve: i % 2 === 0 ? "arc" : "wave",
          mode: "variation",
        });
        name = "Progression " + (i + 1);
      } else if (mode === "call-response") {
        pattern = i % 2 === 0 ? deepClone(sourcePattern) : generatePattern({
          pattern: sourcePattern,
          sourcePattern: sourcePattern,
          scaleDefinition: scaleDefinition,
          instrumentProfile: instrumentProfile,
          density: 0.5,
          maxLeap: 4 + difficulty,
          repeatRate: 0.4,
          surprise: 0.35 + difficulty * 0.08,
          tensionCurve: "fall",
          mode: "response",
        });
        name = i % 2 === 0 ? "Call " + (i / 2 + 1) : "Response " + (Math.floor(i / 2) + 1);
      } else if (mode === "transposition") {
        pattern = transposePattern(sourcePattern, (i - Math.floor(loops / 2)) * 2, scaleDefinition, instrumentProfile);
        name = "Transpose " + (i + 1);
      } else if (mode === "restriction") {
        const restrictedScale = createScaleDefinition(
          scaleDefinition.rootPc,
          scaleDefinition.modeName,
          scaleDefinition.enabledMask.map(function (value, pc) {
            return value && ((pc - scaleDefinition.rootPc + 12) % 12 === 0 || (pc - scaleDefinition.rootPc + 12) % 12 === 7 || Math.random() > difficulty * 0.12);
          }),
          scaleDefinition.pitchOffsets
        );
        pattern = generatePattern({
          pattern: sourcePattern,
          sourcePattern: sourcePattern,
          scaleDefinition: restrictedScale,
          instrumentProfile: instrumentProfile,
          density: 0.4 + difficulty * 0.06,
          maxLeap: 3 + difficulty,
          repeatRate: 0.55,
          surprise: 0.18 + difficulty * 0.08,
          tensionCurve: "rise",
          mode: "variation",
        });
        name = "Restriction " + (i + 1);
      }
      drills.push({
        id: createId("drill"),
        name: name,
        bpm: 84 + difficulty * 5 + i * tempoLift,
        pattern: pattern,
      });
    }

    return {
      id: createId("practice"),
      sourcePatternId: sourcePattern.id,
      mode: mode,
      difficulty: difficulty,
      loops: loops,
      tempoLift: tempoLift,
      drills: drills,
    };
  }

  function previewPattern(pattern) {
    if (!pattern.notes.length) {
      return "空 pattern";
    }
    return sortNotes(pattern.notes)
      .slice(0, 8)
      .map(function (note) {
        return pitchSpecToLabel(note.pitch) + "@" + note.startStep;
      })
      .join(" · ");
  }

  function patternTicksPerStep(pattern) {
    const ticksPerQuarter = 480;
    return Math.max(1, Math.round(ticksPerQuarter / 4));
  }

  function writeVarLength(value) {
    let buffer = value & 0x7f;
    const bytes = [];
    while ((value >>= 7)) {
      buffer <<= 8;
      buffer |= (value & 0x7f) | 0x80;
    }
    while (true) {
      bytes.push(buffer & 0xff);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
    return bytes;
  }

  function createMidiBytes(pattern, instrumentProfile) {
    const track = [];
    const ticksPerStep = patternTicksPerStep(pattern);
    const sorted = sortNotes(pattern.notes);
    const events = [];
    const bendRangeSemitones = 2;

    events.push({ tick: 0, data: [0xc0, instrumentProfile.midiProgram || 80] });
    events.push({ tick: 0, data: [0xb0, 101, 0] });
    events.push({ tick: 0, data: [0xb0, 100, 0] });
    events.push({ tick: 0, data: [0xb0, 6, bendRangeSemitones] });
    events.push({ tick: 0, data: [0xb0, 38, 0] });

    sorted.forEach(function (note) {
      const midi = pitchSpecToMidi(note.pitch);
      const tick = note.startStep * ticksPerStep;
      const endTick = (note.startStep + note.durationSteps) * ticksPerStep;
      const bend = clamp(Math.round(8192 + (note.pitch.offsetCents / (bendRangeSemitones * 200)) * 8192), 0, 16383);
      const lsb = bend & 0x7f;
      const msb = (bend >> 7) & 0x7f;
      events.push({ tick: tick, data: [0xe0, lsb, msb] });
      events.push({ tick: tick, data: [0x90, midi, clamp(note.velocity, 1, 127)] });
      events.push({ tick: endTick, data: [0x80, midi, 0] });
      events.push({ tick: endTick, data: [0xe0, 0, 64] });
    });

    events.sort(function (a, b) {
      if (a.tick !== b.tick) {
        return a.tick - b.tick;
      }
      return a.data[0] - b.data[0];
    });

    let lastTick = 0;
    events.forEach(function (event) {
      const delta = event.tick - lastTick;
      lastTick = event.tick;
      writeVarLength(delta).forEach(function (byte) {
        track.push(byte);
      });
      event.data.forEach(function (byte) {
        track.push(byte);
      });
    });

    track.push(0x00, 0xff, 0x2f, 0x00);

    const header = [
      0x4d, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      0x01, 0xe0,
      0x4d, 0x54, 0x72, 0x6b,
      (track.length >>> 24) & 0xff,
      (track.length >>> 16) & 0xff,
      (track.length >>> 8) & 0xff,
      track.length & 0xff,
    ];
    return new Uint8Array(header.concat(track));
  }

  return {
    NOTE_NAMES: NOTE_NAMES,
    MODE_INTERVALS: MODE_INTERVALS,
    INSTRUMENT_PRESETS: INSTRUMENT_PRESETS,
    MELODIC_CELLS: MELODIC_CELLS,
    LOGIC_FORM_PRESETS: LOGIC_FORM_PRESETS,
    SURPRISE_ZONE_PRESETS: SURPRISE_ZONE_PRESETS,
    clamp: clamp,
    createId: createId,
    createScaleDefinition: createScaleDefinition,
    createEmptyPattern: createEmptyPattern,
    createMotifFromPattern: createMotifFromPattern,
    createEmptyPhraseSequence: createEmptyPhraseSequence,
    addMotifToPhrase: addMotifToPhrase,
    flattenPhraseSequence: flattenPhraseSequence,
    generatePattern: generatePattern,
    generatePracticeDrill: generatePracticeDrill,
    transposePattern: transposePattern,
    chromaticTransposePattern: chromaticTransposePattern,
    diatonicTransposePattern: diatonicTransposePattern,
    fitPatternToInstrument: fitPatternToInstrument,
    transformPattern: transformPattern,
    reversePattern: reversePattern,
    stretchPattern: stretchPattern,
    organicHumanize: organicHumanize,
    upsertNote: upsertNote,
    removeNote: removeNote,
    ensureMonophonic: ensureMonophonic,
    getAllowedMidiNotes: getAllowedMidiNotes,
    pitchSpecToMidi: pitchSpecToMidi,
    midiToPitchSpec: midiToPitchSpec,
    midiToLabel: midiToLabel,
    pitchSpecToLabel: pitchSpecToLabel,
    previewPattern: previewPattern,
    createMidiBytes: createMidiBytes,
    deepClone: deepClone,
    normalizePc: normalizePc,
    stepsPerBar: stepsPerBar,
    stepDurationSeconds: stepDurationSeconds,
  };
});
