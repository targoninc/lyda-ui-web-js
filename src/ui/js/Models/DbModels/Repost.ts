import {User} from "./User.js";

export interface Repost {
    user?: User;
    user_id: number;
    track_id: number;
    created_at: Date;
}