import {User} from "./User.ts";

export interface AlbumLike {
    user?: User;
    user_id: number;
    album_id: number;
    created_at: Date;
}