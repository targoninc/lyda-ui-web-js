import {NotificationReference} from "../../NotificationReference.ts";

export interface Notification {
    references?: NotificationReference[];
    id: number;
    user_id: number;
    track_id: number;
    type: string;
    search_key: string;
    message: string;
    is_read: boolean;
    created_at: Date;
}