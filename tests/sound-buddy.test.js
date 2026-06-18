const test = require("node:test");
const assert = require("node:assert/strict");

const listenCoach = require("../assets/sound-buddy.js");

const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;
const BIN_COUNT = FFT_SIZE / 2;

function frequencyDataFor(ranges) {
  const data = new Uint8Array(BIN_COUNT);
  for (let index = 0; index < data.length; index += 1) {
    const frequency = index * SAMPLE_RATE / FFT_SIZE;
    const match = ranges.find(range => frequency >= range.low && frequency <= range.high);
    data[index] = match ? match.value : 8;
  }
  return data;
}

function steadyTimeData(level = 0.22) {
  const data = new Uint8Array(FFT_SIZE);
  for (let index = 0; index < data.length; index += 1) {
    const wave = Math.sin(index / 7) * level;
    data[index] = Math.round(128 + wave * 127);
  }
  return data;
}

function snapshotFromRanges(ranges, level = 0.22) {
  return listenCoach.analyzeAudioSnapshot({
    frequencyData: frequencyDataFor(ranges),
    timeDomainData: steadyTimeData(level),
    sampleRate: SAMPLE_RATE,
    fftSize: FFT_SIZE,
  });
}

test("exports pure analysis and browser coach helpers", () => {
  assert.equal(typeof listenCoach.analyzeAudioSnapshot, "function");
  assert.equal(typeof listenCoach.aggregateStreamSnapshot, "function");
  assert.equal(typeof listenCoach.createBrowserCoach, "function");
  assert.equal(typeof listenCoach.createCoachState, "function");
  assert.equal(typeof listenCoach.nextCoachComment, "function");
  assert.equal(typeof listenCoach.detectStyleFromSnapshot, "function");
  assert.equal(typeof listenCoach.detectGenreMixFromSnapshot, "function");
  assert.equal(typeof listenCoach.detectSubgenresFromSnapshot, "function");
  assert.equal(typeof listenCoach.styleGuides, "function");
  assert.equal(typeof listenCoach.subgenreGuides, "function");
  assert.equal(typeof listenCoach.styleLessonForSnapshot, "function");
});

test("analysis separates bass-heavy and high-texture snapshots", () => {
  const bassHeavy = snapshotFromRanges([
    { low: 35, high: 170, value: 236 },
    { low: 4200, high: 9800, value: 20 },
  ]);
  const highHeavy = snapshotFromRanges([
    { low: 35, high: 170, value: 22 },
    { low: 4200, high: 9800, value: 236 },
  ]);

  assert.ok(bassHeavy.bassShare > highHeavy.bassShare, "bass-heavy input should produce higher bass share");
  assert.ok(highHeavy.highShare > bassHeavy.highShare, "high-heavy input should produce higher high share");
  assert.equal(bassHeavy.dominantBand, "");
});

test("quiet input produces a waiting comment", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  const snapshot = listenCoach.analyzeAudioSnapshot({
    frequencyData: new Uint8Array(BIN_COUNT),
    timeDomainData: new Uint8Array(FFT_SIZE).fill(128),
    sampleRate: SAMPLE_RATE,
    fftSize: FFT_SIZE,
  });
  const comment = listenCoach.nextCoachComment(snapshot, state, { now: 1000, minIntervalMs: 1 });

  assert.equal(comment.category, "level");
  assert.match(comment.text, /quiet/i);
  assert.equal(comment.focus, "waiting");
});

test("bass-led input produces low-end coaching", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  const snapshot = snapshotFromRanges([
    { low: 25, high: 75, value: 232 },
    { low: 45, high: 180, value: 236 },
    { low: 520, high: 2400, value: 44 },
    { low: 4200, high: 9800, value: 18 },
  ], 0.28);
  const comment = listenCoach.nextCoachComment(snapshot, state, { now: 1000, minIntervalMs: 1 });

  assert.ok(["bass", "kick"].includes(comment.category));
  assert.match(comment.text, /low|kick|rumble|pressure/i);
  assert.equal(comment.focus, "kick / low end");
});

