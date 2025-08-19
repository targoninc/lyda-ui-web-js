import { PlayManager } from "./PlayManager.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { currentQuality, currentTrackId, currentTrackPosition, volume } from "../state.ts";
import { compute, create } from "@targoninc/jess";
import { IStreamClient } from "./IStreamClient.ts";

export class StreamClient implements IStreamClient {
    duration: number;
    playing: boolean;
    private readonly id: number;
    private audio: HTMLAudioElement;
    private waitingForPlay: boolean = false;

    constructor(id: number, code: string) {
        this.id = id;
        const src = compute(q => `${ApiRoutes.getTrackAudio}?id=${this.id}&quality=${q}&code=${code}`, currentQuality);
        this.audio = create("audio")
            .attributes("crossOrigin", "use-credentials")
            .attributes("preload", "auto")
            .attributes("autoplay", "false")
            .src(src).build() as HTMLAudioElement;
        this.duration = this.audio.duration;
        this.playing = false;
        currentQuality.subscribe(async q => {
            if (this.playing) {
                this.stopAsync();
                const interval = setInterval(async () => {
                    if (this.getBufferedLength() >= this.duration) {
                        console.log("Starting because buffer loaded");
                        await this.scrubTo(currentTrackPosition.value.absolute, false, false);
                        await this.startAsync();
                        clearInterval(interval);
                    }
                }, 100);
            } else {
                this.stopAsync();
            }
        });

        const currentStreamClient = PlayManager.getStreamClient(currentTrackId.value);
        if (!currentStreamClient) {
            this.setVolume(volume.value ?? 0.2);
        } else {
            this.setVolume(currentStreamClient.getVolume());
        }
    }

    async startAsync() {
        this.playing = true;
        currentTrackId.value = this.id;
        if (this.waitingForPlay) {
            this.waitingForPlay = true;
            await this.audio.play();
            this.waitingForPlay = false;
            this.duration = this.audio.duration;
        }
    }

    stopAsync() {
        this.playing = false;
        this.audio.pause();
    }

    async scrubTo(time: number, relative = true, togglePlay = false) {
        if (togglePlay) this.stopAsync();
        this.audio.currentTime = time * (relative ? this.audio.duration : 1);
        if (togglePlay) await this.startAsync();
    }

    getCurrentTime(relative = false) {
        return relative ? this.audio.currentTime / this.audio.duration : this.audio.currentTime;
    }

    getVolume() {
        return Math.sqrt(this.audio.volume);
    }

    setVolume(volume: number) {
        this.audio.volume = volume * volume;
    }

    getBufferedLength() {
        return this.audio.buffered.length > 0 ? this.audio.buffered.end(0) : 0;
    }
}