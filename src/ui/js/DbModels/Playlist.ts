import {Track} from "./Track.ts";
import {User} from "./User.ts";

export interface Playlist {
    tracks?: Track[];
    user?: User;
    id: number;
    user_id: number;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
}