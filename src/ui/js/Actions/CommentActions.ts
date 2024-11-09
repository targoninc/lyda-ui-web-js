import {Api} from "../Api/Api.ts";
import {Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class CommentActions {
    static async getPotentiallyHarmful() {
        const res = await Api.getAsync(ApiRoutes.getPotentiallyHarmful);
        if (res.code !== 200) {
            Ui.notify("Error while trying to get comments: " + res.data, "error");
            return [];
        }
        return res.data;
    }

    static async hideComment(id) {
        const res = await Api.postAsync(ApiRoutes.hideComment, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to hide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async unhideComment(id) {
        const res = await Api.postAsync(ApiRoutes.unhideComment, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to unhide comment: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markSafe(id) {
        const res = await Api.postAsync(ApiRoutes.markCommentSafe, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as safe: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async markUnsafe(id) {
        const res = await Api.postAsync(ApiRoutes.markCommentUnsafe, {id});
        if (res.code !== 200) {
            Ui.notify("Error while trying to mark comment as unsafe: " + res.data, "error");
            return false;
        }
        return true;
    }
}