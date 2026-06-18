import { EssentiaWASM } from "./vendor/essentia-wasm.es.js";
import * as EssentiaModel from "./vendor/essentia.js-model.es.js";

function zeroMatrix(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

class SoundBuddyDiscogsFeatureExtractor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 512;
    this.hopSize = 256;
    this.patchSize = 128;
    this.melBandsSize = 96;
    this.patchHopFrames = 64;
    this.samples = [];
    this.previousHop = new Float32Array(this.hopSize);
    this.frameCount = 0;
    this.features = {
      melSpectrum: zeroMatrix(this.patchSize, this.melBandsSize),
      frameSize: this.patchSize,
      melBandsSize: this.melBandsSize,
      patchSize: this.patchSize,
    };

    try {
      this.extractor = new EssentiaModel.EssentiaTFInputExtractor(EssentiaWASM, "musicnn");
      this.port.postMessage({ type: "status", status: "available", detail: "Discogs400 feature worklet is ready." });
    } catch (error) {
      this.extractor = null;
      this.port.postMessage({ type: "status", status: "fallback", detail: "Discogs400 feature extractor failed." });
    }
  }

  process(inputs, outputs) {
    const output = outputs[0] || [];
    for (const channel of output) {
      channel.fill(0);
    }

    const input = inputs[0]?.[0];
    if (!input || !this.extractor) return true;

    for (let index = 0; index < input.length; index += 1) {
      this.samples.push(input[index]);
    }

    while (this.samples.length >= this.hopSize) {
      const hop = this.samples.splice(0, this.hopSize);
      const frame = new Float32Array(this.frameSize);
      frame.set(this.previousHop, 0);
      frame.set(hop, this.hopSize);
      this.previousHop.set(hop);

      const computed = this.extractor.compute(frame);
      const melSpectrum = Array.from(computed?.melSpectrum || []);
      if (!melSpectrum.length) continue;

      this.features.melSpectrum.push(melSpectrum);
      while (this.features.melSpectrum.length > this.patchSize) {
        this.features.melSpectrum.shift();
      }

      this.frameCount += 1;
      if (this.frameCount % this.patchHopFrames === 0) {
        this.port.postMessage({
          type: "features",
          features: {
            melSpectrum: this.features.melSpectrum.map(row => row.slice()),
            frameSize: this.patchSize,
            melBandsSize: this.melBandsSize,
            patchSize: this.patchSize,
          },
        });
      }
    }

    return true;
  }
}

registerProcessor("sound-buddy-discogs-feature-extractor", SoundBuddyDiscogsFeatureExtractor);
