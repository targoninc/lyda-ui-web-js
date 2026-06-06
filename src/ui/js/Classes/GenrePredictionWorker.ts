importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");

const PATCH_SIZE = 128;
const MEL_BANDS = 96;
const TOP_K = 5;
const INFERENCE_STRIDE = 64;

let essentiaExtractor: any = null;
let musiCNN: any = null;
let labels: string[] = [];

self.onmessage = async function(e: MessageEvent) {
    const msg = e.data;

    if (msg.type === "init") {
        try {
            console.log("[GenreWorker] Initializing...");
            const wasmModule = await import("https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.es.js");
            const modelModule = await import("https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-model.es.js");

            const EssentiaWASM = wasmModule.EssentiaWASM || wasmModule.default;
            essentiaExtractor = new modelModule.EssentiaTFInputExtractor(EssentiaWASM, "musicnn", false);
            console.log("[GenreWorker] Essentia WASM extractor ready");

            musiCNN = new modelModule.TensorflowMusiCNN(tf, msg.modelUrl);
            await musiCNN.initialize();
            console.log("[GenreWorker] TF.js model loaded from", msg.modelUrl);

            const response = await fetch(msg.labelsUrl);
            const result = await response.json();
            labels = (result.classes || result).map((label: string) =>
                label.toLowerCase().replace(/ /g, "-")
            );
            console.log(`[GenreWorker] Loaded ${labels.length} labels. First 5:`, labels.slice(0, 5));

            const zeroPatch: number[][] = [];
            for (let i = 0; i < PATCH_SIZE; i++) {
                zeroPatch.push(new Array(MEL_BANDS).fill(0));
            }
            await musiCNN.predict({
                melSpectrum: zeroPatch,
                frameSize: PATCH_SIZE,
                melBandsSize: MEL_BANDS,
                patchSize: PATCH_SIZE
            }, false);
            console.log("[GenreWorker] Model warm-up complete");

            self.postMessage({type: "ready"});
        } catch (err) {
            console.error("[GenreWorker] Init failed:", err);
            self.postMessage({type: "error", error: String(err)});
        }
    }

    if (msg.type === "predict") {
        const startTime = Date.now();
        try {
            const audio = new Float32Array(msg.audioData);
            console.log(`[GenreWorker] Received chunk: ${audio.length} samples (${(audio.length / 16000).toFixed(1)}s)`);

            const featStart = Date.now();
            const features = essentiaExtractor.computeFrameWise(audio, 256);
            const melFrames = features.melSpectrum;
            const totalFrames = melFrames.length;
            console.log(`[GenreWorker] Feature extraction: ${totalFrames} frames in ${Date.now() - featStart}ms`);

            const aggregated = new Float32Array(labels.length);
            let numInferences = 0;

            if (totalFrames <= PATCH_SIZE) {
                const paddedMel: number[][] = [];
                for (let i = 0; i < PATCH_SIZE; i++) {
                    if (i < totalFrames) {
                        paddedMel.push(Array.from(melFrames[i]));
                    } else {
                        paddedMel.push(new Array(MEL_BANDS).fill(0));
                    }
                }
                const predictions = await musiCNN.predict({
                    melSpectrum: paddedMel,
                    frameSize: PATCH_SIZE,
                    melBandsSize: MEL_BANDS,
                    patchSize: PATCH_SIZE
                }, false);

                const predData = predictions[0];
                for (let i = 0; i < aggregated.length && i < predData.length; i++) {
                    aggregated[i] = predData[i];
                }
                numInferences = 1;
            } else {
                for (let start = 0; start + PATCH_SIZE <= totalFrames; start += INFERENCE_STRIDE) {
                    const patch: number[][] = [];
                    for (let i = 0; i < PATCH_SIZE; i++) {
                        patch.push(Array.from(melFrames[start + i]));
                    }
                    const predictions = await musiCNN.predict({
                        melSpectrum: patch,
                        frameSize: PATCH_SIZE,
                        melBandsSize: MEL_BANDS,
                        patchSize: PATCH_SIZE
                    }, false);

                    const predData = predictions[0];
                    for (let i = 0; i < aggregated.length && i < predData.length; i++) {
                        aggregated[i] += predData[i];
                    }
                    numInferences++;
                }
            }

            console.log(`[GenreWorker] Ran ${numInferences} inferences`);

            if (numInferences === 0) {
                self.postMessage({type: "predictions", predictions: []});
                return;
            }

            for (let i = 0; i < aggregated.length; i++) {
                aggregated[i] /= numInferences;
            }

            const scored = Array.from(aggregated).map((score, i) => ({
                label: labels[i] || `genre_${i}`,
                score,
            }));

            scored.sort((a, b) => b.score - a.score);

            console.log("[GenreWorker] All scores (sorted descending):");
            scored.forEach((s, i) => {
                console.log(`  [${i}] ${s.label}: ${s.score.toFixed(4)}`);
            });

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

            console.log("[GenreWorker] Top predictions:");
            predictions.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.display} (${p.genre}) — confidence: ${p.confidence}`);
            });
            console.log(`[GenreWorker] Total time: ${Date.now() - startTime}ms`);

            self.postMessage({type: "predictions", predictions});
        } catch (err) {
            console.error("[GenreWorker] Predict failed:", err);
            self.postMessage({type: "error", error: String(err)});
        }
    }
};
