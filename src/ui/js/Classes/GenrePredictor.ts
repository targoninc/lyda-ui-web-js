import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {Config} from "./Config.ts";

let tf: any = null;
let genreModel: any = null;
let labels: string[] = [];
let loadingPromise: Promise<boolean> | null = null;

const DISCOGS519_LABELS_FILE = "genre_discogs519-labels.json";
const TFJS_CDN_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 512;
const FFT_SIZE = 512;
const HOP_SIZE = 256;
const NUM_MEL_BANDS = 96;
const PATCH_SIZE = 128;
const MEL_LOW_HZ = 0;
const MEL_HIGH_HZ = 8000;

export interface GenrePrediction {
    genre: Genre;
    confidence: number;
    display: string;
}

function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = url;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

function hzToMel(hz: number): number {
    const minLogHz = 1000.0;
    const linSlope = 3.0 / 200.0;
    if (hz < minLogHz) {
        return hz * linSlope;
    }
    const minLogMel = minLogHz * linSlope;
    const logStep = Math.log(6.4) / 27.0;
    return minLogMel + Math.log(hz / minLogHz) / logStep;
}

function melToHz(mel: number): number {
    const minLogHz = 1000.0;
    const linSlope = 3.0 / 200.0;
    const minLogMel = minLogHz * linSlope;
    if (mel < minLogMel) {
        return mel / linSlope;
    }
    const logStep = Math.log(6.4) / 27.0;
    return minLogHz * Math.exp((mel - minLogMel) * logStep);
}

function createMelFilterbank(): Float32Array[] {
    const melLow = hzToMel(MEL_LOW_HZ);
    const melHigh = hzToMel(MEL_HIGH_HZ);
    const melPoints = new Float64Array(NUM_MEL_BANDS + 2);
    for (let i = 0; i < NUM_MEL_BANDS + 2; i++) {
        melPoints[i] = melToHz(melLow + (melHigh - melLow) * i / (NUM_MEL_BANDS + 1));
    }

    const fftBins = new Int32Array(NUM_MEL_BANDS + 2);
    for (let i = 0; i < NUM_MEL_BANDS + 2; i++) {
        fftBins[i] = Math.floor((FFT_SIZE + 1) * melPoints[i] / SAMPLE_RATE);
    }

    const filterbank: Float32Array[] = [];
    for (let m = 0; m < NUM_MEL_BANDS; m++) {
        const filter = new Float32Array(FFT_SIZE / 2 + 1);
        for (let k = fftBins[m]; k < fftBins[m + 1]; k++) {
            if (k < filter.length) {
                filter[k] = (k - fftBins[m]) / (fftBins[m + 1] - fftBins[m]);
            }
        }
        for (let k = fftBins[m + 1]; k < fftBins[m + 2]; k++) {
            if (k < filter.length) {
                filter[k] = (fftBins[m + 2] - k) / (fftBins[m + 2] - fftBins[m + 1]);
            }
        }
        filterbank.push(filter);
    }
    return filterbank;
}

let melFilterbank: Float32Array[] | null = null;

function getMelFilterbank(): Float32Array[] {
    if (!melFilterbank) {
        melFilterbank = createMelFilterbank();
    }
    return melFilterbank;
}

function computeMelSpectrogram(audio: Float32Array): number[][] {
    const fb = getMelFilterbank();
    const numFrames = Math.floor((audio.length - FRAME_SIZE) / HOP_SIZE) + 1;
    const hannWindow = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
        hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FRAME_SIZE - 1)));
    }

    const result: number[][] = [];
    for (let f = 0; f < numFrames; f++) {
        const offset = f * HOP_SIZE;
        const frame = new Float32Array(FRAME_SIZE);
        for (let i = 0; i < FRAME_SIZE; i++) {
            frame[i] = audio[offset + i] * hannWindow[i];
        }

        const real = new Float64Array(FFT_SIZE);
        const imag = new Float64Array(FFT_SIZE);
        for (let i = 0; i < FRAME_SIZE; i++) {
            real[i] = frame[i];
        }

        fftInPlace(real, imag);

        const powerSpectrum = new Float32Array(FFT_SIZE / 2 + 1);
        for (let i = 0; i <= FFT_SIZE / 2; i++) {
            powerSpectrum[i] = real[i] * real[i] + imag[i] * imag[i];
        }

        const melSpec = new Array(NUM_MEL_BANDS);
        for (let m = 0; m < NUM_MEL_BANDS; m++) {
            let sum = 0;
            for (let k = 0; k <= FFT_SIZE / 2; k++) {
                sum += powerSpectrum[k] * fb[m][k];
            }
            melSpec[m] = Math.log10(10000.0 * sum + 1.0);
        }
        result.push(melSpec);
    }
    return result;
}

