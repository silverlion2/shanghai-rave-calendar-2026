const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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

const ANALYSIS_BAND_KEYS = ["sub", "bass", "lowMid", "mid", "high", "air"];

const FREQUENCY_SAMPLE_MATRIX = [
  { name: "sub pressure", expectedBand: "sub", ranges: [{ low: 25, high: 70, value: 248 }] },
  { name: "kick bass body", expectedBand: "bass", ranges: [{ low: 92, high: 150, value: 248 }] },
  { name: "low-mid warmth", expectedBand: "lowMid", ranges: [{ low: 240, high: 420, value: 248 }] },
  { name: "midrange phrase", expectedBand: "mid", ranges: [{ low: 780, high: 1600, value: 248 }] },
  { name: "hat texture", expectedBand: "high", ranges: [{ low: 5200, high: 7800, value: 248 }] },
  { name: "air sheen", expectedBand: "air", ranges: [{ low: 11200, high: 14200, value: 248 }] },
];

function streamStateFrom(baseSnapshot, frames, stepMs = 700) {
  const state = listenCoach.createCoachState({ now: 0 });
  frames.forEach((frame, index) => {
    state.snapshots.push({
      capturedAt: index * stepMs,
      ...baseSnapshot,
      ...frame,
    });
  });
  return state;
}

function styleSample(name, expectedStyle, snapshot, frames = []) {
  return { name, expectedStyle, snapshot, frames };
}

function subgenreSample(name, expectedSubgenre, snapshot, frames = []) {
  return { name, expectedSubgenre, snapshot, frames };
}

function repeatedFrames(count, makeFrame) {
  return Array.from({ length: count }, (_, index) => makeFrame(index));
}

const STYLE_SAMPLE_MATRIX = [
  styleSample("straight techno loop", "techno", {
    level: 0.24, bassShare: 0.4, highShare: 0.16, lowMid: 0.22, mid: 0.12, bass: 0.25, high: 0.06, brightness: 0.42, centroid: 2100, pulseBpm: 136, stablePulse: true,
  }),
  styleSample("electro machine funk", "electro", {
    level: 0.32, bassShare: 0.32, highShare: 0.18, lowMid: 0.16, mid: 0.2, bass: 0.18, high: 0.08, brightness: 0.72, centroid: 3100, pulseBpm: 125, stablePulse: false,
  }),
  styleSample("warm house groove", "house", {
    level: 0.24, bassShare: 0.3, highShare: 0.18, lowMid: 0.22, mid: 0.2, bass: 0.16, high: 0.07, brightness: 0.5, centroid: 2300, pulseBpm: 124, stablePulse: true,
  }),
  styleSample("broken breakbeat pressure", "breaks", {
    level: 0.32, bassShare: 0.36, highShare: 0.28, lowMid: 0.12, mid: 0.12, bass: 0.22, high: 0.18, brightness: 1.0, centroid: 4300, pulseBpm: 150, stablePulse: false,
  }),
  styleSample("acid resonance line", "acid", {
    level: 0.32, bassShare: 0.35, highShare: 0.36, lowMid: 0.14, mid: 0.22, bass: 0.22, high: 0.27, air: 0.15, brightness: 1.75, centroid: 5700, pulseBpm: 139, stablePulse: true,
  }, repeatedFrames(14, index => ({
    level: 0.29 + (index % 3) * 0.01,
    bassShare: 0.33 + (index % 2) * 0.02,
    highShare: 0.33 + (index % 4) * 0.012,
    mid: 0.2 + (index % 3) * 0.012,
    bass: 0.2 + (index % 2) * 0.018,
    high: 0.23 + (index % 4) * 0.014,
    brightness: 1.5 + (index % 4) * 0.08,
    centroid: 5200 + (index % 4) * 180,
    pulseBpm: 138 + (index % 3),
    stablePulse: true,
  }))),
  styleSample("trance lift", "trance", {
    level: 0.3, bassShare: 0.28, highShare: 0.3, lowMid: 0.1, mid: 0.24, bass: 0.14, high: 0.2, brightness: 1.18, centroid: 4400, pulseBpm: 138, stablePulse: true,
  }),
  styleSample("garage shuffle", "garage", {
    level: 0.26, bassShare: 0.34, highShare: 0.18, lowMid: 0.2, mid: 0.17, bass: 0.2, high: 0.07, brightness: 0.55, centroid: 2600, pulseBpm: 132, stablePulse: false,
  }, repeatedFrames(12, index => ({ level: 0.24 + (index % 2) * 0.04, bass: 0.16 + (index % 2) * 0.08, pulseBpm: 132, stablePulse: false }))),
  styleSample("jungle dnb roll", "dnb", {
    level: 0.34, bassShare: 0.36, highShare: 0.24, lowMid: 0.12, mid: 0.14, bass: 0.22, high: 0.18, brightness: 0.9, centroid: 4300, pulseBpm: 172, stablePulse: false,
  }),
  styleSample("sound system bass", "bass", {
    level: 0.3, bassShare: 0.52, highShare: 0.1, lowMid: 0.16, mid: 0.08, bass: 0.34, high: 0.04, brightness: 0.28, centroid: 1300, pulseBpm: 140, stablePulse: false,
  }),
  styleSample("downtempo space", "downtempo", {
    level: 0.12, bassShare: 0.22, highShare: 0.12, lowMid: 0.08, mid: 0.11, bass: 0.06, high: 0.04, brightness: 0.46, centroid: 1800, pulseBpm: 98, stablePulse: false,
  }),
  styleSample("hard dance drive", "hard-dance", {
    level: 0.34, bassShare: 0.48, highShare: 0.22, lowMid: 0.18, mid: 0.2, bass: 0.34, high: 0.15, brightness: 0.82, centroid: 3600, pulseBpm: 156, stablePulse: true,
  }),
  styleSample("industrial body machine", "industrial", {
    level: 0.38, bassShare: 0.42, highShare: 0.36, lowMid: 0.12, mid: 0.16, bass: 0.24, high: 0.26, brightness: 1.5, centroid: 5200, pulseBpm: 142, stablePulse: true,
  }),
];

