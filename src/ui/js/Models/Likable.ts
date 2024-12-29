import {TrackLike} from "./DbModels/lyda/TrackLike.ts";
import {AlbumLike} from "./DbModels/lyda/AlbumLike.ts";
import {PlaylistLike} from "./DbModels/lyda/PlaylistLike.ts";

export interface Likable {
    likes?: (TrackLike | AlbumLike | PlaylistLike)[];
}