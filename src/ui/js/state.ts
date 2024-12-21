import {compute, signal} from "../fjsc/src/signals.ts";
import {StreamClient} from "./Streaming/StreamClient.ts";
import {PlayingFrom} from "./Models/PlayingFrom.ts";
import {Track} from "./Models/DbModels/Track.ts";
import {LydaCache} from "./Cache/LydaCache.ts";
import {CacheItem} from "./Cache/CacheItem.ts";
import {User} from "./Models/DbModels/User.ts";
import {TrackPosition} from "./Models/TrackPosition.ts";
import {LoopMode} from "./Enums/LoopMode.ts";

export const dragging = signal(false);

export const navInitialized = signal(false);

export const streamClients = signal<Record<number, StreamClient>>({});

export const currentTrackId = signal(0);
currentTrackId.subscribe((id, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("currentTrackId", new CacheItem(id));
});

export const trackInfo = signal<Record<number, { track: Track }>>({});

export const volume = signal(0.5);
volume.subscribe((newValue, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("volume", new CacheItem(newValue));
});

export const muted = signal<boolean>(false);

export const manualQueue = signal<number[]>([]);
let cachedQueue = LydaCache.get<number[]>("manualQueue").content ?? [];
if (cachedQueue.constructor === Number) {
    cachedQueue = [cachedQueue];
}
manualQueue.value = cachedQueue.filter(id => id !== undefined && id !== null);
manualQueue.subscribe((newQueue, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("manualQueue", new CacheItem(newQueue));
});

export const contextQueue = signal<number[]>([]);
export const autoQueue = signal<number[]>([]);

export const playingFrom = signal<PlayingFrom|null>(null);

export const currentTrackPosition = signal<TrackPosition>({ relative: 0, absolute: 0 });
currentTrackPosition.subscribe((p, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("currentTrackPosition", new CacheItem(p));
});

export const currentlyBuffered = signal(0);

export const playingElsewhere = signal(false);

export const playingHere = signal(false);

export const openMenus = signal<string[]>([]);

export const currentUser = signal<User|null>(null);

export const loopMode = signal<LoopMode>(LoopMode.off);
loopMode.value = LydaCache.get<LoopMode>("loopMode").content ?? LoopMode.off;
loopMode.subscribe((newMode, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("loopMode", new CacheItem(newMode));
});