import { IStreamClient } from "./IStreamClient.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { currentQuality, currentTrackId, volume } from "../state.ts";
import { initializeClient } from "./InitializeClient.ts";

export class StreamClient implements IStreamClient {
    public duration = 0;
    public playing = false;

    private readonly id: number;
    private readonly code: string;

    private ctx?: AudioContext;
    private gain?: GainNode;
    private source?: AudioBufferSourceNode;
    private buffer?: AudioBuffer;

    private startCtxTime = 0;  // AudioContext.currentTime when playback started
    private offset = 0;        // seconds into the buffer where playback is/was
    private loadingPromise?: Promise<void>;

    private bytesReceived = 0;
    private totalBytes = 0;

    constructor(id: number, code: string) {
        this.id = id;
        this.code = code;
        initializeClient(this);
    }

    setLoop(looping: boolean): void {
        if (this.source) {
            this.source.loop = looping;
        }
    }

    public async startAsync(): Promise<void> {
        await this.ensureAudioContext();

        // If not loaded yet, start loading/decoding
        if (!this.buffer) {
            this.loadingPromise ??= this.loadAndDecode();
            await this.loadingPromise;
        }

        // If already playing, do nothing
        if (this.playing) {
            return;
        }

        // Start/resume from current offset
        this.startFromOffset(this.offset);
    }

    public stopAsync(): void {
        // Stop playback and reset offset
        if (this.source) {
            try {
                this.source.stop();
            } catch (e: any) {
                console.warn(e);
            }
            this.source.disconnect();
            this.source = undefined;
        }
        this.playing = false;
        this.offset = 0;
        this.startCtxTime = 0;
    }

    public async scrubTo(time: number, relative: boolean, togglePlay: boolean): Promise<void> {
        await this.ensureAudioContext();

        // Interpret `relative` as "time is a 0..1 fraction of duration"
        const targetSeconds = relative
            ? (this.duration > 0 ? time * this.duration : 0)
            : time;
        const target = this.clampTime(targetSeconds);

        const wasPlaying = this.playing;
        if (wasPlaying) {
            // Restart playback from new position
            this.stopSourceOnly();
        }

        this.offset = target;

        if (togglePlay) {
            if (wasPlaying) {
                // toggled to pause (stay stopped)
                this.playing = false;
                return;
            } else {
                // toggled to play
                if (!this.buffer) {
                    this.loadingPromise ??= this.loadAndDecode();
                    await this.loadingPromise;
                }
                this.startFromOffset(this.offset);
                return;
            }
        }

        // If we were playing before, continue playing from new offset
        if (wasPlaying) {
            if (!this.buffer) {
                this.loadingPromise ??= this.loadAndDecode();
                await this.loadingPromise;
            }
            this.startFromOffset(this.offset);
        }
    }

    public getCurrentTime(relative: boolean): number {
        if (!this.ctx) {
            return relative ? 0 : 0;
        }

        const baseOffset = this.playing
            ? this.clampTime(this.offset + (this.ctx.currentTime - this.startCtxTime))
            : this.offset;

        if (relative) {
            if (this.duration <= 0) {
                return 0;
            }

            return Math.max(0, Math.min(1, baseOffset / this.duration));
        }

        return this.duration > 0 ? Math.min(baseOffset, this.duration) : baseOffset;
    }

    public getVolume(): number {
        return Math.sqrt(this.gain?.gain.value ?? 1);
    }

    public setVolume(volume: number): void {
        if (!this.gain) {
            return;
        }

        this.gain.gain.value = Math.max(0, Math.min(1, volume * volume));
    }

    public getBufferedLength(): number {
        // If fully decoded, all duration is available.
        if (this.buffer && this.duration > 0) {
            return this.duration;
        }

        // Otherwise, estimate based on response Content-Length (if known).
        if (this.totalBytes > 0 && this.duration > 0) {
            return Math.max(0, Math.min(this.duration, (this.bytesReceived / this.totalBytes) * this.duration));
        }

        // Unknown length.
        return 0;
    }

    // Internals

    private async ensureAudioContext(): Promise<void> {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            await this.ctx.resume().catch(() => {});
        }

        if (!this.gain) {
            this.gain = this.ctx.createGain();
            this.gain.gain.value = 1;
            this.gain.connect(this.ctx.destination);
        }
    }

    private buildUrl(): string {
        return `${ApiRoutes.getTrackAudio}?id=${this.id}&quality=${currentQuality.value}&code=${this.code}`;
    }

    private async loadAndDecode(): Promise<void> {
        if (!this.ctx) throw new Error("AudioContext not initialized");

        const url = this.buildUrl();
        const res = await fetch(url);

        if (!res.ok || !res.body) {
            throw new Error(`Failed to fetch stream: ${res.status} ${res.statusText}`);
        }

        const contentLength = res.headers.get("Content-Length");
        this.totalBytes = contentLength ? parseInt(contentLength, 10) || 0 : 0;

        // Accumulate the stream into a single buffer for decodeAudioData
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            if (value) {
                chunks.push(value);
                received += value.byteLength;
                this.bytesReceived = received;
            }
        }

        const merged = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) {
            merged.set(c, offset);
            offset += c.byteLength;
        }

        const arrayBuffer = merged.buffer as ArrayBuffer;

        // Decode to AudioBuffer
        const buf = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
        this.buffer = buf;
        this.duration = buf.duration;
    }

    private startFromOffset(offsetSeconds: number): void {
        if (!this.ctx || !this.gain || !this.buffer) {
            return;
        }

        // Clean existing source if any
        this.stopSourceOnly();

        const src = this.ctx.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.gain);

        const startAt = this.clampTime(offsetSeconds);
        this.offset = startAt;
        this.startCtxTime = this.ctx.currentTime;
        this.playing = true;

        src.onended = () => {
            // When natural end occurs, update state
            if (!this.source || src !== this.source) {
                return;
            }

            this.playing = false;
            // Move offset to end
            this.offset = this.duration;
        };

        this.source = src;
        this.setVolume(volume.value);

        // Start immediately at the desired offset
        try {
            src.start(0, startAt);
            currentTrackId.value = this.id;
        } catch (e) {
            // If invalid offset is passed, clamp and retry
            const clamped = this.clampTime(startAt);
            this.offset = clamped;
            src.start(0, clamped);
        }
    }

    private stopSourceOnly(): void {
        if (this.source) {
            try {
                this.source.stop();
            } catch (e: any) {
                console.warn(e);
            }
            try {
                this.source.disconnect();
            } catch (e: any) {
                console.warn(e);
            }
            this.source = undefined;
        }

        this.playing = false;

        // Update offset to where we stopped
        if (this.ctx) {
            const elapsed = Math.max(0, this.ctx.currentTime - this.startCtxTime);
            this.offset = this.clampTime(this.offset + elapsed);
        }
    }

    private clampTime(t: number): number {
        if (!isFinite(t) || t < 0) {
            return 0;
        }

        if (this.duration > 0) {
            return Math.min(t, this.duration);
        }

        return t;
    }
}