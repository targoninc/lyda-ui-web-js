import {Api} from "../Classes/Api.mjs";
import {Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class CommentActions {
    static async getPotentiallyHarmful() {
        const res = await Api.getAsync(Api.endpoints.comments.potentiallyHarmful);
        if (res.code !== 200) {
            Ui.notify("Error while trying to get comments: " + res.data, "error");
            return [];
        }
        return res.data;
    }

    static async hideComment(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.hide, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to hide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async unhideComment(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.unhide, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to unhide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markSafe(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.markSafe, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as safe: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markUnsafe(id) {
        const res = await Api.postAsync(Api.endpoints.comments.actions.markUnsafe, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as unsafe: " + res.data, "error");
            return false;
        }
        return true;
    }
}