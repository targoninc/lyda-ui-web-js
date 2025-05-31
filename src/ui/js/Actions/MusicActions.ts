import {PlayManager} from "../Streaming/PlayManager.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {notify} from "../Classes/Ui.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export async function startItem(type: EntityType, item: Track | Album | Playlist, startCallback: Function | null, clearPlayFrom: boolean = true) {
    if (startCallback) {
        startCallback(item.id);
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
            if (clearPlayFrom) {
                PlayManager.clearPlayFrom();
            }
            PlayManager.addStreamClientIfNotExists(item.id, (item as Track).length);
            await PlayManager.startAsync(item.id);
            return;
    }

    PlayManager.playFrom(type, item.title, item.id, item);
    QueueManager.setContextQueue(item.tracks!.map(t => t.track_id));
    const firstTrack = item.tracks![0];
    if (!firstTrack) {
        notify(`This ${type} has no tracks`, NotificationType.error);
        return;
    }
    PlayManager.addStreamClientIfNotExists(firstTrack.track_id, firstTrack.track?.length ?? 0);
    await PlayManager.startAsync(firstTrack.track_id);
}