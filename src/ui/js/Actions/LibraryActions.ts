import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {notify} from "../Classes/Ui.ts";

export class LibraryActions {
    static async getLibrary(name) {
        const res = await Api.getAsync(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            notify("Failed to get library", "error");
            return false;
        }
        return res.data;
    }
}