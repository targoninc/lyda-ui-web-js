import { PlayManager } from "../Streaming/PlayManager.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { notify } from "../Classes/Ui.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { contextQueue } from "../state.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { FeedItem } from "../Models/FeedItem.ts";

export async function startItem(startedType: EntityType, item: FeedItem, options: {
    startCallback?: Function | null,
    startedFrom?: {
        feedType: FeedType,
        name: string
    },
    trackId?: number
} = {}) {
    if (options.startCallback) {
        options.startCallback(item.id);
        return;
    }

    switch (startedType) {
        case EntityType.album:
        case EntityType.playlist:
            break;
        case EntityType.track:
            if (!contextQueue.value.includes(item.id)) {
                PlayManager.clearPlayFrom();
                QueueManager.clearContextQueue();
            }

            if (options.startedFrom) {
                PlayManager.playFrom(options.startedFrom.feedType, options.startedFrom.name);
            }

            PlayManager.addStreamClientIfNotExists(item.id, (item as Track).length);
            await PlayManager.startAsync(item.id);
            return;
    }

    PlayManager.playFrom(startedType, item.title, item.id, item);
    QueueManager.setContextQueue(item.tracks!.map(t => t.track_id));
    const track = options.trackId ? item.tracks!.find(t => t.track_id === options.trackId) : item.tracks!.at(0);

    if (!track) {
        notify(`This does not contain the requested track - should never happen!`, NotificationType.error);
        return;
    }

    PlayManager.addStreamClientIfNotExists(track.track_id, track.track?.length ?? 0);
    await PlayManager.startAsync(track.track_id);
}