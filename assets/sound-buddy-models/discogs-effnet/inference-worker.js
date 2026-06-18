/* global tf, EssentiaModel */
importScripts("./vendor/tf.min.js", "./vendor/essentia.js-model.js");

let model = null;
let modelReady = false;
let labels = [];
let topN = 8;
let minProbability = 0.05;
let history = [];
const historyLimit = 3;

function postStatus(sourceId, status, detail) {
  self.postMessage({ type: "status", sourceId, status, detail });
}

function smoothPredictions(predictions) {
  const values = Array.from(predictions || []).map(value => Number(value) || 0);
  history.push(values);
  while (history.length > historyLimit) history.shift();
  return values.map((value, index) => {
    const sum = history.reduce((total, row) => total + (Number(row[index]) || 0), 0);
    return sum / history.length;
  });
}

function topTags(predictions) {
  return predictions
    .map((probability, index) => ({
      tag: labels[index] || `class-${index}`,
      probability,
      index,
      source: "discogs-effnet",
      modelId: "discogs-effnet-tfjs",
    }))
    .filter(item => Number.isFinite(item.probability) && item.probability >= minProbability)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topN);
}

async function warmUpModel() {
  if (!modelReady || !model) return;
  const zeroFeatures = {
    melSpectrum: Array.from({ length: 128 }, () => Array(96).fill(0)),
    melBandsSize: 96,
    patchSize: 128,
    frameSize: 128,
  };
  await model.predict(zeroFeatures);
}

async function configureRuntime(config = {}) {
  topN = Math.max(1, Math.min(32, Math.round(Number(config.topN || 8))));
  minProbability = Number.isFinite(Number(config.minProbability))
    ? Number(config.minProbability)
    : 0.05;
  postStatus("discogs-effnet", "loading", "Loading Discogs400 model weights.");

  try {
    const [labelResponse] = await Promise.all([
      fetch(config.labelsUrl),
      tf.ready(),
    ]);
    labels = await labelResponse.json();

    try {
      await tf.setBackend("webgl");
      await tf.ready();
    } catch (error) {
      await tf.ready();
    }

    model = new EssentiaModel.TensorflowMusiCNN(tf, config.modelUrl);
    await model.initialize();
    modelReady = true;
    postStatus("essentia-js", "available", "TensorFlow.js and Essentia model runtime are ready.");
    await warmUpModel();
    postStatus("discogs-effnet", "available", "Discogs400 model is ready for audio patches.");
  } catch (error) {
    postStatus("discogs-effnet", "fallback", "Discogs400 model failed to load.");
    postStatus("essentia-js", "standby", "Model runtime unavailable.");
  }
}

async function predict(features) {
  if (!modelReady || !model) return;
  try {
    const raw = await model.predict(features);
    const predictions = Array.isArray(raw?.[0]) ? raw[0] : raw;
    const smoothed = smoothPredictions(predictions);
    self.postMessage({ type: "predictions", predictions: smoothed, labels });
    self.postMessage({ type: "tags", tags: topTags(smoothed) });
  } catch (error) {
    postStatus("discogs-effnet", "fallback", "Discogs400 inference failed.");
  }
}

function shutdown() {
  try {
    if (model && typeof model.dispose === "function") model.dispose();
    if (model?.model && typeof model.model.dispose === "function") model.model.dispose();
  } catch (error) {
    // Disposal is best effort during worker shutdown.
  }
  model = null;
  modelReady = false;
  history = [];
  self.postMessage({ type: "shutdown" });
}

self.onmessage = event => {
  const data = event.data || {};
  if (data.type === "configure") {
    configureRuntime(data);
    return;
  }
  if (data.type === "features") {
    predict(data.features);
    return;
  }
  if (data.type === "shutdown") {
    shutdown();
  }
};
