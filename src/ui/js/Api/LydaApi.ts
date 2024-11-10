import {Api} from "./Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {Signal} from "../../fjsc/f2.ts";
import {ApiRoutes} from "./ApiRoutes.ts";
import {User} from "../Models/DbModels/User.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {CacheItem} from "../Cache/CacheItem.ts";

export class LydaApi {
    static getLogs(filterState: Signal<any>, successCallback: Function) {
        const errorText = "Failed to get logs";
        Api.getAsync(ApiRoutes.getLogs, {type: filterState.value}).then(logs => {
            LydaApi.handleResponse(logs, errorText, successCallback);
        });

        filterState.onUpdate = async (newValue) => {
            Api.getAsync(ApiRoutes.getLogs, {type: newValue}).then(logs => {
                LydaApi.handleResponse(logs, errorText, successCallback);
            });
        };
    }

    static handleResponse(response, errorText, successCallback) {
        if (response.code !== 200) {
            notify(errorText, "error");
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
            notify("Failed to update account", "error");
            return false;
        }
        let newUser = LydaCache.get("user").content;
        newUser = {...newUser, ...user};
        LydaCache.set("user", new CacheItem(newUser));
        notify("Account updated", "success");
        return true;
    }
}