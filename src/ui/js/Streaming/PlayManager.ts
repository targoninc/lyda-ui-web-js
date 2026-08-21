import {LydaCache} from "../Cache/LydaCache.ts";
import {StreamingUpdater} from "./StreamingUpdater.ts";
import {QueueManager} from "./QueueManager.ts";
import {StreamClient} from "./StreamClient.ts";
import {target, userHasSettingValue, Util} from "../Classes/Util.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {
    currentQuality,
    currentSecretCode,
    currentTrackId,
    currentTrackPosition,
    history,
    loadingAudio,
    loopMode,
    muted,
    playingFrom,
    playingHere,
    shuffling,
    streamClients,
    trackInfo,
    setTrackInfo,
    removeTrackInfo,
    volume,
} from "../state.ts";
import {StreamingBroadcaster, StreamingEvent} from "./StreamingBroadcaster.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {TrackDetailResponse} from "@targoninc/lyda-shared/src/Models/TrackDetailResponse";
import {PlayingFrom} from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import {LoopMode} from "@targoninc/lyda-shared/src/Enums/LoopMode";
import {TrackPosition} from "@targoninc/lyda-shared/src/Models/TrackPosition";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {UserSettings} from "@targoninc/lyda-shared/src/Enums/UserSettings";
import {get} from "../Api/ApiClient.ts";
import {IStreamClient} from "./IStreamClient.ts";
import {FeedType} from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import {FeedItem} from "../Models/FeedItem.ts";
import {notify} from "../Classes/Ui.ts";
import {t} from "../../locales";
import {NotificationType} from "../Enums/NotificationType.ts";
import {TrackLyrics} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackLyrics.ts";
import {ListeningHistory} from "@targoninc/lyda-shared/src/Models/db/lyda/ListeningHistory";

interface NextTrackResolution {
    kind: "track";
    type: "manual" | "context";
    id: number;
    force: boolean;
    sliceIfSame: boolean;
}

interface NextAutoResolution {
    kind: "auto";
    clearContext: boolean;
}

export class PlayManager {
    // Length of the crossfade used for gapless track transitions. Short enough
    // to be inaudible on continuous music, long enough to mask any browser
    // gap between media elements and prevent clicks.
    private static readonly CROSSFADE_MS = 10;
    private static gaplessWatchId: number | null = null;
    private static transitionInProgress = false;

    private static readonly HISTORY_MAX = 100;

    private static pushToHistory(trackId: number) {
        const entry: ListeningHistory = {
            id: -1,
            user_id: -1,
            track_id: trackId,
            created_at: new Date(),
            quality: currentQuality.value,
        };
        history.value = [...history.value, entry].slice(-PlayManager.HISTORY_MAX);
    }

    static async playCheck(track: Track) {
        if (PlayManager.isPlaying(track.id)) {
            StreamingUpdater.updateScrubber(track.id);
        }
    }

    static async playNextFromQueues(finishedId: number | null = null) {
        console.log(`[PlayManager] playNextFromQueues called with finishedId: ${finishedId}`);
        const currentId = finishedId ?? currentTrackId.value;
        const resolved = PlayManager.resolveNextFromQueues(currentId);
        if (resolved.kind === "auto") {
            if (resolved.clearContext) {
                QueueManager.clearContextQueue();
                PlayManager.clearPlayFrom();
            }
            // Context queue is empty, play from auto queue
            await PlayManager.playNextInAutoQueueOrStop();
            return;
        }

        await PlayManager.startAsync(resolved.id, true, resolved.force);
        PlayManager.applyQueueConsumption(resolved, currentId);
    }

    private static applyQueueConsumption(resolved: NextTrackResolution, currentId: number) {
        if (resolved.type === "manual") {
            QueueManager.removeFromManualQueue(resolved.id);
        } else if (resolved.sliceIfSame && resolved.id === currentId) {
            QueueManager.setContextQueue(QueueManager.getContextQueue().slice(1));
        }
    }