function fftInPlace(real: Float64Array, imag: Float64Array): void {
    const n = real.length;
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
        let k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    for (let len = 2; len <= n; len <<= 1) {
        const halfLen = len >> 1;
        const angle = -2 * Math.PI / len;
        const wReal = Math.cos(angle);
        const wImag = Math.sin(angle);

        for (let i = 0; i < n; i += len) {
            let curReal = 1;
            let curImag = 0;

            for (let jj = 0; jj < halfLen; jj++) {
                const tReal = curReal * real[i + jj + halfLen] - curImag * imag[i + jj + halfLen];
                const tImag = curReal * imag[i + jj + halfLen] + curImag * real[i + jj + halfLen];

                real[i + jj + halfLen] = real[i + jj] - tReal;
                imag[i + jj + halfLen] = imag[i + jj] - tImag;
                real[i + jj] += tReal;
                imag[i + jj] += tImag;

                const newReal = curReal * wReal - curImag * wImag;
                curImag = curReal * wImag + curImag * wReal;
                curReal = newReal;
            }
        }
    }
}

function prepareModelInput(melSpectrogram: number[][]): any {
    let frames = melSpectrogram;
    if (frames.length < PATCH_SIZE) {
        while (frames.length < PATCH_SIZE) {
            frames.push(new Array(NUM_MEL_BANDS).fill(0));
        }
    } else if (frames.length > PATCH_SIZE) {
        const step = Math.floor(frames.length / PATCH_SIZE);
        const selected: number[][] = [];
        for (let i = 0; i < PATCH_SIZE; i++) {
            selected.push(frames[i * step]);
        }
        frames = selected;
    }

    return tf.tensor3d([frames]);
}

async function loadDependencies(): Promise<boolean> {
    if (tf && genreModel) {
        return true;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = doLoadDependencies();
    const result = await loadingPromise;
    if (!result) {
        loadingPromise = null;
    }
    return result;
}

async function doLoadDependencies(): Promise<boolean> {
    try {
        await loadScript(TFJS_CDN_URL);
        tf = (window as any).tf;

        if (!tf) {
            console.error("TF.js not available");
            return false;
        }

        const modelUrl = `${Config.apiBaseUrl}/models/genre-discogs519/model.9b2e8494.json`;
        genreModel = await tf.loadGraphModel(modelUrl);

        if (labels.length === 0) {
            const labelsUrl = `${Config.apiBaseUrl}/models/genre-discogs519/${DISCOGS519_LABELS_FILE}`;
            const response = await fetch(labelsUrl);
            const data = await response.json();
            labels = (data.classes || data).map((label: string) =>
                label.toLowerCase().replace(/ /g, "-")
            );
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
        const audioContext = new AudioContext({sampleRate: SAMPLE_RATE});
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let channelData = audioBuffer.getChannelData(0);
        if (audioBuffer.sampleRate !== SAMPLE_RATE) {
            const ratio = audioBuffer.sampleRate / SAMPLE_RATE;
            const newLength = Math.floor(channelData.length / ratio);
            channelData = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
                channelData[i] = audioBuffer.getChannelData(0)[Math.floor(i * ratio)];
            }
        }

        const melSpec = computeMelSpectrogram(channelData);
        const input = prepareModelInput(melSpec);
        const prediction = genreModel.predict(input);
        const data = await prediction.data();

        const results: GenrePrediction[] = [];

        for (let i = 0; i < data.length; i++) {
            if (data[i] > 0.1) {
                const label = labels[i] || `genre_${i}`;
                const display = label
                    .split("---")
                    .pop()
                    ?.replace(/-/g, " ")
                    .replace(/\b\w/g, l => l.toUpperCase()) ?? label;

                results.push({
                    genre: label as Genre,
                    confidence: Math.round(data[i] * 1000) / 1000,
                    display,
                });
            }
        }

        input.dispose();
        prediction.dispose();
        return results.sort((a, b) => b.confidence - a.confidence);
    } catch (e) {
        console.error("Genre prediction failed:", e);
        return [];
    }
}

export function isGenrePredictionAvailable(): boolean {
    return tf !== null && genreModel !== null;
}

export async function preloadGenreModel(): Promise<void> {
    await loadDependencies();
}
