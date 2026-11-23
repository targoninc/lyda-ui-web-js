import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";

export interface PlaylistCollaborator {
    playlist_id: number;
    user_id: number;
    approved: boolean | number;
    denied: boolean | number;
    username: string;
    displayname: string;
    has_avatar: boolean | number;
    created_at: string;
    updated_at: string;
    user?: User;
}
