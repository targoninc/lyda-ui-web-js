import { LydaCache } from "../Cache/LydaCache.ts";
import { StreamingUpdater } from "./StreamingUpdater.ts";
import { QueueManager } from "./QueueManager.ts";
import { TrackActions } from "../Actions/TrackActions.ts";
import { StreamClient } from "./StreamClient.ts";
import { target, userHasSettingValue, Util } from "../Classes/Util.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import {
    currentQuality,
    currentSecretCode,
    currentTrackId,
    currentTrackPosition,
    history,
    loopMode,
    muted,
    playingFrom,
    playingHere,
    streamClients,
    trackInfo,
    volume,
} from "../state.ts";
import { StreamingBroadcaster, StreamingEvent } from "./StreamingBroadcaster.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import { LoopMode } from "@targoninc/lyda-shared/src/Enums/LoopMode";
import { TrackPosition } from "@targoninc/lyda-shared/src/Models/TrackPosition";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";
import { get } from "../Api/ApiClient.ts";
import { IStreamClient } from "./IStreamClient.ts";
import { PLAYCHECK_INTERVAL } from "../Templates/music/PlayerTemplates.ts";
import { FeedItem } from "../Models/FeedItem.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";

export class PlayManager {
    static async playCheck(track: Track) {
        if (PlayManager.isPlaying(track.id)) {
            const currentTime = PlayManager.getCurrentTime(track.id);

            if (currentTime.absolute >= PlayManager.getDuration(track.id) - (PLAYCHECK_INTERVAL / 1000)) {
                const loopingSingle = PlayManager.isLoopingSingle();
                if (loopingSingle) {
                    await PlayManager.togglePlayAsync(track.id);
                    await PlayManager.scrubTo(track.id, 0);
                } else {
                    await PlayManager.playNextFromQueues();
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
                if (autoQueue.length > 0 && user && userHasSettingValue(user, UserSettings.playFromAutoQueue, true)) {
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

    static addStreamClient(id: number, streamClient: IStreamClient) {
        streamClients.value[id] = streamClient;
    }

    static removeStreamClient(id: number) {
        delete streamClients.value[id];
    }

    static getStreamClient(id: number): IStreamClient {
        return streamClients.value[id];
    }

    static playFrom(type: string, name: string = type, options?: {
        feedType?: FeedType;
        id?: number,
        entity?: FeedItem
    }) {
        playingFrom.value = {
            type,
            name,
            feedType: options?.feedType,
            id: options?.id,
            entity: options?.entity as (Album | Playlist),
        };
    }

    static clearPlayFrom() {
        playingFrom.value = null;
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

        streamClient.stopAsync();
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

        const d = await PlayManager.getTrackData(id);
        if (!d) {
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            album: playingFrom.value?.name ?? "",
            title: d.track.title,
            artist: d.track.artistname ?? d.track.user?.displayname ?? "",
            artwork: [
                {
                    src: d.track.has_cover ? Util.getTrackCover(id) : Util.defaultImage("track"),
                    type: "image/webp",
                    sizes: "500x500"
                }
            ]
        });
        const streamClient = PlayManager.addStreamClientIfNotExists(id, d.track.length);

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
        if (!track) {
            return;
        }
        if (streamClient === undefined) {
            streamClient = PlayManager.addStreamClientIfNotExists(id, track.track.length);
        }
        if (currentTrackPosition.value.relative !== 0) {
            await streamClient.scrubTo(currentTrackPosition.value.relative * track.track.length, false);
        }
        await StreamingUpdater.updatePlayState();
    }

    static async stopAsync(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            return;
        }

        streamClient.stopAsync();
        playingHere.value = false;
        await StreamingUpdater.updatePlayState();
    }

    static async stopAllAsync(exclusionId = null) {
        for (const key in streamClients.value) {
            if (key === exclusionId) {
                continue;
            }
            streamClients.value[key].stopAsync();
        }
        playingHere.value = false;

        await StreamingUpdater.updatePlayState();
    }

    static async scrubFromElement(e: MouseEvent, id: number) {
        const rect = target(e).getBoundingClientRect();
        const value = e.offsetX / rect.width;
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
        const nextModes: Record<LoopMode, LoopMode> = {
            off: LoopMode.single,
            single: LoopMode.context,
            context: LoopMode.off,
        };
        loopMode.value = nextModes[loopMode.value];
    }

    static async scrubTo(id: number, value: number) {
        value = Math.min(Math.max(value, 0), 1);

        //await PlayManager.stopAllAsync(id);
        const streamClient = PlayManager.getStreamClient(id);
        await streamClient.scrubTo(value, true);

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
        const value = 1 - (e.offsetY / e.target.offsetHeight);
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

        if (!id || id.toString().length === 0) {
            throw new Error("id is missing");
        }

        const data = await get<{ track: Track }>(ApiRoutes.getTrackById, {id});
        if (data) {
            await PlayManager.cacheTrackData(data);
        }
        return data;
    }

    static getAllStreamClients() {
        return Object.values(streamClients.value);
    }
}