const SUBGENRE_SAMPLE_MATRIX = [
  subgenreSample("hard techno", "hard-techno", { level: 0.38, bassShare: 0.5, highShare: 0.2, lowMid: 0.18, mid: 0.12, bass: 0.32, high: 0.08, brightness: 0.55, centroid: 2400, pulseBpm: 148, stablePulse: true }),
  subgenreSample("hypnotic techno", "hypnotic-techno", { level: 0.24, bassShare: 0.36, highShare: 0.14, lowMid: 0.22, mid: 0.11, bass: 0.24, high: 0.05, brightness: 0.38, centroid: 1900, pulseBpm: 132, stablePulse: true }, repeatedFrames(16, index => ({ level: 0.24 + (index % 2) * 0.002, bass: 0.24 + (index % 2) * 0.002, pulseBpm: 132, stablePulse: true }))),
  subgenreSample("industrial techno", "industrial-techno", { level: 0.39, bassShare: 0.42, highShare: 0.36, lowMid: 0.12, mid: 0.16, bass: 0.25, high: 0.26, brightness: 1.5, centroid: 5300, pulseBpm: 142, stablePulse: true }),
  subgenreSample("acid techno", "acid-techno", STYLE_SAMPLE_MATRIX.find(item => item.name === "acid resonance line").snapshot, STYLE_SAMPLE_MATRIX.find(item => item.name === "acid resonance line").frames),
  subgenreSample("detroit groove", "detroit-groove", { level: 0.323, bassShare: 0.371, highShare: 0.226, lowMid: 0.214, mid: 0.277, bass: 0.14, high: 0.119, brightness: 0.444, centroid: 2687, pulseBpm: 136, stablePulse: true }),
  subgenreSample("minimal techno", "minimal-techno", { level: 0.18, bassShare: 0.3, highShare: 0.18, lowMid: 0.15, mid: 0.13, bass: 0.14, high: 0.06, brightness: 0.46, centroid: 2200, pulseBpm: 126, stablePulse: true }, repeatedFrames(16, index => ({ level: 0.18 + (index % 2) * 0.003, bass: 0.14 + (index % 2) * 0.002, pulseBpm: 126, stablePulse: true }))),
  subgenreSample("dub techno", "dub-techno", { level: 0.2, bassShare: 0.29, highShare: 0.13, lowMid: 0.24, mid: 0.2, bass: 0.15, high: 0.05, brightness: 0.35, centroid: 1900, pulseBpm: 124, stablePulse: true }, repeatedFrames(14, index => ({ level: 0.19 + (index % 3) * 0.006, bassShare: 0.28, highShare: 0.12, pulseBpm: 124, stablePulse: true }))),
  subgenreSample("raw techno", "raw-techno", { level: 0.3, bassShare: 0.4, highShare: 0.22, lowMid: 0.18, mid: 0.13, bass: 0.26, high: 0.1, brightness: 0.9, centroid: 3100, pulseBpm: 136, stablePulse: true }),
  subgenreSample("schranz", "schranz", { level: 0.44, bassShare: 0.52, highShare: 0.2, lowMid: 0.16, mid: 0.12, bass: 0.38, high: 0.09, brightness: 0.85, centroid: 3200, pulseBpm: 158, stablePulse: true }),
  subgenreSample("peak time techno", "peak-time-techno", { level: 0.369, bassShare: 0.438, highShare: 0.308, lowMid: 0.13, mid: 0.213, bass: 0.263, high: 0.159, brightness: 0.929, centroid: 3021, pulseBpm: 135, stablePulse: true }),
  subgenreSample("electro funk", "electro-funk", { level: 0.323, bassShare: 0.313, highShare: 0.188, lowMid: 0.12, mid: 0.221, bass: 0.197, high: 0.151, brightness: 0.929, centroid: 4052, pulseBpm: 131, stablePulse: false }, repeatedFrames(10, index => ({ level: 0.3 + (index % 2) * 0.04, bass: 0.16 + (index % 2) * 0.06, pulseBpm: 131, stablePulse: false }))),
  subgenreSample("detroit electro", "detroit-electro", { level: 0.272, bassShare: 0.284, highShare: 0.203, lowMid: 0.151, mid: 0.246, bass: 0.16, high: 0.129, brightness: 0.559, centroid: 3604, pulseBpm: 135, stablePulse: false }, repeatedFrames(10, index => ({ level: 0.27 + (index % 2) * 0.04, bass: 0.16 + (index % 2) * 0.05, pulseBpm: 135, stablePulse: false }))),
  subgenreSample("miami bass", "miami-bass", { level: 0.34, bassShare: 0.54, highShare: 0.14, lowMid: 0.12, mid: 0.1, bass: 0.36, high: 0.06, brightness: 0.4, centroid: 1800, pulseBpm: 145, stablePulse: false }),
  subgenreSample("ghettotech", "ghettotech", { level: 0.34, bassShare: 0.42, highShare: 0.2, lowMid: 0.14, mid: 0.17, bass: 0.27, high: 0.09, brightness: 0.7, centroid: 3000, pulseBpm: 152, stablePulse: false }),
  subgenreSample("ebm electroclash", "ebm-electroclash", { level: 0.31, bassShare: 0.34, highShare: 0.28, lowMid: 0.12, mid: 0.25, bass: 0.2, high: 0.17, brightness: 1.05, centroid: 4100, pulseBpm: 122, stablePulse: true }, repeatedFrames(10, index => ({ level: 0.3 + (index % 2) * 0.01, pulseBpm: 122, stablePulse: true }))),
  subgenreSample("deep house", "deep-house", { level: 0.24, bassShare: 0.28, highShare: 0.16, lowMid: 0.24, mid: 0.22, bass: 0.15, high: 0.06, brightness: 0.42, centroid: 2100, pulseBpm: 120, stablePulse: true }, repeatedFrames(12, index => ({ level: 0.24 + (index % 2) * 0.004, pulseBpm: 120, stablePulse: true }))),
  subgenreSample("tech house", "tech-house", { level: 0.28, bassShare: 0.34, highShare: 0.23, lowMid: 0.2, mid: 0.18, bass: 0.21, high: 0.1, brightness: 0.68, centroid: 2900, pulseBpm: 126, stablePulse: true }),
  subgenreSample("acid house", "acid-house", { level: 0.28, bassShare: 0.3, highShare: 0.3, lowMid: 0.22, mid: 0.22, bass: 0.17, high: 0.18, air: 0.12, brightness: 1.55, centroid: 5200, pulseBpm: 124, stablePulse: true }, repeatedFrames(12, index => ({ level: 0.26 + (index % 2) * 0.01, pulseBpm: 124 + (index % 2), stablePulse: true }))),
  subgenreSample("classic house", "classic-house", { level: 0.279, bassShare: 0.295, highShare: 0.166, lowMid: 0.23, mid: 0.244, bass: 0.139, high: 0.075, brightness: 0.597, centroid: 2478, pulseBpm: 128, stablePulse: true }),
  subgenreSample("disco house", "disco-house", { level: 0.288, bassShare: 0.282, highShare: 0.245, lowMid: 0.168, mid: 0.297, bass: 0.161, high: 0.184, brightness: 0.868, centroid: 3467, pulseBpm: 124, stablePulse: true }),
  subgenreSample("minimal deep tech", "minimal-deep-tech", { level: 0.166, bassShare: 0.31, highShare: 0.171, lowMid: 0.222, mid: 0.108, bass: 0.148, high: 0.082, brightness: 0.412, centroid: 1630, pulseBpm: 128, stablePulse: true }, repeatedFrames(14, index => ({ level: 0.2 + (index % 2) * 0.002, bass: 0.16 + (index % 2) * 0.002, pulseBpm: 128, stablePulse: true }))),
  subgenreSample("breakbeat", "breakbeat", { level: 0.241, bassShare: 0.393, highShare: 0.31, lowMid: 0.158, mid: 0.125, bass: 0.167, high: 0.111, brightness: 0.946, centroid: 5118, pulseBpm: 144, stablePulse: false }, repeatedFrames(10, index => ({ level: 0.27 + (index % 2) * 0.05, bass: 0.16 + (index % 2) * 0.08, pulseBpm: 144, stablePulse: false }))),
  subgenreSample("ukg garage", "ukg-garage", STYLE_SAMPLE_MATRIX.find(item => item.name === "garage shuffle").snapshot, STYLE_SAMPLE_MATRIX.find(item => item.name === "garage shuffle").frames),
  subgenreSample("two step", "two-step", { level: 0.25, bassShare: 0.32, highShare: 0.16, lowMid: 0.2, mid: 0.14, bass: 0.19, high: 0.06, brightness: 0.48, centroid: 2400, pulseBpm: 134, stablePulse: false }),
  subgenreSample("speed garage", "speed-garage", { level: 0.31, bassShare: 0.42, highShare: 0.16, lowMid: 0.2, mid: 0.12, bass: 0.27, high: 0.07, brightness: 0.55, centroid: 2600, pulseBpm: 140, stablePulse: false }),
  subgenreSample("jungle dnb", "jungle-dnb", { level: 0.36, bassShare: 0.38, highShare: 0.24, lowMid: 0.12, mid: 0.13, bass: 0.24, high: 0.18, brightness: 0.9, centroid: 4300, pulseBpm: 172, stablePulse: false }),
  subgenreSample("liquid dnb", "liquid-dnb", { level: 0.3, bassShare: 0.34, highShare: 0.28, lowMid: 0.13, mid: 0.24, bass: 0.2, high: 0.18, brightness: 0.95, centroid: 4200, pulseBpm: 170, stablePulse: false }),
  subgenreSample("neurofunk", "neurofunk", { level: 0.34, bassShare: 0.42, highShare: 0.24, lowMid: 0.12, mid: 0.15, bass: 0.27, high: 0.15, brightness: 1.35, centroid: 5200, pulseBpm: 174, stablePulse: false }),
  subgenreSample("half time dnb", "half-time-dnb", { level: 0.326, bassShare: 0.518, highShare: 0.128, lowMid: 0.144, mid: 0.142, bass: 0.357, high: 0.088, brightness: 0.767, centroid: 2127, pulseBpm: 84, stablePulse: false }),
  subgenreSample("dubstep", "dubstep", { level: 0.29, bassShare: 0.48, highShare: 0.2, lowMid: 0.13, mid: 0.12, bass: 0.3, high: 0.09, brightness: 0.5, centroid: 2100, pulseBpm: 140, stablePulse: false }),
  subgenreSample("deep dubstep", "deep-dubstep", { level: 0.24, bassShare: 0.52, highShare: 0.11, lowMid: 0.12, mid: 0.07, bass: 0.31, high: 0.04, brightness: 0.26, centroid: 1300, pulseBpm: 140, stablePulse: false }, repeatedFrames(10, index => ({ level: 0.22 + (index % 2) * 0.03, pulseBpm: 140, stablePulse: false }))),
  subgenreSample("footwork", "footwork", { level: 0.28, bassShare: 0.34, highShare: 0.2, lowMid: 0.12, mid: 0.14, bass: 0.2, high: 0.1, brightness: 0.65, centroid: 3200, pulseBpm: 158, stablePulse: false }, repeatedFrames(12, index => ({ level: 0.18 + (index % 3) * 0.09, pulseBpm: 158, stablePulse: false }))),
  subgenreSample("leftfield bass", "leftfield-bass", { level: 0.22, bassShare: 0.4, highShare: 0.16, lowMid: 0.1, mid: 0.09, bass: 0.23, high: 0.06, brightness: 0.5, centroid: 2700, pulseBpm: 136, stablePulse: false }, repeatedFrames(12, index => ({ level: 0.16 + (index % 4) * 0.06, bass: 0.18 + (index % 3) * 0.04, pulseBpm: 136, stablePulse: false }))),
  subgenreSample("hard trance", "hard-trance", { level: 0.34, bassShare: 0.34, highShare: 0.32, lowMid: 0.12, mid: 0.25, bass: 0.2, high: 0.2, brightness: 1.15, centroid: 4400, pulseBpm: 148, stablePulse: true }),
  subgenreSample("progressive melodic", "progressive-melodic", { level: 0.27, bassShare: 0.28, highShare: 0.26, lowMid: 0.12, mid: 0.24, bass: 0.14, high: 0.16, brightness: 0.9, centroid: 3600, pulseBpm: 128, stablePulse: true }),
  subgenreSample("psytrance", "psytrance", { level: 0.285, bassShare: 0.404, highShare: 0.277, lowMid: 0.095, mid: 0.205, bass: 0.209, high: 0.188, brightness: 1.175, centroid: 4507, pulseBpm: 147, stablePulse: true }),
  subgenreSample("uplifting trance", "uplifting-trance", { level: 0.3, bassShare: 0.28, highShare: 0.3, lowMid: 0.1, mid: 0.26, bass: 0.14, high: 0.2, brightness: 1.18, centroid: 4400, pulseBpm: 138, stablePulse: true }),
  subgenreSample("hardstyle", "hardstyle", { level: 0.38, bassShare: 0.47, highShare: 0.24, lowMid: 0.15, mid: 0.22, bass: 0.34, high: 0.14, brightness: 0.82, centroid: 3500, pulseBpm: 154, stablePulse: true }, repeatedFrames(10, index => ({ level: 0.36 + (index % 2) * 0.02, pulseBpm: 154, stablePulse: true }))),
  subgenreSample("hardcore", "hardcore", { level: 0.42, bassShare: 0.5, highShare: 0.27, lowMid: 0.14, mid: 0.18, bass: 0.38, high: 0.18, brightness: 1.05, centroid: 4200, pulseBpm: 172, stablePulse: true }, repeatedFrames(10, index => ({ level: 0.41 + (index % 2) * 0.02, pulseBpm: 172, stablePulse: true }))),
  subgenreSample("hard dance rave", "hard-dance-rave", { level: 0.36, bassShare: 0.4, highShare: 0.28, lowMid: 0.14, mid: 0.26, bass: 0.26, high: 0.18, brightness: 1.0, centroid: 3900, pulseBpm: 164, stablePulse: true }),
  subgenreSample("ambient", "ambient", { level: 0.1, bassShare: 0.18, highShare: 0.1, lowMid: 0.07, mid: 0.1, bass: 0.04, high: 0.03, brightness: 0.3, centroid: 1200, pulseBpm: null, stablePulse: false }),
  subgenreSample("downtempo breaks", "downtempo-breaks", { level: 0.18, bassShare: 0.3, highShare: 0.2, lowMid: 0.12, mid: 0.13, bass: 0.12, high: 0.07, brightness: 0.45, centroid: 2200, pulseBpm: 100, stablePulse: false }),
  subgenreSample("leftfield electronic", "leftfield-electronic", { level: 0.2, bassShare: 0.26, highShare: 0.24, lowMid: 0.08, mid: 0.18, bass: 0.1, high: 0.12, brightness: 1.0, centroid: 4300, pulseBpm: 108, stablePulse: false }, repeatedFrames(12, index => ({ level: 0.12 + (index % 4) * 0.07, pulseBpm: 108, stablePulse: false }))),
  subgenreSample("experimental live", "experimental-live", { level: 0.2, bassShare: 0.28, highShare: 0.3, lowMid: 0.08, mid: 0.2, bass: 0.11, high: 0.16, brightness: 1.2, centroid: 5200, pulseBpm: null, stablePulse: false }, repeatedFrames(12, index => ({ level: 0.1 + (index % 4) * 0.08, pulseBpm: null, stablePulse: false }))),
];

