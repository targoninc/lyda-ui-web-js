import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {notify} from "../Classes/Ui.ts";
import {Album} from "../Models/DbModels/lyda/Album.ts";
import {Playlist} from "../Models/DbModels/lyda/Playlist.ts";
import {Track} from "../Models/DbModels/lyda/Track.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Library} from "../Models/Library.ts";

export class LibraryActions {
    static async getLibrary(name: string) {
        const res = await Api.getAsync<Library>(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            notify("Failed to get library", NotificationType.error);
            return null;
        }
        return res.data as Library;
    }
}