test("style guides cover core electronic learning lanes", () => {
  const ids = listenCoach.styleGuides().map(item => item.id);
  for (const id of [
    "techno",
    "electro",
    "house",
    "breaks",
    "acid",
    "trance",
    "garage",
    "dnb",
    "bass",
    "downtempo",
    "hard-dance",
    "industrial",
  ]) {
    assert.ok(ids.includes(id), `missing style guide: ${id}`);
  }
  const electro = listenCoach.styleLessonForSnapshot({ bassShare: 0.3, highShare: 0.22 }, "electro");
  assert.equal(electro.label, "Electro");
  assert.match(electro.text, /machine|syncopated|angular/i);
});

test("subgenre guides cover detailed electronic learning lanes", () => {
  const ids = listenCoach.subgenreGuides().map(item => item.id);
  for (const id of [
    "hard-techno",
    "hypnotic-techno",
    "industrial-techno",
    "acid-techno",
    "dub-techno",
    "raw-techno",
    "schranz",
    "peak-time-techno",
    "electro-funk",
    "detroit-electro",
    "miami-bass",
    "ghettotech",
    "deep-house",
    "tech-house",
    "classic-house",
    "disco-house",
    "minimal-deep-tech",
    "breakbeat",
    "ukg-garage",
    "two-step",
    "speed-garage",
    "jungle-dnb",
    "liquid-dnb",
    "neurofunk",
    "half-time-dnb",
    "dubstep",
    "deep-dubstep",
    "footwork",
    "leftfield-bass",
    "hard-trance",
    "psytrance",
    "uplifting-trance",
    "hardstyle",
    "hardcore",
    "hard-dance-rave",
    "ambient",
    "downtempo-breaks",
    "leftfield-electronic",
  ]) {
    assert.ok(ids.includes(id), `missing subgenre guide: ${id}`);
  }
});

test("auto style detection returns a cautious style guess", () => {
  const techno = listenCoach.detectStyleFromSnapshot({
    level: 0.24,
    bassShare: 0.4,
    highShare: 0.16,
    lowMid: 0.22,
    mid: 0.12,
    bass: 0.25,
    high: 0.06,
    brightness: 0.42,
    pulseBpm: 136,
    stablePulse: true,
  });
  const industrial = listenCoach.detectStyleFromSnapshot({
    level: 0.38,
    bassShare: 0.42,
    highShare: 0.36,
    lowMid: 0.12,
    mid: 0.16,
    bass: 0.24,
    high: 0.26,
    brightness: 1.5,
    centroid: 5200,
    pulseBpm: 142,
    stablePulse: true,
  });

  assert.equal(techno.styleId, "techno");
  assert.equal(industrial.styleId, "industrial");
  assert.match(techno.text, /listening prompt, not a track ID/i);
});

test("expanded style detection covers house, DNB, garage, electro, trance, bass, downtempo, and hard dance", () => {
  const cases = [
    ["house", {
      level: 0.24,
      bassShare: 0.3,
      highShare: 0.18,
      lowMid: 0.22,
      mid: 0.2,
      bass: 0.16,
      high: 0.07,
      brightness: 0.5,
      centroid: 2300,
      pulseBpm: 124,
      stablePulse: true,
    }],
    ["dnb", {
      level: 0.34,
      bassShare: 0.36,
      highShare: 0.24,
      lowMid: 0.12,
      mid: 0.14,
      bass: 0.22,
      high: 0.18,
      brightness: 0.9,
      centroid: 4300,
      pulseBpm: 172,
      stablePulse: false,
    }],
    ["garage", {
      level: 0.28,
      bassShare: 0.34,
      highShare: 0.16,
      lowMid: 0.2,
      mid: 0.16,
      bass: 0.19,
      high: 0.07,
      brightness: 0.58,
      centroid: 2500,
      pulseBpm: 132,
      stablePulse: false,
    }],
    ["electro", {
      level: 0.32,
      bassShare: 0.32,
      highShare: 0.18,
      lowMid: 0.16,
      mid: 0.2,
      bass: 0.18,
      high: 0.08,
      brightness: 0.72,
      centroid: 3100,
      pulseBpm: 125,
      stablePulse: false,
    }],
    ["trance", {
      level: 0.3,
      bassShare: 0.28,
      highShare: 0.3,
      lowMid: 0.1,
      mid: 0.24,
      bass: 0.14,
      high: 0.2,
      brightness: 1.18,
      centroid: 4400,
      pulseBpm: 138,
      stablePulse: true,
    }],
    ["bass", {
      level: 0.3,
      bassShare: 0.52,
      highShare: 0.1,
      lowMid: 0.16,
      mid: 0.08,
      bass: 0.34,
      high: 0.04,
      brightness: 0.28,
      centroid: 1300,
      pulseBpm: 140,
      stablePulse: false,
    }],
    ["downtempo", {
      level: 0.12,
      bassShare: 0.22,
      highShare: 0.12,
      lowMid: 0.08,
      mid: 0.11,
      bass: 0.06,
      high: 0.04,
      brightness: 0.46,
      centroid: 1800,
      pulseBpm: 98,
      stablePulse: false,
    }],
    ["hard-dance", {
      level: 0.34,
      bassShare: 0.48,
      highShare: 0.22,
      lowMid: 0.18,
      mid: 0.2,
      bass: 0.34,
      high: 0.15,
      brightness: 0.82,
      centroid: 3600,
      pulseBpm: 156,
      stablePulse: true,
    }],
  ];

  for (const [expected, snapshot] of cases) {
    const detected = listenCoach.detectStyleFromSnapshot(snapshot);
    assert.equal(detected.styleId, expected, `expected ${expected}, got ${detected.styleId}`);
  }
});

