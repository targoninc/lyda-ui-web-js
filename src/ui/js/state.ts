import { signal } from "@targoninc/jess";
import { LydaCache } from "./Cache/LydaCache.ts";
import { CacheItem } from "./Cache/CacheItem.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import { TrackPosition } from "@targoninc/lyda-shared/src/Models/TrackPosition";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { LoopMode } from "@targoninc/lyda-shared/src/Enums/LoopMode";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { Notification } from "@targoninc/lyda-shared/src/Models/db/lyda/Notification";
import { ListeningHistory } from "@targoninc/lyda-shared/dist/Models/db/lyda/ListeningHistory";
import { PlayManager } from "./Streaming/PlayManager.ts";
import { IStreamClient } from "./Streaming/IStreamClient.ts";

export const navInitialized = signal(false);

export const streamClients = signal<Record<number, IStreamClient>>({});

export const currentTrackId = signal(LydaCache.get<number>("currentTrackId").content ?? 0);
currentTrackId.subscribe((id, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("currentTrackId", new CacheItem(id));
});

export const currentQuality = signal("h");

export const trackInfo = signal<Record<number, { track: Track }>>({});

export const volume = signal(LydaCache.get<number>("volume").content ?? 0.25);
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
contextQueue.subscribe((newQueue, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("contextQueue", new CacheItem(newQueue));
});
export const autoQueue = signal<number[]>([]);

export const playingFrom = signal<PlayingFrom|null>(null);
playingFrom.subscribe((playingFrom: PlayingFrom|null, changed: boolean) => {
    if (!changed) {
        return;
    }
    LydaCache.set("playingFrom", new CacheItem(playingFrom));
});

export const currentTrackPosition = signal<TrackPosition>({ relative: 0, absolute: 0 });
currentTrackPosition.subscribe((p, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("currentTrackPosition", new CacheItem(p));

    if (currentTrackId.value) {
        PlayManager.getTrackData(currentTrackId.value).then(d => {
            if (d) {
                navigator.mediaSession.setPositionState({
                    position: currentTrackPosition.value.absolute,
                    duration: d.track.length,
                    playbackRate: 1,
                });
            }
        })
    }
});

export const currentlyBuffered = signal(0);

export const playingElsewhere = signal(false);

export const playingHere = signal(false);
playingHere.subscribe((p, changed) => {
    if (!changed) {
        return;
    }

    navigator.mediaSession.playbackState = p ? "playing" : (currentTrackId.value ? "paused" : "none");
});

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

export const currentSecretCode = signal<string>("");

export const notifications = signal<Notification[]>([]);

export const permissions = signal<Permission[]>([]);

export const chartColor = signal(getComputedStyle(document.documentElement).getPropertyValue("--color-5").trim());

export const history = signal<ListeningHistory[]>([]);
history.subscribe((h, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("listeningHistory", new CacheItem(h.slice(h.length - 100, h.length)));
});

export const queueVisible = signal(false);

export const playerExpanded = signal(false);
playerExpanded.subscribe((expanded) => {
    const footer = document.querySelector("footer");
    if (expanded) {
        footer?.classList.add("no-padding");
    } else {
        footer?.classList.remove("no-padding");
    }
});