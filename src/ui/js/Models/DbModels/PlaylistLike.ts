import {User} from "./User.js";

export interface PlaylistLike {
    user_id: number;
    playlist_id: number;
    created_at: Date;
    user?: User;
}