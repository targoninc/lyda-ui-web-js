import {signal} from "../fjsc/src/signals.ts";
import {StreamClient} from "./Streaming/StreamClient.ts";
import {PlayingFrom} from "./Models/PlayingFrom.ts";
import {Track} from "./Models/DbModels/Track.ts";
import {LydaCache} from "./Cache/LydaCache.ts";
import {CacheItem} from "./Cache/CacheItem.ts";

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

export const manualQueue = signal<number[]>([]);

export const contextQueue = signal<number[]>([]);

export const autoQueue = signal<number[]>([]);

export const playingFrom = signal<PlayingFrom|null>(null);

export const currentTrackPosition = signal<{ relative: number, absolute: number }>({ relative: 0, absolute: 0 });

export const currentlyBuffered = signal(0);

export const playingElsewhere = signal(false);

export const playingHere = signal(false);
