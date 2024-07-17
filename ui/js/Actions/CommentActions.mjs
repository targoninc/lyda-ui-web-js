import {Api} from "../Classes/Api.mjs";
import {Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class CommentActions {
    static async getPotentiallyHarmful() {
        const res = await Api.getAsync(Api.endpoints.comments.potentiallyHarmful, {}, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Error while trying to get comments: " + res.data, "error");
            return [];
        }
        return res.data;
    }

    static async hideComment(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.hide, {id}, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Error while trying to hide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async unhideComment(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.unhide, {id}, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Error while trying to unhide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markSafe(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.markSafe, {id}, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as safe: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markUnsafe(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.markUnsafe, {id}, Util.getAuthorizationHeaders());
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as unsafe: " + res.data, "error");
            return false;
        }
        return true;
    }
}