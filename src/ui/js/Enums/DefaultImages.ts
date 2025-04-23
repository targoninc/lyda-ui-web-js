import {ItemType} from "./ItemType.ts";

export const DefaultImages: Record<ItemType, string> = {
    [ItemType.track]: window.location.origin + "/img/defaults/track.webp",
    [ItemType.album]: window.location.origin + "/img/defaults/album.webp",
    [ItemType.playlist]: window.location.origin + "/img/defaults/playlist.webp",
}