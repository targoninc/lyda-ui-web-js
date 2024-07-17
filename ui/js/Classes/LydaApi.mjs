import {Api} from "./Api.mjs";
import {Util} from "./Util.mjs";
import {Ui} from "./Ui.mjs";

export class LydaApi {
    /**
     *
     * @param filterState {FjsObservable}
     * @param successCallback
     */
    static getLogs(filterState, successCallback) {
        const errorText = "Failed to get logs";
        Api.getAsync(Api.endpoints.audit.logs, {type: filterState.value}, Util.getAuthorizationHeaders()).then(logs => {
            LydaApi.handleResponse(logs, errorText, successCallback);
        });
        filterState.onUpdate = async (newValue) => {
            Api.getAsync(Api.endpoints.audit.logs, {type: newValue}, Util.getAuthorizationHeaders()).then(logs => {
                LydaApi.handleResponse(logs, errorText, successCallback);
            });
        };
    }

    static handleResponse(response, errorText, successCallback) {
        if (response.code !== 200) {
            Ui.notify(errorText, "error");
            return;
        }
        successCallback(response.data);
    }
}