import {LydaCache} from "../Cache/LydaCache.ts";
import {Api} from "../Api/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {StreamingUpdater} from "./StreamingUpdater.ts";
import {QueueManager} from "./QueueManager.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {StreamClient} from "./StreamClient.ts";
import {userHasSettingValue, Util} from "../Classes/Util.ts";
import {notify} from "../Classes/Ui.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {trackInfo, currentTrackId, playingFrom, streamClients, volume, playingHere} from "../state.ts";
import {PlayingFrom} from "../Models/PlayingFrom.ts";
import {StreamingBroadcaster, StreamingEvent} from "./StreamingBroadcaster.ts";

export class PlayManager {
    static async playCheck(track: any) {
        if (PlayManager.isPlaying(track.id)) {
            const currentTime = PlayManager.getCurrentTime(track.id);

            if (currentTime.absolute >= PlayManager.getDuration(track.id)) {
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
                if (nextTrackId !== undefined && nextTrackId !== null) {
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
                if (autoQueue.length > 0 && user && userHasSettingValue(user, "playFromAutoQueue", "true")) {
                    await PlayManager.playNextInAutoQueue();
                } else {
                    await PlayManager.stopAllAsync();
                }
            }
        }
    }

    static addStreamClient(id: number, streamClient: StreamClient) {
        streamClients.value[id] = streamClient;
    }

    static removeStreamClient(id: number) {
        delete streamClients.value[id];
    }

    static getStreamClient(id: number): StreamClient {
        return streamClients.value[id];
    }

    static playFrom(type: string, name: string, id: number) {
        playingFrom.value = { type, name, id };
        LydaCache.set("playingFrom", new CacheItem(playingFrom.value));
    }

    static getPlayingFrom() {
        let playingFromTmp = playingFrom.value;
        if (!playingFromTmp || Object.keys(playingFromTmp as any).length === 0) {
            const cachedPlayingFrom = LydaCache.get<PlayingFrom>("playingFrom").content ?? null;
            if (cachedPlayingFrom) {
                playingFromTmp = cachedPlayingFrom;
                playingFrom.value = playingFromTmp;
            }
        }
        return playingFromTmp;
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
                StreamingUpdater.updateBuffers(streamClient.getBufferedLength(), streamClient.duration);
            }
        }
        return streamClient;
    }

    static async removeTrackFromAllStates(id: number) {
        QueueManager.removeFromAllQueues(id);
        if (currentTrackId.value === id) {
            await PlayManager.stopAsync(id);
            PlayManager.removeStreamClient(id);
            currentTrackId.value = 0;
            delete trackInfo.value[id];
            document.querySelector("#permanent-player")?.remove();
            StreamingBroadcaster.send(StreamingEvent.trackStop, id);
        }
        if (trackInfo.value[id]) {
            delete trackInfo.value[id];
        }
    }

    static async togglePlayAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        if (streamClient.playing) {
            await streamClient.stopAsync();
            playingHere.value = false;
            StreamingBroadcaster.send(StreamingEvent.trackStop, id);
        } else {
            await PlayManager.stopAllAsync();
            await streamClient.startAsync();
            StreamingBroadcaster.send(StreamingEvent.trackStart, id);
            playingHere.value = true;
        }

        await StreamingUpdater.updatePlayState();
    }

    static async startAsync(id: number) {
        await PlayManager.stopAllAsync();

        if (!Util.isLoggedIn()) {
            notify("You need to be logged in to play music", "error");
            return;
        }

        const track = await PlayManager.getTrackData(id);
        const streamClient = PlayManager.addStreamClientIfNotExists(id, track.track.length);

        await streamClient.startAsync();
        await StreamingUpdater.updatePlayState();
    }

    static async safeStartAsync(id: number) {
        await PlayManager.startAsync(id);
        if (PlayManager.getCurrentTime(id).relative > .1) {
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
        playingHere.value = false;
        await StreamingUpdater.updatePlayState();
    }

    static async stopAllAsync(exclusionId = null) {
        for (const key in streamClients.value) {
            if (key === exclusionId) {
                continue;
            }
            await streamClients.value[key].stopAsync();
        }
        playingHere.value = false;

        await StreamingUpdater.updatePlayState();
    }

    static async scrubFromElement(e: any) {
        const value = e.offsetX / e.target.offsetWidth;
        if (e.target.id !== currentTrackId.value) {
            await PlayManager.startAsync(e.target.id);
        }
        await PlayManager.scrubTo(e.target.id, value);
    }

    static isLoopingSingle() {
        return LydaCache.get<boolean>("loopSingle").content ?? false;
    }

    static isLoopingContext() {
        return LydaCache.get<boolean>("loopContext").content ?? false;
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
        StreamingUpdater.updateLoopStates(loopingSingle, loopingContext);
    }

    static async scrubTo(id: number, value: number) {
        value = Math.min(Math.max(value, 0), 1);

        //await PlayManager.stopAllAsync(id);
        const streamClient = PlayManager.getStreamClient(id);
        await streamClient.scrubTo(value);

        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
    }

    static getCurrentTime(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        return {
            relative: streamClient.getCurrentTime(true),
            absolute: streamClient.getCurrentTime(false)
        };
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
            volume.value = streamClient.getVolume();
            streamClient.setVolume(0);
            StreamingUpdater.updateLoudness(id, 0);
        } else {
            streamClient.setVolume(volume.value);
            StreamingUpdater.updateLoudness(id, volume.value);
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
        trackInfo.value[trackData.track.id] = trackData;
    }

    static async getTrackData(id: number, noCache = false) {
        if (trackInfo.value[id] && !noCache) {
            return trackInfo.value[id];
        }
        const res = await Api.getAsync<{ track: Track }>(ApiRoutes.getTrackById, { id });
        if (res.code !== 200) {
            await PlayManager.removeTrackFromAllStates(id);
            throw new Error(`Failed to get track data for ${id}: ${res.data.error}`);
        }
        await PlayManager.cacheTrackData(res.data);
        return res.data;
    }
}