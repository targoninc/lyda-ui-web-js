import {Api} from "../Classes/Api.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {PlayManager} from "./PlayManager.mjs";
import {CacheItem} from "../Cache/CacheItem.ts";
import {Util} from "../Classes/Util.ts";

export class StreamClient {
    constructor(id) {
        this.id = id;
        const src = `${Api.endpoints.tracks.audio}?id=${this.id}`;
        this.audio = new Audio(src);
        this.duration = this.audio.duration;
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        this.audio.autoplay = false;
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

    scrubTo(time, relative = true) {
        //await this.stopAsync();
        this.audio.currentTime = time * (relative ? this.audio.duration : 1);
        //await this.startAsync();
    }

    getCurrentTime(relative = false) {
        return relative ? this.audio.currentTime / this.audio.duration : this.audio.currentTime;
    }

    getVolume() {
        return this.audio.volume;
    }

    setVolume(volume) {
        this.audio.volume = volume;
    }

    getBufferedLength() {
        return this.audio.buffered.length > 0 ? this.audio.buffered.end(0) : 0;
    }
}