import {LydaCache} from "../Cache/LydaCache.ts";
import {PlayManager} from "./PlayManager.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {currentTrackId, volume} from "../state.ts";

export class StreamClient {
    id: number;
    audio: HTMLAudioElement;
    duration: number;
    playing: boolean;

    constructor(id: number) {
        this.id = id;
        const src = `${ApiRoutes.getTrackAudio}?id=${this.id}`;
        this.audio = new Audio();
        this.duration = this.audio.duration;
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        this.audio.autoplay = false;
        this.audio.src = src;
        this.playing = false;

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