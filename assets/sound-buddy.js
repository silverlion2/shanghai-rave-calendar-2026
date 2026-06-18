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
  const SILENCE_LEVEL = 0.018;
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

  function detectStyleFromSnapshot(snapshot = {}, state = {}) {
    const stream = aggregateStreamSnapshot(snapshot, state);
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
    const bassShare = clamp(Number(merged.bassShare || 0), 0, 1);
    const highShare = clamp(Number(merged.highShare || 0), 0, 1);
    const lowMid = Number(merged.lowMid || 0);
    const mid = Number(merged.mid || 0);
    const bass = Number(merged.bass || 0);
    const high = Number(merged.high || 0);
    const brightness = Number(merged.brightness || 0);
    const centroid = Number(merged.centroid || 0);
    const recentBassDeviation = Number(merged.recentBassDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.bass || 0)) : 0.08));
    const streamDurationMs = Number(merged.streamDurationMs || 0);
    const bpmDeviation = Number(merged.bpmDeviation || 0);
    const brokenPulse = !stablePulse || recentBassDeviation > 0.065;

    const scores = {
      techno:
        0.08
        + rangeScore(bpm, 126, 146, 14) * 0.26
        + (stablePulse ? 0.17 : 0)
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
        + (stablePulse ? 0.18 : 0)
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
        + clamp((centroid - 2600) / 4200, 0, 1) * 0.1,
      trance:
        0.08
        + rangeScore(bpm, 128, 150, 18) * 0.2
        + (stablePulse ? 0.14 : 0)
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
    if (stablePulse && highShare > 0.32 && bassShare > 0.34 && level > 0.3) {
      scores.industrial += 0.18;
    }
    if (stablePulse && bpm >= 126 && bpm <= 146 && bassShare > 0.34 && highShare < 0.24) {
      scores.techno += 0.08;
      scores.garage -= 0.14;
    }
    if (stablePulse && (mid + high > lowMid + bass) && highShare >= 0.24) {
      scores.techno -= 0.12;
    }
    if (brokenPulse && bpm >= 126 && bpm <= 140 && highShare < 0.2 && lowMid + bass > 0.34) {
      scores.garage += 0.08;
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
    if (stablePulse && bpm >= 118 && bpm <= 130 && highShare < 0.26 && lowMid + mid > bass) {
      scores.house += 0.14;
      scores.garage -= 0.1;
      scores.electro -= 0.08;
    }
    if (
      stablePulse
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
    if (stablePulse && bpm >= 128 && bpm <= 150 && highShare >= 0.26 && mid + high > 0.38 && bassShare < 0.36) {
      scores.trance += 0.14;
      scores.electro -= 0.08;
    }
    if (bassShare >= 0.46 && highShare < 0.16 && (brokenPulse || bpm >= 136)) {
      scores.bass += 0.24;
      scores.garage -= 0.12;
      scores.techno -= 0.08;
    }
    if (bpm >= 154 && stablePulse && bassShare >= 0.38 && level >= 0.22) {
      scores["hard-dance"] += 0.18;
      scores.techno -= 0.08;
      scores.trance -= 0.05;
    }

    const ranked = Object.entries(scores)
      .map(([styleId, score]) => ({ styleId, score: clamp(score, 0, 1) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1] || { score: 0 };
    const guide = STYLE_GUIDES[best.styleId] || STYLE_GUIDES.techno;
    const streamFactor = clamp(stream.sampleCount / 8, 0.55, 1);
    const scoreMargin = Math.max(0, best.score - second.score);
    const isCloseCall = scoreMargin < 0.09;
    const confidence = clamp((best.score * 0.66 + scoreMargin * 0.34) * streamFactor * (isCloseCall ? 0.84 : 1), 0, 0.96);
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

  function detectSubgenresFromSnapshot(snapshot = {}, state = {}) {
    const stream = aggregateStreamSnapshot(snapshot, state);
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
    const bassShare = clamp(Number(merged.bassShare || 0), 0, 1);
    const highShare = clamp(Number(merged.highShare || 0), 0, 1);
    const lowMid = Number(merged.lowMid || 0);
    const mid = Number(merged.mid || 0);
    const bass = Number(merged.bass || 0);
    const high = Number(merged.high || 0);
    const brightness = Number(merged.brightness || 0);
    const centroid = Number(merged.centroid || 0);
    const recentBassDeviation = Number(merged.recentBassDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.bass || 0)) : 0.08));
    const recentLevelDeviation = Number(merged.recentLevelDeviation || (recent.length > 4 ? standardDeviation(recent.map(item => item.level || 0)) : 0.05));
    const brokenPulse = !stablePulse || recentBassDeviation > 0.065;
    const spareArrangement = bassShare < 0.36 && highShare < 0.26 && level < 0.28;
    const brightTexture = highShare > 0.3 || brightness > 1.15 || centroid > 4300;
    const parentBoost = parent => style.styleId === parent ? 0.14 : 0;

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
        + clamp((0.05 - recentLevelDeviation) / 0.05, 0, 1) * 0.12,
      "dub-techno":
        parentBoost("techno")
        + rangeScore(bpm, 116, 130, 12) * 0.12
        + (stablePulse ? 0.14 : 0)
        + clamp((0.24 - highShare) / 0.2, 0, 1) * 0.14
        + clamp((lowMid + mid) / 0.46, 0, 1) * 0.14
        + (spareArrangement ? 0.1 : 0),
      "raw-techno":
        parentBoost("techno")
        + rangeScore(bpm, 128, 145, 16) * 0.14
        + clamp((bassShare - 0.34) / 0.3, 0, 1) * 0.16
        + clamp((brightness - 0.7) / 1.2, 0, 1) * 0.1
        + clamp((level - 0.18) / 0.22, 0, 1) * 0.12,
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
        + clamp((brightness - 0.75) / 1.4, 0, 1) * 0.12,
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
        + clamp((0.36 - highShare) / 0.24, 0, 1) * 0.08,
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
        + (brokenPulse ? 0.1 : 0.03),
      "deep-dubstep":
        parentBoost("bass")
        + Math.max(rangeScore(bpm, 68, 75, 8), rangeScore(bpm, 136, 148, 16)) * 0.14
        + clamp((bassShare - 0.38) / 0.3, 0, 1) * 0.18
        + clamp((0.22 - highShare) / 0.2, 0, 1) * 0.14
        + (spareArrangement ? 0.12 : 0),
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
        + (spareArrangement ? 0.1 : 0),
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
        + clamp((mid + high) / 0.58, 0, 1) * 0.12,
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
        + (level > 0.08 && !stablePulse ? 0.08 : 0),
      "experimental-live":
        parentBoost("industrial")
        + parentBoost("downtempo") * 0.5
        + (brokenPulse ? 0.12 : 0)
        + clamp(recentLevelDeviation / 0.11, 0, 1) * 0.16
        + clamp((centroid - 3600) / 5200, 0, 1) * 0.12
        + (level > 0.1 && !bpm ? 0.16 : 0.04),
    };

    const candidates = Object.entries(scores)
      .map(([id, score]) => {
        const guide = SUBGENRE_GUIDES[id];
        const confidence = clamp(Number(score || 0), 0, 0.96);
        const reason = brightTexture && /acid|industrial|ebm|trance/.test(id)
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

  function createCoachState(options = {}) {
    return {
      snapshots: [],
      pulseTimes: [],
      lastPulseActive: false,
      lastCommentAt: 0,
      lastSignature: "",
      defaultIndex: 0,
      startedAt: Number(options.now || 0),
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

  function createBrowserCoach(options = {}) {
    let audioContext = null;
    let analyser = null;
    let source = null;
    let stream = null;
    let frequencyData = null;
    let timeDomainData = null;
    let frameId = null;
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

    function loop() {
      if (!running || !analyser || !audioContext) return;
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeDomainData);
      const snapshot = analyzeAudioSnapshot({
        frequencyData,
        timeDomainData,
        sampleRate: audioContext.sampleRate,
        fftSize: analyser.fftSize,
      });
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
      state = createCoachState({ now: frameNow() });
      running = true;
      loop();
      return true;
    }

    function stop() {
      running = false;
      if (frameId && root.cancelAnimationFrame) root.cancelAnimationFrame(frameId);
      if (frameId && !root.cancelAnimationFrame) clearTimeout(frameId);
      frameId = null;
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
    };
  }

  return {
    analyzeAudioSnapshot,
    aggregateStreamSnapshot,
    createBrowserCoach,
    createCoachState,
    nextCoachComment,
    detectStyleFromSnapshot,
    detectGenreMixFromSnapshot,
    detectSubgenresFromSnapshot,
    subgenreGuides,
    styleGuides,
    styleLessonForSnapshot,
  };
});
