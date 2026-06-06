importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");

const FRAME_SIZE = 512;
const HOP_SIZE = 256;
const PATCH_SIZE = 128;
const TOP_K = 5;

let essentiaExtractor: any = null;
let genreModel: any = null;
let labels: string[] = [];

self.onmessage = async function(e: MessageEvent) {
    const msg = e.data;

    if (msg.type === "init") {
        try {
            const wasmModule = await import("https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.es.js");
            const modelModule = await import("https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-model.es.js");

            const EssentiaWASM = wasmModule.EssentiaWASM || wasmModule.default;
            const essentia = new EssentiaWASM.EssentiaJS(false);
            essentiaExtractor = new modelModule.EssentiaTFInputExtractor(EssentiaWASM, "musicnn");

            genreModel = await tf.loadGraphModel(msg.modelUrl);

            const response = await fetch(msg.labelsUrl);
            const result = await response.json();
            labels = (result.classes || result).map((label: string) =>
                label.toLowerCase().replace(/ /g, "-")
            );

            self.postMessage({type: "ready"});
        } catch (err) {
            self.postMessage({type: "error", error: String(err)});
        }
    }

    if (msg.type === "predict") {
        try {
            const audio = new Float32Array(msg.audioData);

            const totalFrames = Math.floor((audio.length - FRAME_SIZE) / HOP_SIZE) + 1;

            const frameBuffer = new Float32Array(FRAME_SIZE);
            const melSpec: number[][] = [];

            if (totalFrames <= PATCH_SIZE) {
                for (let f = 0; f < totalFrames; f++) {
                    frameBuffer.set(audio.subarray(f * HOP_SIZE, f * HOP_SIZE + FRAME_SIZE));
                    const feature = essentiaExtractor.compute(frameBuffer);
                    melSpec.push(feature.melSpectrum);
                }
            } else {
                const step = totalFrames / PATCH_SIZE;
                for (let i = 0; i < PATCH_SIZE; i++) {
                    const f = Math.floor(i * step);
                    frameBuffer.set(audio.subarray(f * HOP_SIZE, f * HOP_SIZE + FRAME_SIZE));
                    const feature = essentiaExtractor.compute(frameBuffer);
                    melSpec.push(feature.melSpectrum);
                }
            }

            while (melSpec.length < PATCH_SIZE) {
                melSpec.push(new Array(96).fill(0));
            }

            const input = tf.tensor3d([melSpec]);
            const results = genreModel.execute([input]);
            const predData = await (Array.isArray(results) ? results[0] : results).data();

            input.dispose();
            if (Array.isArray(results)) {
                results.forEach((r: any) => r.dispose());
            } else {
                results.dispose();
            }

            const scored = Array.from(predData).map((score, i) => ({
                label: labels[i] || `genre_${i}`,
                score,
            }));

            scored.sort((a, b) => b.score - a.score);
            const topK = scored.slice(0, TOP_K);

            const maxScore = Math.max(...topK.map(t => t.score));
            const minScore = Math.min(...topK.map(t => t.score));
            const range = maxScore - minScore || 1;

            const predictions = topK.map(t => {
                const subgenre = t.label.split("---").pop() || t.label;
                return {
                    genre: t.label,
                    confidence: Math.round(((t.score - minScore) / range) * 1000) / 1000,
                    display: subgenre.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                };
            });

            self.postMessage({type: "predictions", predictions});
        } catch (err) {
            self.postMessage({type: "error", error: String(err)});
        }
    }
};
