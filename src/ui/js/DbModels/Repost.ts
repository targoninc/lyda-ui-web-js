import {User} from "./User.ts";

export interface Repost {
    user?: User;
    user_id: number;
    track_id: number;
    created_at: Date;
}