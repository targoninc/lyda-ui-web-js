import {User} from "./User.ts";
import {AlbumLike} from "./AlbumLike.ts";
import {AlbumTrack} from "./AlbumTrack.ts";

export interface Album {
    likes: AlbumLike[];
    tracks?: AlbumTrack[];
    user?: User;
    id: number;
    user_id: number;
    title: string;
    description: string;
    upc: string;
    release_date: Date;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
    price: number;
    has_cover: boolean;
}