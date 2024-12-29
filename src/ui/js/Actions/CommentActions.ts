import {Api} from "../Api/Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class CommentActions {
    static getModerationComments(filter: { potentiallyHarmful: boolean, user_id: number | null, offset: number, limit: number }, loading: Signal<boolean>, callback: Function) {
        loading.value = true;
        Api.getAsync<Comment[]>(ApiRoutes.getModerationComments, filter).then(res => {
            loading.value = false;
            if (res.code !== 200) {
                notify("Error while trying to get comments: " + getErrorMessage(res), NotificationType.error);
                return [];
            }
            callback(res.data);
        });
    }

    static async hideComment(id: number) {
        const res = await Api.postAsync(ApiRoutes.hideComment, {id});
        if (res.code !== 200) {
            notify("Error while trying to hide comment: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async unhideComment(id: number) {
        const res = await Api.postAsync(ApiRoutes.unhideComment, {id});
        if (res.code !== 200) {
            notify("Error while trying to unhide comment: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async markSafe(id: number) {
        const res = await Api.postAsync(ApiRoutes.markCommentSafe, {id});
        if (res.code !== 200) {
            notify("Error while trying to mark comment as safe: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async markUnsafe(id: number) {
        const res = await Api.postAsync(ApiRoutes.markCommentUnsafe, {id});
        if (res.code !== 200) {
            notify("Error while trying to mark comment as unsafe: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }
}