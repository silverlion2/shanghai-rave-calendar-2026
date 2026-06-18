(function attachSoundBuddyDiscogsRuntime(root) {
  if (!root) return;

  const currentScript = root.document?.currentScript;
  const runtimeBaseUrl = currentScript?.src
    ? new URL(".", currentScript.src).href
    : new URL("assets/sound-buddy-models/discogs-effnet/", root.location?.href || "http://localhost/").href;

  function createDiscogsModelRuntime(options = {}) {
    const rootScope = options.root || root;
    const baseUrl = options.baseUrl || runtimeBaseUrl;
    let worker = null;
    let workletNode = null;
    let muteGain = null;
    let sourceNode = null;
    let callbacks = {};

    function postStatus(sourceId, status, detail) {
      if (typeof callbacks.onStatus === "function") {
        callbacks.onStatus(sourceId, status, detail);
      }
    }

    function stop() {
      if (workletNode) {
        try {
          workletNode.port.onmessage = null;
          workletNode.disconnect();
        } catch (error) {
          // The audio graph may already be torn down.
        }
      }
      if (muteGain) {
        try {
          muteGain.disconnect();
        } catch (error) {
          // The audio context may already be closed.
        }
      }
      if (worker) {
        try {
          worker.postMessage({ type: "shutdown" });
          worker.terminate();
        } catch (error) {
          // Worker shutdown is best effort during page teardown.
        }
      }
      worker = null;
      workletNode = null;
      muteGain = null;
      sourceNode = null;
      callbacks = {};
    }

    async function start(config = {}) {
      callbacks = config;
      const audioContext = config.audioContext;
      sourceNode = config.source;
      const model = config.model || options.model || {};

      if (!audioContext?.audioWorklet?.addModule || !rootScope.AudioWorkletNode) {
        postStatus("discogs-effnet", "fallback", "AudioWorklet is unavailable in this browser.");
        throw new Error("AudioWorklet is unavailable.");
      }
      if (!rootScope.Worker) {
        postStatus("discogs-effnet", "fallback", "Module workers are unavailable in this browser.");
        throw new Error("Worker is unavailable.");
      }
      if (!sourceNode) {
        postStatus("discogs-effnet", "standby", "Waiting for the microphone source.");
        throw new Error("Audio source is unavailable.");
      }

      const workletUrl = new URL(options.workletUrl || "feature-worklet.js", baseUrl).href;
      const workerUrl = new URL(options.workerUrl || "inference-worker.js", baseUrl).href;
      const pageBase = rootScope.document?.baseURI || rootScope.location?.href || baseUrl;
      const modelUrl = new URL(options.modelUrl || model.modelUrl || "model-tfjs/model.json", pageBase).href;
      const labelsUrl = new URL(options.labelsUrl || model.labelsUrl || "labels.json", pageBase).href;

      await audioContext.audioWorklet.addModule(workletUrl);
      worker = new rootScope.Worker(workerUrl, {
        name: "sound-buddy-discogs-inference",
      });

      worker.onmessage = event => {
        const data = event.data || {};
        if (data.type === "status") {
          postStatus(data.sourceId || "discogs-effnet", data.status || "standby", data.detail || "");
          return;
        }
        if (data.type === "predictions" && typeof callbacks.onPredictions === "function") {
          callbacks.onPredictions(data.predictions || [], data.labels || []);
          return;
        }
        if (data.type === "tags" && typeof callbacks.onTags === "function") {
          callbacks.onTags(data.tags || []);
        }
      };
      worker.onerror = () => {
        postStatus("discogs-effnet", "fallback", "Discogs400 inference worker failed.");
      };

      worker.postMessage({
        type: "configure",
        modelUrl,
        labelsUrl,
        topN: options.topN || model.topN || 8,
        minProbability: Number.isFinite(Number(options.minProbability))
          ? Number(options.minProbability)
          : 0.05,
      });

      workletNode = new rootScope.AudioWorkletNode(audioContext, "sound-buddy-discogs-feature-extractor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      workletNode.port.onmessage = event => {
        const data = event.data || {};
        if (data.type === "features" && worker) {
          worker.postMessage({ type: "features", features: data.features });
          return;
        }
        if (data.type === "status") {
          postStatus("discogs-effnet", data.status || "standby", data.detail || "");
        }
      };

      muteGain = audioContext.createGain();
      muteGain.gain.value = 0;
      sourceNode.connect(workletNode);
      workletNode.connect(muteGain);
      muteGain.connect(audioContext.destination);
      postStatus("discogs-effnet", "available", "Discogs400 feature extractor is attached.");
      return true;
    }

    return { start, stop };
  }

  root.SoundBuddyDiscogsRuntime = {
    createDiscogsModelRuntime,
  };
})(typeof window !== "undefined" ? window : globalThis);
