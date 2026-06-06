import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {Config} from "./Config.ts";

const DISCOGS400_LABELS_FILE = "genre_discogs400-labels.json";
const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 6);

export interface GenrePrediction {
    genre: Genre;
    confidence: number;
    display: string;
}

interface PoolWorker {
    worker: Worker;
    ready: boolean;
}

let pool: PoolWorker[] = [];
let poolInitPromise: Promise<boolean> | null = null;

function createWorker(): Worker {
    const w = new Worker(
        new URL("./js/Classes/GenrePredictionWorker.js", import.meta.url),
    );
    w.onerror = (e) => console.error("Genre prediction worker error:", e);
    return w;
}

async function initWorker(pw: PoolWorker, modelUrl: string, labelsUrl: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        pw.worker.onmessage = (e: MessageEvent) => {
            if (e.data.type === "ready") {
                pw.ready = true;
                resolve(true);
            } else if (e.data.type === "error") {
                console.error("Genre worker init failed:", e.data.error);
                resolve(false);
            }
        };
        pw.worker.postMessage({type: "init", modelUrl, labelsUrl});
    });
}

async function ensurePoolReady(): Promise<boolean> {
    if (pool.length > 0 && pool.every(pw => pw.ready)) return true;
    if (poolInitPromise) return poolInitPromise;

    poolInitPromise = (async () => {
        const modelUrl = `${Config.apiBaseUrl}/models/genre-discogs519/model.9b2e8494.json`;
        const labelsUrl = `${Config.apiBaseUrl}/models/genre-discogs519/${DISCOGS400_LABELS_FILE}`;

        console.log(`[GenrePredictor] Creating ${MAX_WORKERS} workers...`);
        pool = Array.from({length: MAX_WORKERS}, () => ({
            worker: createWorker(),
            ready: false,
        }));

        const results = await Promise.all(
            pool.map(pw => initWorker(pw, modelUrl, labelsUrl))
        );

        const allReady = results.every(r => r);
        console.log(`[GenrePredictor] Pool ready: ${pool.filter(pw => pw.ready).length}/${MAX_WORKERS} workers`);
        return allReady;
    })();

    return poolInitPromise;
}

function predictOnWorker(pw: PoolWorker, audioData: ArrayBuffer): Promise<any[]> {
    return new Promise<any[]>((resolve) => {
        const prevHandler = pw.worker.onmessage;
        pw.worker.onmessage = (e: MessageEvent) => {
            pw.worker.onmessage = prevHandler;
            if (e.data.type === "predictions") {
                resolve(e.data.predictions);
            } else {
                resolve([]);
            }
        };
        pw.worker.postMessage({type: "predict", audioData}, [audioData]);
    });
}

function splitAudioIntoChunks(audio: Float32Array, numChunks: number): Float32Array[] {
    const TRIM_RATIO = 0.1;
    const trimSamples = Math.floor(audio.length * TRIM_RATIO);
    const trimmed = audio.subarray(trimSamples, audio.length - trimSamples);

    const chunkSize = Math.ceil(trimmed.length / numChunks);
    const chunks: Float32Array[] = [];

    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, trimmed.length);
        if (start < trimmed.length) {
            chunks.push(trimmed.slice(start, end));
        }
    }

    return chunks;
}

function aggregatePredictions(allPredictions: any[][]): any[] {
    const labelScores = new Map<string, { totalScore: number; count: number }>();

    for (const preds of allPredictions) {
        for (const pred of preds) {
            const existing = labelScores.get(pred.genre);
            if (existing) {
                existing.totalScore += pred.confidence;
                existing.count++;
            } else {
                labelScores.set(pred.genre, {totalScore: pred.confidence, count: 1});
            }
        }
    }

    const scored = Array.from(labelScores.entries()).map(([genre, {totalScore, count}]) => ({
        genre,
        score: totalScore / count,
        display: genre.split("---").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || genre,
    }));

    scored.sort((a, b) => b.score - a.score);

    const topK = scored.slice(0, 5);
    const maxScore = Math.max(...topK.map(t => t.score));
    const minScore = Math.min(...topK.map(t => t.score));
    const range = maxScore - minScore || 1;

    return topK.map(t => ({
        genre: t.genre,
        confidence: Math.round(((t.score - minScore) / range) * 1000) / 1000,
        display: t.display,
    }));
}

export async function predictGenresFromFile(audioFile: File): Promise<GenrePrediction[]> {
    const loaded = await ensurePoolReady();
    if (!loaded) return [];

    return new Promise<GenrePrediction[]>((resolve) => {
        const audioContext = new AudioContext({sampleRate: 16000});

        audioFile.arrayBuffer().then((arrayBuffer) => {
            audioContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
                audioContext.close();

                const numChannels = audioBuffer.numberOfChannels;
                let monoData: Float32Array;
                if (numChannels === 1) {
                    monoData = audioBuffer.getChannelData(0);
                } else {
                    const left = audioBuffer.getChannelData(0);
                    const right = audioBuffer.getChannelData(1);
                    monoData = new Float32Array(left.length);
                    for (let i = 0; i < monoData.length; i++) {
                        monoData[i] = (left[i] + right[i]) * 0.5;
                    }
                }

                const numWorkers = pool.filter(pw => pw.ready).length;
                const chunks = splitAudioIntoChunks(monoData, numWorkers);
                console.log(`[GenrePredictor] Split audio into ${chunks.length} chunks for ${numWorkers} workers`);

                const startTime = Date.now();
                const promises = chunks.map((chunk, i) => {
                    const pw = pool[i];
                    const audioData = chunk.buffer.slice(0);
                    return predictOnWorker(pw, audioData);
                });

                Promise.all(promises).then((allPredictions) => {
                    const merged = aggregatePredictions(allPredictions);
                    console.log(`[GenrePredictor] Parallel analysis done in ${Date.now() - startTime}ms (${chunks.length} chunks)`);
                    resolve(merged);
                }).catch(() => resolve([]));
            }).catch(() => { audioContext.close(); resolve([]); });
        }).catch(() => resolve([]));
    });
}

export function isGenrePredictionAvailable(): boolean {
    return pool.length > 0 && pool.every(pw => pw.ready);
}

export async function preloadGenreModel(): Promise<void> {
    await ensurePoolReady();
}
