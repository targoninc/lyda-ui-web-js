import {PlayManager} from "./PlayManager.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {currentQuality, currentTrackId, currentTrackPosition, volume} from "../state.ts";
import {create} from "../../fjsc/src/f2.ts";
import {compute} from "../../fjsc/src/signals.ts";

export class StreamClient {
    id: number;
    audio: HTMLAudioElement;
    duration: number;
    playing: boolean;

    constructor(id: number) {
        this.id = id;
        const src = compute(q => `${ApiRoutes.getTrackAudio}?id=${this.id}&quality=${q}`, currentQuality);
        this.audio = create("audio")
            .attributes("crossOrigin", "anonymous")
            .attributes("preload", "auto")
            .attributes("autoplay", "false")
            .src(src)
            .build() as HTMLAudioElement;
        this.duration = this.audio.duration;
        this.playing = false;
        currentQuality.subscribe(async q => {
            if (this.playing) {
                await this.stopAsync();
                const interval = setInterval(async () => {
                    if (this.getBufferedLength() >= this.duration) {
                        await this.scrubTo(currentTrackPosition.value.absolute, false, false);
                        await this.startAsync();
                        clearInterval(interval);
                    }
                }, 100);
            } else {
                await this.stopAsync();
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
        await this.audio.play();
        this.duration = this.audio.duration;
    }

    async stopAsync() {
        this.playing = false;
        await this.audio.pause();
    }

    async scrubTo(time: number, relative = true, togglePlay = false) {
        if (togglePlay) await this.stopAsync();
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