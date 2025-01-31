import {Track} from "./DbModels/lyda/Track.ts";
import {Album} from "./DbModels/lyda/Album.ts";
import {Playlist} from "./DbModels/lyda/Playlist.ts";

export interface Library {
    tracks: Track[];
    albums: Album[];
    playlists: Playlist[];
}