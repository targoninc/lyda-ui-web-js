import {LydaCache} from "../Cache/LydaCache.ts";
import {Api, ApiRoutes} from "../Classes/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {StreamingUpdater} from "./StreamingUpdater.ts";
import {QueueManager} from "./QueueManager.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {StreamClient} from "./StreamClient.ts";
import {userHasSettingValue, Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {Track} from "../Models/DbModels/Track.ts";

export class PlayManager {
    static async playCheck(track: any) {
        if (PlayManager.isPlaying(track.id)) {
            const value = PlayManager.getCurrentTime(track.id, false);

            if (value >= PlayManager.getDuration(track.id)) {
                const secondsBeforePlaySave = 5;
                const loopingSingle = PlayManager.isLoopingSingle();
                if (loopingSingle) {
                    await PlayManager.togglePlayAsync(track.id);
                    await PlayManager.scrubTo(track.id, 0);
                    TrackActions.savePlayAfterTime(track.id, secondsBeforePlaySave);
                } else {
                    await this.playNextFromQueues(track);
                }
            }

            StreamingUpdater.updateScrubber(track.id);
        }
    }

    static async playNextFromQueues(currentTrack: any) {
        const queue = QueueManager.getManualQueue();
        const nextTrackId = queue[0];
        if (nextTrackId !== undefined) {
            await PlayManager.safeStartAsync(nextTrackId);
            QueueManager.removeFromManualQueue(nextTrackId);
        } else {
            const loopingContext = PlayManager.isLoopingContext();
            const contextQueue = QueueManager.getContextQueue();
            if (contextQueue.length > 0) {
                let nextTrackId = QueueManager.getNextTrackInContextQueue(currentTrack.id);
                if (nextTrackId !== undefined) {
                    await PlayManager.safeStartAsync(nextTrackId);
                } else {
                    if (loopingContext) {
                        nextTrackId = QueueManager.getContextQueue()[0];
                        await PlayManager.safeStartAsync(nextTrackId);
                    } else {
                        await PlayManager.playNextInAutoQueue();
                    }
                }
            } else {
                const user = await Util.getUserAsync();
                const autoQueue = QueueManager.getAutoQueue();
                if (autoQueue.length > 0 && user && userHasSettingValue(user, "playFromAutoQueue", true)) {
                    await PlayManager.playNextInAutoQueue();
                } else {
                    await PlayManager.stopAllAsync();
                }
            }
        }
    }

    static addStreamClient(id: number, streamClient: StreamClient) {
        PlayManager.ensureWindowObjects();
        window.streamClients[id] = streamClient;
    }

    static removeStreamClient(id: number) {
        PlayManager.ensureWindowObjects();
        delete window.streamClients[id];
    }

    static getStreamClient(id: number): StreamClient {
        PlayManager.ensureWindowObjects();
        return window.streamClients[id];
    }

    static ensureWindowObjects() {
        if (window.streamClients === undefined) {
            window.streamClients = {};
        }

        if (window.manualQueue === undefined) {
            window.manualQueue = [];
        }

        if (window.autoQueue === undefined) {
            window.autoQueue = [];
        }

        if (window.contextQueue === undefined) {
            window.contextQueue = [];
        }

        if (window.trackInfo === undefined) {
            window.trackInfo = {};
        }

        if (window.playingFrom === undefined) {
            window.playingFrom = {};
        }
    }

    static playFrom(type: string, name: string, id: number) {
        PlayManager.ensureWindowObjects();
        window.playingFrom = { type, name, id };
        LydaCache.set("playingFrom", new CacheItem(window.playingFrom));
    }

    static getPlayingFrom() {
        PlayManager.ensureWindowObjects();
        let playingFrom = window.playingFrom;
        if (Object.keys(playingFrom).length === 0) {
            const cachedPlayingFrom = LydaCache.get("playingFrom").content ?? {};
            if (cachedPlayingFrom) {
                playingFrom = cachedPlayingFrom;
                window.playingFrom = playingFrom;
            }
        }
        return playingFrom;
    }

    static isPlaying(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return false;
        } else {
            return streamClient.playing;
        }
    }

    static addStreamClientIfNotExists(id: number, duration: number) {
        let streamClient;
        if (PlayManager.getStreamClient(id) === undefined) {
            streamClient = new StreamClient(id);
            PlayManager.addStreamClient(id, streamClient);
        } else {
            streamClient = PlayManager.getStreamClient(id);
            if (streamClient.duration === 0) {
                streamClient.duration = duration;
                StreamingUpdater.updateBuffers(id, streamClient.getBufferedLength(), streamClient.duration);
            }
        }
        return streamClient;
    }

    static async togglePlayAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        if (streamClient.playing) {
            await streamClient.stopAsync();
        } else {
            await PlayManager.stopAllAsync();
            await streamClient.startAsync();
        }

        await StreamingUpdater.updatePlayState();
    }

    static async startAsync(id: number) {
        await PlayManager.stopAllAsync();

        if (!Util.isLoggedIn()) {
            Ui.notify("You need to be logged in to play music", "error");
            return;
        }

        const track = await PlayManager.getTrackData(id);
        const streamClient = PlayManager.addStreamClientIfNotExists(id, track.length);

        await streamClient.startAsync();
        await StreamingUpdater.updatePlayState();
    }

    static async safeStartAsync(id: number) {
        await PlayManager.startAsync(id);
        if (PlayManager.getCurrentTime(id) > .1) {
            await PlayManager.scrubTo(id, 0);
        }
    }

    static async playNextInAutoQueue() {
        await PlayManager.stopAllAsync();
        const nextTrackId = await QueueManager.popFromAutoQueue();
        if (nextTrackId === undefined) {
            return false;
        }
        await PlayManager.safeStartAsync(nextTrackId);
        return true;
    }

    static async initializeTrackAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        const track = await PlayManager.getTrackData(id);
        if (streamClient === undefined) {
            PlayManager.addStreamClientIfNotExists(id, track.track.length);
        }
        await StreamingUpdater.updatePlayState();
    }

    static async stopAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        await streamClient.stopAsync();
        await StreamingUpdater.updatePlayState();
    }

    static async stopAllAsync(exclusionId = null) {
        PlayManager.ensureWindowObjects();
        for (const key in window.streamClients) {
            if (key === exclusionId) {
                continue;
            }
            await window.streamClients[key].stopAsync();
        }

        await StreamingUpdater.updatePlayState();
    }

    static async scrubFromElement(e: any) {
        const value = e.offsetX / e.target.offsetWidth;
        if (e.target.id !== window.currentTrackId) {
            await PlayManager.startAsync(e.target.id);
        }
        await PlayManager.scrubTo(e.target.id, value);
    }

    static isLoopingSingle() {
        return LydaCache.get("loopSingle").content ?? false;
    }

    static isLoopingContext() {
        return LydaCache.get("loopContext").content ?? false;
    }

    static async toggleLoop() {
        let loopingSingle = PlayManager.isLoopingSingle();
        let loopingContext = PlayManager.isLoopingContext();

        if (loopingSingle) {
            loopingSingle = false;
            loopingContext = true;
        } else if (loopingContext) {
            loopingSingle = false;
            loopingContext = false;
        } else {
            loopingSingle = true;
            loopingContext = false;
        }

        LydaCache.set("loopSingle", new CacheItem(loopingSingle));
        LydaCache.set("loopContext", new CacheItem(loopingContext));
        await StreamingUpdater.updateLoopStates(loopingSingle, loopingContext);
    }

    static async scrubTo(id: number, value: number) {
        value = Math.min(Math.max(value, 0), 1);

        //await PlayManager.stopAllAsync(id);
        const streamClient = PlayManager.getStreamClient(id);
        await streamClient.scrubTo(value);

        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
    }

    static getCurrentTime(id: number, relative = false) {
        const streamClient = PlayManager.getStreamClient(id);
        return streamClient.getCurrentTime(relative);
    }

    static getDuration(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return 0;
        }
        return streamClient.duration;
    }

    static getBufferedLength(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return 0;
        }
        return streamClient.getBufferedLength();
    }

    static toggleMute(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient.getVolume() > 0) {
            window.trackInfo[id].volume = streamClient.getVolume();
            streamClient.setVolume(0);
            StreamingUpdater.updateLoudness(id, 0);
        } else {
            streamClient.setVolume(window.trackInfo[id].volume);
            StreamingUpdater.updateLoudness(id, window.trackInfo[id].volume);
        }
        StreamingUpdater.updateMuteState(id);
    }

    static async setLoudnessFromElement(e: any) {
        let value = 1 - (e.offsetY / e.target.offsetHeight);
        await PlayManager.setLoudness(e.target.id, value);
    }

    static async setLoudnessFromWheel(e: any) {
        const id = e.target.id;
        let value = PlayManager.getLoudness(id);
        if (e.deltaY < 0) {
            value += 0.05;
        } else {
            value -= 0.05;
        }
        await PlayManager.setLoudness(id, value);
    }

    static getLoudness(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        return streamClient.getVolume();
    }

    static async setLoudness(id: number, value: number) {
        value = Math.min(Math.max(value, 0), 1);
        const streamClient = PlayManager.getStreamClient(id);
        await streamClient.setVolume(value);

        StreamingUpdater.updateLoudness(id, value);
        StreamingUpdater.updateMuteState(id);

        LydaCache.set("volume", new CacheItem(value));
    }

    static async skipForward(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        await PlayManager.scrubTo(id, streamClient.getCurrentTime(true) + .1);
    }

    static async skipBackward(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        await PlayManager.scrubTo(id, streamClient.getCurrentTime(true) - .1);
    }

    static config = {
        controls: {
            volumeChangeRelative: 1.2
        }
    };

    static async volumeUp(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        await PlayManager.setLoudness(id, streamClient.getVolume() * PlayManager.config.controls.volumeChangeRelative);
    }

    static async volumeDown(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        await PlayManager.setLoudness(id, streamClient.getVolume() / PlayManager.config.controls.volumeChangeRelative);
    }

    static async cacheTrackData(trackData: { track: Track }) {
        if (!window.trackInfo) {
            window.trackInfo = {};
        }
        window.trackInfo[trackData.track.id] = trackData;
    }

    static async getTrackData(id: number, noCache = false) {
        if (window.trackInfo && window.trackInfo[id] && !noCache) {
            return window.trackInfo[id];
        }
        const res = await Api.getAsync(ApiRoutes.getTrackById, { id });
        return PlayManager.cacheTrackData(res.data);
    }
}