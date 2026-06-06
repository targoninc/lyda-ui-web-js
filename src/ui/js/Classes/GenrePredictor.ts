import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {Config} from "./Config.ts";

const DISCOGS519_LABELS_FILE = "genre_discogs519-labels.json";

export interface GenrePrediction {
    genre: Genre;
    confidence: number;
    display: string;
}

let worker: Worker | null = null;
let ready = false;
let initPromise: Promise<boolean> | null = null;

function getWorker(): Worker {
    if (worker) return worker;

    worker = new Worker(
        new URL("./js/Classes/GenrePredictionWorker.js", import.meta.url),
    );

    worker.onerror = (e) => console.error("Genre prediction worker error:", e);

    return worker;
}

async function ensureReady(): Promise<boolean> {
    if (ready) return true;
    if (initPromise) return initPromise;

    initPromise = new Promise<boolean>((resolve) => {
        const w = getWorker();
        const modelUrl = `${Config.apiBaseUrl}/models/genre-discogs519/model.9b2e8494.json`;
        const labelsUrl = `${Config.apiBaseUrl}/models/genre-discogs519/${DISCOGS519_LABELS_FILE}`;

        const prevHandler = w.onmessage;
        w.onmessage = (e: MessageEvent) => {
            if (e.data.type === "ready") {
                ready = true;
                w.onmessage = prevHandler;
                resolve(true);
            } else if (e.data.type === "error") {
                console.error("Genre worker init failed:", e.data.error);
                w.onmessage = prevHandler;
                initPromise = null;
                resolve(false);
            }
        };

        w.postMessage({type: "init", modelUrl, labelsUrl});
    });

    return initPromise;
}

export async function predictGenresFromFile(audioFile: File): Promise<GenrePrediction[]> {
    const loaded = await ensureReady();
    if (!loaded) return [];

    return new Promise<GenrePrediction[]>((resolve) => {
        const audioContext = new AudioContext({sampleRate: 16000});

        audioFile.arrayBuffer().then((arrayBuffer) => {
            audioContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
                audioContext.close();

                const channelData = audioBuffer.getChannelData(0);
                const w = getWorker();

                const prevHandler = w.onmessage;
                w.onmessage = (e: MessageEvent) => {
                    w.onmessage = prevHandler;
                    if (e.data.type === "predictions") {
                        resolve(e.data.predictions.map((p: any) => ({
                            genre: p.genre as Genre,
                            confidence: p.confidence,
                            display: p.display,
                        })));
                    } else {
                        resolve([]);
                    }
                };

                const audioData = channelData.buffer.slice(0);
                w.postMessage({
                    type: "predict",
                    audioData,
                    sampleRate: audioBuffer.sampleRate,
                }, [audioData]);
            }).catch(() => { audioContext.close(); resolve([]); });
        }).catch(() => resolve([]));
    });
}

export function isGenrePredictionAvailable(): boolean {
    return ready;
}

export async function preloadGenreModel(): Promise<void> {
    await ensureReady();
}
