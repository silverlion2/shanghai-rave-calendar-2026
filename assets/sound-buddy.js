(function attachListenCoach(root, factory) {
  const api = factory(root || {});
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.LISTEN_COACH = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createListenCoach(root) {
  const DEFAULT_INTERVAL_MS = 4200;
  const MAX_HISTORY = 900;
  const MAX_PULSE_TIMES = 12;
  const STREAM_DETECTION_WINDOW_MS = 18000;
  const GENRE_DETECTION_WINDOW_MS = 30000;
  const SUBGENRE_DETECTION_WINDOW_MS = 32000;
  const SILENCE_LEVEL = 0.018;
  const DEFAULT_DETECTION_TUNING = {
    genreWindowMs: GENRE_DETECTION_WINDOW_MS,
    subgenreWindowMs: SUBGENRE_DETECTION_WINDOW_MS,
    sensitivity: 1,
    bassBias: 1,
    textureBias: 1,
  };
  const EXTERNAL_ANALYSIS_SOURCES = [
    {
      id: "meyda",
      label: "Meyda",
      role: "real-time Web Audio feature extraction",
      url: "https://github.com/meyda/meyda",
      license: "MIT",
      mode: "feature-extractor",
    },
    {
      id: "essentia-js",
      label: "Essentia.js",
      role: "browser / Node audio analysis and TensorFlow.js ML runtime",
      url: "https://github.com/MTG/essentia.js",
      license: "AGPL-3.0",
      mode: "ml-runtime",
    },
    {
      id: "discogs-effnet",
      label: "Discogs400 EffNet",
      role: "local pretrained Discogs taxonomy subgenre model",
      url: "https://github.com/MTG/essentia.js/tree/master/examples/demos/discogs-autotagging",
      license: "CC BY-NC-SA model weights / AGPL-3.0 runtime",
      mode: "pretrained-model",
    },
    {
      id: "wled-rtmgc",
      label: "WLEDAudioSyncRTMGC",
      role: "reference real-time mic capture and top-tag streaming pattern",
      url: "https://github.com/zak-45/WLEDAudioSyncRTMGC",
      license: "MIT",
      mode: "integration-pattern",
    },
  ];
  const PRETRAINED_GENRE_MODELS = [
    {
      id: "discogs-effnet-tfjs",
      label: "Discogs400 EffNet TFJS",
      sourceId: "discogs-effnet",
      sourceLabel: "Discogs400 EffNet",
      modelName: "211115-202040_resnet18",
      classes: 400,
      modelUrl: "assets/sound-buddy-models/discogs-effnet/model-tfjs/model.json",
      labelsUrl: "assets/sound-buddy-models/discogs-effnet/labels.json",
      runtimeUrl: "assets/sound-buddy-models/discogs-effnet/discogs-runtime.js",
      sizeBytes: 45548294,
      weightsMode: "local-shards",
      assetStrategy: "local manifest, labels, and TFJS weight shards",
      license: "CC BY-NC-SA 4.0 model weights; Essentia.js runtime AGPL-3.0",
      upstreamUrl: "https://github.com/MTG/essentia.js/tree/819c00e8f034dc709e3d330ed8ac9ed37dfdb767/examples/demos/discogs-autotagging",
      mode: "local-browser-tfjs",
    },
  ];
  const MODEL_MODES = [
    {
      id: "hybrid",
      label: "Hybrid",
      role: "local analyzer + Meyda features + Discogs400 tags",
      usesLocal: true,
      usesFeatures: true,
      usesDiscogs: true,
    },
    {
      id: "local",
      label: "Local only",
      role: "FFT, pulse, and local heuristic scoring only",
      usesLocal: true,
      usesFeatures: false,
      usesDiscogs: false,
    },
    {
      id: "discogs",
      label: "Discogs400",
      role: "pretrained Discogs400 tag model only",
      usesLocal: false,
      usesFeatures: false,
      usesDiscogs: true,
    },
    {
      id: "features",
      label: "Features",
      role: "local scoring with Meyda MIR features, no Discogs tag boosts",
      usesLocal: true,
      usesFeatures: true,
      usesDiscogs: false,
    },
  ];
  const MODEL_MODE_IDS = new Set(MODEL_MODES.map(mode => mode.id));
  const STYLE_GUIDES = {
    techno: {
      label: "Techno",
      tempo: "Often 125-145 BPM",
      pattern: "Four-four kick, repeating machine groove, slow changes.",
      cues: ["steady kick", "loop tension", "filter movement", "room pressure"],
      lesson: "Techno teaches patience: count the pulse, then notice the small changes that move the room.",
    },
    electro: {
      label: "Electro",
      tempo: "Often 120-140 BPM",
      pattern: "Broken machine funk, syncopated drums, sharp bass, robotic edges.",
      cues: ["broken kick", "snare snap", "machine funk", "vocoder feel"],
      lesson: "Electro is less about a straight stomp and more about angular funk between the kick and snare.",
    },
    house: {
      label: "House",
      tempo: "Often 118-130 BPM",
      pattern: "Four-four pulse, warmer swing, claps, chords, vocals or soulful fragments.",
      cues: ["swing", "clap", "chords", "warm bass"],
      lesson: "House usually invites bounce: listen for swing, warmth, and the relationship between clap and bassline.",
    },
    breaks: {
      label: "Breaks / Bass",
      tempo: "Wide range",
      pattern: "Broken drums, bass pressure, garage or jungle-adjacent movement.",
      cues: ["off-grid drums", "bass drops", "snare accents", "shuffle"],
      lesson: "Breaks and bass styles move around the grid; follow the snare and bass answer instead of only the downbeat.",
    },
    acid: {
      label: "Acid",
      tempo: "Often 130-150 BPM",
      pattern: "303-style squelch, resonance, rolling pressure, filter movement.",
      cues: ["squelch", "resonance", "filter bite", "rolling line"],
      lesson: "Acid tracks often teach through one animated line: hear how resonance opens and closes over the groove.",
    },
    trance: {
      label: "Trance",
      tempo: "Often 128-150 BPM",
      pattern: "Long builds, bright leads, arpeggios, lift, breakdown and release.",
      cues: ["rising lead", "arpeggio", "long build", "euphoric lift"],
      lesson: "Trance is about direction and lift: follow the lead line and how tension stretches over many bars.",
    },
    garage: {
      label: "Garage / UKG",
      tempo: "Often 126-140 BPM",
      pattern: "Swung drums, skipped kicks, shuffle, bass bounce, clipped vocal feel.",
      cues: ["shuffle", "2-step", "bass bounce", "vocal chops"],
      lesson: "Garage lives in the skipped spaces. Listen for swing, ghost hits, and bass answering the drums.",
    },
    dnb: {
      label: "Jungle / DNB",
      tempo: "Often 160-180 BPM",
      pattern: "Fast breaks, rolling tops, sub bass, chopped drum motion.",
      cues: ["fast break", "rolling hats", "sub pressure", "chopped drums"],
      lesson: "Jungle and DNB move through break detail. Track the drum phrase, not only the speed.",
    },
    bass: {
      label: "Bass / Dubstep",
      tempo: "Often 70/140 or 130-150 BPM",
      pattern: "Sub pressure, half-time weight, sparse drums, wobble or sound-system bass.",
      cues: ["sub weight", "half-time", "wobble", "space"],
      lesson: "Bass music often leaves space for low-end movement. Notice the silence around the sub as much as the hit.",
    },
    downtempo: {
      label: "Downtempo / Ambient",
      tempo: "Often below 115 BPM or beatless",
      pattern: "Slow pulse, atmospheric texture, spacious arrangement, less kick pressure.",
      cues: ["slow pulse", "space", "drone", "soft texture"],
      lesson: "Downtempo and ambient listening is about space and timbre: follow texture, depth, and slow changes.",
    },
    "hard-dance": {
      label: "Hard dance / Hardcore",
      tempo: "Often 145-180 BPM",
      pattern: "Fast pressure, hard kick design, rave stabs, reverse bass or distorted drive.",
      cues: ["fast kick", "reverse bass", "rave stab", "distortion"],
      lesson: "Hard dance and hardcore styles center the kick as a sound-design object. Listen for tail shape, drive, and how the riff rides the kick.",
    },
    industrial: {
      label: "Industrial / EBM",
      tempo: "Often 120-150 BPM",
      pattern: "Metallic percussion, distortion, body-machine rhythm, darker synth pressure.",
      cues: ["metal hits", "distortion", "body rhythm", "cold synth"],
      lesson: "Industrial and EBM lean into impact and texture: separate the groove from the noise layer.",
    },
  };
  const SUBGENRE_GUIDES = {
    "hard-techno": {
      parent: "techno",
      label: "Hard techno",
      cues: ["fast four-four", "heavy kick", "high pressure"],
      lesson: "Hard techno is about force and momentum: hear the kick weight, distortion, and whether tension comes from speed or pressure.",
    },
    "hypnotic-techno": {
      parent: "techno",
      label: "Hypnotic techno",
      cues: ["steady loop", "subtle filter", "deep repetition"],
      lesson: "Hypnotic techno moves slowly inside repetition. Track tiny changes in hats, delay, and low-mid movement.",
    },
    "industrial-techno": {
      parent: "techno",
      label: "Industrial techno",
      cues: ["distortion", "metallic tops", "machine pressure"],
      lesson: "Industrial techno pushes impact and texture. Separate the kick engine from noise, grit, and metallic percussion.",
    },
    "acid-techno": {
      parent: "acid",
      label: "Acid techno",
      cues: ["303 squelch", "resonance", "rolling pressure"],
      lesson: "Acid techno is led by a squelching line. Listen for resonance opening and closing over the kick.",
    },
    "detroit-groove": {
      parent: "techno",
      label: "Detroit / groove techno",
      cues: ["machine funk", "swing", "warm mid groove"],
      lesson: "Detroit-leaning groove is less blunt than hard techno. Listen for funk, chords, and human-feeling machine swing.",
    },
    "minimal-techno": {
      parent: "techno",
      label: "Minimal techno",
      cues: ["small changes", "dry hits", "space"],
      lesson: "Minimal techno uses space as a feature. Notice what is missing and how small edits change tension.",
    },
    "dub-techno": {
      parent: "techno",
      label: "Dub techno",
      cues: ["chord echo", "deep space", "soft pulse"],
      lesson: "Dub techno is about depth and delay. Listen for chord tails, room space, and low-end restraint.",
    },
    "raw-techno": {
      parent: "techno",
      label: "Raw techno",
      cues: ["rough drums", "lo-fi edge", "machine drive"],
      lesson: "Raw techno keeps the machine feel exposed. Listen for rough transients, saturation, and direct drum pressure.",
    },
    schranz: {
      parent: "techno",
      label: "Schranz",
      cues: ["relentless kick", "distortion", "high pressure"],
      lesson: "Schranz is extreme pressure: check whether distortion and pace are the identity, not just a momentary peak.",
    },
    "peak-time-techno": {
      parent: "techno",
      label: "Peak-time techno",
      cues: ["big kick", "wide top", "main-room lift"],
      lesson: "Peak-time techno is functional and direct. Listen for clean impact, build/release shape, and high-energy polish.",
    },
    "electro-funk": {
      parent: "electro",
      label: "Electro funk",
      cues: ["broken kick", "snare snap", "robotic funk"],
      lesson: "Electro funk moves around the grid. Follow the kick/snare conversation rather than expecting a straight stomp.",
    },
    "detroit-electro": {
      parent: "electro",
      label: "Detroit electro",
      cues: ["machine funk", "snare snap", "cold bass"],
      lesson: "Detroit electro is angular but funky. Listen for how the bassline and snare make the machine swing.",
    },
    "miami-bass": {
      parent: "electro",
      label: "Miami bass",
      cues: ["808 boom", "fast bounce", "raw low end"],
      lesson: "Miami bass is body-forward. Listen for 808 pressure, call-and-response energy, and fast low-end bounce.",
    },
    "ghettotech": {
      parent: "electro",
      label: "Ghettotech",
      cues: ["fast machine funk", "bass punch", "raw swing"],
      lesson: "Ghettotech is fast, raw, and body-forward. Listen for electro patterns pushed into higher energy.",
    },
    "ebm-electroclash": {
      parent: "industrial",
      label: "EBM / electroclash",
      cues: ["body rhythm", "cold synth", "midrange drive"],
      lesson: "EBM and electroclash lean on body rhythm and cold synth character more than pure club kick pressure.",
    },
    "deep-house": {
      parent: "house",
      label: "Deep house",
      cues: ["warm chords", "soft low end", "smooth groove"],
      lesson: "Deep house is warm and patient. Listen for chords, swing, and bass movement rather than a big drop.",
    },
    "tech-house": {
      parent: "house",
      label: "Tech house",
      cues: ["tight groove", "clean kick", "percussion loop"],
      lesson: "Tech house sits between house bounce and techno tools. Listen for clipped percussion and a functional groove.",
    },
    "acid-house": {
      parent: "house",
      label: "Acid house",
      cues: ["303 line", "house swing", "resonance"],
      lesson: "Acid house keeps the house bounce but gives the acid line the personality.",
    },
    "classic-house": {
      parent: "house",
      label: "Classic house",
      cues: ["warm groove", "clap", "soulful loop"],
      lesson: "Classic house is about uplift and bounce. Listen for claps, warm bass, and musical repetition.",
    },
    "disco-house": {
      parent: "house",
      label: "Disco house",
      cues: ["bright tops", "funk loop", "rolling groove"],
      lesson: "Disco house lifts through looped funk and bright percussion. Listen for how the sample carries energy.",
    },
    "minimal-deep-tech": {
      parent: "house",
      label: "Minimal / deep tech",
      cues: ["dry groove", "small bass", "negative space"],
      lesson: "Minimal and deep tech use restraint. Notice the small bass edits and dry percussion details.",
    },
    breakbeat: {
      parent: "breaks",
      label: "Breakbeat",
      cues: ["broken drums", "snare accents", "off-grid push"],
      lesson: "Breakbeat is about drum shape. Follow snare accents and how the kick answers them.",
    },
    "ukg-garage": {
      parent: "breaks",
      label: "UKG / garage",
      cues: ["shuffle", "swing", "bass bounce"],
      lesson: "UKG and garage live in shuffle. Listen for skipped beats, swung hats, and bass answering the drums.",
    },
    "two-step": {
      parent: "garage",
      label: "2-step garage",
      cues: ["skipped kick", "vocal chop", "swing"],
      lesson: "2-step works by omission. Feel the missing kick and how the vocal or bass fills the gap.",
    },
    "speed-garage": {
      parent: "garage",
      label: "Speed garage",
      cues: ["bass wobble", "shuffle", "house pressure"],
      lesson: "Speed garage pushes garage swing into heavier bass pressure. Listen for the bassline answering the shuffle.",
    },
    "jungle-dnb": {
      parent: "dnb",
      label: "Jungle / drum & bass",
      cues: ["fast breaks", "sub bass", "rolling tops"],
      lesson: "Jungle and drum & bass move fast through chopped breaks and sub pressure. Track the break pattern, not only tempo.",
    },
    "liquid-dnb": {
      parent: "dnb",
      label: "Liquid DNB",
      cues: ["fast break", "smooth pads", "rolling bass"],
      lesson: "Liquid DNB keeps the fast drum engine but softens the emotional surface with pads and smoother bass.",
    },
    neurofunk: {
      parent: "dnb",
      label: "Neurofunk",
      cues: ["fast drums", "technical bass", "dark movement"],
      lesson: "Neurofunk is about engineered bass motion. Listen to how the bass shape mutates under tight drums.",
    },
    "half-time-dnb": {
      parent: "dnb",
      label: "Half-time DNB",
      cues: ["half-time feel", "sub weight", "fast grid"],
      lesson: "Half-time DNB feels slow on top of a fast grid. Count the space between heavy hits.",
    },
    dubstep: {
      parent: "bass",
      label: "Dubstep",
      cues: ["half-time", "sub weight", "wobble"],
      lesson: "Dubstep leaves space for sub movement. Listen for the half-time hit and bass modulation.",
    },
    "deep-dubstep": {
      parent: "bass",
      label: "Deep dubstep",
      cues: ["sub pressure", "space", "dark atmosphere"],
      lesson: "Deep dubstep is restrained and heavy. Listen for space, sub depth, and small percussion shadows.",
    },
    footwork: {
      parent: "bass",
      label: "Footwork / juke",
      cues: ["fast chopped rhythm", "syncopation", "bass hits"],
      lesson: "Footwork is fast and fractured. Follow rhythmic edits and repeated vocal or percussion cuts.",
    },
    "leftfield-bass": {
      parent: "bass",
      label: "Leftfield bass",
      cues: ["unusual rhythm", "sub design", "negative space"],
      lesson: "Leftfield bass bends club grammar. Listen for odd rhythmic placement and sound-system pressure.",
    },
    "hard-trance": {
      parent: "trance",
      label: "Hard trance",
      cues: ["fast pulse", "rising lead", "euphoric pressure"],
      lesson: "Hard trance uses speed and lift. Listen for rising synth lines over a forceful pulse.",
    },
    "progressive-melodic": {
      parent: "trance",
      label: "Progressive / melodic",
      cues: ["melodic loop", "long build", "smooth lift"],
      lesson: "Progressive and melodic lanes build slowly through harmony and lift rather than only kick pressure.",
    },
    "psytrance": {
      parent: "trance",
      label: "Psytrance",
      cues: ["fast rolling bass", "bright leads", "hypnotic drive"],
      lesson: "Psytrance often locks into rolling bass and bright detail. Listen for continuous drive and psychedelic motion.",
    },
    "uplifting-trance": {
      parent: "trance",
      label: "Uplifting trance",
      cues: ["breakdown", "bright lead", "release"],
      lesson: "Uplifting trance stretches emotion through breakdown and release. Follow the lead line across the build.",
    },
    hardstyle: {
      parent: "hard-dance",
      label: "Hardstyle",
      cues: ["reverse bass", "hard kick tail", "rave melody"],
      lesson: "Hardstyle depends on kick character. Listen for whether the bass tail, pitch movement, and melody all lock to the kick.",
    },
    hardcore: {
      parent: "hard-dance",
      label: "Hardcore / gabber",
      cues: ["very fast kick", "distortion", "rave pressure"],
      lesson: "Hardcore and gabber push pace and distortion. Separate the kick tail from the noise layer to hear the groove.",
    },
    "hard-dance-rave": {
      parent: "hard-dance",
      label: "Hard dance rave",
      cues: ["fast pulse", "big riff", "peak energy"],
      lesson: "Hard dance rave sits between trance lift and harder kick pressure. Listen for which element leads the track.",
    },
    ambient: {
      parent: "downtempo",
      label: "Ambient",
      cues: ["drone", "space", "slow texture"],
      lesson: "Ambient removes the demand for a beat. Listen for depth, movement, and timbre over time.",
    },
    "downtempo-breaks": {
      parent: "downtempo",
      label: "Downtempo breaks",
      cues: ["slow break", "soft bass", "space"],
      lesson: "Downtempo breaks slow the grid down. Listen for relaxed drum shape and atmosphere.",
    },
    "leftfield-electronic": {
      parent: "downtempo",
      label: "Leftfield electronic",
      cues: ["unusual form", "textural focus", "loose pulse"],
      lesson: "Leftfield electronic can refuse club categories. Listen for form, timbre, and surprise.",
    },
    "experimental-live": {
      parent: "industrial",
      label: "Experimental / live",
      cues: ["unusual spectrum", "unstable form", "hardware feel"],
      lesson: "Experimental and live electronic sets may avoid stable genre markers. Listen for sound design and form changes.",
    },
  };

  const defaultComments = [
    {
      signature: "default-kick",
      category: "kick",
      text: "Keep counting the kick. In techno, the lesson is often in what changes around a steady pulse.",
    },
    {
      signature: "default-arc",
      category: "arc",
      text: "Listen for the arc: what disappears, what returns, and whether the room is being pushed or reset.",
    },
    {
      signature: "default-texture",
      category: "texture",
      text: "Focus on texture now. Noise, hats, echo, and synth grain can change the feeling without changing the beat.",
    },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resolveDetectionTuning(state = {}) {
    const source = state && typeof state === "object" && state.tuning && typeof state.tuning === "object"
      ? state.tuning
      : {};
    const windowSeconds = Number(source.windowSeconds || 0);
    const genreWindowMs = Number(source.genreWindowMs || 0) || (windowSeconds ? windowSeconds * 1000 : DEFAULT_DETECTION_TUNING.genreWindowMs);
    const subgenreWindowMs = Number(source.subgenreWindowMs || 0) || (windowSeconds ? Math.max(14000, windowSeconds * 1000 + 2000) : DEFAULT_DETECTION_TUNING.subgenreWindowMs);
    return {
      genreWindowMs: clamp(genreWindowMs, 12000, 45000),
      subgenreWindowMs: clamp(subgenreWindowMs, 14000, 48000),
      sensitivity: clamp(Number(source.sensitivity || DEFAULT_DETECTION_TUNING.sensitivity), 0.82, 1.18),
      bassBias: clamp(Number(source.bassBias || DEFAULT_DETECTION_TUNING.bassBias), 0.78, 1.22),
      textureBias: clamp(Number(source.textureBias || DEFAULT_DETECTION_TUNING.textureBias), 0.78, 1.22),
    };
  }

  function externalAnalysisSources() {
    return EXTERNAL_ANALYSIS_SOURCES.map(source => ({ ...source }));
  }

  function pretrainedGenreModels() {
    return PRETRAINED_GENRE_MODELS.map(model => ({ ...model }));
  }

  function modelModes() {
    return MODEL_MODES.map(mode => ({ ...mode }));
  }

  function resolveModelMode(state = {}) {
    const mode = String(state?.modelMode || state?.tuning?.modelMode || "hybrid").trim();
    return MODEL_MODE_IDS.has(mode) ? mode : "hybrid";
  }

  function shouldUseExternalTags(state = {}) {
    const mode = resolveModelMode(state);
    return mode === "hybrid" || mode === "discogs";
  }

  function normalizePretrainedGenrePredictions(predictions = [], labels = [], options = {}) {
    if (!predictions || typeof predictions.length !== "number") return [];
    const source = options.source || options.sourceId || "discogs-effnet";
    const modelId = options.modelId || "discogs-effnet-tfjs";
    const minProbability = Number.isFinite(Number(options.minProbability))
      ? Number(options.minProbability)
      : 0.05;
    const topN = clamp(Math.round(Number(options.topN || 8)), 1, 64);
    const normalized = [];

    for (let index = 0; index < predictions.length; index += 1) {
      const probability = Number(predictions[index]);
      if (!Number.isFinite(probability) || probability < minProbability) continue;
      const tag = String(labels[index] || `class-${index}`).trim();
      if (!tag) continue;
      normalized.push({
        tag,
        probability,
        source,
        modelId,
        index,
      });
    }

    return normalized
      .sort((a, b) => b.probability - a.probability)
      .slice(0, topN);
  }

  function normalizeMeydaFeatures(features = {}) {
    if (!features || typeof features !== "object") {
      return { available: false, featureCount: 0 };
    }
    const numericKeys = [
      "rms",
      "energy",
      "zcr",
      "spectralCentroid",
      "spectralFlatness",
      "spectralFlux",
      "spectralRolloff",
      "spectralSpread",
      "spectralSkewness",
      "perceptualSharpness",
      "perceptualSpread",
    ];
    const normalized = { available: true, featureCount: 0 };
    numericKeys.forEach(key => {
      const value = Number(features[key]);
      if (Number.isFinite(value)) {
        normalized[key] = value;
        normalized.featureCount += 1;
      }
    });
    if (Array.isArray(features.spectralContrast)) {
      normalized.spectralContrastBands = features.spectralContrast
        .map(value => Number(value || 0))
        .filter(value => Number.isFinite(value));
      normalized.spectralContrast = average(normalized.spectralContrastBands);
      normalized.featureCount += normalized.spectralContrastBands.length ? 1 : 0;
    } else {
      const contrast = Number(features.spectralContrast);
      if (Number.isFinite(contrast)) {
        normalized.spectralContrast = contrast;
        normalized.spectralContrastBands = [contrast];
        normalized.featureCount += 1;
      }
    }
    if (Array.isArray(features.mfcc)) {
      normalized.mfcc = features.mfcc.map(value => Number(value || 0)).slice(0, 13);
      normalized.featureCount += normalized.mfcc.length ? 1 : 0;
    }
    if (Array.isArray(features.chroma)) {
      const chroma = features.chroma.map(value => Number(value || 0));
      const chromaMax = Math.max(...chroma, 0);
      const chromaAvg = average(chroma);
      normalized.chroma = chroma;
      normalized.chromaFocus = chromaAvg ? clamp(chromaMax / (chromaAvg * 4), 0, 1) : 0;
      normalized.featureCount += chroma.length ? 1 : 0;
    }
    normalized.available = normalized.featureCount > 0;
    return normalized;
  }

  const EXTERNAL_TAG_MAPPINGS = [
    { match: ["acid techno", "acid-techno"], style: "acid", subgenre: "acid-techno", styleWeight: 0.85, subgenreWeight: 1 },
    { match: ["acid house"], style: "house", subgenre: "acid-house", styleWeight: 0.85, subgenreWeight: 1 },
    { match: ["dub techno"], style: "techno", subgenre: "dub-techno", styleWeight: 0.8, subgenreWeight: 1 },
    { match: ["minimal techno"], style: "techno", subgenre: "minimal-techno", styleWeight: 0.75, subgenreWeight: 1 },
    { match: ["raw techno"], style: "techno", subgenre: "raw-techno", styleWeight: 0.75, subgenreWeight: 1 },
    { match: ["hard techno"], style: "techno", subgenre: "hard-techno", styleWeight: 0.75, subgenreWeight: 1 },
    { match: ["industrial techno"], style: "techno", subgenre: "industrial-techno", styleWeight: 0.7, subgenreWeight: 1 },
    { match: ["peak time techno", "peak-time techno"], style: "techno", subgenre: "peak-time-techno", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["schranz"], style: "techno", subgenre: "schranz", styleWeight: 0.74, subgenreWeight: 1 },
    { match: ["detroit techno", "groove techno"], style: "techno", subgenre: "detroit-groove", styleWeight: 0.72, subgenreWeight: 0.9 },
    { match: ["uk garage", "ukg", "garage"], style: "garage", subgenre: "ukg-garage", styleWeight: 0.8, subgenreWeight: 0.86 },
    { match: ["2-step", "two step"], style: "garage", subgenre: "two-step", styleWeight: 0.7, subgenreWeight: 0.94 },
    { match: ["speed garage"], style: "garage", subgenre: "speed-garage", styleWeight: 0.74, subgenreWeight: 1 },
    { match: ["deep house"], style: "house", subgenre: "deep-house", styleWeight: 0.8, subgenreWeight: 1 },
    { match: ["tech house"], style: "house", subgenre: "tech-house", styleWeight: 0.78, subgenreWeight: 1 },
    { match: ["classic house"], style: "house", subgenre: "classic-house", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["disco house"], style: "house", subgenre: "disco-house", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["minimal deep tech", "deep tech"], style: "house", subgenre: "minimal-deep-tech", styleWeight: 0.72, subgenreWeight: 0.95 },
    { match: ["electroclash", "ebm"], style: "industrial", subgenre: "ebm-electroclash", styleWeight: 0.74, subgenreWeight: 0.92 },
    { match: ["electro funk"], style: "electro", subgenre: "electro-funk", styleWeight: 0.78, subgenreWeight: 1 },
    { match: ["detroit electro"], style: "electro", subgenre: "detroit-electro", styleWeight: 0.75, subgenreWeight: 1 },
    { match: ["miami bass"], style: "electro", subgenre: "miami-bass", styleWeight: 0.65, subgenreWeight: 1 },
    { match: ["ghettotech"], style: "electro", subgenre: "ghettotech", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["breakbeat", "breaks"], style: "breaks", subgenre: "breakbeat", styleWeight: 0.78, subgenreWeight: 0.9 },
    { match: ["drum and bass", "drum & bass", "drum n bass", "drum'n'bass", "drum'n bass", "drum bass", "dnb", "jungle"], style: "dnb", subgenre: "jungle-dnb", styleWeight: 0.8, subgenreWeight: 0.86 },
    { match: ["liquid dnb", "liquid drum"], style: "dnb", subgenre: "liquid-dnb", styleWeight: 0.76, subgenreWeight: 1 },
    { match: ["neurofunk"], style: "dnb", subgenre: "neurofunk", styleWeight: 0.76, subgenreWeight: 1 },
    { match: ["half-time dnb", "halftime dnb"], style: "dnb", subgenre: "half-time-dnb", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["deep dubstep"], style: "bass", subgenre: "deep-dubstep", styleWeight: 0.78, subgenreWeight: 1 },
    { match: ["dubstep"], style: "bass", subgenre: "dubstep", styleWeight: 0.78, subgenreWeight: 0.95 },
    { match: ["footwork", "juke"], style: "bass", subgenre: "footwork", styleWeight: 0.66, subgenreWeight: 1 },
    { match: ["leftfield bass"], style: "bass", subgenre: "leftfield-bass", styleWeight: 0.72, subgenreWeight: 1 },
    { match: ["hard trance"], style: "trance", subgenre: "hard-trance", styleWeight: 0.78, subgenreWeight: 1 },
    { match: ["psytrance", "psy trance"], style: "trance", subgenre: "psytrance", styleWeight: 0.78, subgenreWeight: 1 },
    { match: ["uplifting trance"], style: "trance", subgenre: "uplifting-trance", styleWeight: 0.74, subgenreWeight: 1 },
    { match: ["progressive", "melodic techno", "melodic"], style: "trance", subgenre: "progressive-melodic", styleWeight: 0.64, subgenreWeight: 0.78 },
    { match: ["hardstyle"], style: "hard-dance", subgenre: "hardstyle", styleWeight: 0.84, subgenreWeight: 1 },
    { match: ["hardcore", "gabber"], style: "hard-dance", subgenre: "hardcore", styleWeight: 0.82, subgenreWeight: 1 },
    { match: ["hard dance"], style: "hard-dance", subgenre: "hard-dance-rave", styleWeight: 0.78, subgenreWeight: 0.86 },
    { match: ["ambient"], style: "downtempo", subgenre: "ambient", styleWeight: 0.8, subgenreWeight: 1 },
    { match: ["downtempo"], style: "downtempo", subgenre: "downtempo-breaks", styleWeight: 0.74, subgenreWeight: 0.75 },
    { match: ["leftfield electronic"], style: "downtempo", subgenre: "leftfield-electronic", styleWeight: 0.74, subgenreWeight: 1 },
    { match: ["experimental", "live electronic"], style: "industrial", subgenre: "experimental-live", styleWeight: 0.62, subgenreWeight: 0.82 },
    { match: ["techno"], style: "techno", styleWeight: 0.72 },
    { match: ["house"], style: "house", styleWeight: 0.72 },
    { match: ["electro"], style: "electro", styleWeight: 0.72 },
    { match: ["trance"], style: "trance", styleWeight: 0.72 },
    { match: ["bass"], style: "bass", styleWeight: 0.62 },
    { match: ["industrial"], style: "industrial", styleWeight: 0.72 },
  ];

  function normalizeTagText(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[_/]+/g, " ")
      .replace(/[^\w&+\-\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function collectExternalTags(snapshot = {}, state = {}) {
    return [
      ...(Array.isArray(snapshot.externalTags) ? snapshot.externalTags : []),
      ...(Array.isArray(snapshot.external?.tags) ? snapshot.external.tags : []),
      ...(Array.isArray(state.externalTags) ? state.externalTags : []),
      ...(Array.isArray(state.externalAnalysis?.tags) ? state.externalAnalysis.tags : []),
      ...(Array.isArray(state.externalAnalysis?.latestTags) ? state.externalAnalysis.latestTags : []),
    ];
  }

  function mapExternalGenreTags(tags = []) {
    const styleScores = {};
    const subgenreScores = {};
    const matches = [];
    const normalizedTags = (Array.isArray(tags) ? tags : [])
      .map(item => {
        const tag = typeof item === "string" ? item : item.tag || item.label || item.name || item.className || "";
        const probability = typeof item === "string"
          ? 1
          : Number(item.probability ?? item.score ?? item.confidence ?? item.value ?? 1);
        return {
          tag,
          text: normalizeTagText(tag),
          probability: clamp(Number.isFinite(probability) ? probability : 1, 0, 1),
          source: typeof item === "string" ? "" : item.source || "",
        };
      })
      .filter(item => item.text);

    normalizedTags.forEach(tagItem => {
      EXTERNAL_TAG_MAPPINGS.forEach(mapping => {
        const matched = mapping.match.some(pattern => tagItem.text.includes(normalizeTagText(pattern)));
        if (!matched) return;
        const styleScore = tagItem.probability * Number(mapping.styleWeight || 0.7);
        const subgenreScore = tagItem.probability * Number(mapping.subgenreWeight || 0.85);
        if (mapping.style) styleScores[mapping.style] = Math.max(Number(styleScores[mapping.style] || 0), styleScore);
        if (mapping.subgenre) subgenreScores[mapping.subgenre] = Math.max(Number(subgenreScores[mapping.subgenre] || 0), subgenreScore);
        matches.push({
          tag: tagItem.tag,
          source: tagItem.source,
          style: mapping.style || "",
          subgenre: mapping.subgenre || "",
          score: Math.max(styleScore, subgenreScore),
        });
      });
    });

    const electronicAcidScore = normalizedTags.reduce((score, tagItem) => (
      tagItem.text.includes("electronic---acid")
        ? Math.max(score, tagItem.probability)
        : score
    ), 0);
    const technoFamilyScore = normalizedTags.reduce((score, tagItem) => (
      tagItem.text.includes("techno")
        ? Math.max(score, tagItem.probability)
        : score
    ), 0);
    if (electronicAcidScore > 0.15 && technoFamilyScore > 0.15) {
      const combinedScore = Math.sqrt(electronicAcidScore * technoFamilyScore);
      styleScores.acid = Math.max(Number(styleScores.acid || 0), combinedScore * 0.86);
      subgenreScores["acid-techno"] = Math.max(Number(subgenreScores["acid-techno"] || 0), combinedScore * 0.94);
      matches.push({
        tag: "Discogs400 acid + techno",
        source: "discogs-effnet",
        style: "acid",
        subgenre: "acid-techno",
        score: combinedScore,
      });
    }

    return { styleScores, subgenreScores, matches };
  }

  function styleGuides() {
    return Object.entries(STYLE_GUIDES).map(([id, guide]) => ({
      id,
      label: guide.label,
      tempo: guide.tempo,
      pattern: guide.pattern,
      cues: [...guide.cues],
      lesson: guide.lesson,
    }));
  }

  function subgenreGuides() {
    return Object.entries(SUBGENRE_GUIDES).map(([id, guide]) => ({
      id,
      parent: guide.parent,
      label: guide.label,
      cues: [...guide.cues],
      lesson: guide.lesson,
    }));
  }

  function average(values) {
    if (!values || !values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
  }

  function rangeScore(value, min, max, shoulder = 12) {
    const numeric = Number(value || 0);
    if (!numeric) return 0;
    if (numeric >= min && numeric <= max) return 1;
    if (numeric < min) return clamp(1 - (min - numeric) / shoulder, 0, 1);
    return clamp(1 - (numeric - max) / shoulder, 0, 1);
  }

  function standardDeviation(values) {
    if (!values || values.length < 2) return 0;
    const mean = average(values);
    const variance = average(values.map(value => Math.pow(Number(value || 0) - mean, 2)));
    return Math.sqrt(variance);
  }

  function frequencyAtBin(index, sampleRate, fftSize) {
    return index * sampleRate / fftSize;
  }

  function averageBand(frequencyData, sampleRate, fftSize, lowHz, highHz) {
    if (!frequencyData || !frequencyData.length) return 0;
    const start = clamp(Math.floor(lowHz * fftSize / sampleRate), 0, frequencyData.length - 1);
    const end = clamp(Math.ceil(highHz * fftSize / sampleRate), start, frequencyData.length - 1);
    let total = 0;
    let count = 0;
    for (let index = start; index <= end; index += 1) {
      total += Number(frequencyData[index] || 0) / 255;
      count += 1;
    }
    return count ? total / count : 0;
  }

  function rmsFromTimeData(timeDomainData) {
    if (!timeDomainData || !timeDomainData.length) return 0;
    let total = 0;
    for (let index = 0; index < timeDomainData.length; index += 1) {
      const centered = (Number(timeDomainData[index] || 128) - 128) / 128;
      total += centered * centered;
    }
    return Math.sqrt(total / timeDomainData.length);
  }

  function spectralCentroid(frequencyData, sampleRate, fftSize) {
    if (!frequencyData || !frequencyData.length) return 0;
    let weighted = 0;
    let total = 0;
    for (let index = 0; index < frequencyData.length; index += 1) {
      const value = Number(frequencyData[index] || 0) / 255;
      const freq = frequencyAtBin(index, sampleRate, fftSize);
      weighted += freq * value;
      total += value;
    }
    return total ? weighted / total : 0;
  }

  function spectralContrastFromFrequencyData(frequencyData, sampleRate, fftSize) {
    if (!frequencyData || !frequencyData.length) {
      return { value: 0, bands: [] };
    }
    const contrastBands = [
      [60, 180],
      [180, 520],
      [520, 1400],
      [1400, 3600],
      [3600, 7600],
      [7600, 16000],
    ].map(([lowHz, highHz]) => {
      const start = clamp(Math.floor(lowHz * fftSize / sampleRate), 0, frequencyData.length - 1);
      const end = clamp(Math.ceil(highHz * fftSize / sampleRate), start, frequencyData.length - 1);
      const values = [];
      for (let index = start; index <= end; index += 1) {
        values.push(Number(frequencyData[index] || 0) / 255);
      }
      const sorted = values.sort((a, b) => a - b);
      const sliceCount = Math.max(1, Math.ceil(sorted.length * 0.18));
      const valley = average(sorted.slice(0, sliceCount));
      const peak = average(sorted.slice(-sliceCount));
      const active = peak > 0.045 || average(sorted) > 0.04;
      return active ? clamp((peak - valley) / (peak + valley + 0.0001), 0, 1) : 0;
    });
    const activeBands = contrastBands.filter(value => value > 0.01);
    return {
      value: activeBands.length ? average(activeBands) : 0,
      bands: contrastBands,
    };
  }

  function dominantBand(snapshot) {
    const bands = [
      ["sub", snapshot.sub],
      ["kick", snapshot.bass],
      ["body", snapshot.lowMid],
      ["mid", snapshot.mid],
      ["top", snapshot.high],
      ["air", snapshot.air],
    ];
    return bands.sort((a, b) => b[1] - a[1])[0][0];
  }

  function analyzeAudioSnapshot(input = {}) {
    const frequencyData = input.frequencyData || [];
    const timeDomainData = input.timeDomainData || input.timeData || [];
    const meydaFeatures = normalizeMeydaFeatures(input.meydaFeatures || input.externalFeatures?.meyda || input.meyda);
    const sampleRate = Number(input.sampleRate || 44100);
    const fftSize = Number(input.fftSize || (frequencyData.length ? frequencyData.length * 2 : 2048));
    const sub = averageBand(frequencyData, sampleRate, fftSize, 25, 75);
    const bass = averageBand(frequencyData, sampleRate, fftSize, 45, 180);
    const lowMid = averageBand(frequencyData, sampleRate, fftSize, 180, 520);
    const mid = averageBand(frequencyData, sampleRate, fftSize, 520, 2400);
    const high = averageBand(frequencyData, sampleRate, fftSize, 4200, 9800);
    const air = averageBand(frequencyData, sampleRate, fftSize, 9800, 16000);
    const total = average(Array.from(frequencyData || []).map(value => Number(value || 0) / 255));
    const rms = rmsFromTimeData(timeDomainData);
    const level = clamp(Math.max(rms, total * 0.82), 0, 1);
    const bandTotal = sub + bass + lowMid + mid + high + air + 0.0001;
    const bassShare = clamp((sub + bass) / bandTotal, 0, 1);
    const highShare = clamp((high + air) / bandTotal, 0, 1);
    const brightness = clamp((high + air) / (sub + bass + lowMid + 0.0001), 0, 8);
    const centroid = spectralCentroid(frequencyData, sampleRate, fftSize);
    const localSpectralContrast = spectralContrastFromFrequencyData(frequencyData, sampleRate, fftSize);
    const spectralContrast = Number.isFinite(Number(meydaFeatures.spectralContrast))
      ? Number(meydaFeatures.spectralContrast)
      : localSpectralContrast.value;
    const spectralContrastBands = Array.isArray(meydaFeatures.spectralContrastBands) && meydaFeatures.spectralContrastBands.length
      ? meydaFeatures.spectralContrastBands
      : localSpectralContrast.bands;

    return {
      level,
      total,
      rms,
      sub,
      bass,
      lowMid,
      mid,
      high,
      air,
      bassShare,
      highShare,
      brightness,
      centroid,
      dominantBand: "",
      focus: "",
      pulseBpm: null,
      stablePulse: false,
      external: {
        meyda: meydaFeatures,
        tags: Array.isArray(input.externalTags) ? input.externalTags : [],
      },
      externalTags: Array.isArray(input.externalTags) ? input.externalTags : [],
      spectralRolloff: meydaFeatures.spectralRolloff || 0,
      spectralFlatness: meydaFeatures.spectralFlatness || 0,
      spectralFlux: meydaFeatures.spectralFlux || 0,
      spectralSpread: meydaFeatures.spectralSpread || 0,
      spectralContrast,
      spectralContrastBands,
      zcr: meydaFeatures.zcr || 0,
      chromaFocus: meydaFeatures.chromaFocus || 0,
    };
  }

  function median(values = []) {
    const sorted = values
      .map(value => Number(value || 0))
      .filter(value => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    if (!sorted.length) return 0;
    return sorted[Math.floor(sorted.length / 2)];
  }

  function roughlySameSnapshot(a = {}, b = {}) {
    return Math.abs(Number(a.level || 0) - Number(b.level || 0)) < 0.00001
      && Math.abs(Number(a.bass || 0) - Number(b.bass || 0)) < 0.00001
      && Math.abs(Number(a.high || 0) - Number(b.high || 0)) < 0.00001
      && Number(a.pulseBpm || 0) === Number(b.pulseBpm || 0);
  }

  function aggregateStreamSnapshot(snapshot = {}, state = {}, options = {}) {
    const windowMs = Number(options.windowMs || STREAM_DETECTION_WINDOW_MS);
    const history = Array.isArray(state.snapshots) ? state.snapshots : [];
    const incoming = snapshot && typeof snapshot === "object" ? snapshot : {};
    const latestAt = Number(
      incoming.capturedAt
      || (history.length ? history[history.length - 1].capturedAt : 0)
      || 0
    );
    const recent = latestAt
      ? history.filter(item => latestAt - Number(item.capturedAt || 0) <= windowMs)
      : history;
    const frames = [...recent];
    if (Object.keys(incoming).length && (!frames.length || !roughlySameSnapshot(frames[frames.length - 1], incoming))) {
      frames.push(incoming);
    }
    const usable = frames.filter(item => Number(item.level || item.total || 0) >= SILENCE_LEVEL);
    const source = usable.length ? usable : frames.length ? frames.slice(-1) : [incoming];
    const latest = frames[frames.length - 1] || incoming || {};
    const numericAverage = key => average(source.map(item => Number(item[key] || 0)));
    const bassValues = source.map(item => Number(item.bass || 0));
    const levelValues = source.map(item => Number(item.level || item.total || 0));
    const stableVotes = source.filter(item => item.stablePulse).length;
    const pulseValues = source
      .map(item => Number(item.pulseBpm || 0))
      .filter(value => Number.isFinite(value) && value > 0);
    const pulseBpm = median(pulseValues);
    const bpmDeviation = pulseValues.length > 3 ? standardDeviation(pulseValues) : 0;
    const recentBassDeviation = source.length > 4 ? standardDeviation(bassValues) : 0.08;
    const recentLevelDeviation = source.length > 4 ? standardDeviation(levelValues) : 0.05;
    const peakLevel = Math.max(...levelValues, Number(latest.level || latest.total || 0), 0);
    const aggregate = {
      ...latest,
      level: numericAverage("level") || numericAverage("total") || Number(latest.level || latest.total || 0),
      total: numericAverage("total") || Number(latest.total || 0),
      rms: numericAverage("rms") || Number(latest.rms || 0),
      sub: numericAverage("sub"),
      bass: numericAverage("bass"),
      lowMid: numericAverage("lowMid"),
      mid: numericAverage("mid"),
      high: numericAverage("high"),
      air: numericAverage("air"),
      bassShare: clamp(numericAverage("bassShare"), 0, 1),
      highShare: clamp(numericAverage("highShare"), 0, 1),
      brightness: numericAverage("brightness"),
      centroid: numericAverage("centroid"),
      pulseBpm: pulseBpm || Number(latest.pulseBpm || 0) || null,
      bpmDeviation,
      stablePulse: source.length > 8
        ? stableVotes / source.length >= 0.45 || recentBassDeviation < 0.055
        : Boolean(latest.stablePulse),
      recentBassDeviation,
      recentLevelDeviation,
      peakLevel,
      streamSampleCount: usable.length,
      streamFrameCount: frames.length,
      streamWindowMs: windowMs,
      streamDurationMs: frames.length > 1
        ? Math.max(0, Number(frames[frames.length - 1].capturedAt || 0) - Number(frames[0].capturedAt || 0))
        : 0,
    };
    aggregate.dominantBand = dominantBand(aggregate);
    aggregate.focus = classifyFocus(aggregate);
    return {
      snapshot: aggregate,
      frames,
      usable,
      sampleCount: usable.length,
      windowMs,
    };
  }

  function styleLessonForSnapshot(snapshot = {}, styleId = "techno") {
    const guide = STYLE_GUIDES[styleId] || STYLE_GUIDES.techno;
    const bassShare = Number(snapshot.bassShare || 0);
    const highShare = Number(snapshot.highShare || 0);
    const pulse = Number(snapshot.pulseBpm || 0);
    const liveHint = bassShare > 0.42
      ? "Right now the low end is prominent, so compare weight and groove before naming the style."
      : highShare > 0.34
        ? "Right now the top texture is prominent, so listen for hats, noise, resonance, or metallic edges."
        : pulse
          ? `The pulse reads around ${pulse} BPM; use tempo as context, not proof of style.`
          : "Use the style card as a listening checklist, not as track identification.";
    return {
      styleId: Object.prototype.hasOwnProperty.call(STYLE_GUIDES, styleId) ? styleId : "techno",
      label: guide.label,
      tempo: guide.tempo,
      pattern: guide.pattern,
      cues: [...guide.cues],
      text: `${guide.lesson} ${liveHint}`,
    };
  }

  function acidLineScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const brightness = Number(input.brightness || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const high = Number(input.high || 0);
    const bass = Number(input.bass || 0);
    const level = Number(input.level || 0);
    const stablePulse = Boolean(input.stablePulse);
    const tempoFit = rangeScore(bpm, 130, 150, 16);
    const resonanceFit = Math.max(
      clamp((brightness - 1.18) / 0.62, 0, 1),
      clamp((centroid - 4700) / 1500, 0, 1)
    );
    const topLineFit = clamp((highShare - 0.28) / 0.16, 0, 1);
    const lineOverKickFit = clamp((mid + high - bass * 0.72) / 0.36, 0, 1);
    const technoWeightFit = clamp((bassShare - 0.27) / 0.12, 0, 1)
      * clamp((0.48 - bassShare) / 0.16, 0, 1);
    const pulseFit = stablePulse ? 1 : 0.35;
    const industrialDensityPenalty = clamp((level - 0.34) / 0.1, 0, 1)
      * clamp((bassShare - 0.39) / 0.09, 0, 1)
      * 0.45;
    return clamp(
      tempoFit * 0.22
      + resonanceFit * 0.28
      + topLineFit * 0.18
      + lineOverKickFit * 0.16
      + technoWeightFit * 0.1
      + pulseFit * 0.06
      - industrialDensityPenalty,
      0,
      1
    );
  }

  function acidHouseScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const brightness = Number(input.brightness || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const bass = Number(input.bass || 0);
    const stablePulse = Boolean(input.stablePulse);
    const resonanceFit = Math.max(
      clamp((brightness - 1.08) / 0.58, 0, 1),
      clamp((centroid - 4600) / 1600, 0, 1)
    );
    const houseTempoFit = rangeScore(bpm, 118, 130, 12);
    const acidTopFit = clamp((highShare - 0.24) / 0.16, 0, 1);
    const warmGrooveFit = clamp((lowMid + mid - bass * 0.7) / 0.34, 0, 1);
    const bassPocketFit = clamp((bassShare - 0.24) / 0.1, 0, 1) * clamp((0.4 - bassShare) / 0.16, 0, 1);
    return clamp(
      houseTempoFit * 0.2
      + resonanceFit * 0.28
      + acidTopFit * 0.16
      + warmGrooveFit * 0.18
      + bassPocketFit * 0.1
      + (stablePulse ? 0.08 : 0.02),
      0,
      1
    );
  }

  function dubTechnoScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const centroid = Number(input.centroid || 0);
    const stablePulse = Boolean(input.stablePulse);
    return clamp(
      rangeScore(bpm, 116, 130, 12) * 0.18
      + clamp((lowMid + mid - 0.32) / 0.16, 0, 1) * 0.22
      + clamp((0.18 - highShare) / 0.12, 0, 1) * 0.18
      + clamp((0.25 - level) / 0.12, 0, 1) * 0.14
      + clamp((2700 - centroid) / 1600, 0, 1) * 0.12
      + (stablePulse ? 0.16 : 0.04),
      0,
      1
    );
  }

  function minimalTechnoScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const recentBassDeviation = Number(input.recentBassDeviation || 0.08);
    const recentLevelDeviation = Number(input.recentLevelDeviation || 0.06);
    const stablePulse = Boolean(input.stablePulse);
    const sparseFit = clamp((0.24 - level) / 0.12, 0, 1) * clamp((level - 0.12) / 0.08, 0, 1);
    const steadyFit = clamp((0.06 - Math.max(recentBassDeviation, recentLevelDeviation)) / 0.06, 0, 1);
    return clamp(
      rangeScore(bpm, 118, 132, 12) * 0.18
      + sparseFit * 0.22
      + clamp((0.24 - highShare) / 0.16, 0, 1) * 0.16
      + steadyFit * 0.2
      + (stablePulse ? 0.18 : 0.04),
      0,
      1
    );
  }

  function ebmElectroclashScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const brightness = Number(input.brightness || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const bass = Number(input.bass || 0);
    const high = Number(input.high || 0);
    const stablePulse = Boolean(input.stablePulse);
    const coldTopFit = Math.max(
      clamp((brightness - 0.82) / 0.58, 0, 1),
      clamp((centroid - 3600) / 1800, 0, 1),
      clamp((highShare - 0.24) / 0.18, 0, 1)
    );
    return clamp(
      rangeScore(bpm, 112, 132, 16) * 0.18
      + clamp((mid + high - 0.36) / 0.22, 0, 1) * 0.24
      + clamp((mid + high - lowMid - bass + 0.02) / 0.16, 0, 1) * 0.18
      + coldTopFit * 0.22
      + clamp((bassShare - 0.28) / 0.12, 0, 1) * clamp((0.42 - bassShare) / 0.16, 0, 1) * 0.1
      + clamp((level - 0.22) / 0.16, 0, 1) * 0.1
      + (stablePulse ? 0.08 : 0.04),
      0,
      1
    );
  }

  function garageShuffleScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const lowMid = Number(input.lowMid || 0);
    const bass = Number(input.bass || 0);
    const loosePulse = Boolean(input.loosePulse);
    const recentLevelDeviation = Number(input.recentLevelDeviation || 0);
    const recentBassDeviation = Number(input.recentBassDeviation || 0);
    return clamp(
      rangeScore(bpm, 126, 140, 12) * 0.2
      + (loosePulse ? 0.18 : 0.02)
      + clamp((lowMid + bass - 0.34) / 0.2, 0, 1) * 0.2
      + clamp((0.26 - highShare) / 0.16, 0, 1) * 0.1
      + clamp((bassShare - 0.28) / 0.12, 0, 1) * clamp((0.44 - bassShare) / 0.18, 0, 1) * 0.14
      + clamp((recentLevelDeviation + recentBassDeviation - 0.04) / 0.08, 0, 1) * 0.12,
      0,
      1
    );
  }

  function deepBassScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const brightness = Number(input.brightness || 0);
    const mid = Number(input.mid || 0);
    const loosePulse = Boolean(input.loosePulse);
    return clamp(
      Math.max(rangeScore(bpm, 68, 75, 8), rangeScore(bpm, 136, 150, 16)) * 0.22
      + clamp((bassShare - 0.44) / 0.16, 0, 1) * 0.28
      + clamp((0.18 - highShare) / 0.14, 0, 1) * 0.18
      + clamp((0.5 - brightness) / 0.4, 0, 1) * 0.12
      + clamp((0.12 - mid) / 0.1, 0, 1) * 0.08
      + (loosePulse ? 0.12 : 0.03),
      0,
      1
    );
  }

  function hardstyleScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const mid = Number(input.mid || 0);
    const high = Number(input.high || 0);
    const stablePulse = Boolean(input.stablePulse);
    return clamp(
      rangeScore(bpm, 150, 162, 14) * 0.24
      + clamp((bassShare - 0.4) / 0.16, 0, 1) * 0.22
      + clamp((level - 0.3) / 0.16, 0, 1) * 0.14
      + clamp((mid + high - 0.34) / 0.22, 0, 1) * 0.12
      + clamp((highShare - 0.18) / 0.16, 0, 1) * 0.08
      + (stablePulse ? 0.12 : 0.03),
      0,
      1
    );
  }

  function rawTechnoScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const brightness = Number(input.brightness || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const bass = Number(input.bass || 0);
    const high = Number(input.high || 0);
    const stablePulse = Boolean(input.stablePulse);
    const stableVoteRatio = Number(input.stableVoteRatio ?? (stablePulse ? 1 : 0));
    const straightPulse = stablePulse && stableVoteRatio >= 0.45;
    const straightMachineFit = stablePulse
      ? clamp((bass + high - mid * 0.5) / 0.32, 0, 1)
      : 0.2;
    const hardDensityPenalty = clamp((bassShare - 0.46) / 0.08, 0, 1) * 0.22
      + clamp((level - 0.35) / 0.08, 0, 1) * 0.18;
    return clamp(
      rangeScore(bpm, 128, 145, 16) * 0.18
      + rangeScore(bassShare, 0.34, 0.44, 0.06) * 0.16
      + rangeScore(highShare, 0.17, 0.29, 0.08) * 0.14
      + rangeScore(level, 0.22, 0.34, 0.06) * 0.14
      + rangeScore(brightness, 0.62, 1.16, 0.36) * 0.12
      + rangeScore(centroid, 2300, 4300, 1700) * 0.1
      + clamp((bass + lowMid - 0.32) / 0.18, 0, 1) * 0.08
      + straightMachineFit * 0.08
      + (straightPulse ? 0.08 : -0.24)
      - hardDensityPenalty,
      0,
      1
    );
  }

  function dubstepScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const brightness = Number(input.brightness || 0);
    const mid = Number(input.mid || 0);
    const loosePulse = Boolean(input.loosePulse);
    return clamp(
      Math.max(rangeScore(bpm, 68, 75, 8), rangeScore(bpm, 136, 150, 8)) * 0.22
      + rangeScore(bassShare, 0.42, 0.58, 0.12) * 0.24
      + rangeScore(highShare, 0.16, 0.28, 0.06) * 0.12
      + rangeScore(level, 0.22, 0.36, 0.1) * 0.1
      + rangeScore(brightness, 0.38, 0.9, 0.28) * 0.08
      + clamp((0.2 - mid) / 0.14, 0, 1) * 0.08
      + (loosePulse ? 0.16 : 0.04),
      0,
      1
    );
  }

  function leftfieldBassScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const recentBassDeviation = Number(input.recentBassDeviation || 0);
    const recentLevelDeviation = Number(input.recentLevelDeviation || 0);
    const loosePulse = Boolean(input.loosePulse);
    return clamp(
      rangeScore(bpm, 120, 148, 24) * 0.12
      + rangeScore(bassShare, 0.34, 0.48, 0.14) * 0.2
      + rangeScore(highShare, 0.1, 0.24, 0.12) * 0.1
      + rangeScore(level, 0.16, 0.3, 0.12) * 0.1
      + clamp((recentLevelDeviation + recentBassDeviation - 0.06) / 0.11, 0, 1) * 0.2
      + (loosePulse ? 0.2 : 0.04)
      + clamp((0.5 - bassShare) / 0.18, 0, 1) * 0.08,
      0,
      1
    );
  }

  function leftfieldElectronicScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const centroid = Number(input.centroid || 0);
    const recentLevelDeviation = Number(input.recentLevelDeviation || 0);
    const stablePulse = Boolean(input.stablePulse);
    return clamp(
      rangeScore(bpm, 88, 118, 24) * 0.16
      + rangeScore(bassShare, 0.18, 0.34, 0.12) * 0.12
      + rangeScore(highShare, 0.18, 0.34, 0.12) * 0.14
      + rangeScore(level, 0.12, 0.26, 0.12) * 0.1
      + clamp((centroid - 3000) / 2600, 0, 1) * 0.12
      + clamp(recentLevelDeviation / 0.12, 0, 1) * 0.16
      + (!stablePulse ? 0.2 : 0.04),
      0,
      1
    );
  }

  function dnbBreakScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const high = Number(input.high || 0);
    const loosePulse = Boolean(input.loosePulse);
    const stablePulse = Boolean(input.stablePulse);
    const tempoFit = Math.max(
      rangeScore(bpm, 160, 180, 22),
      rangeScore(bpm, 80, 92, 10)
    );
    const fastOrHalfTime = bpm >= 158 || (bpm >= 78 && bpm <= 96);
    if (!fastOrHalfTime) return 0;
    if (stablePulse && !loosePulse && bpm < 168) return 0;
    const rollingTopFit = clamp((highShare - 0.18) / 0.16, 0, 1);
    const bassPocketFit = rangeScore(bassShare, 0.3, 0.44, 0.12);
    const spectralMotionFit = Math.max(
      rangeScore(centroid, 3600, 5600, 2200),
      clamp((mid + high - lowMid) / 0.42, 0, 1)
    );
    const hardKickPenalty = clamp((bassShare - 0.44) / 0.1, 0, 1) * 0.22
      + (stablePulse && bpm < 162 ? 0.08 : 0);

    return clamp(
      tempoFit * 0.28
      + rollingTopFit * 0.18
      + bassPocketFit * 0.18
      + spectralMotionFit * 0.14
      + rangeScore(level, 0.22, 0.38, 0.12) * 0.1
      + (loosePulse ? 0.08 : 0)
      + (stablePulse && bpm >= 168 && bassShare <= 0.44 ? 0.08 : 0)
      - hardKickPenalty,
      0,
      1
    );
  }

  function warmHouseGrooveScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const bass = Number(input.bass || 0);
    const high = Number(input.high || 0);
    const centroid = Number(input.centroid || 0);
    const stablePulse = Boolean(input.stablePulse);
    const recentBassDeviation = Number(input.recentBassDeviation || 0.08);
    const recentLevelDeviation = Number(input.recentLevelDeviation || 0.05);
    if (bpm > 134 || (highShare < 0.15 && centroid < 2200)) return 0;
    if (!stablePulse && recentBassDeviation + recentLevelDeviation > 0.045) return 0;
    const tempoFit = rangeScore(bpm, 118, 132, 6);
    const warmMidFit = clamp((lowMid + mid - 0.36) / 0.16, 0, 1);
    const chordPocketFit = clamp((lowMid + mid - bass - high + 0.02) / 0.2, 0, 1);
    const lowMidFit = clamp((lowMid - 0.19) / 0.08, 0, 1);
    const smoothLooseFit = clamp((0.055 - recentBassDeviation - recentLevelDeviation) / 0.055, 0, 1);
    const brightOrHardPenalty = clamp((highShare - 0.25) / 0.12, 0, 1) * 0.14
      + clamp((bassShare - 0.38) / 0.1, 0, 1) * 0.12
      + clamp((centroid - 3300) / 1500, 0, 1) * 0.08
      + clamp((level - 0.3) / 0.08, 0, 1) * 0.16;

    return clamp(
      tempoFit * 0.2
      + warmMidFit * 0.22
      + chordPocketFit * 0.2
      + lowMidFit * 0.18
      + (stablePulse ? 0.16 : smoothLooseFit * 0.16)
      + rangeScore(level, 0.18, 0.29, 0.08) * 0.08
      - brightOrHardPenalty,
      0,
      1
    );
  }

  function tranceLiftScore(input = {}) {
    const bpm = Number(input.bpm || 0);
    const bassShare = clamp(Number(input.bassShare || 0), 0, 1);
    const highShare = clamp(Number(input.highShare || 0), 0, 1);
    const level = Number(input.level || 0);
    const brightness = Number(input.brightness || 0);
    const centroid = Number(input.centroid || 0);
    const lowMid = Number(input.lowMid || 0);
    const mid = Number(input.mid || 0);
    const bass = Number(input.bass || 0);
    const high = Number(input.high || 0);
    const stablePulse = Boolean(input.stablePulse);
    if (!stablePulse || (bpm && bpm < 126)) return 0;
    const tempoFit = rangeScore(bpm, 128, 150, 18);
    const leadFit = clamp((mid + high - bass - lowMid + 0.04) / 0.22, 0, 1);
    const brightnessFit = Math.max(
      clamp((highShare - 0.23) / 0.16, 0, 1),
      clamp((brightness - 0.82) / 0.5, 0, 1),
      clamp((centroid - 3300) / 1700, 0, 1)
    );
    const bassPocketFit = clamp((0.39 - bassShare) / 0.16, 0, 1);
    const hardKickPenalty = clamp((bassShare - 0.42) / 0.1, 0, 1) * 0.16;

    return clamp(
      tempoFit * 0.22
      + leadFit * 0.22
      + brightnessFit * 0.2
      + bassPocketFit * 0.14
      + (stablePulse ? 0.14 : 0.02)
      + rangeScore(level, 0.22, 0.34, 0.1) * 0.08
      - hardKickPenalty,
      0,
      1
    );
  }

  function detectStyleFromExternalTags(snapshot = {}, state = {}) {
    const tuning = resolveDetectionTuning(state);
    const tagMap = mapExternalGenreTags(collectExternalTags(snapshot, state));
    const scores = Object.fromEntries(Object.keys(STYLE_GUIDES).map(styleId => [styleId, 0]));
    Object.entries(tagMap.styleScores).forEach(([styleId, score]) => {
      if (Object.prototype.hasOwnProperty.call(scores, styleId)) {
        scores[styleId] = Math.max(Number(scores[styleId] || 0), Number(score || 0));
      }
    });
    const ranked = Object.entries(scores)
      .map(([styleId, score]) => ({ styleId, score: clamp(score, 0, 1) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score <= 0.01) {
      return {
        styleId: "unknown",
        label: "Listening",
        confidence: 0,
        reason: "waiting for Discogs400 tags",
        isCloseCall: false,
        scoreMargin: 0,
        runnerUpStyleId: null,
        scores,
        modelMode: "discogs",
        streamSampleCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
        streamFrameCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
        text: "Discogs400 mode is waiting for enough model tags before choosing a style.",
      };
    }
    const second = ranked[1] || { score: 0 };
    const guide = STYLE_GUIDES[best.styleId] || STYLE_GUIDES.techno;
    const scoreMargin = Math.max(0, best.score - second.score);
    const isCloseCall = scoreMargin < 0.09;
    const confidence = clamp((best.score * 0.82 + scoreMargin * 0.18) * (isCloseCall ? 0.9 : 1) * tuning.sensitivity, 0, 0.96);
    const matches = tagMap.matches
      .filter(match => match.style === best.styleId || (match.subgenre && SUBGENRE_GUIDES[match.subgenre]?.parent === best.styleId))
      .slice(0, 3)
      .map(match => match.tag)
      .join(" / ");
    return {
      styleId: best.styleId,
      label: guide.label,
      confidence,
      reason: matches ? `Discogs400 tags: ${matches}` : "Discogs400 tag score",
      isCloseCall,
      scoreMargin,
      runnerUpStyleId: second.styleId || null,
      scores,
      modelMode: "discogs",
      streamSampleCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
      streamFrameCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
      text: isCloseCall
        ? `Discogs400 style is a close call: ${guide.label} over ${STYLE_GUIDES[second.styleId]?.label || "another lane"} from model tags.`
        : `Discogs400 style leans ${guide.label} from model tags only.`,
    };
  }

  function detectStyleFromSnapshot(snapshot = {}, state = {}) {
    const modelMode = resolveModelMode(state);
    if (modelMode === "discogs") {
      return detectStyleFromExternalTags(snapshot, state);
    }
    const tuning = resolveDetectionTuning(state);
    const stream = aggregateStreamSnapshot(snapshot, state, { windowMs: tuning.genreWindowMs });
    const recent = stream.frames;
    const merged = stream.snapshot;
    const level = Number(merged.level || merged.total || 0);
    if (level < SILENCE_LEVEL) {
      return {
        styleId: "unknown",
        label: "Listening",
        confidence: 0,
        reason: "waiting for stronger input",
        streamSampleCount: stream.sampleCount,
        text: "Auto style detection is waiting for a clearer kick, bassline, or texture layer.",
      };
    }

    const bpm = Number(merged.pulseBpm || 0);
    const stablePulse = Boolean(merged.stablePulse);
    const bassShare = clamp(Number(merged.bassShare || 0) * tuning.bassBias, 0, 1);
    const highShare = clamp(Number(merged.highShare || 0) * tuning.textureBias, 0, 1);
    const lowMid = Number(merged.lowMid || 0);
    const mid = Number(merged.mid || 0);
    const bass = Number(merged.bass || 0) * tuning.bassBias;
    const high = Number(merged.high || 0) * tuning.textureBias;
    const brightness = Number(merged.brightness || 0) * tuning.textureBias;
    const centroid = Number(merged.centroid || 0);
    const recentBassDeviation = Number(merged.recentBassDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.bass || 0)) : 0.08));
    const recentLevelDeviation = Number(merged.recentLevelDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.level || 0)) : 0.05));
    const stableVoteRatio = recent.length
      ? recent.filter(item => item.stablePulse).length / recent.length
      : stablePulse ? 1 : 0;
    const streamDurationMs = Number(merged.streamDurationMs || 0);
    const bpmDeviation = Number(merged.bpmDeviation || 0);
    const loosePulse = (recent.length > 3 && stableVoteRatio < 0.45) || !stablePulse;
    const brokenPulse = loosePulse || (recent.length > 4 && recentBassDeviation > 0.065);
    const straightPulse = stablePulse && (!recent.length || stableVoteRatio >= 0.45);
    const acidLine = acidLineScore({ bpm, bassShare, highShare, brightness, centroid, mid, high, bass, level, stablePulse });
    const acidHouse = acidHouseScore({ bpm, bassShare, highShare, brightness, centroid, lowMid, mid, bass, stablePulse });
    const dubTechno = dubTechnoScore({ bpm, highShare, level, lowMid, mid, centroid, stablePulse: straightPulse });
    const minimalTechno = minimalTechnoScore({ bpm, highShare, level, recentBassDeviation, recentLevelDeviation, stablePulse: straightPulse });
    const ebm = ebmElectroclashScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, high, bass, stablePulse });
    const garageShuffle = garageShuffleScore({ bpm, bassShare, highShare, lowMid, bass, loosePulse, recentLevelDeviation, recentBassDeviation });
    const deepBass = deepBassScore({ bpm, bassShare, highShare, brightness, mid, loosePulse });
    const hardstyle = hardstyleScore({ bpm, bassShare, highShare, level, mid, high, stablePulse });
    const rawTechno = rawTechnoScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, bass, high, stablePulse: straightPulse, stableVoteRatio });
    const dubstep = dubstepScore({ bpm, bassShare, highShare, level, brightness, mid, loosePulse });
    const leftfieldBass = leftfieldBassScore({ bpm, bassShare, highShare, level, recentBassDeviation, recentLevelDeviation, loosePulse });
    const leftfieldElectronic = leftfieldElectronicScore({ bpm, bassShare, highShare, level, centroid, recentLevelDeviation, stablePulse });
    const dnbBreak = dnbBreakScore({ bpm, bassShare, highShare, level, centroid, lowMid, mid, high, loosePulse, stablePulse });
    const warmHouseGroove = warmHouseGrooveScore({ bpm, bassShare, highShare, level, lowMid, mid, bass, high, centroid, stablePulse, recentBassDeviation, recentLevelDeviation });
    const tranceLift = tranceLiftScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, bass, high, stablePulse });

    const scores = {
      techno:
        0.08
        + rangeScore(bpm, 126, 146, 14) * 0.26
        + (straightPulse ? 0.17 : 0)
        + clamp((bassShare - 0.28) / 0.28, 0, 1) * 0.14
        + clamp((lowMid + bass - highShare) / 0.48, 0, 1) * 0.12,
      electro:
        0.08
        + rangeScore(bpm, 118, 140, 16) * 0.18
        + (brokenPulse ? 0.22 : 0.05)
        + clamp((mid + high + bass) / 0.72, 0, 1) * 0.2
        + clamp((0.5 - bassShare) / 0.35, 0, 1) * 0.12,
      house:
        0.08
        + rangeScore(bpm, 116, 130, 12) * 0.26
        + (straightPulse ? 0.18 : 0)
        + clamp((lowMid + mid) / 0.5, 0, 1) * 0.18
        + clamp((0.34 - highShare) / 0.24, 0, 1) * 0.1,
      breaks:
        0.08
        + (brokenPulse ? 0.28 : 0)
        + clamp((bassShare - 0.3) / 0.28, 0, 1) * 0.18
        + clamp((highShare - 0.14) / 0.26, 0, 1) * 0.12
        + (bpm ? rangeScore(bpm, 128, 170, 26) * 0.1 : 0.14),
      acid:
        0.08
        + rangeScore(bpm, 130, 150, 16) * 0.2
        + clamp((highShare - 0.2) / 0.28, 0, 1) * 0.2
        + clamp((brightness - 0.85) / 1.2, 0, 1) * 0.16
        + clamp((centroid - 2600) / 4200, 0, 1) * 0.1
        + acidLine * 0.28,
      trance:
        0.08
        + rangeScore(bpm, 128, 150, 18) * 0.2
        + (straightPulse ? 0.14 : 0)
        + clamp((mid + high) / 0.56, 0, 1) * 0.18
        + clamp((highShare - 0.2) / 0.28, 0, 1) * 0.12
        + clamp((0.42 - bassShare) / 0.28, 0, 1) * 0.08,
      garage:
        0.08
        + rangeScore(bpm, 126, 140, 14) * 0.2
        + (brokenPulse ? 0.24 : 0.04)
        + clamp((lowMid + bass) / 0.58, 0, 1) * 0.18
        + clamp((0.38 - highShare) / 0.28, 0, 1) * 0.1,
      dnb:
        0.08
        + rangeScore(bpm, 160, 178, 24) * 0.24
        + (brokenPulse ? 0.2 : 0.04)
        + clamp((bassShare - 0.26) / 0.32, 0, 1) * 0.16
        + clamp((highShare - 0.14) / 0.28, 0, 1) * 0.1,
      bass:
        0.08
        + (brokenPulse ? 0.14 : 0.04)
        + clamp((bassShare - 0.38) / 0.3, 0, 1) * 0.24
        + clamp((0.26 - highShare) / 0.22, 0, 1) * 0.12
        + (bpm ? Math.max(rangeScore(bpm, 68, 78, 10), rangeScore(bpm, 136, 150, 18)) * 0.12 : 0.1),
      downtempo:
        0.06
        + (bpm ? rangeScore(bpm, 86, 116, 18) * 0.18 : 0.2)
        + (!stablePulse ? 0.12 : 0)
        + clamp((0.3 - bassShare) / 0.24, 0, 1) * 0.12
        + clamp((0.22 - highShare) / 0.2, 0, 1) * 0.1
        + clamp((0.22 - level) / 0.18, 0, 1) * 0.12,
      "hard-dance":
        0.06
        + rangeScore(bpm, 152, 180, 22) * 0.24
        + (stablePulse ? 0.12 : 0.04)
        + clamp((bassShare - 0.38) / 0.28, 0, 1) * 0.2
        + clamp((level - 0.22) / 0.22, 0, 1) * 0.14
        + clamp((highShare - 0.18) / 0.28, 0, 1) * 0.08,
      industrial:
        0.08
        + rangeScore(bpm, 124, 152, 18) * 0.14
        + clamp((highShare - 0.22) / 0.3, 0, 1) * 0.2
        + clamp((bassShare - 0.3) / 0.28, 0, 1) * 0.18
        + clamp((level - 0.16) / 0.22, 0, 1) * 0.14
        + clamp((brightness - 0.75) / 1.4, 0, 1) * 0.08,
    };
    if (highShare > 0.32 || brightness > 1.2) {
      scores.techno -= 0.14;
      scores.industrial += 0.12;
      scores.acid += 0.06;
    }
    if (acidLine >= 0.62) {
      scores.acid += 0.1;
      scores.trance -= acidLine * 0.18;
      scores.industrial -= acidLine * 0.16;
      scores.electro -= acidLine * 0.08;
      scores.garage -= acidLine * 0.08;
    }
    if (acidHouse >= 0.66) {
      scores.house += acidHouse * 0.08;
      scores.trance -= acidHouse * 0.08;
      scores.electro -= acidHouse * 0.04;
      if (lowMid + mid > bass + high + 0.04) {
        scores.house += acidHouse * 0.18;
        scores.industrial -= acidHouse * 0.22;
      }
    }
    if (dubTechno >= 0.62 || minimalTechno >= 0.66) {
      const restrainedTechno = Math.max(dubTechno, minimalTechno);
      scores.techno += restrainedTechno * 0.28;
      scores.house -= restrainedTechno * 0.24;
      scores.garage -= restrainedTechno * 0.08;
      scores.electro -= restrainedTechno * 0.06;
    }
    if (dubTechno >= 0.62 && bpm >= 116 && bpm <= 128 && highShare <= 0.16 && lowMid + mid > bass + high + 0.12) {
      scores.techno += dubTechno * 0.16;
      scores.house -= dubTechno * 0.18;
      scores.trance -= dubTechno * 0.08;
    }
    if (ebm >= 0.58 && !(acidHouse >= 0.66 && lowMid + mid > bass + high + 0.04)) {
      scores.industrial += ebm * 0.32;
      scores.house -= ebm * 0.24;
      scores.techno -= ebm * 0.08;
    }
    if (garageShuffle >= 0.58) {
      scores.garage += garageShuffle * 0.34;
      scores.breaks += garageShuffle * 0.1;
      scores.house -= garageShuffle * 0.2;
      scores.techno -= garageShuffle * 0.08;
    }
    if (deepBass >= 0.58) {
      scores.bass += deepBass * 0.38;
      scores.techno -= deepBass * 0.24;
      scores.house -= deepBass * 0.12;
      scores.garage -= deepBass * 0.06;
    }
    if (hardstyle >= 0.62) {
      scores["hard-dance"] += hardstyle * 0.18;
      scores.techno -= hardstyle * 0.08;
      scores.trance -= hardstyle * 0.06;
    }
    if (rawTechno >= 0.62) {
      scores.techno += rawTechno * 0.18;
      scores.garage -= rawTechno * 0.18;
      scores.house -= rawTechno * 0.08;
    }
    if (dubstep >= 0.62 || leftfieldBass >= 0.62) {
      const bassSignal = Math.max(dubstep, leftfieldBass);
      scores.bass += bassSignal * 0.08;
      scores.garage -= bassSignal * 0.04;
      scores.techno -= bassSignal * 0.04;
    }
    if (leftfieldElectronic >= 0.62) {
      scores.downtempo += leftfieldElectronic * 0.18;
      scores.electro -= leftfieldElectronic * 0.08;
      scores.techno -= leftfieldElectronic * 0.06;
    }
    if (dnbBreak >= 0.58) {
      scores.dnb += dnbBreak * 0.44;
      scores.breaks += dnbBreak * 0.06;
      scores.electro -= dnbBreak * 0.18;
      scores.garage -= dnbBreak * 0.16;
      scores.techno -= dnbBreak * 0.08;
      if (bpm >= 160 && bassShare <= 0.44) {
        scores["hard-dance"] -= dnbBreak * 0.24;
      }
      if (bpm < 100) {
        scores.bass -= dnbBreak * 0.08;
      }
    }
    if (warmHouseGroove >= 0.58) {
      scores.house += warmHouseGroove * 0.38;
      scores.techno -= warmHouseGroove * 0.24;
      scores.electro -= warmHouseGroove * 0.2;
      scores.garage -= warmHouseGroove * 0.16;
      scores.breaks -= warmHouseGroove * 0.1;
      scores.trance -= warmHouseGroove * 0.06;
      scores.acid -= warmHouseGroove * 0.06;
    }
    if (tranceLift >= 0.58 && acidLine < 0.62) {
      scores.trance += tranceLift * 0.28;
      scores.techno -= tranceLift * 0.18;
      scores.house -= tranceLift * 0.1;
      scores.electro -= tranceLift * 0.08;
      scores.industrial -= tranceLift * 0.06;
      if (bpm < 152 || bassShare < 0.4) {
        scores["hard-dance"] -= tranceLift * 0.08;
      }
    }
    if (straightPulse && highShare > 0.32 && bassShare > 0.34 && level > 0.3) {
      scores.industrial += 0.18;
    }
    if (straightPulse && bpm >= 126 && bpm <= 146 && bassShare > 0.34 && highShare < 0.24) {
      scores.techno += 0.08;
      scores.garage -= 0.14;
    }
    if (straightPulse && (mid + high > lowMid + bass) && highShare >= 0.24) {
      scores.techno -= 0.12;
    }
    if (brokenPulse && bpm >= 126 && bpm <= 140 && highShare < 0.2 && lowMid + bass > 0.34) {
      scores.garage += 0.16;
      scores.electro -= 0.05;
    }
    if (brokenPulse && bpm >= 118 && bpm <= 128 && mid >= lowMid && bassShare < 0.38) {
      scores.electro += 0.09;
      scores.garage -= 0.07;
    }
    if (brokenPulse) {
      scores.house -= 0.14;
    }
    if (bpm && bpm > 132) {
      scores.house -= 0.08;
    }
    if (straightPulse && bpm >= 118 && bpm <= 130 && highShare < 0.26 && lowMid + mid > bass) {
      scores.house += 0.14;
      scores.techno -= 0.12;
      scores.garage -= 0.1;
      scores.electro -= 0.08;
    }
    if (
      straightPulse
      && bpm >= 118
      && bpm <= 130
      && streamDurationMs >= 8000
      && bpmDeviation <= 5
      && highShare < 0.28
      && lowMid + mid > bass * 1.18
    ) {
      scores.house += 0.16;
      scores.techno -= 0.08;
      scores.garage -= 0.06;
      scores.electro -= 0.04;
    }
    if (bpm && bpm < 152) {
      scores.dnb -= 0.18;
    }
    if (straightPulse && bpm >= 128 && bpm <= 150 && highShare >= 0.26 && mid + high > 0.38 && bassShare < 0.36) {
      scores.trance += 0.14;
      scores.electro -= 0.08;
    }
    if (bassShare >= 0.46 && highShare < 0.16 && (brokenPulse || bpm >= 136)) {
      scores.bass += 0.24;
      scores.garage -= 0.12;
      scores.techno -= 0.08;
    }
    if (bpm >= 154 && straightPulse && bassShare >= 0.38 && level >= 0.22) {
      scores["hard-dance"] += 0.18;
      scores.techno -= 0.08;
      scores.trance -= 0.05;
    }
    const externalTagMap = shouldUseExternalTags(state)
      ? mapExternalGenreTags(collectExternalTags(merged, state))
      : { styleScores: {}, subgenreScores: {}, matches: [] };
    Object.entries(externalTagMap.styleScores).forEach(([styleId, score]) => {
      if (Object.prototype.hasOwnProperty.call(scores, styleId)) {
        scores[styleId] += Number(score || 0) * 0.24;
      }
    });

    const ranked = Object.entries(scores)
      .map(([styleId, score]) => ({ styleId, score: clamp(score, 0, 1) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1] || { score: 0 };
    const guide = STYLE_GUIDES[best.styleId] || STYLE_GUIDES.techno;
    const streamFactor = clamp(stream.sampleCount / 8, 0.55, 1);
    const scoreMargin = Math.max(0, best.score - second.score);
    const isCloseCall = scoreMargin < 0.09;
    const confidence = clamp((best.score * 0.66 + scoreMargin * 0.34) * streamFactor * (isCloseCall ? 0.84 : 1) * tuning.sensitivity, 0, 0.96);
    const baseReason = stablePulse && best.styleId !== "breaks" && best.styleId !== "electro"
      ? "recent steady pulse plus spectrum balance"
      : brokenPulse && (best.styleId === "breaks" || best.styleId === "electro")
        ? "recent less-stable pulse with bass and mid/high movement"
        : highShare > 0.3
          ? "top texture and brightness are prominent across the recent window"
          : bassShare > 0.4
            ? "low-end weight is prominent across the recent window"
            : "recent balance of pulse, bass, and texture";
    const reason = isCloseCall
      ? `close call with ${STYLE_GUIDES[second.styleId]?.label || "another style"}; ${baseReason}`
      : baseReason;

    return {
      styleId: best.styleId,
      label: guide.label,
      confidence,
      reason,
      isCloseCall,
      scoreMargin,
      runnerUpStyleId: second.styleId || null,
      scores,
      streamSampleCount: stream.sampleCount,
      streamFrameCount: stream.frames.length,
      text: isCloseCall
        ? `Auto style is a close call: ${guide.label} over ${STYLE_GUIDES[second.styleId]?.label || "another lane"} from the recent audio stream. Treat this as a hybrid listening prompt, not a track ID.`
        : `Auto style leans ${guide.label} from the recent audio stream: ${reason}. Treat this as a listening prompt, not a track ID.`,
    };
  }

  function rankedStyleScores(scores = {}) {
    return Object.entries(STYLE_GUIDES)
      .map(([styleId, guide]) => ({
        styleId,
        label: guide.label,
        pattern: guide.pattern,
        cues: [...guide.cues],
        score: clamp(Number(scores[styleId] || 0), 0, 1),
      }))
      .sort((a, b) => b.score - a.score);
  }

  function detectGenreMixFromSnapshot(snapshot = {}, state = {}) {
    const style = detectStyleFromSnapshot(snapshot, state);
    if (style.styleId === "unknown") {
      return {
        mix: [],
        primary: null,
        isHybrid: false,
        style,
        text: "Genre mix detection is waiting for stronger input.",
      };
    }

    const ranked = rankedStyleScores(style.scores);
    const primaryScore = ranked[0]?.score || 0;
    const relevant = ranked
      .filter((item, index) => {
        if (index === 0) return true;
        const requiredShare = item.styleId === "techno" ? 0.84 : 0.72;
        return item.score >= 0.32 && item.score >= primaryScore * requiredShare;
      })
      .slice(0, 3);
    const mixSource = relevant.length ? relevant : ranked.slice(0, 1);
    const total = mixSource.reduce((sum, item) => sum + item.score, 0) || 1;
    const mix = mixSource.map((item, index) => ({
      ...item,
      rank: index + 1,
      share: clamp(item.score / total, 0, 1),
    }));
    const primary = mix[0] || null;
    const second = mix[1] || { share: 0 };
    const third = mix[2] || { share: 0 };
    const isHybrid = Boolean(primary && (second.share >= 0.25 || third.share >= 0.2 || primary.share < 0.52));
    const blendLabel = mix.map(item => item.label).join(" + ");
    const reason = isHybrid
      ? "the recent stream keeps the top style scores close enough to treat the track as a blend"
      : "one style lane is clearly ahead across the recent stream";

    return {
      mix,
      primary,
      isHybrid,
      blendLabel,
      reason,
      style,
      text: isHybrid
        ? `Genre mix reads ${blendLabel}. ${reason}; listen for which element carries each lane.`
        : `Genre mix leans ${primary.label}. ${reason}; use the next lanes as secondary references.`,
    };
  }

  function detectSubgenresFromExternalTags(snapshot = {}, state = {}) {
    const tuning = resolveDetectionTuning(state);
    const tagMap = mapExternalGenreTags(collectExternalTags(snapshot, state));
    const style = detectStyleFromSnapshot(snapshot, state);
    const candidates = Object.entries(tagMap.subgenreScores)
      .filter(([id]) => Boolean(SUBGENRE_GUIDES[id]))
      .map(([id, score]) => {
        const guide = SUBGENRE_GUIDES[id];
        return {
          id,
          label: guide.label,
          parent: guide.parent,
          confidence: clamp(Number(score || 0) * tuning.sensitivity, 0, 0.96),
          reason: "Discogs400 tag score",
          cues: [...guide.cues],
          lesson: guide.lesson,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    const primary = candidates[0] || null;
    return {
      candidates,
      primary,
      style,
      modelMode: "discogs",
      streamSampleCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
      streamFrameCount: Array.isArray(state?.snapshots) ? state.snapshots.length : 0,
      text: primary
        ? `Discogs400 subgenre candidate from model tags: ${primary.label}.`
        : "Discogs400 mode is waiting for subgenre tags.",
    };
  }

  function detectSubgenresFromSnapshot(snapshot = {}, state = {}) {
    if (resolveModelMode(state) === "discogs") {
      return detectSubgenresFromExternalTags(snapshot, state);
    }
    const tuning = resolveDetectionTuning(state);
    const stream = aggregateStreamSnapshot(snapshot, state, { windowMs: tuning.subgenreWindowMs });
    const recent = stream.frames;
    const merged = stream.snapshot;
    const level = Number(merged.level || merged.total || 0);
    if (level < SILENCE_LEVEL) {
      return {
        candidates: [],
        primary: null,
        streamSampleCount: stream.sampleCount,
        text: "Subgenre detection is waiting for stronger input.",
      };
    }

    const style = detectStyleFromSnapshot(snapshot, state);
    const bpm = Number(merged.pulseBpm || 0);
    const stablePulse = Boolean(merged.stablePulse);
    const bassShare = clamp(Number(merged.bassShare || 0) * tuning.bassBias, 0, 1);
    const highShare = clamp(Number(merged.highShare || 0) * tuning.textureBias, 0, 1);
    const lowMid = Number(merged.lowMid || 0);
    const mid = Number(merged.mid || 0);
    const bass = Number(merged.bass || 0) * tuning.bassBias;
    const high = Number(merged.high || 0) * tuning.textureBias;
    const brightness = Number(merged.brightness || 0) * tuning.textureBias;
    const centroid = Number(merged.centroid || 0);
    const recentBassDeviation = Number(merged.recentBassDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.bass || 0)) : 0.08));
    const recentLevelDeviation = Number(merged.recentLevelDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.level || 0)) : 0.05));
    const stableVoteRatio = recent.length
      ? recent.filter(item => item.stablePulse).length / recent.length
      : stablePulse ? 1 : 0;
    const loosePulse = (recent.length > 3 && stableVoteRatio < 0.45) || !stablePulse;
    const brokenPulse = loosePulse || (recent.length > 4 && recentBassDeviation > 0.065);
    const straightPulse = stablePulse && (!recent.length || stableVoteRatio >= 0.45);
    const spareArrangement = bassShare < 0.36 && highShare < 0.26 && level < 0.28;
    const brightTexture = highShare > 0.3 || brightness > 1.15 || centroid > 4300;
    const parentBoost = parent => style.styleId === parent ? 0.14 : 0;
    const acidLine = acidLineScore({ bpm, bassShare, highShare, brightness, centroid, mid, high, bass, level, stablePulse });
    const acidHouse = acidHouseScore({ bpm, bassShare, highShare, brightness, centroid, lowMid, mid, bass, stablePulse });
    const dubTechno = dubTechnoScore({ bpm, highShare, level, lowMid, mid, centroid, stablePulse: straightPulse });
    const minimalTechno = minimalTechnoScore({ bpm, highShare, level, recentBassDeviation, recentLevelDeviation, stablePulse: straightPulse });
    const ebm = ebmElectroclashScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, high, bass, stablePulse });
    const garageShuffle = garageShuffleScore({ bpm, bassShare, highShare, lowMid, bass, loosePulse, recentLevelDeviation, recentBassDeviation });
    const deepBass = deepBassScore({ bpm, bassShare, highShare, brightness, mid, loosePulse });
    const hardstyle = hardstyleScore({ bpm, bassShare, highShare, level, mid, high, stablePulse });
    const rawTechno = rawTechnoScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, bass, high, stablePulse: straightPulse, stableVoteRatio });
    const dubstepSignal = dubstepScore({ bpm, bassShare, highShare, level, brightness, mid, loosePulse });
    const leftfieldBass = leftfieldBassScore({ bpm, bassShare, highShare, level, recentBassDeviation, recentLevelDeviation, loosePulse });
    const leftfieldElectronic = leftfieldElectronicScore({ bpm, bassShare, highShare, level, centroid, recentLevelDeviation, stablePulse });
    const dnbBreak = dnbBreakScore({ bpm, bassShare, highShare, level, centroid, lowMid, mid, high, loosePulse, stablePulse });
    const warmHouseGroove = warmHouseGrooveScore({ bpm, bassShare, highShare, level, lowMid, mid, bass, high, centroid, stablePulse, recentBassDeviation, recentLevelDeviation });
    const tranceLift = tranceLiftScore({ bpm, bassShare, highShare, level, brightness, centroid, lowMid, mid, bass, high, stablePulse });

    const scores = {
      "hard-techno":
        parentBoost("techno")
        + rangeScore(bpm, 138, 156, 18) * 0.24
        + (stablePulse ? 0.12 : 0)
        + clamp((bassShare - 0.36) / 0.28, 0, 1) * 0.2
        + clamp((level - 0.2) / 0.24, 0, 1) * 0.14,
      "hypnotic-techno":
        parentBoost("techno")
        + rangeScore(bpm, 124, 138, 14) * 0.16
        + (stablePulse ? 0.22 : 0)
        + clamp((0.28 - highShare) / 0.24, 0, 1) * 0.14
        + clamp((0.065 - recentBassDeviation) / 0.065, 0, 1) * 0.14,
      "industrial-techno":
        parentBoost("industrial")
        + rangeScore(bpm, 130, 152, 20) * 0.12
        + clamp((bassShare - 0.32) / 0.3, 0, 1) * 0.16
        + clamp((highShare - 0.26) / 0.28, 0, 1) * 0.2
        + clamp((level - 0.2) / 0.24, 0, 1) * 0.14
        + (brightTexture ? 0.12 : 0),
      "acid-techno":
        parentBoost("acid")
        + parentBoost("techno") * 0.5
        + rangeScore(bpm, 128, 150, 18) * 0.16
        + clamp((brightness - 0.92) / 1.25, 0, 1) * 0.22
        + clamp((highShare - 0.22) / 0.28, 0, 1) * 0.16
        + acidLine * 0.28
        + (stablePulse ? 0.08 : 0),
      "detroit-groove":
        parentBoost("techno")
        + rangeScore(bpm, 122, 138, 14) * 0.14
        + (stablePulse ? 0.12 : 0)
        + clamp((lowMid + mid) / 0.48, 0, 1) * 0.22
        + clamp((0.34 - highShare) / 0.24, 0, 1) * 0.08,
      "minimal-techno":
        parentBoost("techno")
        + rangeScore(bpm, 118, 132, 12) * 0.14
        + (stablePulse ? 0.16 : 0)
        + (spareArrangement ? 0.24 : 0)
        + clamp((0.05 - recentLevelDeviation) / 0.05, 0, 1) * 0.12
        + minimalTechno * 0.28,
      "dub-techno":
        parentBoost("techno")
        + rangeScore(bpm, 116, 130, 12) * 0.12
        + (stablePulse ? 0.14 : 0)
        + clamp((0.24 - highShare) / 0.2, 0, 1) * 0.14
        + clamp((lowMid + mid) / 0.46, 0, 1) * 0.14
        + (spareArrangement ? 0.1 : 0)
        + dubTechno * 0.34,
      "raw-techno":
        parentBoost("techno")
        + rangeScore(bpm, 128, 145, 16) * 0.14
        + clamp((bassShare - 0.34) / 0.3, 0, 1) * 0.16
        + clamp((brightness - 0.7) / 1.2, 0, 1) * 0.1
        + clamp((level - 0.18) / 0.22, 0, 1) * 0.12
        + rawTechno * 0.28,
      schranz:
        parentBoost("techno")
        + rangeScore(bpm, 145, 162, 20) * 0.2
        + (stablePulse ? 0.12 : 0)
        + clamp((bassShare - 0.4) / 0.28, 0, 1) * 0.2
        + clamp((level - 0.24) / 0.22, 0, 1) * 0.16,
      "peak-time-techno":
        parentBoost("techno")
        + rangeScore(bpm, 132, 150, 18) * 0.16
        + (stablePulse ? 0.12 : 0)
        + clamp((bassShare - 0.34) / 0.28, 0, 1) * 0.16
        + clamp((highShare - 0.2) / 0.28, 0, 1) * 0.12
        + clamp((level - 0.2) / 0.22, 0, 1) * 0.12,
      "electro-funk":
        parentBoost("electro")
        + rangeScore(bpm, 116, 140, 18) * 0.14
        + (brokenPulse ? 0.2 : 0.04)
        + clamp((mid + high + bass) / 0.74, 0, 1) * 0.2
        + clamp((0.48 - bassShare) / 0.32, 0, 1) * 0.08,
      "detroit-electro":
        parentBoost("electro")
        + rangeScore(bpm, 118, 138, 16) * 0.14
        + (brokenPulse ? 0.16 : 0.04)
        + clamp((mid + bass) / 0.52, 0, 1) * 0.16
        + clamp((0.5 - bassShare) / 0.35, 0, 1) * 0.08,
      "miami-bass":
        parentBoost("electro")
        + parentBoost("bass") * 0.8
        + rangeScore(bpm, 130, 155, 24) * 0.14
        + (brokenPulse ? 0.14 : 0.04)
        + clamp((bassShare - 0.38) / 0.28, 0, 1) * 0.22
        + clamp((level - 0.2) / 0.22, 0, 1) * 0.1,
      ghettotech:
        parentBoost("electro")
        + rangeScore(bpm, 138, 165, 24) * 0.18
        + (brokenPulse ? 0.18 : 0.04)
        + clamp((bassShare - 0.34) / 0.3, 0, 1) * 0.18
        + clamp((level - 0.2) / 0.24, 0, 1) * 0.12,
      "ebm-electroclash":
        parentBoost("industrial")
        + parentBoost("electro") * 0.6
        + rangeScore(bpm, 112, 134, 18) * 0.14
        + clamp((mid + high) / 0.5, 0, 1) * 0.2
        + clamp((brightness - 0.75) / 1.4, 0, 1) * 0.12
        + ebm * 0.34,
      "deep-house":
        parentBoost("house")
        + rangeScore(bpm, 114, 126, 10) * 0.18
        + (stablePulse ? 0.12 : 0)
        + clamp((lowMid + mid) / 0.5, 0, 1) * 0.2
        + clamp((0.28 - highShare) / 0.2, 0, 1) * 0.12,
      "tech-house":
        parentBoost("house")
        + rangeScore(bpm, 122, 132, 10) * 0.18
        + (stablePulse ? 0.14 : 0)
        + clamp((bass + lowMid + mid) / 0.65, 0, 1) * 0.2
        + clamp((highShare - 0.14) / 0.24, 0, 1) * 0.08,
      "acid-house":
        parentBoost("house")
        + parentBoost("acid") * 0.6
        + rangeScore(bpm, 118, 130, 12) * 0.16
        + clamp((brightness - 0.9) / 1.2, 0, 1) * 0.2
        + clamp((highShare - 0.2) / 0.26, 0, 1) * 0.12
        + acidHouse * 0.34
        + (stablePulse ? 0.08 : 0),
      "classic-house":
        parentBoost("house")
        + rangeScore(bpm, 116, 128, 10) * 0.16
        + (stablePulse ? 0.12 : 0)
        + clamp((lowMid + mid) / 0.5, 0, 1) * 0.18
        + clamp((0.34 - highShare) / 0.24, 0, 1) * 0.1,
      "disco-house":
        parentBoost("house")
        + rangeScore(bpm, 118, 128, 10) * 0.14
        + (stablePulse ? 0.1 : 0)
        + clamp((mid + high) / 0.56, 0, 1) * 0.18
        + clamp((highShare - 0.18) / 0.26, 0, 1) * 0.1,
      "minimal-deep-tech":
        parentBoost("house")
        + rangeScore(bpm, 120, 130, 10) * 0.14
        + (stablePulse ? 0.12 : 0)
        + (spareArrangement ? 0.18 : 0)
        + clamp((lowMid + bass) / 0.5, 0, 1) * 0.14,
      breakbeat:
        parentBoost("breaks")
        + rangeScore(bpm, 124, 145, 18) * 0.12
        + (brokenPulse ? 0.24 : 0)
        + clamp((highShare - 0.16) / 0.26, 0, 1) * 0.12
        + clamp((bassShare - 0.28) / 0.3, 0, 1) * 0.12,
      "ukg-garage":
        parentBoost("garage")
        + parentBoost("breaks") * 0.6
        + rangeScore(bpm, 126, 138, 12) * 0.14
        + (brokenPulse ? 0.18 : 0.03)
        + clamp((lowMid + bass) / 0.52, 0, 1) * 0.16
        + clamp((0.36 - highShare) / 0.24, 0, 1) * 0.08
        + garageShuffle * 0.34,
      "two-step":
        parentBoost("garage")
        + rangeScore(bpm, 126, 140, 12) * 0.14
        + (brokenPulse ? 0.22 : 0.02)
        + clamp((lowMid + bass) / 0.54, 0, 1) * 0.14
        + clamp((0.34 - highShare) / 0.24, 0, 1) * 0.08,
      "speed-garage":
        parentBoost("garage")
        + rangeScore(bpm, 132, 145, 14) * 0.14
        + (brokenPulse ? 0.16 : 0.04)
        + clamp((bassShare - 0.32) / 0.28, 0, 1) * 0.18
        + clamp((lowMid + bass) / 0.56, 0, 1) * 0.12,
      "jungle-dnb":
        parentBoost("breaks")
        + parentBoost("dnb")
        + rangeScore(bpm, 158, 178, 28) * 0.2
        + (brokenPulse ? 0.18 : 0.02)
        + clamp((bassShare - 0.32) / 0.3, 0, 1) * 0.16
        + clamp((highShare - 0.18) / 0.3, 0, 1) * 0.12,
      "liquid-dnb":
        parentBoost("dnb")
        + rangeScore(bpm, 160, 176, 24) * 0.18
        + (brokenPulse ? 0.12 : 0.02)
        + clamp((mid + high) / 0.56, 0, 1) * 0.14
        + clamp((0.44 - bassShare) / 0.28, 0, 1) * 0.08,
      neurofunk:
        parentBoost("dnb")
        + rangeScore(bpm, 168, 178, 20) * 0.18
        + (brokenPulse ? 0.14 : 0.02)
        + clamp((bassShare - 0.32) / 0.28, 0, 1) * 0.16
        + clamp((brightness - 0.9) / 1.4, 0, 1) * 0.12,
      "half-time-dnb":
        parentBoost("dnb")
        + parentBoost("bass") * 0.6
        + Math.max(rangeScore(bpm, 84, 92, 8), rangeScore(bpm, 168, 180, 18)) * 0.16
        + clamp((bassShare - 0.36) / 0.3, 0, 1) * 0.18
        + (brokenPulse ? 0.1 : 0.02),
      dubstep:
        parentBoost("bass")
        + Math.max(rangeScore(bpm, 68, 75, 8), rangeScore(bpm, 136, 150, 18)) * 0.16
        + clamp((bassShare - 0.4) / 0.28, 0, 1) * 0.22
        + clamp((0.28 - highShare) / 0.22, 0, 1) * 0.1
        + (brokenPulse ? 0.1 : 0.03)
        + dubstepSignal * 0.22,
      "deep-dubstep":
        parentBoost("bass")
        + Math.max(rangeScore(bpm, 68, 75, 8), rangeScore(bpm, 136, 148, 16)) * 0.14
        + clamp((bassShare - 0.38) / 0.3, 0, 1) * 0.18
        + clamp((0.22 - highShare) / 0.2, 0, 1) * 0.14
        + (spareArrangement ? 0.12 : 0)
        + deepBass * 0.34,
      footwork:
        parentBoost("bass")
        + rangeScore(bpm, 150, 165, 18) * 0.16
        + (brokenPulse ? 0.22 : 0.04)
        + clamp((bassShare - 0.3) / 0.3, 0, 1) * 0.12
        + clamp(recentLevelDeviation / 0.1, 0, 1) * 0.1,
      "leftfield-bass":
        parentBoost("bass")
        + (brokenPulse ? 0.14 : 0.04)
        + clamp((bassShare - 0.32) / 0.32, 0, 1) * 0.16
        + clamp(recentLevelDeviation / 0.11, 0, 1) * 0.12
        + (spareArrangement ? 0.1 : 0)
        + leftfieldBass * 0.24,
      "hard-trance":
        parentBoost("trance")
        + parentBoost("acid") * 0.4
        + rangeScore(bpm, 138, 155, 18) * 0.2
        + (stablePulse ? 0.12 : 0)
        + clamp((highShare - 0.24) / 0.28, 0, 1) * 0.16
        + clamp((level - 0.18) / 0.22, 0, 1) * 0.1,
      "progressive-melodic":
        parentBoost("trance")
        + rangeScore(bpm, 120, 134, 14) * 0.14
        + (stablePulse ? 0.12 : 0)
        + clamp((mid + high) / 0.52, 0, 1) * 0.18
        + clamp((0.36 - bassShare) / 0.24, 0, 1) * 0.08,
      psytrance:
        parentBoost("trance")
        + rangeScore(bpm, 138, 150, 16) * 0.18
        + (stablePulse ? 0.12 : 0)
        + clamp((bassShare - 0.3) / 0.28, 0, 1) * 0.12
        + clamp((highShare - 0.22) / 0.28, 0, 1) * 0.12
        + clamp((brightness - 0.9) / 1.3, 0, 1) * 0.1,
      "uplifting-trance":
        parentBoost("trance")
        + rangeScore(bpm, 132, 142, 14) * 0.16
        + (stablePulse ? 0.12 : 0)
        + clamp((mid + high) / 0.58, 0, 1) * 0.18
        + clamp((0.36 - bassShare) / 0.24, 0, 1) * 0.08,
      hardstyle:
        parentBoost("hard-dance")
        + rangeScore(bpm, 150, 162, 16) * 0.2
        + (stablePulse ? 0.12 : 0.02)
        + clamp((bassShare - 0.4) / 0.28, 0, 1) * 0.2
        + clamp((mid + high) / 0.58, 0, 1) * 0.12
        + hardstyle * 0.28,
      hardcore:
        parentBoost("hard-dance")
        + rangeScore(bpm, 160, 185, 24) * 0.22
        + (stablePulse ? 0.1 : 0.02)
        + clamp((bassShare - 0.42) / 0.28, 0, 1) * 0.22
        + clamp((level - 0.24) / 0.22, 0, 1) * 0.14,
      "hard-dance-rave":
        parentBoost("hard-dance")
        + parentBoost("trance") * 0.4
        + rangeScore(bpm, 152, 172, 20) * 0.18
        + (stablePulse ? 0.12 : 0.02)
        + clamp((mid + high) / 0.58, 0, 1) * 0.14
        + clamp((level - 0.2) / 0.24, 0, 1) * 0.12,
      ambient:
        parentBoost("downtempo")
        + (!bpm ? 0.16 : rangeScore(bpm, 70, 105, 28) * 0.1)
        + clamp((0.22 - bassShare) / 0.2, 0, 1) * 0.12
        + clamp((0.18 - highShare) / 0.18, 0, 1) * 0.1
        + clamp((0.16 - level) / 0.14, 0, 1) * 0.16,
      "downtempo-breaks":
        parentBoost("downtempo")
        + rangeScore(bpm, 86, 115, 18) * 0.14
        + (brokenPulse ? 0.14 : 0.02)
        + clamp((bassShare - 0.24) / 0.3, 0, 1) * 0.1
        + clamp((0.3 - highShare) / 0.24, 0, 1) * 0.08,
      "leftfield-electronic":
        parentBoost("downtempo")
        + (brokenPulse ? 0.1 : 0.02)
        + clamp(recentLevelDeviation / 0.1, 0, 1) * 0.14
        + clamp((centroid - 2800) / 5200, 0, 1) * 0.08
        + (level > 0.08 && !stablePulse ? 0.08 : 0)
        + leftfieldElectronic * 0.24,
      "experimental-live":
        parentBoost("industrial")
        + parentBoost("downtempo") * 0.5
        + (brokenPulse ? 0.12 : 0)
        + clamp(recentLevelDeviation / 0.11, 0, 1) * 0.16
        + clamp((centroid - 3600) / 5200, 0, 1) * 0.12
        + (level > 0.1 && !bpm ? 0.16 : 0.04),
    };

    if (acidHouse >= 0.66) {
      scores["acid-house"] += acidHouse * 0.16;
      scores["tech-house"] -= acidHouse * 0.18;
      scores["deep-house"] -= acidHouse * 0.08;
      scores["classic-house"] -= acidHouse * 0.08;
      if (lowMid + mid > bass + high + 0.04) {
        scores["acid-house"] += acidHouse * 0.16;
        scores["ebm-electroclash"] -= acidHouse * 0.22;
      }
    }
    if (dubTechno >= 0.62) {
      scores["dub-techno"] += dubTechno * 0.2;
      scores["deep-house"] -= dubTechno * 0.22;
      scores["minimal-deep-tech"] -= dubTechno * 0.16;
      scores["classic-house"] -= dubTechno * 0.14;
      if (highShare <= 0.16 && centroid < 2600) {
        scores["minimal-techno"] -= dubTechno * 0.42;
      }
    }
    if (minimalTechno >= 0.66) {
      scores["minimal-techno"] += minimalTechno * 0.16;
      scores["minimal-deep-tech"] -= minimalTechno * 0.16;
      scores["deep-house"] -= minimalTechno * 0.12;
    }
    if (ebm >= 0.58 && !(acidHouse >= 0.66 && lowMid + mid > bass + high + 0.04)) {
      scores["ebm-electroclash"] += ebm * 0.18;
      scores["tech-house"] -= ebm * 0.24;
      scores["deep-house"] -= ebm * 0.12;
      scores["classic-house"] -= ebm * 0.12;
    }
    if (garageShuffle >= 0.58) {
      scores["ukg-garage"] += garageShuffle * 0.14;
      scores["minimal-deep-tech"] -= garageShuffle * 0.22;
      scores["tech-house"] -= garageShuffle * 0.16;
      scores["minimal-techno"] -= garageShuffle * 0.36;
      scores["dub-techno"] -= garageShuffle * 0.18;
      scores["raw-techno"] -= garageShuffle * 0.16;
      scores["detroit-groove"] -= garageShuffle * 0.12;
    }
    if (style.styleId === "garage" && loosePulse && bpm >= 126 && bpm <= 140 && lowMid + bass > 0.34 && highShare <= 0.22) {
      scores["ukg-garage"] += 0.28;
      scores["two-step"] += 0.08;
      scores["minimal-techno"] -= 0.34;
      scores["dub-techno"] -= 0.18;
      scores["raw-techno"] -= 0.16;
      scores["minimal-deep-tech"] -= 0.12;
    }
    if (deepBass >= 0.58) {
      scores["deep-dubstep"] += deepBass * 0.18;
      if (highShare <= 0.14 && brightness <= 0.38) {
        scores.dubstep -= deepBass * 0.16;
      } else {
        scores.dubstep += deepBass * 0.08;
      }
      scores["hypnotic-techno"] -= deepBass * 0.28;
      scores["hard-techno"] -= deepBass * 0.18;
      scores["detroit-groove"] -= deepBass * 0.12;
    }
    if (loosePulse && bassShare >= 0.48 && highShare <= 0.14 && brightness <= 0.35) {
      scores["deep-dubstep"] += 0.16;
      scores.dubstep -= 0.14;
      scores["leftfield-bass"] -= 0.06;
    }
    if (hardstyle >= 0.62) {
      scores.hardstyle += hardstyle * 0.16;
      scores["hard-dance-rave"] -= hardstyle * 0.14;
      scores.hardcore -= hardstyle * 0.08;
    }
    if (rawTechno >= 0.62) {
      scores["raw-techno"] += rawTechno * 0.18;
      scores["ukg-garage"] -= rawTechno * 0.22;
      scores["dub-techno"] -= rawTechno * 0.16;
      scores["hypnotic-techno"] -= rawTechno * 0.12;
      scores["detroit-groove"] -= rawTechno * 0.1;
    }
    if (stablePulse && bpm >= 138 && bpm <= 156 && bassShare >= 0.46 && level >= 0.34) {
      scores["hard-techno"] += 0.12;
      scores["raw-techno"] -= 0.18;
    }
    if (stablePulse && bpm >= 150 && bpm <= 164 && bassShare >= 0.48 && level >= 0.36 && mid + high < 0.28) {
      scores.schranz += 0.22;
      scores.hardstyle -= 0.18;
      scores.hardcore -= 0.08;
      scores.dubstep -= 0.12;
    }
    if (
      straightPulse
      && bpm >= 140
      && bpm <= 150
      && level <= 0.3
      && bassShare >= 0.36
      && bassShare <= 0.44
      && highShare >= 0.25
      && brightness >= 1
      && centroid >= 3900
      && mid + high > bass + lowMid + 0.04
    ) {
      scores.psytrance += 0.3;
      scores["raw-techno"] -= 0.28;
      scores["hard-techno"] -= 0.12;
      scores["peak-time-techno"] -= 0.1;
      scores["acid-techno"] -= 0.08;
    }
    if (dubstepSignal >= 0.62) {
      scores.dubstep += dubstepSignal * 0.18;
      scores["ukg-garage"] -= dubstepSignal * 0.2;
      scores["two-step"] -= dubstepSignal * 0.16;
      scores["speed-garage"] -= dubstepSignal * 0.12;
      if (highShare >= 0.16 || brightness >= 0.42) {
        scores["deep-dubstep"] -= dubstepSignal * 0.12;
      }
    }
    if (leftfieldBass >= 0.62) {
      scores["leftfield-bass"] += leftfieldBass * 0.18;
      scores["ukg-garage"] -= leftfieldBass * 0.2;
      scores["two-step"] -= leftfieldBass * 0.12;
      scores["hypnotic-techno"] -= leftfieldBass * 0.1;
      if (bassShare < 0.46) {
        scores.dubstep -= leftfieldBass * 0.08;
      }
    }
    if (leftfieldElectronic >= 0.62) {
      scores["leftfield-electronic"] += leftfieldElectronic * 0.2;
      scores["electro-funk"] -= leftfieldElectronic * 0.16;
      scores["detroit-electro"] -= leftfieldElectronic * 0.12;
      scores["dub-techno"] -= leftfieldElectronic * 0.1;
      scores["minimal-techno"] -= leftfieldElectronic * 0.1;
    }
    if (
      straightPulse
      && bpm >= 120
      && bpm <= 130
      && level <= 0.23
      && highShare <= 0.2
      && bassShare >= 0.28
      && bassShare <= 0.36
      && lowMid > mid + 0.07
    ) {
      scores["minimal-deep-tech"] += 0.26;
      scores["minimal-techno"] -= 0.22;
      scores["dub-techno"] -= 0.12;
      scores["raw-techno"] -= 0.1;
    }
    if (
      brokenPulse
      && bpm >= 116
      && bpm <= 140
      && bassShare <= 0.38
      && highShare >= 0.17
      && mid + high > bass + lowMid + 0.035
    ) {
      scores["electro-funk"] += 0.18;
      scores["detroit-electro"] += 0.08;
      scores["ukg-garage"] -= 0.06;
      scores["tech-house"] -= 0.04;
    }
    if (dnbBreak >= 0.58) {
      if (bpm < 100) {
        scores["half-time-dnb"] += dnbBreak * 0.48;
        scores["jungle-dnb"] += dnbBreak * 0.12;
      } else {
        scores["jungle-dnb"] += dnbBreak * 0.38;
        scores["liquid-dnb"] += dnbBreak * 0.14;
        if (brightness >= 1.05 || centroid >= 4800) {
          scores.neurofunk += dnbBreak * 0.1;
        }
      }
      scores["electro-funk"] -= dnbBreak * 0.24;
      scores["detroit-electro"] -= dnbBreak * 0.18;
      scores["ukg-garage"] -= dnbBreak * 0.16;
      scores["two-step"] -= dnbBreak * 0.12;
      scores["hard-dance-rave"] -= dnbBreak * 0.18;
      scores.hardstyle -= dnbBreak * 0.12;
      scores["minimal-techno"] -= dnbBreak * 0.18;
      scores["raw-techno"] -= dnbBreak * 0.16;
    }
    if (warmHouseGroove >= 0.58 && style.styleId === "house") {
      const deepTarget = bpm <= 124 && highShare <= 0.2;
      const techTarget = highShare >= 0.21 || bassShare >= 0.34;
      scores["classic-house"] += warmHouseGroove * (deepTarget || techTarget ? 0.2 : 0.4);
      scores["deep-house"] += warmHouseGroove * (deepTarget ? 0.4 : 0.14);
      scores["tech-house"] += warmHouseGroove * (techTarget ? 0.3 : 0.12);
      scores["disco-house"] += warmHouseGroove * (highShare >= 0.22 && mid + high >= 0.42 ? 0.36 : 0.08);
      scores["minimal-deep-tech"] += warmHouseGroove * 0.08;
      scores["minimal-techno"] -= warmHouseGroove * 0.5;
      scores["dub-techno"] -= warmHouseGroove * 0.34;
      scores["hypnotic-techno"] -= warmHouseGroove * 0.3;
      scores["raw-techno"] -= warmHouseGroove * 0.24;
      scores["electro-funk"] -= warmHouseGroove * 0.18;
      scores["detroit-electro"] -= warmHouseGroove * 0.12;
      scores["ukg-garage"] -= warmHouseGroove * 0.12;
    }
    if (tranceLift >= 0.58 && acidLine < 0.62) {
      scores["progressive-melodic"] += tranceLift * (bpm <= 136 ? 0.46 : 0.16);
      scores["hard-trance"] += tranceLift * (bpm >= 140 ? 0.46 : 0.14);
      scores["uplifting-trance"] += tranceLift * 0.18;
      if (bpm >= 140 && bassShare >= 0.32 && highShare >= 0.26) {
        scores.psytrance += tranceLift * 0.08;
      }
      scores["minimal-techno"] -= tranceLift * 0.4;
      scores["raw-techno"] -= tranceLift * 0.36;
      scores["hard-techno"] -= tranceLift * 0.2;
      scores["peak-time-techno"] -= tranceLift * 0.18;
      scores["detroit-groove"] -= tranceLift * 0.14;
      scores["electro-funk"] -= tranceLift * 0.12;
      scores.hardstyle -= tranceLift * 0.08;
      scores["hard-dance-rave"] -= tranceLift * 0.08;
    }
    const externalTagMap = shouldUseExternalTags(state)
      ? mapExternalGenreTags(collectExternalTags(merged, state))
      : { styleScores: {}, subgenreScores: {}, matches: [] };
    Object.entries(externalTagMap.subgenreScores).forEach(([subgenreId, score]) => {
      if (Object.prototype.hasOwnProperty.call(scores, subgenreId)) {
        scores[subgenreId] += Number(score || 0) * 0.28;
      }
    });
    Object.entries(externalTagMap.styleScores).forEach(([styleId, score]) => {
      Object.entries(SUBGENRE_GUIDES).forEach(([subgenreId, guide]) => {
        if (guide.parent === styleId && Object.prototype.hasOwnProperty.call(scores, subgenreId)) {
          scores[subgenreId] += Number(score || 0) * 0.035;
        }
      });
    });

    const candidates = Object.entries(scores)
      .map(([id, score]) => {
        const guide = SUBGENRE_GUIDES[id];
        const confidence = clamp(Number(score || 0) * tuning.sensitivity, 0, 0.96);
        const reason = acidLine >= 0.62 && /acid/.test(id)
          ? "resonant acid line over a steady techno pulse"
          : brightTexture && /acid|industrial|ebm|trance/.test(id)
          ? "bright / noisy top texture"
          : brokenPulse && /break|garage|electro|ghetto|jungle/.test(id)
            ? "broken or less-stable drum feel"
            : stablePulse && /techno|house|trance/.test(id)
              ? "stable pulse and groove balance"
              : bassShare > 0.38
                ? "strong low-end weight"
                : "broad spectrum balance";
        return {
          id,
          label: guide.label,
          parent: guide.parent,
          confidence,
          reason,
          cues: [...guide.cues],
          lesson: guide.lesson,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const primary = candidates[0] || null;
    return {
      candidates,
      primary,
      style,
      streamSampleCount: stream.sampleCount,
      streamFrameCount: stream.frames.length,
      text: primary
        ? `Top subgenre candidate from the recent stream: ${primary.label}. Reason: ${primary.reason}. Treat as a learning cue, not proof.`
        : "Subgenre detection needs more signal.",
    };
  }

  function firstLastAverages(frames = [], key = "level") {
    const values = frames
      .map(item => Number(item[key] || 0))
      .filter(value => Number.isFinite(value));
    if (!values.length) return { first: 0, last: 0, delta: 0 };
    const sliceSize = Math.max(1, Math.ceil(values.length / 3));
    const first = average(values.slice(0, sliceSize));
    const last = average(values.slice(-sliceSize));
    return {
      first,
      last,
      delta: last - first,
    };
  }

  function detectEnergyArcFromSnapshot(snapshot = {}, state = {}) {
    const stream = aggregateStreamSnapshot(snapshot, state, { windowMs: 24000 });
    const frames = stream.frames;
    const merged = stream.snapshot;
    const level = Number(merged.level || merged.total || 0);
    const peakLevel = Number(merged.peakLevel || level || 0);
    const bassShare = clamp(Number(merged.bassShare || 0), 0, 1);
    const highShare = clamp(Number(merged.highShare || 0), 0, 1);
    const stablePulse = Boolean(merged.stablePulse);
    const levelTrend = firstLastAverages(frames, "level");
    const bassTrend = firstLastAverages(frames, "bass");
    const highTrend = firstLastAverages(frames, "high");
    const sampleFactor = clamp(stream.sampleCount / 8, 0.45, 1);
    const trendStrength = Math.max(
      Math.abs(levelTrend.delta),
      Math.abs(bassTrend.delta) * 1.4,
      Math.abs(highTrend.delta) * 1.25
    );

    if (level < SILENCE_LEVEL) {
      return {
        arcId: "waiting",
        label: "Waiting",
        confidence: 0,
        cues: ["clearer input", "kick", "texture"],
        streamSampleCount: stream.sampleCount,
        text: "Energy arc is waiting for a clearer signal.",
      };
    }

    if (peakLevel > 0.18 && level < 0.08) {
      return {
        arcId: "reset",
        label: "Reset",
        confidence: clamp((peakLevel - level) * 2.8 * sampleFactor, 0.28, 0.9),
        cues: ["pressure drop", "space", "remaining element"],
        streamSampleCount: stream.sampleCount,
        text: "The room pressure has reset. Listen for the one element that stays alive before the next lift.",
      };
    }

    if (levelTrend.delta < -0.08 || bassTrend.delta < -0.055) {
      return {
        arcId: "breakdown",
        label: "Breakdown",
        confidence: clamp((Math.abs(levelTrend.delta) + Math.abs(bassTrend.delta)) * 2.4 * sampleFactor, 0.34, 0.92),
        cues: ["falling level", "kick pullback", "reset tension"],
        streamSampleCount: stream.sampleCount,
        text: "The pressure pulled back into a breakdown or reset. Check which sound remains while the kick weight drops.",
      };
    }

    if (levelTrend.delta > 0.07 || bassTrend.delta > 0.045 || highTrend.delta > 0.05) {
      const cue = bassTrend.delta >= highTrend.delta ? "kick weight" : "top texture";
      return {
        arcId: "building",
        label: "Building",
        confidence: clamp((trendStrength * 2.6 + level * 0.25) * sampleFactor, 0.36, 0.92),
        cues: ["rising pressure", cue, "next change"],
        streamSampleCount: stream.sampleCount,
        text: `Pressure is building through ${cue}. Count the phrase and listen for whether the next change adds weight or opens space.`,
      };
    }

    if (level > 0.3 && bassShare > 0.35 && stablePulse) {
      return {
        arcId: "peak",
        label: "Peak",
        confidence: clamp((level + bassShare) * 0.6 * sampleFactor, 0.42, 0.94),
        cues: ["high pressure", "stable pulse", "kick weight"],
        streamSampleCount: stream.sampleCount,
        text: "This reads like a peak-pressure section. Listen for whether the tension is held by the kick, the top line, or both.",
      };
    }

    if (stablePulse && Number(merged.recentLevelDeviation || 0) < 0.04) {
      return {
        arcId: "holding",
        label: "Holding",
        confidence: clamp((0.5 - Number(merged.recentLevelDeviation || 0)) * sampleFactor, 0.32, 0.82),
        cues: ["steady loop", "small edits", "patience"],
        streamSampleCount: stream.sampleCount,
        text: "The groove is holding steady. The useful detail is likely a small edit, mute, filter move, or hat change.",
      };
    }

    if (highShare > 0.34 && bassShare < 0.3) {
      return {
        arcId: "texture",
        label: "Texture-led",
        confidence: clamp((highShare - bassShare + 0.24) * sampleFactor, 0.3, 0.84),
        cues: ["hats", "noise", "air"],
        streamSampleCount: stream.sampleCount,
        text: "The section is texture-led. Follow hats, noise, echo, and air instead of waiting only for a drop.",
      };
    }

    return {
      arcId: "forming",
      label: "Forming",
      confidence: clamp((level + trendStrength) * sampleFactor, 0.22, 0.7),
      cues: ["balance", "pulse", "next phrase"],
      streamSampleCount: stream.sampleCount,
      text: "The arc is still forming. Track the next phrase and compare low-end weight with top texture.",
    };
  }

  function listeningDrillForSnapshot(snapshot = {}, state = {}, options = {}) {
    const style = options.style || detectStyleFromSnapshot(snapshot, state);
    const subgenre = options.subgenre || detectSubgenresFromSnapshot(snapshot, state);
    const arc = options.arc || detectEnergyArcFromSnapshot(snapshot, state);
    const primarySubgenre = subgenre.primary || null;
    const bassShare = clamp(Number(snapshot.bassShare || 0), 0, 1);
    const highShare = clamp(Number(snapshot.highShare || 0), 0, 1);
    const styleId = style.styleId || "";
    const subgenreId = primarySubgenre?.id || "";

    let focus = "arc";
    let title = "Phrase change watch";
    let prompt = "For 16 bars, name what changes at the phrase turn: kick, bass, hats, synth, or silence.";
    let steps = [
      "Count four groups of four kicks.",
      "At each group, name one element that changes or stays fixed.",
      "After 16 bars, decide whether pressure rose, held, or reset.",
    ];

    if (bassShare > 0.44 || /hard|schranz|gabber|hardcore|kick/.test(subgenreId)) {
      focus = "kick";
      title = "Kick tail check";
      prompt = "For 16 bars, compare the kick attack with the tail: short punch, rolling rumble, reverse pull, or distorted smear.";
      steps = [
        "Count four kicks and listen only to the first hit shape.",
        "Count the next four and follow the low tail after each hit.",
        "Ask whether the groove comes from punch, rumble, distortion, or speed.",
      ];
    } else if (highShare > 0.32 || /industrial|acid|trance/.test(styleId)) {
      focus = "texture";
      title = "Top texture scan";
      prompt = "For 16 bars, follow hats, resonance, noise, and air before judging the drop.";
      steps = [
        "Ignore the kick for four bars and name the brightest sound.",
        "Listen for filter opening, metallic edge, delay, or air.",
        "Check whether texture makes the section feel faster without changing BPM.",
      ];
    } else if (/breaks|garage|dnb|electro/.test(styleId)) {
      focus = "drums";
      title = "Broken-grid map";
      prompt = "For 16 bars, map where the snare and bass answer the kick instead of expecting a straight stomp.";
      steps = [
        "Find the strongest snare or clap.",
        "Notice which kick is missing, delayed, or skipped.",
        "Follow how bass fills the empty space.",
      ];
    } else if (/house/.test(styleId)) {
      focus = "groove";
      title = "Swing and warmth check";
      prompt = "For 16 bars, listen for swing, clap placement, chord warmth, and bass bounce.";
      steps = [
        "Find the clap and feel whether it lands straight or loose.",
        "Compare bass movement with chord or vocal fragments.",
        "Ask whether the track invites bounce more than pressure.",
      ];
    } else if (arc.arcId === "breakdown" || arc.arcId === "reset") {
      focus = "arc";
      title = "Reset element hunt";
      prompt = "During the reset, find the one element that stays alive and predicts the next lift.";
      steps = [
        "Name the first sound that remains after the kick drops.",
        "Track whether it opens, repeats, or disappears.",
        "Use that element to predict how the kick will return.",
      ];
    }

    return {
      focus,
      title,
      prompt,
      steps,
      durationBars: 16,
      styleId,
      styleLabel: style.label || "Listening",
      subgenreId,
      subgenreLabel: primarySubgenre?.label || "",
      arcId: arc.arcId,
      arcLabel: arc.label,
      text: `${title}: ${prompt}`,
    };
  }

  function formatPercent(value) {
    const numeric = Number(value || 0);
    if (!numeric) return "";
    return `${Math.round(clamp(numeric, 0, 1) * 100)}%`;
  }

  function formatSessionRecap(input = {}) {
    const comments = Array.isArray(input.comments) ? input.comments : [];
    const style = input.style || {};
    const subgenre = input.subgenre || {};
    const primarySubgenre = subgenre.primary || input.primarySubgenre || {};
    const arc = input.arc || {};
    const drill = input.drill || {};
    const lines = ["Sound Buddy recap"];
    const styleConfidence = formatPercent(style.confidence);
    const subgenreConfidence = formatPercent(primarySubgenre.confidence);
    const arcConfidence = formatPercent(arc.confidence);

    if (style.label) lines.push(`Style: ${style.label}${styleConfidence ? ` (${styleConfidence})` : ""}`);
    if (primarySubgenre.label) lines.push(`Subgenre: ${primarySubgenre.label}${subgenreConfidence ? ` (${subgenreConfidence})` : ""}`);
    if (arc.label) lines.push(`Arc: ${arc.label}${arcConfidence ? ` (${arcConfidence})` : ""} - ${arc.text || ""}`.trim());
    if (drill.title || drill.prompt) lines.push(`Drill: ${drill.title || "Listening drill"} - ${drill.prompt || ""}`.trim());
    if (comments.length) {
      lines.push("Cues:");
      comments.slice(0, 8).forEach(comment => {
        if (typeof comment === "string") {
          lines.push(`- ${comment}`);
          return;
        }
        const category = String(comment.category || "cue").toUpperCase();
        lines.push(`- ${category}: ${comment.text || ""}`.trim());
      });
    }
    return lines.join("\n");
  }

  function createCoachState(options = {}) {
    return {
      snapshots: [],
      pulseTimes: [],
      lastPulseActive: false,
      lastCommentAt: 0,
      lastSignature: "",
      defaultIndex: 0,
      startedAt: Number(options.now || 0),
      modelMode: resolveModelMode(options),
    };
  }

  function estimatePulseBpm(pulseTimes) {
    if (!pulseTimes || pulseTimes.length < 3) return null;
    const intervals = [];
    for (let index = 1; index < pulseTimes.length; index += 1) {
      const interval = pulseTimes[index] - pulseTimes[index - 1];
      if (interval >= 250 && interval <= 1100) intervals.push(interval);
    }
    if (intervals.length < 2) return null;
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    let bpm = 60000 / median;
    while (bpm < 86) bpm *= 2;
    while (bpm > 184) bpm /= 2;
    return Math.round(bpm);
  }

  function classifyFocus(snapshot) {
    if (snapshot.level < SILENCE_LEVEL) return "waiting";
    if (snapshot.bassShare > 0.42 && snapshot.bass > 0.16) return "kick / low end";
    if (snapshot.highShare > 0.34 || snapshot.brightness > 1.25) return "hats / texture";
    if (snapshot.mid > snapshot.bass && snapshot.mid > snapshot.high) return "mid texture";
    if (snapshot.lowMid > 0.17) return "body / groove";
    return "arrangement";
  }

  function updateCoachState(state, snapshot, now) {
    const enriched = {
      ...snapshot,
      capturedAt: now,
      dominantBand: dominantBand(snapshot),
      focus: classifyFocus(snapshot),
    };
    const bassHistory = state.snapshots.slice(-10).map(item => item.bass);
    const bassBaseline = average(bassHistory) || enriched.bass;
    const pulseActive = enriched.level > 0.04 && enriched.bass > Math.max(0.11, bassBaseline * 1.18);
    const lastPulse = state.pulseTimes[state.pulseTimes.length - 1] || 0;
    if (pulseActive && !state.lastPulseActive && (!lastPulse || now - lastPulse > 240)) {
      state.pulseTimes.push(now);
      if (state.pulseTimes.length > MAX_PULSE_TIMES) state.pulseTimes.shift();
    }
    state.lastPulseActive = pulseActive;
    enriched.pulseBpm = estimatePulseBpm(state.pulseTimes);
    const recentLevels = state.snapshots.slice(-12).map(item => item.level);
    const recentBass = state.snapshots.slice(-12).map(item => item.bass);
    enriched.stablePulse = standardDeviation(recentBass) < 0.055 && average(recentLevels) > 0.04 && state.snapshots.length > 8;
    state.snapshots.push(enriched);
    if (state.snapshots.length > MAX_HISTORY) state.snapshots.shift();
    return enriched;
  }

  function commentCandidates(snapshot, previous) {
    const candidates = [];
    if (snapshot.level < SILENCE_LEVEL) {
      candidates.push({
        signature: "quiet",
        category: "level",
        text: "Input is quiet. I will wait for a clearer kick before reading the track.",
      });
      return candidates;
    }

    const levelDelta = previous ? snapshot.level - previous.level : 0;
    const bassDelta = previous ? snapshot.bass - previous.bass : 0;
    const highDelta = previous ? snapshot.high - previous.high : 0;

    if (previous && levelDelta > 0.08) {
      candidates.push({
        signature: "energy-up",
        category: "arc",
        text: "Energy stepped up. Notice whether the DJ added weight in the kick or simply made the whole mix louder.",
      });
    }
    if (previous && levelDelta < -0.08) {
      candidates.push({
        signature: "energy-down",
        category: "arc",
        text: "The pressure pulled back. This is likely a reset or breakdown; listen for the element that stays alive.",
      });
    }
    if (snapshot.sub > 0.2 && snapshot.bass > 0.17) {
      candidates.push({
        signature: "sub-rumble",
        category: "bass",
        text: "There is a low rumble bed under the kick. That is the physical part of techno, more felt than sung.",
      });
    }
    if (snapshot.bassShare > 0.43 && snapshot.bass > 0.15) {
      candidates.push({
        signature: "bass-led",
        category: "kick",
        text: "Low end is leading. Compare the kick attack with its tail: short punch feels different from rolling pressure.",
      });
    }
    if (previous && bassDelta > 0.05 && snapshot.bassShare > 0.34) {
      candidates.push({
        signature: "kick-forward",
        category: "kick",
        text: "The kick moved forward. This is where hard techno can feel direct even before the track gets faster.",
      });
    }
    if (previous && highDelta > 0.045 && snapshot.highShare > 0.24) {
      candidates.push({
        signature: "top-open",
        category: "texture",
        text: "Top end opened. Hats and noise can make a room feel faster even when the pulse stays the same.",
      });
    }
    if (snapshot.highShare > 0.36 && snapshot.bassShare < 0.25) {
      candidates.push({
        signature: "texture-led",
        category: "texture",
        text: "This passage is texture-led. Focus on hiss, metallic edges, and echo instead of waiting for a big drop.",
      });
    }
    if (snapshot.mid > 0.18 && snapshot.mid > snapshot.bass && snapshot.highShare < 0.35) {
      candidates.push({
        signature: "mid-identity",
        category: "texture",
        text: "Mid texture is carrying the identity: synth grit, percussion, or vocal fragments are doing the storytelling.",
      });
    }
    if (snapshot.pulseBpm && snapshot.pulseBpm >= 126 && snapshot.pulseBpm <= 148 && snapshot.stablePulse) {
      candidates.push({
        signature: "club-tempo",
        category: "pulse",
        text: `Pulse is around ${snapshot.pulseBpm} BPM. Count four kicks, then listen for the small changes around them.`,
      });
    }
    if (snapshot.pulseBpm && snapshot.pulseBpm > 148 && snapshot.stablePulse) {
      candidates.push({
        signature: "fast-pulse",
        category: "pulse",
        text: `Fast pulse, roughly ${snapshot.pulseBpm} BPM. Do not reduce it to speed; check the kick, distortion, and room pressure.`,
      });
    }
    if (!candidates.length && snapshot.stablePulse) {
      candidates.push({
        signature: "steady-loop",
        category: "arrangement",
        text: "The loop is steady. The useful question is not what changed, but how long the DJ can hold tension.",
      });
    }
    return candidates;
  }

  function nextCoachComment(snapshot, state, options = {}) {
    const now = Number(options.now || Date.now());
    const minIntervalMs = Number(options.minIntervalMs || DEFAULT_INTERVAL_MS);
    const enriched = updateCoachState(state, snapshot, now);
    const previous = state.snapshots.length > 1 ? state.snapshots[state.snapshots.length - 2] : null;
    const firstComment = state.lastCommentAt === 0;
    if (!firstComment && now - state.lastCommentAt < minIntervalMs) {
      return null;
    }

    const candidates = commentCandidates(enriched, previous);
    let selected = candidates.find(item => item.signature !== state.lastSignature);
    if (!selected) {
      selected = defaultComments[state.defaultIndex % defaultComments.length];
      state.defaultIndex += 1;
    }
    state.lastCommentAt = now;
    state.lastSignature = selected.signature;
    return {
      ...selected,
      at: now,
      focus: enriched.focus,
      metrics: {
        level: enriched.level,
        bassShare: enriched.bassShare,
        highShare: enriched.highShare,
        pulseBpm: enriched.pulseBpm,
        dominantBand: enriched.dominantBand,
      },
    };
  }

  function setExternalStatus(state = {}, sourceId, status, detail = "") {
    if (!state.externalAnalysis) {
      state.externalAnalysis = {
        status: {},
        latestFeatures: null,
        latestTags: [],
        tags: [],
      };
    }
    state.externalAnalysis.status[sourceId] = {
      status,
      detail,
      updatedAt: Date.now ? Date.now() : 0,
    };
    return state.externalAnalysis.status[sourceId];
  }

  function ensureBrowserScript(rootScope, id, src) {
    if (!rootScope?.document) return Promise.reject(new Error("Document is not available."));
    const existing = rootScope.document.querySelector(`script[data-sound-buddy-loader="${id}"]`);
    if (existing?.dataset.loaded === "true") return Promise.resolve(true);
    if (existing?.dataset.loading === "true") {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = rootScope.document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.soundBuddyLoader = id;
      script.dataset.loading = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        script.dataset.loading = "false";
        resolve(true);
      }, { once: true });
      script.addEventListener("error", () => {
        script.dataset.loading = "false";
        reject(new Error(`Failed to load ${src}`));
      }, { once: true });
      rootScope.document.head.appendChild(script);
    });
  }

  function createExternalAnalysisBridge(options = {}) {
    const rootScope = options.root || root;
    const state = options.state || createCoachState();
    let meydaAnalyzer = null;
    let latestMeydaFeatures = null;
    let latestTags = [];
    let taggerBusy = false;
    let lastTaggerAt = 0;
    let discogsRuntime = null;
    const onStatus = typeof options.onStatus === "function" ? options.onStatus : null;

    function publish(sourceId, status, detail = "") {
      const entry = setExternalStatus(state, sourceId, status, detail);
      if (onStatus) onStatus(sourceId, entry, externalAnalysisStatus());
      return entry;
    }

    function externalAnalysisStatus() {
      return externalAnalysisSources().map(source => ({
        ...source,
        ...(state.externalAnalysis?.status?.[source.id] || { status: "standby", detail: "Ready when live audio starts." }),
      }));
    }

    async function startMeyda(audioContext, sourceNode) {
      if (!audioContext || !sourceNode) {
        publish("meyda", "standby", "Waiting for an audio context.");
        return false;
      }
      try {
        if (!rootScope.Meyda && options.loadLibraries !== false) {
          publish("meyda", "loading", "Loading Meyda feature extractor.");
          await ensureBrowserScript(rootScope, "meyda", options.meydaUrl || "https://cdn.jsdelivr.net/npm/meyda@5.6.3/dist/web/meyda.min.js");
        }
        if (!rootScope.Meyda?.createMeydaAnalyzer) {
          publish("meyda", "fallback", "Meyda unavailable; using local FFT bands.");
          return false;
        }
        meydaAnalyzer = rootScope.Meyda.createMeydaAnalyzer({
          audioContext,
          source: sourceNode,
          bufferSize: 1024,
          featureExtractors: [
            "rms",
            "zcr",
            "spectralCentroid",
            "spectralFlatness",
            "spectralFlux",
            "spectralRolloff",
            "spectralSpread",
            "perceptualSharpness",
            "perceptualSpread",
            "mfcc",
            "chroma",
          ],
          callback(features) {
            latestMeydaFeatures = normalizeMeydaFeatures(features || {});
            state.externalAnalysis = state.externalAnalysis || { status: {}, latestTags: [], tags: [] };
            state.externalAnalysis.latestFeatures = latestMeydaFeatures;
          },
        });
        if (typeof meydaAnalyzer.start === "function") meydaAnalyzer.start();
        publish("meyda", "live", "Meyda features are feeding the local analyzer.");
        return true;
      } catch (error) {
        publish("meyda", "fallback", "Meyda failed; local FFT bands remain active.");
        return false;
      }
    }

    function resolveDiscogsModel() {
      const models = pretrainedGenreModels();
      return models.find(model => model.id === options.discogsModelId) || models[0] || null;
    }

    function publishDiscogsRuntimeStatus(sourceId, status, detail) {
      const resolvedSource = sourceId || "discogs-effnet";
      const resolvedStatus = status === "ready" ? "available" : status;
      return publish(resolvedSource, resolvedStatus || "standby", detail || "");
    }

    async function startDiscogsModel(audioContext, sourceNode) {
      if (!options.loadDiscogsModel) return false;
      const model = resolveDiscogsModel();
      if (!model) {
        publish("discogs-effnet", "fallback", "No pretrained genre model is registered.");
        return false;
      }
      if (!audioContext || !sourceNode) {
        publish("discogs-effnet", "standby", "Waiting for an audio context.");
        return false;
      }
      if (!rootScope?.document) {
        publish("discogs-effnet", "fallback", "Browser document is unavailable.");
        return false;
      }

      try {
        publish("discogs-effnet", "loading", "Loading local Discogs400 model runtime.");
        publish("essentia-js", "loading", "Essentia.js and TensorFlow.js load inside the local model worker.");
        await ensureBrowserScript(
          rootScope,
          "sound-buddy-discogs-runtime",
          options.discogsRuntimeUrl || model.runtimeUrl
        );
        const factory = rootScope.SoundBuddyDiscogsRuntime?.createDiscogsModelRuntime;
        if (typeof factory !== "function") {
          publish("discogs-effnet", "fallback", "Discogs400 runtime hook is unavailable.");
          publish("essentia-js", "standby", "Local heuristics remain active.");
          return false;
        }
        discogsRuntime = factory({
          root: rootScope,
          model,
          topN: options.discogsTopN || 8,
          minProbability: options.discogsMinProbability ?? 0.05,
        });
        await discogsRuntime.start({
          audioContext,
          source: sourceNode,
          model,
          onStatus(sourceId, status, detail) {
            publishDiscogsRuntimeStatus(sourceId, status, detail);
          },
          onPredictions(predictions, labels) {
            const tags = normalizePretrainedGenrePredictions(predictions, labels, {
              source: "discogs-effnet",
              modelId: model.id,
              topN: options.discogsTopN || 8,
              minProbability: options.discogsMinProbability ?? 0.05,
            });
            if (tags.length) {
              updateTags(tags, "discogs-effnet");
              publish("discogs-effnet", "live", "Discogs400 pretrained tags are steering genre scores.");
            }
          },
          onTags(tags) {
            const normalizedTags = (Array.isArray(tags) ? tags : []).map(item => ({
              source: "discogs-effnet",
              modelId: model.id,
              ...item,
            }));
            if (normalizedTags.length) {
              updateTags(normalizedTags, "discogs-effnet");
              publish("discogs-effnet", "live", "Discogs400 pretrained tags are steering genre scores.");
            }
          },
        });
        publish("discogs-effnet", "available", "Discogs400 model is listening for enough audio to classify.");
        return true;
      } catch (error) {
        publish("discogs-effnet", "fallback", "Discogs400 model could not start; local genre heuristics remain active.");
        publish("essentia-js", "standby", "Model runtime failed to load.");
        return false;
      }
    }

    async function primeMlAdapters() {
      publish("wled-rtmgc", "mapped", "Using its real-time top-tag pattern as a local adapter.");
      if (!options.loadDiscogsModel) {
        publish("discogs-effnet", "mapped", "Discogs-style tags can now steer local candidates.");
      }
      if (rootScope.Essentia || rootScope.EssentiaModel || rootScope.tf) {
        publish("essentia-js", "available", "Essentia / TensorFlow globals detected.");
        return true;
      }
      if (options.loadMlRuntime) {
        try {
          publish("essentia-js", "loading", "Loading Essentia.js and TensorFlow.js runtime.");
          await ensureBrowserScript(rootScope, "tfjs", options.tfjsUrl || "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
          await ensureBrowserScript(rootScope, "essentia-wasm", options.essentiaWasmUrl || "https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia-wasm.web.js");
          await ensureBrowserScript(rootScope, "essentia-model", options.essentiaModelUrl || "https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia.js-model.js");
          publish("essentia-js", "available", "Essentia.js runtime loaded; model tags can be mapped locally.");
          return true;
        } catch (error) {
          publish("essentia-js", "standby", "Essentia.js runtime unavailable; tag adapter remains ready.");
          return false;
        }
      }
      publish("essentia-js", "standby", "Runtime can be loaded when a hosted model is configured.");
      return false;
    }

    async function start({ audioContext, source: sourceNode } = {}) {
      await Promise.allSettled([
        startMeyda(audioContext, sourceNode),
        primeMlAdapters(),
        startDiscogsModel(audioContext, sourceNode),
      ]);
      return true;
    }

    function updateTags(tags = [], sourceId = "external") {
      latestTags = (Array.isArray(tags) ? tags : []).map(item => (
        typeof item === "string" ? { tag: item, probability: 1, source: sourceId } : { source: sourceId, ...item }
      ));
      state.externalAnalysis = state.externalAnalysis || { status: {}, latestFeatures: null, latestTags: [], tags: [] };
      state.externalAnalysis.latestTags = latestTags;
      state.externalAnalysis.tags = latestTags;
      return latestTags;
    }

    async function analyzeTags(snapshot = {}) {
      const tagger = rootScope.SOUND_BUDDY_EXTERNAL_TAGGER;
      if (typeof tagger !== "function") return latestTags;
      const now = Date.now();
      const intervalMs = Number(options.tagIntervalMs || 2600);
      if (taggerBusy || now - lastTaggerAt < intervalMs) return latestTags;
      taggerBusy = true;
      lastTaggerAt = now;
      try {
        const tags = await tagger(snapshot, { sources: externalAnalysisSources() });
        return updateTags(tags, "external-tagger");
      } catch (error) {
        return latestTags;
      } finally {
        taggerBusy = false;
      }
    }

    function stop() {
      if (meydaAnalyzer && typeof meydaAnalyzer.stop === "function") meydaAnalyzer.stop();
      meydaAnalyzer = null;
      if (discogsRuntime && typeof discogsRuntime.stop === "function") discogsRuntime.stop();
      discogsRuntime = null;
    }

    return {
      start,
      stop,
      status: externalAnalysisStatus,
      latestMeydaFeatures: () => latestMeydaFeatures,
      latestTags: () => latestTags,
      updateTags,
      analyzeTags,
    };
  }

  function createBrowserCoach(options = {}) {
    let audioContext = null;
    let analyser = null;
    let source = null;
    let stream = null;
    let frequencyData = null;
    let timeDomainData = null;
    let frameId = null;
    let externalBridge = null;
    let running = false;
    let state = createCoachState();

    function frameNow() {
      return root.performance && typeof root.performance.now === "function"
        ? root.performance.now()
        : Date.now();
    }

    function commentIntervalMs() {
      const value = typeof options.minIntervalMs === "function" ? options.minIntervalMs() : options.minIntervalMs;
      return Number(value || DEFAULT_INTERVAL_MS);
    }

    function currentModelMode() {
      const value = typeof options.modelMode === "function" ? options.modelMode() : options.modelMode;
      return resolveModelMode({ modelMode: value });
    }

    function loop() {
      if (!running || !analyser || !audioContext) return;
      state.modelMode = currentModelMode();
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeDomainData);
      const meydaFeatures = externalBridge && typeof externalBridge.latestMeydaFeatures === "function"
        ? externalBridge.latestMeydaFeatures()
        : null;
      const externalTags = externalBridge && typeof externalBridge.latestTags === "function"
        ? externalBridge.latestTags()
        : [];
      const snapshot = analyzeAudioSnapshot({
        frequencyData,
        timeDomainData,
        sampleRate: audioContext.sampleRate,
        fftSize: analyser.fftSize,
        meydaFeatures,
        externalTags,
      });
      if (externalBridge && typeof externalBridge.analyzeTags === "function") {
        externalBridge.analyzeTags(snapshot);
      }
      const comment = nextCoachComment(snapshot, state, {
        now: frameNow(),
        minIntervalMs: commentIntervalMs(),
      });
      if (typeof options.onFrame === "function") options.onFrame(snapshot, state);
      if (comment && typeof options.onComment === "function") options.onComment(comment, state);
      frameId = root.requestAnimationFrame ? root.requestAnimationFrame(loop) : setTimeout(loop, 180);
    }

    async function start() {
      if (running) return true;
      const AudioContextCtor = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextCtor) throw new Error("AudioContext is not available in this browser.");
      if (!root.navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access requires HTTPS or localhost.");
      }
      // No audio leaves the browser; this stream only feeds the local analyzer.
      stream = await root.navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      audioContext = new AudioContextCtor();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.76;
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      timeDomainData = new Uint8Array(analyser.fftSize);
      state = createCoachState({ now: frameNow(), modelMode: currentModelMode() });
      externalBridge = createExternalAnalysisBridge({
        root,
        state,
        loadLibraries: options.loadExternalLibraries !== false,
        loadMlRuntime: Boolean(options.loadMlRuntime),
        loadDiscogsModel: Boolean(options.loadDiscogsModel),
        discogsRuntimeUrl: options.discogsRuntimeUrl,
        discogsModelId: options.discogsModelId,
        discogsTopN: options.discogsTopN,
        discogsMinProbability: options.discogsMinProbability,
        onStatus: options.onExternalStatus,
      });
      if (typeof options.onExternalStatus === "function") {
        options.onExternalStatus("all", null, externalBridge.status());
      }
      externalBridge.start({ audioContext, source }).catch(() => {
        if (typeof options.onExternalStatus === "function" && externalBridge) {
          options.onExternalStatus("all", null, externalBridge.status());
        }
      });
      running = true;
      loop();
      return true;
    }

    function stop() {
      running = false;
      if (frameId && root.cancelAnimationFrame) root.cancelAnimationFrame(frameId);
      if (frameId && !root.cancelAnimationFrame) clearTimeout(frameId);
      frameId = null;
      if (externalBridge && typeof externalBridge.stop === "function") externalBridge.stop();
      externalBridge = null;
      if (source && typeof source.disconnect === "function") source.disconnect();
      source = null;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stream = null;
      if (audioContext && typeof audioContext.close === "function") {
        audioContext.close();
      }
      audioContext = null;
      analyser = null;
      frequencyData = null;
      timeDomainData = null;
    }

    return {
      start,
      stop,
      isRunning: () => running,
      state: () => state,
      externalStatus: () => (
        externalBridge && typeof externalBridge.status === "function"
          ? externalBridge.status()
          : externalAnalysisSources().map(sourceItem => ({
            ...sourceItem,
            status: "standby",
            detail: "Ready when live audio starts.",
          }))
      ),
    };
  }

  return {
    analyzeAudioSnapshot,
    aggregateStreamSnapshot,
    createBrowserCoach,
    createCoachState,
    createExternalAnalysisBridge,
    externalAnalysisSources,
    pretrainedGenreModels,
    modelModes,
    normalizeMeydaFeatures,
    normalizePretrainedGenrePredictions,
    mapExternalGenreTags,
    nextCoachComment,
    detectStyleFromSnapshot,
    detectGenreMixFromSnapshot,
    detectSubgenresFromSnapshot,
    detectEnergyArcFromSnapshot,
    listeningDrillForSnapshot,
    formatSessionRecap,
    subgenreGuides,
    styleGuides,
    styleLessonForSnapshot,
  };
});
