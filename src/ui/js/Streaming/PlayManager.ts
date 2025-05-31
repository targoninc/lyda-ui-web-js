import {LydaCache} from "../Cache/LydaCache.ts";
import {Api} from "../Api/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {StreamingUpdater} from "./StreamingUpdater.ts";
import {QueueManager} from "./QueueManager.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {StreamClient} from "./StreamClient.ts";
import {getErrorMessage, userHasSettingValue, Util} from "../Classes/Util.ts";
import {notify} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {
    trackInfo,
    currentTrackId,
    playingFrom,
    streamClients,
    volume,
    playingHere,
    currentTrackPosition,
    loopMode,
    muted, currentSecretCode, history, currentUser, currentQuality
} from "../state.ts";
import {StreamingBroadcaster, StreamingEvent} from "./StreamingBroadcaster.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {PlayingFrom} from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import {LoopMode} from "@targoninc/lyda-shared/src/Enums/LoopMode";
import {TrackPosition} from "@targoninc/lyda-shared/src/Models/TrackPosition";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";

export class PlayManager {
    static async playCheck(track: Track) {
        if (PlayManager.isPlaying(track.id)) {
            const currentTime = PlayManager.getCurrentTime(track.id);

            if (currentTime.absolute >= PlayManager.getDuration(track.id)) {
                const loopingSingle = PlayManager.isLoopingSingle();
                if (loopingSingle) {
                    await PlayManager.togglePlayAsync(track.id);
                    await PlayManager.scrubTo(track.id, 0);
                } else {
                    await this.playNextFromQueues();
                }
                TrackActions.savePlayAfterTimeIf(track.id, 5, () => track.id === currentTrackId.value && PlayManager.isPlaying(track.id));
            }

            StreamingUpdater.updateScrubber(track.id);
        }
    }

