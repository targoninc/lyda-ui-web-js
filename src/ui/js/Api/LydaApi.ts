import {Api} from "./Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {Signal} from "../../fjsc/f2.ts";
import {ApiRoutes} from "./ApiRoutes.ts";

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
}