import {User} from "./User.ts";
import {PlaylistLike} from "./PlaylistLike.ts";
import {PlaylistTrack} from "./PlaylistTrack.ts";

export interface Playlist {
    likes?: PlaylistLike[];
    tracks?: PlaylistTrack[];
    user?: User;
    id: number;
    user_id: number;
    title: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
    has_cover: boolean;
}