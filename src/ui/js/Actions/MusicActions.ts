import { ItemType } from "../Enums/ItemType.ts";
import {Playlist} from "../Models/DbModels/lyda/Playlist.ts";
import {Track} from "../Models/DbModels/lyda/Track.ts";
import {Album} from "../Models/DbModels/lyda/Album.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";

export async function startItem(type: ItemType, item: Track | Album | Playlist, startCallback: Function | null) {
    if (startCallback) {
        startCallback(item.id);
        return;
    }

    switch (type) {
        case ItemType.album:
            item = item as Album;
            break;
        case ItemType.playlist:
            item = item as Playlist;
            break;
        case ItemType.track:
            item = item as Track;
            PlayManager.addStreamClientIfNotExists(item.id, item.length);
            await PlayManager.startAsync(item.id);
            break;
    }
}