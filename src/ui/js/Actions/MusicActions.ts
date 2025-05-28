import {PlayManager} from "../Streaming/PlayManager.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";

export async function startItem(type: EntityType, item: Track | Album | Playlist, startCallback: Function | null) {
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
            PlayManager.addStreamClientIfNotExists(item.id, (item as Track).length);
            await PlayManager.startAsync(item.id);
            break;
    }
}