test("exports pure analysis and browser coach helpers", () => {
  assert.equal(typeof listenCoach.analyzeAudioSnapshot, "function");
  assert.equal(typeof listenCoach.aggregateStreamSnapshot, "function");
  assert.equal(typeof listenCoach.createBrowserCoach, "function");
  assert.equal(typeof listenCoach.createCoachState, "function");
  assert.equal(typeof listenCoach.nextCoachComment, "function");
  assert.equal(typeof listenCoach.detectStyleFromSnapshot, "function");
  assert.equal(typeof listenCoach.detectGenreMixFromSnapshot, "function");
  assert.equal(typeof listenCoach.detectSubgenresFromSnapshot, "function");
  assert.equal(typeof listenCoach.externalAnalysisSources, "function");
  assert.equal(typeof listenCoach.pretrainedGenreModels, "function");
  assert.equal(typeof listenCoach.modelModes, "function");
  assert.equal(typeof listenCoach.normalizeMeydaFeatures, "function");
  assert.equal(typeof listenCoach.normalizePretrainedGenrePredictions, "function");
  assert.equal(typeof listenCoach.mapExternalGenreTags, "function");
  assert.equal(typeof listenCoach.detectEnergyArcFromSnapshot, "function");
  assert.equal(typeof listenCoach.listeningDrillForSnapshot, "function");
  assert.equal(typeof listenCoach.formatSessionRecap, "function");
  assert.equal(typeof listenCoach.styleGuides, "function");
  assert.equal(typeof listenCoach.subgenreGuides, "function");
  assert.equal(typeof listenCoach.styleLessonForSnapshot, "function");
});