test("style detection marks narrow-score results as close calls", () => {
  const detected = listenCoach.detectStyleFromSnapshot({
    level: 0.3,
    bassShare: 0.52,
    highShare: 0.1,
    lowMid: 0.16,
    mid: 0.08,
    bass: 0.34,
    high: 0.04,
    brightness: 0.28,
    centroid: 1300,
    pulseBpm: 140,
    stablePulse: false,
  });

  assert.equal(detected.styleId, "bass");
  assert.equal(detected.isCloseCall, true);
  assert.ok(detected.scoreMargin < 0.09);
  assert.match(detected.text, /close call|hybrid/i);
});

test("genre mix detection returns top three likeness lanes", () => {
  const mix = listenCoach.detectGenreMixFromSnapshot({
    level: 0.34,
    bassShare: 0.36,
    highShare: 0.28,
    lowMid: 0.16,
    mid: 0.18,
    bass: 0.2,
    high: 0.16,
    brightness: 1.05,
    centroid: 3900,
    pulseBpm: 136,
    stablePulse: false,
  });
  const totalShare = mix.mix.reduce((sum, item) => sum + item.share, 0);

  assert.equal(mix.mix.length, 3);
  assert.ok(Math.abs(totalShare - 1) < 0.001);
  assert.ok(mix.mix[0].share >= mix.mix[1].share);
  assert.ok(mix.mix[1].share >= mix.mix[2].share);
  assert.ok(mix.mix.every(item => item.label && item.cues.length));
  assert.match(mix.text, /Genre mix/i);
});

test("genre mix hides weak house and DNB matches", () => {
  const brokenGarage = listenCoach.detectGenreMixFromSnapshot({
    level: 0.28,
    bassShare: 0.34,
    highShare: 0.16,
    lowMid: 0.2,
    mid: 0.16,
    bass: 0.19,
    high: 0.07,
    brightness: 0.58,
    centroid: 2500,
    pulseBpm: 132,
    stablePulse: false,
  });
  const halfTimeBass = listenCoach.detectGenreMixFromSnapshot({
    level: 0.3,
    bassShare: 0.52,
    highShare: 0.1,
    lowMid: 0.16,
    mid: 0.08,
    bass: 0.34,
    high: 0.04,
    brightness: 0.28,
    centroid: 1300,
    pulseBpm: 140,
    stablePulse: false,
  });

  assert.ok(!brokenGarage.mix.some(item => item.styleId === "house"));
  assert.ok(!halfTimeBass.mix.some(item => item.styleId === "dnb"));
});

