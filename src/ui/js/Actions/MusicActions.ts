import {PlayManager} from "../Streaming/PlayManager.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {notify} from "../Classes/Ui.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import { contextQueue } from "../state.ts";

export async function startItem(type: EntityType, item: Track | Album | Playlist, options: {
    startCallback?: Function | null,
    trackId?: number
} = {}) {
    if (options.startCallback) {
        options.startCallback(item.id);
        return;
    }

    switch (type) {
        case EntityType.album:
            item = item as Album;
            break;
        case EntityType.playlist:
            item = item as Playlist;
            break;
        case EntityType.track:
            if (!contextQueue.value.includes(item.id)) {
                PlayManager.clearPlayFrom();
                QueueManager.clearContextQueue();
            }

            PlayManager.addStreamClientIfNotExists(item.id, (item as Track).length);
            await PlayManager.startAsync(item.id);
            return;
    }

    PlayManager.playFrom(type, item.title, item.id, item);
    QueueManager.setContextQueue(item.tracks!.map(t => t.track_id));
    const track = options.trackId ? item.tracks!.find(t => t.track_id === options.trackId) : item.tracks!.at(0);

    if (!track) {
        notify(`This ${type} does not contain the requested track`, NotificationType.error);
        return;
    }

    PlayManager.addStreamClientIfNotExists(track.track_id, track.track?.length ?? 0);
    await PlayManager.startAsync(track.track_id);
}