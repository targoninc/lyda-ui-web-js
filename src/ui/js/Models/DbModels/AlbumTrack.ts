import {Track} from "./Track.js";

export interface AlbumTrack {
    track?: Track;
    album_id: number;
    track_id: number;
    user_id: number;
    position: number;
    created_at: Date;
}