test("genre mix does not keep techno as a default fallback", () => {
  const house = listenCoach.detectGenreMixFromSnapshot({
    level: 0.24,
    bassShare: 0.3,
    highShare: 0.18,
    lowMid: 0.22,
    mid: 0.2,
    bass: 0.16,
    high: 0.07,
    brightness: 0.5,
    centroid: 2300,
    pulseBpm: 124,
    stablePulse: true,
  });
  const trance = listenCoach.detectGenreMixFromSnapshot({
    level: 0.3,
    bassShare: 0.28,
    highShare: 0.3,
    lowMid: 0.1,
    mid: 0.24,
    bass: 0.14,
    high: 0.2,
    brightness: 1.18,
    centroid: 4400,
    pulseBpm: 138,
    stablePulse: true,
  });

  assert.equal(house.primary.styleId, "house");
  assert.equal(trance.primary.styleId, "trance");
  assert.ok(!house.mix.some(item => item.styleId === "techno"));
  assert.ok(!trance.mix.some(item => item.styleId === "techno"));
});

test("genre detection uses a recent stream window instead of one instant", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  for (let index = 0; index < 20; index += 1) {
    state.snapshots.push({
      capturedAt: index * 500,
      level: 0.26,
      bassShare: 0.42,
      highShare: 0.14,
      lowMid: 0.22,
      mid: 0.12,
      bass: 0.26,
      high: 0.05,
      brightness: 0.42,
      centroid: 2100,
      pulseBpm: 136,
      stablePulse: true,
    });
  }

  const noisyLastFrame = {
    capturedAt: 10000,
    level: 0.46,
    bassShare: 0.36,
    highShare: 0.42,
    lowMid: 0.1,
    mid: 0.16,
    bass: 0.2,
    high: 0.3,
    brightness: 1.8,
    centroid: 6200,
    pulseBpm: 142,
    stablePulse: true,
  };
  const mix = listenCoach.detectGenreMixFromSnapshot(noisyLastFrame, state);

  assert.equal(mix.primary.styleId, "techno");
  assert.ok(mix.style.streamSampleCount >= 20);
  assert.match(mix.text, /recent stream/i);
});

test("house detection uses a longer stable groove window", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  for (let index = 0; index < 32; index += 1) {
    state.snapshots.push({
      capturedAt: index * 500,
      level: 0.24,
      bassShare: 0.3,
      highShare: 0.18,
      lowMid: 0.22,
      mid: 0.2,
      bass: 0.16,
      high: 0.07,
      brightness: 0.5,
      centroid: 2300,
      pulseBpm: 124 + (index % 3 === 0 ? 1 : 0),
      stablePulse: true,
    });
  }

  const heavierLastFrame = {
    capturedAt: 16000,
    level: 0.3,
    bassShare: 0.39,
    highShare: 0.17,
    lowMid: 0.2,
    mid: 0.18,
    bass: 0.25,
    high: 0.06,
    brightness: 0.44,
    centroid: 2200,
    pulseBpm: 125,
    stablePulse: true,
  };
  const detected = listenCoach.detectStyleFromSnapshot(heavierLastFrame, state);
  const mix = listenCoach.detectGenreMixFromSnapshot(heavierLastFrame, state);

  assert.equal(detected.styleId, "house");
  assert.equal(mix.primary.styleId, "house");
  assert.ok(detected.streamFrameCount >= 30);
});

test("subgenre detection returns ranked candidates", () => {
  const hardTechno = listenCoach.detectSubgenresFromSnapshot({
    level: 0.38,
    bassShare: 0.5,
    highShare: 0.2,
    lowMid: 0.18,
    mid: 0.12,
    bass: 0.32,
    high: 0.08,
    brightness: 0.55,
    pulseBpm: 148,
    stablePulse: true,
  });
  const electroFunk = listenCoach.detectSubgenresFromSnapshot({
    level: 0.32,
    bassShare: 0.32,
    highShare: 0.18,
    lowMid: 0.16,
    mid: 0.2,
    bass: 0.18,
    high: 0.08,
    brightness: 0.72,
    pulseBpm: 125,
    stablePulse: false,
  }, {
    recentEnergy: [0.3, 0.18, 0.34, 0.2, 0.36, 0.19],
  });

  assert.ok(hardTechno.candidates.length >= 3);
  assert.equal(hardTechno.primary.id, "hard-techno");
  assert.ok(electroFunk.candidates.some(item => item.id === "electro-funk"));
  assert.match(hardTechno.text, /Top subgenre candidate/i);
});
