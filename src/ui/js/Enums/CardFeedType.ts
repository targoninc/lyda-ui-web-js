import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";

export enum CardFeedType {
    profileAlbums = "profileAlbums",
    profilePlaylists = "profilePlaylists",
    likedAlbums = "likedAlbums",
    likedPlaylists = "likedPlaylists",
}

export const entityTypeByCardFeedType: Record<CardFeedType, EntityType> = {
    [CardFeedType.likedPlaylists]: EntityType.playlist,
    [CardFeedType.profilePlaylists]: EntityType.playlist,
    [CardFeedType.likedAlbums]: EntityType.album,
    [CardFeedType.profileAlbums]: EntityType.album,
};