    /**
     * Pure queue decision: which track plays next after `currentId` finishes.
     * Does not mutate queue state — the caller applies consumption.
     */
    private static resolveNextFromQueues(currentId: number): NextTrackResolution | NextAutoResolution {
        const manualQueue = QueueManager.getManualQueue();
        const nextTrackIdFromManual = manualQueue[0];
        if (nextTrackIdFromManual !== undefined) {
            return {
                kind: "track",
                type: "manual",
                id: nextTrackIdFromManual,
                force: nextTrackIdFromManual === currentId,
                sliceIfSame: false,
            };
        }

        const loopingContext = PlayManager.isLoopingContext();
        const contextQueue = QueueManager.getContextQueue();
        if (contextQueue.length > 0) {
            const index = contextQueue.findIndex(id => id === currentId);

            if (index !== -1 && index < contextQueue.length - 1) {
                const id = contextQueue[index + 1];
                return {
                    kind: "track",
                    type: "context",
                    id,
                    force: id === currentId,
                    sliceIfSame: true,
                };
            }

            if (index === -1) {
                const id = contextQueue[0];
                return {
                    kind: "track",
                    type: "context",
                    id,
                    force: id === currentId,
                    sliceIfSame: false,
                };
            }

            if (loopingContext) {
                const id = contextQueue[0];
                return {
                    kind: "track",
                    type: "context",
                    id,
                    force: id === currentId,
                    sliceIfSame: false,
                };
            }

            return {kind: "auto", clearContext: true};
        }

        return {kind: "auto", clearContext: false};
    }

