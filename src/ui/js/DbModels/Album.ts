import {Track} from "./Track.js";
import {User} from "./User.js";
import {AlbumLike} from "./AlbumLike.js";

export interface Album {
    likes: AlbumLike[];
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