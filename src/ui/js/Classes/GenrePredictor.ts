import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";

let tf: any = null;
let essentiaInstance: any = null;
let featureExtractor: any = null;
let genreModel: any = null;
let labels: string[] = [];

const DISCOGS519_LABELS_URL = "https://essentia.upf.edu/models/genre-classifiers/genre_discogs519-discogs-maest-30s-pw-519l-1.json";
const DISCOGS519_MODEL_URL = "https://essentia.upf.edu/models/genre-classifiers/genre_discogs519-discogs-maest-30s-pw-519l-1.pb";

export interface GenrePrediction {
    genre: Genre;
    confidence: number;
    display: string;
}

async function loadDependencies(): Promise<boolean> {
    if (tf && essentiaInstance && featureExtractor && genreModel) {
        return true;
    }

    try {
        tf = await import("@tensorflow/tfjs");
        await tf.ready();

        const essentia = await import("essentia.js");
        essentiaInstance = new essentia.Essentia(essentia.EssentiaWASM);
        featureExtractor = new essentia.EssentiaTFInputExtractor(tf, "musicnn", false);
        genreModel = new essentia.TensorflowMusiCNN(tf, DISCOGS519_MODEL_URL);
        await genreModel.load();

        if (labels.length === 0) {
            const response = await fetch(DISCOGS519_LABELS_URL);
            labels = await response.json();
        }

        return true;
    } catch (e) {
        console.error("Failed to load genre prediction dependencies:", e);
        return false;
    }
}

export async function predictGenresFromFile(audioFile: File): Promise<GenrePrediction[]> {
    const loaded = await loadDependencies();
    if (!loaded) {
        return [];
    }

    try {
        const audioContext = new AudioContext();
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const audioVector = essentiaInstance.arrayToVector(channelData);

        const input = featureExtractor.computeFrameFeatures(audioVector, 0, 1024);
        const prediction = await genreModel.predict(input);

        const results: GenrePrediction[] = [];

        for (let i = 0; i < prediction.length; i++) {
            if (prediction[i] > 0.1) {
                const label = labels[i] || `genre_${i}`;
                const genreKey = label.replace(/[^a-z0-9-]/gi, "").toLowerCase() as Genre;

                if (Object.values(Genre).includes(genreKey)) {
                    const display = label
                        .split("---")
                        .pop()
                        ?.replace(/-/g, " ")
                        .replace(/\b\w/g, l => l.toUpperCase()) ?? label;

                    results.push({
                        genre: genreKey,
                        confidence: Math.round(prediction[i] * 1000) / 1000,
                        display,
                    });
                }
            }
        }

        audioVector.delete();
        return results.sort((a, b) => b.confidence - a.confidence);
    } catch (e) {
        console.error("Genre prediction failed:", e);
        return [];
    }
}

export function isGenrePredictionAvailable(): boolean {
    return tf !== null && essentiaInstance !== null && genreModel !== null;
}

export async function preloadGenreModel(): Promise<void> {
    await loadDependencies();
}
