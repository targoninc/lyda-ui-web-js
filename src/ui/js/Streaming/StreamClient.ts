import { IStreamClient } from "./IStreamClient.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { currentQuality, currentTrackId, currentTrackPosition, loadingAudio, muted, volume } from "../state.ts";
import { initializeClient } from "./InitializeClient.ts";

let sharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
    if (!sharedCtx) {
        sharedCtx = new AudioContext();
    }
    if (sharedCtx.state === "suspended") {
        sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
}

export class StreamClient implements IStreamClient {
    public duration = 0;
    public playing = false;
    public onEnded?: () => void;

    private readonly id: number;
    private readonly code: string;
    private version?: number;

    private ctx?: AudioContext;
    private gain?: GainNode;
    private audio?: HTMLAudioElement;
    private elementSource?: MediaElementAudioSourceNode;

    private offset = 0; // seconds where playback should resume when started

    constructor(id: number, code: string, version?: number) {
        this.id = id;
        this.code = code;
        this.version = version;
        initializeClient(this);
    }

    public setVersion(version: number | undefined) {
        if (this.version !== version) {
            this.version = version;
            this.reloadSource();
        }
    }

    setLoop(looping: boolean): void {
        if (this.audio) {
            this.audio.loop = looping;
        }
    }

    public async startAsync(fromBeginning: boolean = false): Promise<void> {
        try {
            this.ensureAudioContext();

            if (fromBeginning) {
                this.offset = 0;
                currentTrackPosition.value = { relative: 0, absolute: 0 };
            }

            const freshElement = this.ensureAudioElement();
            if (this.playing) {
                return;
            }

            if (freshElement) {
                // The element was just created: wait until metadata is known
                // before seeking, otherwise the browser may ignore currentTime.
                await this.waitForMetadata();
            }

            const target = this.clampTime(this.offset);
            if (Math.abs(this.audio!.currentTime - target) > 0.05) {
                this.audio!.currentTime = target;
            }

            await this.audio!.play();
            this.playing = true;
            currentTrackId.value = this.id;
        } catch (e) {
            console.error("[StreamClient] startAsync failed:", e);
            throw e;
        }
    }

    public stopAsync(): void {
        if (this.audio) {
            const t = this.audio.currentTime;
            if (isFinite(t)) {
                this.offset = this.clampTime(t);
            }
            try {
                this.audio.pause();
            } catch (e: any) {
                console.warn(e);
            }
        }
        this.playing = false;
    }

    public close(): void {
        this.stopAsync();

        if (this.audio) {
            // Drop the source to stop network activity and free the buffer.
            try {
                this.audio.removeAttribute("src");
                this.audio.load();
            } catch (e: any) {
                console.warn(e);
            }
            this.audio = undefined;
        }
        this.elementSource = undefined;

        if (this.gain) {
            try {
                this.gain.disconnect();
            } catch (e: any) {
                console.warn(e);
            }
            this.gain = undefined;
        }
        this.ctx = undefined;
        this.duration = 0;
        this.offset = 0;
    }

    /**
     * Preloads the track without starting playback. The element begins
     * fetching (and buffering) the beginning of the file, so a later
     * startAsync starts almost immediately.
     */
    public preload(): void {
        this.ensureAudioContext();
        this.ensureAudioElement();
    }

    /**
     * Drops the current media element so the next startAsync re-fetches
     * with the current quality/version. The resume position is preserved.
     */
    public reloadSource(): void {
        if (this.playing) {
            this.offset = this.getCurrentTime(false);
        }
        if (this.audio) {
            try {
                this.audio.removeAttribute("src");
                this.audio.load();
            } catch (e: any) {
                console.warn(e);
            }
            this.audio = undefined;
        }
        this.elementSource = undefined;
    }

    public async scrubTo(time: number, relative: boolean): Promise<void> {
        try {
            this.ensureAudioContext();

            const freshElement = this.ensureAudioElement();
            if (freshElement) {
                await this.waitForMetadata();
            }

            // Interpret `relative` as "time is a 0..1 fraction of duration"
            const targetSeconds = relative
                ? (this.duration > 0 ? time * this.duration : 0)
                : time;
            const target = this.clampTime(targetSeconds);

            const wasPlaying = this.playing;
            this.audio!.currentTime = target;
            this.offset = target;

            if (wasPlaying) {
                await this.audio!.play();
            }
        } catch (e) {
            console.error("[StreamClient] scrubTo failed:", e);
            throw e;
        }
    }