    static async playNextFromQueues() {
        const queue = QueueManager.getManualQueue();
        const nextTrackId = queue[0];
        if (nextTrackId !== undefined) {
            await PlayManager.safeStartAsync(nextTrackId);
            QueueManager.removeFromManualQueue(nextTrackId);
        } else {
            const loopingContext = PlayManager.isLoopingContext();
            const contextQueue = QueueManager.getContextQueue();
            if (contextQueue.length > 0) {
                let nextTrackId = QueueManager.getNextTrackInContextQueue(currentTrackId.value);
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

    static async playPreviousFromQueues() {
        const hist = history.value;
        hist.pop();
        const lastTrack = hist.pop();
        if (!lastTrack) {
            return;
        }
        history.value = hist;
        await PlayManager.safeStartAsync(lastTrack.track_id);
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

    static playFrom(type: string, name: string, id: number, entity?: Album | Playlist) {
        playingFrom.value = {
            type,
            name,
            id,
            entity
        };
        LydaCache.set("playingFrom", new CacheItem(playingFrom.value));
    }

    static clearPlayFrom() {
        playingFrom.value = null;
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
        let streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            streamClient = new StreamClient(id, currentSecretCode.value);
            PlayManager.addStreamClient(id, streamClient);
        } else {
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

    static async pauseAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        await streamClient.stopAsync();
        playingHere.value = false;
        StreamingBroadcaster.send(StreamingEvent.trackStop, id);

        await StreamingUpdater.updatePlayState();
    }

    static async togglePlayAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        if (streamClient.playing) {
            await PlayManager.pauseAsync(id);
        } else {
            await PlayManager.stopAllAsync();
            await streamClient.startAsync();
            StreamingBroadcaster.send(StreamingEvent.trackStart, id);
            playingHere.value = true;
            TrackActions.savePlayAfterTimeIf(id, 5, () => id === currentTrackId.value && PlayManager.isPlaying(id));

            await StreamingUpdater.updatePlayState();
        }
    }

    static async startAsync(id: number) {
        await PlayManager.stopAllAsync();

        if (id !== currentTrackId.value) {
            history.value = [
                ...history.value,
                {
                    id: -1,
                    user_id: -1,
                    track_id: id,
                    created_at: new Date(),
                    quality: currentQuality.value
                }
            ];
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
        let streamClient = PlayManager.getStreamClient(id);
        const track = await PlayManager.getTrackData(id);
        if (streamClient === undefined) {
            streamClient = PlayManager.addStreamClientIfNotExists(id, track.track.length);
        }
        if (currentTrackPosition.value.relative !== 0) {
            await streamClient.scrubTo(currentTrackPosition.value.relative * track.track.length, false, false);
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

    static async scrubFromElement(e: any, id: number) {
        const value = e.offsetX / e.target.offsetWidth;
        if (id !== currentTrackId.value) {
            await PlayManager.startAsync(id);
        }
        await PlayManager.scrubTo(id, value);
    }

    static isLoopingSingle() {
        return loopMode.value === LoopMode.single;
    }

    static isLoopingContext() {
        return loopMode.value === LoopMode.context;
    }

    static async nextLoopMode() {
        switch (loopMode.value) {
            case LoopMode.off:
                loopMode.value = LoopMode.single;
                break;
            case LoopMode.single:
                loopMode.value = LoopMode.context;
                break;
            case LoopMode.context:
                loopMode.value = LoopMode.off;
                break;
        }

        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        streamClient.audio.loop = loopMode.value === LoopMode.single;
    }

    static async scrubTo(id: number, value: number) {
        value = Math.min(Math.max(value, 0), 1);

        //await PlayManager.stopAllAsync(id);
        const streamClient = PlayManager.getStreamClient(id);
        await streamClient.scrubTo(value, true, true);

        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
    }

    static getCurrentTime(id: number): TrackPosition {
        const streamClient = PlayManager.getStreamClient(id);
        const trackPosition = {
            relative: streamClient.getCurrentTime(true),
            absolute: streamClient.getCurrentTime(false)
        };
        if (isNaN(trackPosition.relative)) {
            trackPosition.relative = 0;
        }
        return trackPosition;
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
            muted.value = true;
            streamClient.setVolume(0);
        } else {
            muted.value = false;
            streamClient.setVolume(volume.value);
        }
    }

    static async setLoudnessFromElement(e: any) {
        let value = 1 - (e.offsetY / e.target.offsetHeight);
        await PlayManager.setLoudness(value);
    }

    static async setLoudnessFromWheel(e: any) {
        let value = PlayManager.getLoudness();
        if (e.deltaY < 0) {
            value += 0.05;
        } else {
            value -= 0.05;
        }
        await PlayManager.setLoudness(value);
    }

    static getLoudness() {
        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        return streamClient.getVolume();
    }

    static async setLoudness(value: number) {
        value = Math.min(Math.max(value, 0), 1);
        const streamClients = PlayManager.getAllStreamClients();
        for (const client of streamClients) {
            await client.setVolume(value);
        }

        volume.value = value;
        muted.value = value === 0;
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

    static async volumeUp() {
        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        await PlayManager.setLoudness(streamClient.getVolume() * PlayManager.config.controls.volumeChangeRelative);
    }

    static async volumeDown() {
        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        await PlayManager.setLoudness(streamClient.getVolume() / PlayManager.config.controls.volumeChangeRelative);
    }

    static async cacheTrackData(trackData: { track: Track }) {
        trackInfo.value[trackData.track.id] = trackData;
    }

    static async getTrackData(id: number, allowCache = true) {
        if (trackInfo.value[id] && allowCache) {
            return trackInfo.value[id];
        }

        if (!id) {
            throw new Error("id is missing");
        }

        const res = await Api.getAsync<{ track: Track }>(ApiRoutes.getTrackById, {id});
        if (res.code !== 200) {
            await PlayManager.removeTrackFromAllStates(id);
            notify(`Failed to get track data for ${id}: ${getErrorMessage(res)}`, NotificationType.error);
            throw new Error(`Failed to get track data for ${id}: ${res.data.error}`);
        }
        await PlayManager.cacheTrackData(res.data);
        return res.data;
    }

    static getAllStreamClients() {
        return Object.values(streamClients.value);
    }
}