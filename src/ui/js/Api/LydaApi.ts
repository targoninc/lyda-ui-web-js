import {Api} from "./Api.ts";
import {notify} from "../Classes/Ui.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {ApiRoutes} from "./ApiRoutes.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {Log} from "../Models/DbModels/lyda/Log.ts";
import {currentUser} from "../state.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {getErrorMessage} from "../Classes/Util.ts";

export class LydaApi {
    static getLogs(filterState: Signal<any>, successCallback: Function) {
        const errorText = "Failed to get logs";
        Api.getAsync<Log[]>(ApiRoutes.getLogs, {
            logLevel: filterState.value,
            offset: 0,
            limit: 50
        }).then(logs => {
            LydaApi.handleResponse(logs, errorText, successCallback);
        });

        filterState.subscribe(async (newValue) => {
            Api.getAsync<Log[]>(ApiRoutes.getLogs, {
                logLevel: newValue,
                offset: 0,
                limit: 100
            }).then(logs => {
                LydaApi.handleResponse(logs, errorText, successCallback);
            });
        });
    }

    static handleResponse(response: any, errorText: string, successCallback: Function) {
        if (response.code !== 200) {
            notify(errorText, NotificationType.error);
            return;
        }
        successCallback(response.data);
    }

    static async deleteUser() {
        return await Api.postAsync(ApiRoutes.deleteUser);
    }

    static async updateUser(user: Partial<User>) {
        const res = await Api.postAsync(ApiRoutes.updateUser, { user });
        if (res.code !== 200) {
            notify("Failed to update account: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        currentUser.value = <User>{
            ...currentUser.value,
            ...user
        };
        notify("Account updated", NotificationType.success);
        return true;
    }

    static async exportUser() {
        return await Api.getAsync(ApiRoutes.exportUser);
    }
}