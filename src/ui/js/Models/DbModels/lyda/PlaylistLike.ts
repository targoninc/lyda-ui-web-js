import {User} from "./User.ts";

export interface PlaylistLike {
    user_id: number;
    playlist_id: number;
    created_at: Date;
    user?: User;
}