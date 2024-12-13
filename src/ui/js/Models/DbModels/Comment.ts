import {User} from "./User.js";

export interface Comment {
    user?: User;
    canEdit?: boolean;
    id: number;
    parent_id: number;
    track_id: number;
    user_id: number;
    content: string;
    created_at: Date;
    potentially_harmful: boolean;
    hidden: boolean;
}