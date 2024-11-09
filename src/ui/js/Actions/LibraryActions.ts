import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Classes/ApiRoutes.ts";

export class LibraryActions {
    static async getLibrary(name) {
        const res = await Api.getAsync(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            Ui.notify("Failed to get library", "error");
            return false;
        }
        return res.data;
    }
}