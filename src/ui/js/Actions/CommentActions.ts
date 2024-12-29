import {Api} from "../Api/Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Signal} from "../../fjsc/src/signals.ts";

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

    static async setPotentiallyHarmful(id: number, v: boolean) {
        const res = await Api.postAsync(ApiRoutes.setCommentPotentiallyHarmful, {id, potentiallyHarmful: v});
        if (res.code !== 200) {
            notify("Error while trying to set potentially harmful for comment: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
    }

    static async setHidden(id: number, v: boolean) {
        const res = await Api.postAsync(ApiRoutes.setCommentHidden, {id, hidden: v});
        if (res.code !== 200) {
            notify("Error while trying to set hidden for comment: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
    }
}