    public getCurrentTime(relative: boolean): number {
        let base: number;
        if (this.audio) {
            const t = this.audio.currentTime;
            base = isFinite(t) ? t : this.offset;
        } else {
            base = this.offset;
        }

        if (relative) {
            if (this.duration <= 0) {
                return 0;
            }

            return Math.max(0, Math.min(1, base / this.duration));
        }

        return this.duration > 0 ? Math.min(base, this.duration) : base;
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

    /**
     * Smoothly ramps the volume (0..1) over durationSeconds on the shared
     * AudioContext clock. Used for gapless crossfades between tracks.
     */
    public rampVolume(targetVolume: number, durationSeconds: number): void {
        if (!this.gain || !this.ctx) {
            return;
        }

        const target = Math.max(0, Math.min(1, targetVolume * targetVolume));
        const now = this.ctx.currentTime;
        if (durationSeconds <= 0) {
            this.gain.gain.setValueAtTime(target, now);
        } else {
            this.gain.gain.cancelScheduledValues(now);
            this.gain.gain.setValueAtTime(this.gain.gain.value, now);
            this.gain.gain.linearRampToValueAtTime(target, now + durationSeconds);
        }
    }

    public getBufferedLength(): number {
        if (!this.audio) {
            return 0;
        }

        try {
            const buffered = this.audio.buffered;
            if (buffered.length > 0) {
                const end = buffered.end(buffered.length - 1);
                if (isFinite(end) && end > 0) {
                    return this.duration > 0 ? Math.min(end, this.duration) : end;
                }
            }
        } catch {
            // TimeRanges access can throw while the media is loading.
        }

        return 0;
    }

    // Internals

    private ensureAudioContext(): void {
        if (!this.ctx) {
            this.ctx = getSharedAudioContext();
            this.gain = this.ctx.createGain();
            this.gain.gain.value = 1;
            this.gain.connect(this.ctx.destination);
            // Apply the current volume once; setVolume is called again on
            // every volume/mute change via initializeClient.
            this.setVolume(muted.value ? 0 : volume.value);
        }
    }

    private buildUrl(): string {
        let url = `${ApiRoutes.getTrackAudio}?id=${this.id}&quality=${currentQuality.value}&code=${this.code}`;
        if (this.version !== undefined) {
            url += `&version=${this.version}`;
        }
        return url;
    }

    /**
     * Creates (once) the HTMLAudioElement that streams the track via HTTP
     * range requests. The browser starts playback as soon as the first part
     * is buffered and lazily downloads the rest.
     * @returns true when a new element was created.
     */
    private ensureAudioElement(): boolean {
        if (this.audio) {
            return false;
        }
        if (!this.ctx || !this.gain) {
            throw new Error("AudioContext not initialized");
        }

        const audio = new Audio();
        audio.preload = "auto";
        audio.crossOrigin = "use-credentials";

        // Route the element through our gain node. Must be called before the
        // element starts playing; the element is exclusively controlled here.
        this.elementSource = this.ctx.createMediaElementSource(audio);
        this.elementSource.connect(this.gain);

        audio.addEventListener("loadedmetadata", () => {
            if (isFinite(audio.duration) && audio.duration > 0) {
                this.duration = audio.duration;
            }
        });
        audio.addEventListener("durationchange", () => {
            if (isFinite(audio.duration) && audio.duration > 0) {
                this.duration = audio.duration;
            }
        });
        audio.addEventListener("playing", () => {
            this.playing = true;
            if (currentTrackId.value === this.id) {
                loadingAudio.value = false;
            }
        });
        audio.addEventListener("waiting", () => {
            if (currentTrackId.value === this.id) {
                loadingAudio.value = true;
            }
        });
        audio.addEventListener("pause", () => {
            this.playing = false;
        });
        audio.addEventListener("ended", () => {
            this.playing = false;
            this.offset = this.duration;
            this.onEnded?.();
        });

        audio.src = this.buildUrl();
        if (currentTrackId.value === this.id) {
            loadingAudio.value = true;
        }
        this.audio = audio;
        return true;
    }

    private waitForMetadata(): Promise<void> {
        const audio = this.audio;
        if (!audio) {
            return Promise.resolve();
        }
        if (isFinite(audio.duration) && audio.duration > 0) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Timed out waiting for audio metadata"));
            }, 10_000);

            const onMeta = () => {
                clearTimeout(timeout);
                cleanup();
                resolve();
            };
            const onError = () => {
                clearTimeout(timeout);
                cleanup();
                reject(new Error("Failed to load audio metadata"));
            };
            const cleanup = () => {
                audio.removeEventListener("loadedmetadata", onMeta);
                audio.removeEventListener("error", onError);
            };

            audio.addEventListener("loadedmetadata", onMeta);
            audio.addEventListener("error", onError);
        });
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
