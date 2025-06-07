import {HttpClient} from "../Api/HttpClient.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {notify} from "../Classes/Ui.ts";
import {Library} from "@targoninc/lyda-shared/dist/Models/Library";
import {NotificationType} from "../Enums/NotificationType.ts";

export class LibraryActions {
    static async getLibrary(name: string) {
        const res = await HttpClient.getAsync<Library>(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            notify("Failed to get library", NotificationType.error);
            return null;
        }
        return res.data as Library;
    }
}