    private static async playNextInAutoQueueOrStop() {
        const user = await Util.getUserAsync();
        const autoQueue = QueueManager.getAutoQueue();
        if (autoQueue.length > 0 && user && userHasSettingValue(user, UserSettings.playFromAutoQueue, true)) {
            await PlayManager.playNextInAutoQueue();
        } else {
            await PlayManager.stopAllAsync();
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
        await PlayManager.startAtBeginningAsync(lastTrack.track_id);
    }

    static addStreamClient(id: number, streamClient: IStreamClient) {
        const existing = streamClients.value[id];
        if (existing) {
            if (typeof (existing as any)._cleanup === "function") {
                (existing as any)._cleanup();
            }
            if (typeof (existing as any).close === "function") {
                (existing as any).close();
            }
        }
        streamClients.value[id] = streamClient;
    }

    private static registerOnEnded(id: number, streamClient: IStreamClient) {
        console.log(`[PlayManager] Registering onEnded for track ${id}. streamClient instance:`, streamClient);
        streamClient.onEnded = async () => {
            console.log(`[PlayManager] streamClient.onEnded callback triggered for track ${id}. currentTrackId: ${currentTrackId.value}`);
            if (PlayManager.transitionInProgress) {
                console.log(`[PlayManager] streamClient.onEnded: gapless transition in progress for track ${id}, ignoring`);
                return;
            }
            if (id !== currentTrackId.value) {
                console.log(`[PlayManager] streamClient.onEnded: id mismatch (${id} !== ${currentTrackId.value}), returning`);
                return;
            }

            const loopingSingle = PlayManager.isLoopingSingle();
            console.log(`[PlayManager] loopingSingle: ${loopingSingle}`);
            if (loopingSingle) {
                await PlayManager.scrubTo(id, 0);
            } else {
                await PlayManager.playNextFromQueues(id);
            }
        };
    }

    static removeStreamClient(id: number) {
        const existing = streamClients.value[id];
        if (existing) {
            if (typeof (existing as any)._cleanup === "function") {
                (existing as any)._cleanup();
            }
            if (typeof (existing as any).close === "function") {
                (existing as any).close();
            }
        }
        delete streamClients.value[id];
        this.streamClientLastUsed.delete(id);
    }

    static playFrom(type: FeedType | "album" | "playlist", name: string = type, options?: {
        id?: number,
        username?: string,
        entity?: FeedItem
    }) {
        playingFrom.value = {
            type,
            name,
            id: options?.id,
            username: options?.username,
            entity: options?.entity as (Album | Playlist),
        };
    }

    /**
     * Starts playback of a feed context from its beginning, or resumes the current
     * track when this context is already active with an intact queue.
     * With shuffle, starts from a random position in the context.
     */
    static async playFeed(newPlayingFrom: PlayingFrom, shuffle: boolean) {
        const currentPf = playingFrom.value;
        const isSameContext = !!currentPf && currentPf.type === newPlayingFrom.type && currentPf.id === newPlayingFrom.id;
        playingFrom.value = newPlayingFrom;
        if (!shuffle) {
            const queue = QueueManager.getContextQueue();
            const canResume = isSameContext
                && queue.length > 0
                && currentTrackId.value !== 0
                && queue.includes(currentTrackId.value);
            if (canResume) {
                if (!PlayManager.isPlaying(currentTrackId.value)) {
                    const position = PlayManager.getCurrentTime(currentTrackId.value);
                    await PlayManager.startAsync(currentTrackId.value);
                    if (position.relative > 0) {
                        await PlayManager.scrubTo(currentTrackId.value, position.relative);
                    }
                }
                return;
            }
        }
        if (shuffling.value !== shuffle) {
            shuffling.value = shuffle;
        }
        await QueueManager.populateContextQueue(playingFrom.value, shuffle);
        const nextQueue = QueueManager.getContextQueue();
        if (nextQueue.length === 0) {
            return;
        }
        const nextId = shuffle ? nextQueue[Math.floor(Math.random() * nextQueue.length)] : nextQueue[0];
        await PlayManager.startAtBeginningAsync(nextId);
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

    private static streamClientLastUsed = new Map<number, number>();
    private static readonly STREAM_CLIENT_TTL = 10 * 60 * 1000;

    private static touchStreamClient(id: number) {
        this.streamClientLastUsed.set(id, Date.now());
    }

    private static pruneStaleStreamClients() {
        const now = Date.now();
        for (const [id, lastUsed] of this.streamClientLastUsed) {
            if (id === currentTrackId.value) continue;
            if (now - lastUsed > this.STREAM_CLIENT_TTL) {
                this.removeStreamClient(id);
            }
        }
    }

    static addStreamClientIfNotExists(id: number, duration: number, version?: number) {
        let streamClient = PlayManager.getStreamClient(id);
        if (streamClient === undefined) {
            streamClient = new StreamClient(id, currentSecretCode.value, version);
            PlayManager.addStreamClient(id, streamClient);
            PlayManager.registerOnEnded(id, streamClient);
            PlayManager.pruneStaleStreamClients();
        } else {
            if (version !== undefined) {
                streamClient.setVersion(version);
            }
            if (streamClient.duration === 0) {
                streamClient.duration = duration;
                StreamingUpdater.updateBuffers(streamClient.getBufferedLength(), streamClient.duration);
            }
        }
        PlayManager.touchStreamClient(id);
        return streamClient;
    }

    static getStreamClient(id: number): IStreamClient {
        if (streamClients.value[id]) {
            this.touchStreamClient(id);
        }
        return streamClients.value[id];
    }

    static async removeTrackFromAllStates(id: number) {
        QueueManager.removeFromAllQueues(id);
        if (currentTrackId.value === id) {
            await PlayManager.stopAsync(id);
            PlayManager.removeStreamClient(id);
            currentTrackId.value = 0;
            removeTrackInfo(id);
            document.querySelector("#permanent-player")?.remove();
            StreamingBroadcaster.send(StreamingEvent.trackStop, id);
        }
        if (trackInfo.value[id]) {
            removeTrackInfo(id);
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

    private static afterStart(id: number) {
        StreamingBroadcaster.send(StreamingEvent.trackStart, id);
        playingHere.value = true;
        PlayManager.preloadNextTrack(id);
        PlayManager.watchForGaplessTransition(id);
    }

    /**
     * Starts buffering the next queued track so the gapless transition at the
     * end of the current one starts instantly instead of after a network round
     * trip.
     */
    private static preloadNextTrack(currentId: number) {
        const resolved = PlayManager.resolveNextFromQueues(currentId);
        if (resolved.kind === "auto" || resolved.id === currentId) {
            return;
        }

        const existing = PlayManager.getStreamClient(resolved.id);
        if (existing) {
            existing.preload();
            return;
        }

        const client = new StreamClient(resolved.id, currentSecretCode.value);
        PlayManager.addStreamClient(resolved.id, client);
        PlayManager.registerOnEnded(resolved.id, client);
        client.preload();
    }

    /**
     * Watches the playing track and starts the next one slightly before the
     * current one ends, crossfading the two so the transition is gapless and
     * click-free. Falls back to the plain `ended` path when no next track is
     * queued or the watch misses its window.
     */
    private static watchForGaplessTransition(id: number) {
        if (PlayManager.gaplessWatchId !== null) {
            cancelAnimationFrame(PlayManager.gaplessWatchId);
            PlayManager.gaplessWatchId = null;
        }
        PlayManager.transitionInProgress = false;

        const tick = () => {
            PlayManager.gaplessWatchId = null;

            const client = PlayManager.getStreamClient(id);
            if (!client || !client.playing || id !== currentTrackId.value) {
                return;
            }

            // Single-track loop restarts itself via `ended`; don't intercept.
            if (PlayManager.isLoopingSingle()) {
                return;
            }

            if (client.duration > 0) {
                const remaining = client.duration - client.getCurrentTime(false);
                if (remaining <= PlayManager.CROSSFADE_MS / 1000) {
                    PlayManager.transitionInProgress = true;
                    PlayManager.gaplessTransition(id).catch(() => {
                        PlayManager.transitionInProgress = false;
                    });
                    return;
                }
            }

            PlayManager.gaplessWatchId = requestAnimationFrame(tick);
        };

        PlayManager.gaplessWatchId = requestAnimationFrame(tick);
    }

    private static async gaplessTransition(prevId: number) {
        const resolved = PlayManager.resolveNextFromQueues(prevId);
        if (resolved.kind === "auto") {
            if (resolved.clearContext) {
                QueueManager.clearContextQueue();
                PlayManager.clearPlayFrom();
            }
            // No next track queued: let `ended` handle the auto queue / stop.
            PlayManager.transitionInProgress = false;
            return;
        }

        if (resolved.id === prevId) {
            // Same track again (duplicate in queue): plain restart.
            PlayManager.transitionInProgress = false;
            await PlayManager.startAsync(resolved.id, true, resolved.force);
            PlayManager.applyQueueConsumption(resolved, prevId);
            return;
        }

        try {
            await PlayManager.startWithCrossfade(prevId, resolved.id, resolved.force);
            PlayManager.applyQueueConsumption(resolved, prevId);
        } catch (e) {
            console.error("[PlayManager] gapless transition failed:", e);
            PlayManager.transitionInProgress = false;
            // Fall back to the normal ended path so playback continues.
            await PlayManager.playNextFromQueues(prevId);
        }
    }

    /**
     * Starts `nextId` while the previous track is still audible and ramps the
     * two gains in opposite directions, producing a seamless transition.
     * The previous client is closed once the fade completes.
     */
    private static async startWithCrossfade(prevId: number, nextId: number, force: boolean) {
        loadingAudio.value = true;
        try {
            if (nextId !== currentTrackId.value || force) {
                PlayManager.pushToHistory(nextId);
            }

            const d = await PlayManager.getTrackData(nextId, false);
            if (!d) {
                throw new Error(`Track ${nextId} not found`);
            }
            setTrackInfo(d.track.id, {track: d.track});

            navigator.mediaSession.metadata = new MediaMetadata({
                album: playingFrom.value?.name ?? "",
                title: d.track.title,
                artist: d.track.artistname ?? d.track.user?.displayname ?? "",
                artwork: [
                    {
                        src: d.track.has_cover ? Util.getTrackCover(nextId) : Util.defaultImage("track"),
                        type: "image/webp",
                        sizes: "500x500"
                    }
                ]
            });

            const nextClient = PlayManager.addStreamClientIfNotExists(nextId, d.track.length);
            PlayManager.registerOnEnded(nextId, nextClient);
            const prevClient = PlayManager.getStreamClient(prevId);

            // Start the next track at zero gain, then crossfade both
            // directions so there is no gap and no click.
            nextClient.preload();
            nextClient.rampVolume(0, 0);
            await nextClient.startAsync(true);

            const targetVolume = muted.value ? 0 : volume.value;
            const fadeSeconds = PlayManager.CROSSFADE_MS / 1000;
            prevClient?.rampVolume(0, fadeSeconds);
            nextClient.rampVolume(targetVolume, fadeSeconds);

            setTimeout(() => {
                if (prevClient) {
                    prevClient.close();
                    PlayManager.removeStreamClient(prevId);
                }
            }, PlayManager.CROSSFADE_MS + 50);
        } catch (e) {
            loadingAudio.value = false;
            throw e;
        }
        loadingAudio.value = false;
        PlayManager.afterStart(nextId);
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
            loadingAudio.value = true;
            try {
                await streamClient.startAsync();
            } catch (e) {
                loadingAudio.value = false;
                console.error("[PlayManager] togglePlayAsync failed:", e);
                notify(t("CANNOT_PLAY_TRACK"), NotificationType.error);
                PlayManager.removeStreamClient(id);
                return;
            }
            loadingAudio.value = false;
            PlayManager.afterStart(id);
            await StreamingUpdater.updatePlayState();
        }
    }

    static async startAsync(id: number, fromBeginning: boolean = false, force: boolean = false, version?: number, track?: Track) {
        loadingAudio.value = true;
        await PlayManager.stopAllAsync();
        await PlayManager.startTrackAsync(id, fromBeginning, force, version, track);
    }

    private static async startTrackAsync(id: number, fromBeginning: boolean, force: boolean, version?: number, track?: Track) {
        if (id !== currentTrackId.value || force) {
            PlayManager.pushToHistory(id);
        }

        const d = track?.user
            ? {track}
            : await PlayManager.getTrackData(id, false);
        if (!d) {
            loadingAudio.value = false;
            return;
        }
        setTrackInfo(d.track.id, {track: d.track});

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
        const streamClient = PlayManager.addStreamClientIfNotExists(id, d.track.length, version);
        PlayManager.registerOnEnded(id, streamClient);

        try {
            await streamClient.startAsync(fromBeginning);
        } catch (e) {
            loadingAudio.value = false;
            console.error("[PlayManager] startAsync failed:", e);
            notify(t("CANNOT_PLAY_TRACK"), NotificationType.error);
            PlayManager.removeStreamClient(id);
            return;
        }
        loadingAudio.value = false;
        PlayManager.afterStart(id);
        await StreamingUpdater.updatePlayState();
    }

    static async startAtBeginningAsync(id: number, track?: Track) {
        await PlayManager.startAsync(id, true, false, undefined, track);
    }

    static async playNextInAutoQueue() {
        await PlayManager.stopAllAsync();
        const nextTrackId = await QueueManager.popFromAutoQueue();
        if (nextTrackId === undefined) {
            return false;
        }
        await PlayManager.startAtBeginningAsync(nextTrackId);
        return true;
    }

    static async initializeTrackAsync(id: number) {
        console.log(`[PlayManager] initializeTrackAsync called for track ${id}`);
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
            const streamClient = streamClients.value[key];
            streamClient.stopAsync();
            if (typeof (streamClient as any)._cleanup === "function") {
                (streamClient as any)._cleanup();
            }
            if (typeof (streamClient as any).close === "function") {
                (streamClient as any).close();
            }
            this.streamClientLastUsed.delete(Number(key));
            delete streamClients.value[key];
        }
        playingHere.value = false;

        await StreamingUpdater.updatePlayState();
    }

    static async scrubFromElement(e: MouseEvent, id: number, version?: number) {
        const rect = target(e).getBoundingClientRect();
        const value = e.offsetX / rect.width;
        if (id !== currentTrackId.value) {
            await PlayManager.startAsync(id, true, false, version);
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
        if (!streamClient) {
            return;
        }
        await streamClient.scrubTo(value, true);

        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
    }

    static getCurrentTime(id: number): TrackPosition {
        const streamClient = PlayManager.getStreamClient(id);
        if (!streamClient) {
            return { relative: 0, absolute: 0 };
        }
        const trackPosition = {
            relative: streamClient.getCurrentTime(true),
            absolute: streamClient.getCurrentTime(false)
        };
        if (!Number.isFinite(trackPosition.relative)) trackPosition.relative = 0;
        if (!Number.isFinite(trackPosition.absolute)) trackPosition.absolute = 0;
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

    static async setLoudnessFromHorizontalElement(e: any) {
        const value = e.offsetX / e.target.offsetWidth;
        await PlayManager.setLoudness(value);
    }

    static async setLoudnessFromWheel(e: any) {
        e.preventDefault();
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
        const newTime = Math.max(0, streamClient.getCurrentTime(false) + 5);
        await streamClient.scrubTo(newTime, false);
        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
    }

    static async skipBackward(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        const newTime = Math.max(0, streamClient.getCurrentTime(false) - 5);
        await streamClient.scrubTo(newTime, false);
        StreamingUpdater.updateScrubber(id);
        await StreamingUpdater.updatePlayState();
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

    static async cacheTrackData(trackData: TrackDetailResponse) {
        setTrackInfo(trackData.track.id, trackData);
    }

    static async getTrackData(id: number, allowCache = true) {
        if (trackInfo.value[id]?.track.user && allowCache) {
            return trackInfo.value[id];
        }

        if (!id || id.toString().length === 0) {
            throw new Error("id is missing");
        }

        const data = await get<TrackDetailResponse>(ApiRoutes.getTrackById, {id, code: currentSecretCode.value});
        if (data) {
            await PlayManager.cacheTrackData(data);
        }
        return data;
    }

    static getAllStreamClients() {
        return Object.values(streamClients.value);
    }

    static async getTrackLyrics(id: number): Promise<TrackLyrics | null> {
        const data = await get<{ lyrics: TrackLyrics }>(ApiRoutes.getTrackLyrics, { id });
        return data?.lyrics ?? null;
    }
}
