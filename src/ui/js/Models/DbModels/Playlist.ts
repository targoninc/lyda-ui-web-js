import {Track} from "./Track.js";
import {User} from "./User.js";
import {PlaylistLike} from "./PlaylistLike.js";

export interface Playlist {
    likes?: PlaylistLike[];
    tracks?: Track[];
    user?: User;
    id: number;
    user_id: number;
    title: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
}