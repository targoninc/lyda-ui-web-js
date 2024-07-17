import {Api} from "../Classes/Api.mjs";
import {Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class LibraryActions {
    static async getLibrary(name) {
        const res = await Api.getAsync(Api.endpoints.library.get, { name }, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Failed to get library", "error");
            return false;
        }
        return res.data;
    }
}