test("external analysis source registry includes the first four GitHub projects", () => {
  const sources = listenCoach.externalAnalysisSources();
  const ids = sources.map(item => item.id).sort();

  assert.deepEqual(ids, ["discogs-effnet", "essentia-js", "meyda", "wled-rtmgc"].sort());
  assert.ok(sources.find(item => item.id === "meyda").role.includes("feature"));
  assert.ok(sources.find(item => item.id === "essentia-js").url.includes("github.com/MTG/essentia.js"));
  assert.ok(sources.find(item => item.id === "discogs-effnet").role.includes("Discogs"));
  assert.ok(sources.find(item => item.id === "wled-rtmgc").url.includes("WLEDAudioSyncRTMGC"));
});

test("pretrained genre registry includes Discogs400 TFJS manifest and labels", () => {
  const models = listenCoach.pretrainedGenreModels();
  const model = models.find(item => item.id === "discogs-effnet-tfjs");

  assert.ok(model, "Discogs400 TFJS model should be registered");
  assert.equal(model.classes, 400);
  assert.equal(model.sourceId, "discogs-effnet");
  assert.match(model.modelUrl, /assets\/sound-buddy-models\/discogs-effnet\/model-tfjs\/model\.json/);
  assert.match(model.labelsUrl, /assets\/sound-buddy-models\/discogs-effnet\/labels\.json/);
  assert.ok(model.sizeBytes > 45000000);
  assert.equal(model.weightsMode, "local-shards");
  assert.match(model.license, /CC BY-NC-SA/i);
});

test("model mode registry supports hybrid, local, Discogs400, and feature-assisted scoring", () => {
  const modes = listenCoach.modelModes();
  const ids = modes.map(item => item.id);

  assert.deepEqual(ids, ["hybrid", "local", "discogs", "features"]);
  assert.equal(modes.find(item => item.id === "hybrid").usesDiscogs, true);
  assert.equal(modes.find(item => item.id === "local").usesDiscogs, false);
  assert.equal(modes.find(item => item.id === "discogs").usesLocal, false);
  assert.equal(modes.find(item => item.id === "features").usesFeatures, true);
});

test("pretrained Discogs predictions normalize into external genre tags", () => {
  const tags = listenCoach.normalizePretrainedGenrePredictions(
    [0.91, 0.84, 0.64, 0.72],
    [
      "Electronic---Acid",
      "Electronic---Techno",
      "Electronic---UK Garage",
      "Electronic---Dub Techno",
    ],
    { source: "discogs-effnet", modelId: "discogs-effnet-tfjs", minProbability: 0.6, topN: 3 }
  );
  const mapped = listenCoach.mapExternalGenreTags(tags);

  assert.deepEqual(tags.map(item => item.tag), [
    "Electronic---Acid",
    "Electronic---Techno",
    "Electronic---Dub Techno",
  ]);
  assert.equal(tags[0].modelId, "discogs-effnet-tfjs");
  assert.ok(mapped.subgenreScores["acid-techno"] > 0.7);
  assert.ok(mapped.subgenreScores["dub-techno"] > 0.6);
});

test("local Discogs400 TFJS manifest and labels are available for browser loading", () => {
  const manifestPath = path.join(__dirname, "..", "assets", "sound-buddy-models", "discogs-effnet", "model-tfjs", "model.json");
  const modelDir = path.dirname(manifestPath);
  const labelsPath = path.join(__dirname, "..", "assets", "sound-buddy-models", "discogs-effnet", "labels.json");

  assert.equal(fs.existsSync(manifestPath), true);
  assert.equal(fs.existsSync(labelsPath), true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));

  assert.equal(manifest.format, "graph-model");
  assert.equal(manifest.weightsManifest[0].paths.length, 11);
  assert.equal(manifest.weightsManifest[0].paths[0], "group1-shard1of11.bin");
  for (const shardPath of manifest.weightsManifest[0].paths) {
    const resolvedShard = path.join(modelDir, shardPath);
    assert.equal(fs.existsSync(resolvedShard), true, `${shardPath} should be local`);
    assert.ok(fs.statSync(resolvedShard).size > 3000000, `${shardPath} should contain model weights`);
  }
  assert.equal(labels.length, 400);
  assert.ok(labels.includes("Electronic---Acid"));
  assert.ok(labels.includes("Electronic---Techno"));
  assert.ok(labels.includes("Electronic---UK Garage"));
});

