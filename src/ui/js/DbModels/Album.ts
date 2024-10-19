import {Track} from "./Track.ts";
import {User} from "./User.ts";

export interface Album {
    tracks?: Track[];
    user?: User;
    id: number;
    user_id: number;
    name: string;
    description: string;
    upc: string;
    release_date: Date;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
    price: number;
}