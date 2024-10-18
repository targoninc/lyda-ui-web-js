import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.ts";

export class LibraryActions {
    static async getLibrary(name) {
        const res = await Api.getAsync(Api.endpoints.library.get, { name });
        if (res.code !== 200) {
            Ui.notify("Failed to get library", "error");
            return false;
        }
        return res.data;
    }
}