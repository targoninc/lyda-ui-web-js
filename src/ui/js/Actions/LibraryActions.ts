import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {notify} from "../Classes/Ui.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {Track} from "../Models/DbModels/Track.ts";

export class LibraryActions {
    static async getLibrary(name: string) {
        const res = await Api.getAsync<{
            albums: Album[],
            playlists: Playlist[],
            tracks: Track[],
        }>(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            notify("Failed to get library", "error");
            return false;
        }
        return res.data;
    }
}