test("local Discogs400 runtime does not depend on CDN imports", () => {
  const rootDir = path.join(__dirname, "..", "assets", "sound-buddy-models", "discogs-effnet");
  const runtime = fs.readFileSync(path.join(rootDir, "discogs-runtime.js"), "utf8");
  const worklet = fs.readFileSync(path.join(rootDir, "feature-worklet.js"), "utf8");
  const worker = fs.readFileSync(path.join(rootDir, "inference-worker.js"), "utf8");
  const vendorDir = path.join(rootDir, "vendor");

  assert.doesNotMatch(`${runtime}\n${worklet}\n${worker}`, /https:\/\/cdn\.jsdelivr\.net/);
  assert.match(worklet, /".\/vendor\/essentia-wasm\.es\.js"/);
  assert.match(worker, /importScripts\("\.\/vendor\/tf\.min\.js", "\.\/vendor\/essentia\.js-model\.js"\)/);
  assert.equal(fs.existsSync(path.join(vendorDir, "tf.min.js")), true);
  assert.equal(fs.existsSync(path.join(vendorDir, "essentia-wasm.es.js")), true);
  assert.equal(fs.existsSync(path.join(vendorDir, "essentia.js-model.js")), true);
  assert.equal(fs.existsSync(path.join(vendorDir, "essentia.js-model.es.js")), true);
});

test("Meyda features enrich the local snapshot without replacing fallback features", () => {
  const snapshot = listenCoach.analyzeAudioSnapshot({
    frequencyData: frequencyDataFor([{ low: 5200, high: 7800, value: 220 }]),
    timeDomainData: steadyTimeData(0.22),
    sampleRate: SAMPLE_RATE,
    fftSize: FFT_SIZE,
    meydaFeatures: {
      rms: 0.19,
      spectralRolloff: 7200,
      spectralFlatness: 0.18,
      spectralFlux: 0.42,
      zcr: 0.08,
      perceptualSharpness: 0.62,
      spectralContrast: [0.18, 0.36, 0.62, 0.44],
      chroma: [0.08, 0.1, 0.7, 0.16, 0.1, 0.09, 0.08, 0.1, 0.11, 0.1, 0.09, 0.08],
      mfcc: [4.2, -1.1, 0.4],
    },
  });

  assert.equal(snapshot.external?.meyda?.available, true);
  assert.equal(snapshot.external.meyda.featureCount >= 6, true);
  assert.equal(snapshot.spectralRolloff, 7200);
  assert.ok(snapshot.spectralContrast > 0.35);
  assert.deepEqual(snapshot.spectralContrastBands, [0.18, 0.36, 0.62, 0.44]);
  assert.ok(snapshot.chromaFocus > 0.4);
  assert.ok(snapshot.highShare > 0);
});

test("local analyzer estimates spectral contrast from quiet and bright frequency bands", () => {
  const snapshot = listenCoach.analyzeAudioSnapshot({
    frequencyData: frequencyDataFor([
      { low: 35, high: 70, value: 235 },
      { low: 90, high: 130, value: 12 },
      { low: 620, high: 950, value: 230 },
      { low: 1300, high: 1800, value: 18 },
      { low: 5200, high: 6400, value: 225 },
      { low: 7600, high: 8800, value: 20 },
    ]),
    timeDomainData: steadyTimeData(0.22),
    sampleRate: SAMPLE_RATE,
    fftSize: FFT_SIZE,
  });

  assert.ok(snapshot.spectralContrast > 0.45);
  assert.ok(Array.isArray(snapshot.spectralContrastBands));
  assert.ok(snapshot.spectralContrastBands.length >= 4);
});

test("external Discogs-style tags map into current genre and subgenre scores", () => {
  const mapped = listenCoach.mapExternalGenreTags([
    { tag: "Acid Techno", probability: 0.88, source: "discogs-effnet" },
    { tag: "UK Garage", probability: 0.72, source: "wled-rtmgc" },
    { tag: "EBM", probability: 0.61, source: "essentia-js" },
    { tag: "Drum N Bass", probability: 0.7, source: "discogs-effnet" },
  ]);

  assert.ok(mapped.styleScores.acid > 0.6);
  assert.ok(mapped.styleScores.garage > 0.4);
  assert.ok(mapped.styleScores.industrial > 0.3);
  assert.ok(mapped.styleScores.dnb > 0.5);
  assert.ok(mapped.subgenreScores["acid-techno"] > 0.7);
  assert.ok(mapped.subgenreScores["ukg-garage"] > 0.5);
  assert.ok(mapped.subgenreScores["ebm-electroclash"] > 0.4);
  assert.ok(mapped.subgenreScores["jungle-dnb"] > 0.5);
});

test("model mode can isolate local scoring from Discogs400 tag scoring", () => {
  const technoSnapshot = {
    level: 0.28,
    bassShare: 0.42,
    highShare: 0.16,
    lowMid: 0.22,
    mid: 0.12,
    bass: 0.26,
    high: 0.06,
    brightness: 0.42,
    centroid: 2200,
    pulseBpm: 136,
    stablePulse: true,
    externalTags: [
      { tag: "Electronic---UK Garage", probability: 0.96, source: "discogs-effnet" },
    ],
  };

  const local = listenCoach.detectStyleFromSnapshot(technoSnapshot, { modelMode: "local" });
  const discogs = listenCoach.detectStyleFromSnapshot(technoSnapshot, { modelMode: "discogs" });

  assert.equal(local.styleId, "techno");
  assert.equal(discogs.styleId, "garage");
  assert.match(discogs.reason, /Discogs400/);
});

