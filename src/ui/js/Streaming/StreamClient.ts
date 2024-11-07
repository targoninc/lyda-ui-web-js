import {Api, ApiRoutes} from "../Classes/Api.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {PlayManager} from "./PlayManager.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {Util} from "../Classes/Util.ts";

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

        const currentStreamClient = PlayManager.getStreamClient(window.currentTrackId);
        if (!currentStreamClient) {
            const cachedVolume = LydaCache.get("volume").content;
            this.audio.volume = cachedVolume !== null ? cachedVolume : 0.2;
        } else {
            this.audio.volume = currentStreamClient.getVolume();
        }
    }

    async startAsync() {
        this.playing = true;
        window.currentTrackId = this.id;
        LydaCache.set("currentTrackId", new CacheItem(this.id));
        await this.audio.play();
        this.duration = this.audio.duration;
    }

    async stopAsync() {
        this.playing = false;
        await this.audio.pause();
    }

    async scrubTo(time: number, relative = true) {
        await this.stopAsync();
        this.audio.currentTime = time * (relative ? this.audio.duration : 1);
        await this.startAsync();
    }

    getCurrentTime(relative = false) {
        return relative ? this.audio.currentTime / this.audio.duration : this.audio.currentTime;
    }

    getVolume() {
        return this.audio.volume;
    }

    setVolume(volume: number) {
        this.audio.volume = volume;
    }

    getBufferedLength() {
        return this.audio.buffered.length > 0 ? this.audio.buffered.end(0) : 0;
    }
}