import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";

export const DefaultImages: Record<EntityType, string> = {
    [EntityType.track]: window.location.origin + "/img/defaults/track.webp",
    [EntityType.album]: window.location.origin + "/img/defaults/album.webp",
    [EntityType.playlist]: window.location.origin + "/img/defaults/playlist.webp",
}