test("Discogs400-only mode reports subgenres from model tags only", () => {
  const snapshot = {
    level: 0.08,
    bassShare: 0.12,
    highShare: 0.1,
    bass: 0.02,
    high: 0.02,
    pulseBpm: null,
    stablePulse: false,
    externalTags: [
      { tag: "Electronic---Dub Techno", probability: 0.92, source: "discogs-effnet" },
    ],
  };

  const subgenre = listenCoach.detectSubgenresFromSnapshot(snapshot, { modelMode: "discogs" });
  const local = listenCoach.detectSubgenresFromSnapshot(snapshot, { modelMode: "local" });

  assert.equal(subgenre.primary.id, "dub-techno");
  assert.match(subgenre.text, /Discogs400/);
  assert.notEqual(local.primary?.id, "dub-techno");
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

test("frequency sample matrix covers every analyzer band range", () => {
  const coveredBands = FREQUENCY_SAMPLE_MATRIX.map(item => item.expectedBand).sort();

  assert.deepEqual(coveredBands, [...ANALYSIS_BAND_KEYS].sort());
  for (const sample of FREQUENCY_SAMPLE_MATRIX) {
    const snapshot = snapshotFromRanges(sample.ranges);
    const rankedBands = ANALYSIS_BAND_KEYS
      .map(key => ({ key, value: snapshot[key] }))
      .sort((a, b) => b.value - a.value);

    assert.equal(
      rankedBands[0].key,
      sample.expectedBand,
      `${sample.name}: expected ${sample.expectedBand}, got ${rankedBands[0].key}`
    );
    assert.ok(
      rankedBands[0].value > rankedBands[1].value + 0.03,
      `${sample.name}: expected a clear ${sample.expectedBand} lead`
    );
  }
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

test("style sample matrix covers every top-level style range", () => {
  const expectedIds = listenCoach.styleGuides().map(item => item.id).sort();
  const coveredIds = STYLE_SAMPLE_MATRIX.map(item => item.expectedStyle).sort();

  assert.deepEqual(coveredIds, expectedIds);
  for (const sample of STYLE_SAMPLE_MATRIX) {
    const state = streamStateFrom(sample.snapshot, sample.frames || []);
    const detected = listenCoach.detectStyleFromSnapshot(sample.snapshot, state);
    assert.equal(detected.styleId, sample.expectedStyle, `${sample.name}: expected ${sample.expectedStyle}, got ${detected.styleId}`);
  }
});

test("subgenre sample matrix covers every subgenre range", () => {
  const expectedIds = listenCoach.subgenreGuides().map(item => item.id).sort();
  const coveredIds = SUBGENRE_SAMPLE_MATRIX.map(item => item.expectedSubgenre).sort();

  assert.deepEqual(coveredIds, expectedIds);
  for (const sample of SUBGENRE_SAMPLE_MATRIX) {
    const state = streamStateFrom(sample.snapshot, sample.frames || []);
    const detected = listenCoach.detectSubgenresFromSnapshot(sample.snapshot, state);
    assert.ok(
      detected.candidates.some(item => item.id === sample.expectedSubgenre),
      `${sample.name}: expected ${sample.expectedSubgenre} in candidates, got ${detected.candidates.map(item => item.id).join(", ")}`
    );
  }
});

test("live broad genre detection keeps DNB, house, and trance recoverable under common tempo reads", () => {
  const cases = [
    ["half-time DNB read", "dnb", {
      level: 0.32,
      bassShare: 0.37,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.15,
      bass: 0.23,
      high: 0.17,
      brightness: 0.95,
      centroid: 4300,
      pulseBpm: 86,
      stablePulse: false,
    }],
    ["fast DNB read", "dnb", {
      level: 0.32,
      bassShare: 0.37,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.15,
      bass: 0.23,
      high: 0.17,
      brightness: 0.95,
      centroid: 4300,
      pulseBpm: 174,
      stablePulse: true,
    }],
    ["132 BPM house groove", "house", {
      level: 0.24,
      bassShare: 0.31,
      highShare: 0.2,
      lowMid: 0.22,
      mid: 0.21,
      bass: 0.16,
      high: 0.08,
      brightness: 0.55,
      centroid: 2400,
      pulseBpm: 132,
      stablePulse: true,
    }],
    ["loose warm house groove", "house", {
      level: 0.24,
      bassShare: 0.3,
      highShare: 0.19,
      lowMid: 0.23,
      mid: 0.22,
      bass: 0.15,
      high: 0.07,
      brightness: 0.5,
      centroid: 2300,
      pulseBpm: 124,
      stablePulse: false,
    }],
    ["progressive trance bed", "trance", {
      level: 0.27,
      bassShare: 0.3,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.24,
      bass: 0.15,
      high: 0.16,
      brightness: 0.88,
      centroid: 3600,
      pulseBpm: 132,
      stablePulse: true,
    }],
    ["bright hard trance lift", "trance", {
      level: 0.31,
      bassShare: 0.34,
      highShare: 0.29,
      lowMid: 0.1,
      mid: 0.24,
      bass: 0.18,
      high: 0.19,
      brightness: 1.05,
      centroid: 4200,
      pulseBpm: 148,
      stablePulse: true,
    }],
  ];

  for (const [name, expectedStyle, snapshot] of cases) {
    const state = listenCoach.createCoachState({ now: 0 });
    for (let index = 0; index < 16; index += 1) {
      state.snapshots.push({
        capturedAt: index * 700,
        ...snapshot,
        pulseBpm: snapshot.pulseBpm + (index % 3 === 0 ? 1 : 0),
      });
    }
    const detected = listenCoach.detectStyleFromSnapshot(snapshot, state);

    assert.equal(detected.styleId, expectedStyle, `${name}: expected ${expectedStyle}, got ${detected.styleId}`);
  }
});

test("live subgenre detection keeps DNB, house, and trance families ahead of techno fallbacks", () => {
  const cases = [
    ["half-time DNB read", "half-time-dnb", {
      level: 0.32,
      bassShare: 0.37,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.15,
      bass: 0.23,
      high: 0.17,
      brightness: 0.95,
      centroid: 4300,
      pulseBpm: 86,
      stablePulse: false,
    }],
    ["fast DNB read", "jungle-dnb", {
      level: 0.32,
      bassShare: 0.37,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.15,
      bass: 0.23,
      high: 0.17,
      brightness: 0.95,
      centroid: 4300,
      pulseBpm: 174,
      stablePulse: true,
    }],
    ["132 BPM house groove", "classic-house", {
      level: 0.24,
      bassShare: 0.31,
      highShare: 0.2,
      lowMid: 0.22,
      mid: 0.21,
      bass: 0.16,
      high: 0.08,
      brightness: 0.55,
      centroid: 2400,
      pulseBpm: 132,
      stablePulse: true,
    }],
    ["progressive trance bed", "progressive-melodic", {
      level: 0.27,
      bassShare: 0.3,
      highShare: 0.26,
      lowMid: 0.12,
      mid: 0.24,
      bass: 0.15,
      high: 0.16,
      brightness: 0.88,
      centroid: 3600,
      pulseBpm: 132,
      stablePulse: true,
    }],
    ["bright hard trance lift", "hard-trance", {
      level: 0.31,
      bassShare: 0.34,
      highShare: 0.29,
      lowMid: 0.1,
      mid: 0.24,
      bass: 0.18,
      high: 0.19,
      brightness: 1.05,
      centroid: 4200,
      pulseBpm: 148,
      stablePulse: true,
    }],
  ];

  for (const [name, expectedSubgenre, snapshot] of cases) {
    const state = listenCoach.createCoachState({ now: 0 });
    for (let index = 0; index < 16; index += 1) {
      state.snapshots.push({
        capturedAt: index * 700,
        ...snapshot,
        pulseBpm: snapshot.pulseBpm + (index % 3 === 0 ? 1 : 0),
      });
    }
    const detected = listenCoach.detectSubgenresFromSnapshot(snapshot, state);

    assert.equal(detected.primary.id, expectedSubgenre, `${name}: expected ${expectedSubgenre}, got ${detected.primary.id}`);
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

test("acid techno detection hears a resonant 303-style line over a techno pulse", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  for (let index = 0; index < 14; index += 1) {
    state.snapshots.push({
      capturedAt: index * 700,
      level: 0.29 + (index % 3) * 0.01,
      bassShare: 0.33 + (index % 2) * 0.02,
      highShare: 0.33 + (index % 4) * 0.012,
      lowMid: 0.14,
      mid: 0.2 + (index % 3) * 0.012,
      bass: 0.2 + (index % 2) * 0.018,
      high: 0.23 + (index % 4) * 0.014,
      air: 0.13 + (index % 2) * 0.012,
      brightness: 1.5 + (index % 4) * 0.08,
      centroid: 5200 + (index % 4) * 180,
      pulseBpm: 138 + (index % 3),
      stablePulse: true,
    });
  }
  const snapshot = {
    capturedAt: 10100,
    level: 0.32,
    bassShare: 0.35,
    highShare: 0.36,
    lowMid: 0.14,
    mid: 0.22,
    bass: 0.22,
    high: 0.27,
    air: 0.15,
    brightness: 1.75,
    centroid: 5700,
    pulseBpm: 139,
    stablePulse: true,
  };

  const style = listenCoach.detectStyleFromSnapshot(snapshot, state);
  const subgenre = listenCoach.detectSubgenresFromSnapshot(snapshot, state);

  assert.equal(style.styleId, "acid");
  assert.equal(subgenre.primary.id, "acid-techno");
  assert.match(subgenre.text, /Acid techno/i);
});

test("external tag adapter can steer close calls toward ML-backed candidates", () => {
  const snapshot = {
    level: 0.27,
    bassShare: 0.34,
    highShare: 0.25,
    lowMid: 0.15,
    mid: 0.18,
    bass: 0.2,
    high: 0.12,
    brightness: 0.78,
    centroid: 3600,
    pulseBpm: 134,
    stablePulse: true,
    externalTags: [
      { tag: "Dub Techno", probability: 0.8, source: "discogs-effnet" },
      { tag: "Techno", probability: 0.68, source: "essentia-js" },
    ],
  };
  const subgenre = listenCoach.detectSubgenresFromSnapshot(snapshot, {});
  const mix = listenCoach.detectGenreMixFromSnapshot(snapshot, {});

  assert.ok(mix.mix.some(item => item.styleId === "techno"));
  assert.ok(subgenre.candidates.some(item => item.id === "dub-techno"));
});

test("subgenre detection recognizes common club signatures beyond broad style", () => {
  const cases = [
    {
      name: "acid house",
      expectedStyle: "house",
      expectedSubgenre: "acid-house",
      snapshot: {
        level: 0.28,
        bassShare: 0.3,
        highShare: 0.3,
        lowMid: 0.22,
        mid: 0.22,
        bass: 0.17,
        high: 0.18,
        air: 0.12,
        brightness: 1.55,
        centroid: 5200,
        pulseBpm: 124,
        stablePulse: true,
      },
      frames: Array.from({ length: 12 }, (_, index) => ({
        level: 0.26 + (index % 2) * 0.01,
        pulseBpm: 124 + (index % 2),
        stablePulse: true,
      })),
    },
    {
      name: "dub techno",
      expectedStyle: "techno",
      expectedSubgenre: "dub-techno",
      snapshot: {
        level: 0.2,
        bassShare: 0.29,
        highShare: 0.13,
        lowMid: 0.24,
        mid: 0.2,
        bass: 0.15,
        high: 0.05,
        brightness: 0.35,
        centroid: 1900,
        pulseBpm: 124,
        stablePulse: true,
      },
      frames: Array.from({ length: 14 }, (_, index) => ({
        level: 0.19 + (index % 3) * 0.006,
        bassShare: 0.28,
        highShare: 0.12,
        pulseBpm: 124,
        stablePulse: true,
      })),
    },
    {
      name: "minimal techno",
      expectedStyle: "techno",
      expectedSubgenre: "minimal-techno",
      snapshot: {
        level: 0.18,
        bassShare: 0.3,
        highShare: 0.18,
        lowMid: 0.15,
        mid: 0.13,
        bass: 0.14,
        high: 0.06,
        brightness: 0.46,
        centroid: 2200,
        pulseBpm: 126,
        stablePulse: true,
      },
      frames: Array.from({ length: 16 }, (_, index) => ({
        level: 0.18 + (index % 2) * 0.003,
        bass: 0.14 + (index % 2) * 0.002,
        pulseBpm: 126,
        stablePulse: true,
      })),
    },
    {
      name: "EBM electroclash",
      expectedStyle: "industrial",
      expectedSubgenre: "ebm-electroclash",
      snapshot: {
        level: 0.31,
        bassShare: 0.34,
        highShare: 0.28,
        lowMid: 0.12,
        mid: 0.25,
        bass: 0.2,
        high: 0.17,
        brightness: 1.05,
        centroid: 4100,
        pulseBpm: 122,
        stablePulse: true,
      },
      frames: Array.from({ length: 10 }, (_, index) => ({
        level: 0.3 + (index % 2) * 0.01,
        pulseBpm: 122,
        stablePulse: true,
      })),
    },
    {
      name: "UKG garage",
      expectedStyle: "garage",
      expectedSubgenre: "ukg-garage",
      snapshot: {
        level: 0.26,
        bassShare: 0.34,
        highShare: 0.18,
        lowMid: 0.2,
        mid: 0.17,
        bass: 0.2,
        high: 0.07,
        brightness: 0.55,
        centroid: 2600,
        pulseBpm: 132,
        stablePulse: false,
      },
      frames: Array.from({ length: 12 }, (_, index) => ({
        level: 0.24 + (index % 2) * 0.04,
        bass: 0.16 + (index % 2) * 0.08,
        pulseBpm: 132,
        stablePulse: false,
      })),
    },
    {
      name: "deep dubstep",
      expectedStyle: "bass",
      expectedSubgenre: "deep-dubstep",
      snapshot: {
        level: 0.24,
        bassShare: 0.52,
        highShare: 0.11,
        lowMid: 0.12,
        mid: 0.07,
        bass: 0.31,
        high: 0.04,
        brightness: 0.26,
        centroid: 1300,
        pulseBpm: 140,
        stablePulse: false,
      },
      frames: Array.from({ length: 10 }, (_, index) => ({
        level: 0.22 + (index % 2) * 0.03,
        pulseBpm: 140,
        stablePulse: false,
      })),
    },
    {
      name: "hardstyle",
      expectedStyle: "hard-dance",
      expectedSubgenre: "hardstyle",
      snapshot: {
        level: 0.38,
        bassShare: 0.47,
        highShare: 0.24,
        lowMid: 0.15,
        mid: 0.22,
        bass: 0.34,
        high: 0.14,
        brightness: 0.82,
        centroid: 3500,
        pulseBpm: 154,
        stablePulse: true,
      },
      frames: Array.from({ length: 10 }, (_, index) => ({
        level: 0.36 + (index % 2) * 0.02,
        pulseBpm: 154,
        stablePulse: true,
      })),
    },
    {
      name: "hardcore",
      expectedStyle: "hard-dance",
      expectedSubgenre: "hardcore",
      snapshot: {
        level: 0.42,
        bassShare: 0.5,
        highShare: 0.27,
        lowMid: 0.14,
        mid: 0.18,
        bass: 0.38,
        high: 0.18,
        brightness: 1.05,
        centroid: 4200,
        pulseBpm: 172,
        stablePulse: true,
      },
      frames: Array.from({ length: 10 }, (_, index) => ({
        level: 0.41 + (index % 2) * 0.02,
        pulseBpm: 172,
        stablePulse: true,
      })),
    },
  ];

  const results = cases.map(item => {
    const state = streamStateFrom(item.snapshot, item.frames);
    return {
      name: item.name,
      style: listenCoach.detectStyleFromSnapshot(item.snapshot, state).styleId,
      subgenre: listenCoach.detectSubgenresFromSnapshot(item.snapshot, state).primary.id,
    };
  });

  assert.deepEqual(results, cases.map(item => ({
    name: item.name,
    style: item.expectedStyle,
    subgenre: item.expectedSubgenre,
  })));
});

test("energy arc detection reads recent stream direction", () => {
  const buildingState = listenCoach.createCoachState({ now: 0 });
  [0.12, 0.16, 0.2, 0.25, 0.3].forEach((level, index) => {
    buildingState.snapshots.push({
      capturedAt: index * 1200,
      level,
      bass: 0.14 + index * 0.025,
      high: 0.08 + index * 0.012,
      bassShare: 0.36,
      highShare: 0.18,
      stablePulse: true,
      pulseBpm: 138,
    });
  });

  const building = listenCoach.detectEnergyArcFromSnapshot({
    capturedAt: 6200,
    level: 0.36,
    bass: 0.28,
    high: 0.15,
    bassShare: 0.4,
    highShare: 0.22,
    stablePulse: true,
    pulseBpm: 138,
  }, buildingState);

  const breakdownState = listenCoach.createCoachState({ now: 0 });
  [0.38, 0.34, 0.27, 0.2, 0.14].forEach((level, index) => {
    breakdownState.snapshots.push({
      capturedAt: index * 1200,
      level,
      bass: 0.28 - index * 0.035,
      high: 0.22 - index * 0.018,
      bassShare: 0.32,
      highShare: 0.2,
      stablePulse: index < 3,
      pulseBpm: 136,
    });
  });

  const breakdown = listenCoach.detectEnergyArcFromSnapshot({
    capturedAt: 6200,
    level: 0.11,
    bass: 0.08,
    high: 0.1,
    bassShare: 0.22,
    highShare: 0.3,
    stablePulse: false,
    pulseBpm: null,
  }, breakdownState);

  assert.equal(building.arcId, "building");
  assert.match(building.text, /building|pressure/i);
  assert.ok(building.cues.length >= 2);
  assert.equal(breakdown.arcId, "breakdown");
  assert.match(breakdown.text, /breakdown|reset|pulled/i);
});

test("listening drill adapts to detected style and arc", () => {
  const state = listenCoach.createCoachState({ now: 0 });
  for (let index = 0; index < 12; index += 1) {
    state.snapshots.push({
      capturedAt: index * 800,
      level: 0.3 + index * 0.004,
      bassShare: 0.46,
      highShare: 0.2,
      lowMid: 0.18,
      mid: 0.12,
      bass: 0.3,
      high: 0.1,
      brightness: 0.5,
      centroid: 2400,
      pulseBpm: 148,
      stablePulse: true,
    });
  }

  const drill = listenCoach.listeningDrillForSnapshot({
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
  }, state);

  assert.equal(drill.focus, "kick");
  assert.match(`${drill.title} ${drill.prompt}`, /kick|pressure/i);
  assert.equal(drill.durationBars, 16);
  assert.ok(drill.steps.length >= 3);
});

test("session recap formats recent cues with style, arc, and drill context", () => {
  const recap = listenCoach.formatSessionRecap({
    style: { label: "Techno", confidence: 0.72 },
    subgenre: { primary: { label: "Hard techno", confidence: 0.66 } },
    arc: { label: "Building", text: "Pressure is rising.", confidence: 0.7 },
    drill: { title: "Kick tail check", prompt: "Compare the kick attack with the tail." },
    comments: [
      { category: "kick", text: "Low end is leading." },
      { category: "texture", text: "Top end opened." },
    ],
  });

  assert.match(recap, /Sound Buddy recap/i);
  assert.match(recap, /Style: Techno/i);
  assert.match(recap, /Subgenre: Hard techno/i);
  assert.match(recap, /Arc: Building/i);
  assert.match(recap, /Kick tail check/i);
  assert.match(recap, /KICK: Low end is leading/i);
});

test("Sound Buddy page exposes energy arc, drill, and recap controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sound-buddy.html"), "utf8");

  assert.match(html, /id="energyArcReadout"/);
  assert.match(html, /id="energyArcBoard"/);
  assert.match(html, /id="drillBoard"/);
  assert.match(html, /id="newListeningDrill"/);
  assert.match(html, /id="copyCoachRecap"/);
  assert.match(html, /Listening drill/);
});

test("Sound Buddy page exposes advanced tuning controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sound-buddy.html"), "utf8");

  assert.match(html, /id="tuningWindow"/);
  assert.match(html, /id="tuningSensitivity"/);
  assert.match(html, /id="tuningBassBias"/);
  assert.match(html, /id="tuningTextureBias"/);
  assert.match(html, /data-tuning="windowSeconds"/);
  assert.match(html, /data-tuning="sensitivity"/);
  assert.match(html, /data-tuning="bassBias"/);
  assert.match(html, /data-tuning="textureBias"/);
});

test("Sound Buddy page exposes hybrid ML assist source status", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sound-buddy.html"), "utf8");

  assert.match(html, /id="externalAnalysisStatus"/);
  assert.match(html, /id="externalSourceBoard"/);
  assert.match(html, /Meyda/);
  assert.match(html, /Essentia/);
  assert.match(html, /Discogs/);
  assert.match(html, /WLEDAudioSyncRTMGC/);
  assert.match(html, /loadDiscogsModel:\s*true/);
  assert.match(html, /Sound Buddy <small class="coach-beta-badge">beta<\/small>/);
  assert.match(html, /coach-title-beta">beta<\/small>/);
  assert.match(html, /data-model-mode="hybrid"/);
  assert.match(html, /data-model-mode="local"/);
  assert.match(html, /data-model-mode="discogs"/);
  assert.match(html, /data-model-mode="features"/);
  assert.match(html, /modelMode:\s*\(\)\s*=>\s*coachSettings\.modelMode/);
});

test("Sound Buddy page exposes collapsible signal indicators", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sound-buddy.html"), "utf8");

  assert.match(html, /class="coach-drawer coach-signal-drawer"/);
  assert.match(html, /Signal indicators/);
  assert.match(html, /id="signalLiveStatus"/);
  assert.match(html, /id="signalIndicatorBoard"/);
  assert.match(html, /renderSignalIndicators/);
  assert.match(html, /Texture \/ MIR/);
});
