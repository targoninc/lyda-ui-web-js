import {Api} from "./Api.ts";
import {Util} from "./Util.ts";
import {Ui} from "./Ui.ts";

export class AuthApi {
    static userExists(email: string, successCallback: Function = () => {
    }, errorCallback: Function = () => {
    }) {
        Api.getAsync(Api.endpoints.user.userExists, {email: encodeURIComponent(email)}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            } else {
                errorCallback(response.code, response.data);
            }
        });
    }

    static login(email: string, password: string, mfaCode: string, successCallback: Function, errorCallback: Function = () => {}) {
        Api.postAsync(Api.endpoints.user.actions.login, {
            email,
            password,
            mfaCode
        }).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            } else {
                Ui.notify(response.data, "error");
                errorCallback(response.code, response.data);
            }
        });
    }

    static user(id: number, successCallback: Function) {
        Api.getAsync(Api.endpoints.user.get, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            }
        });
    }

    static register(username: string, displayname: string, email: string, password: string, successCallback: Function, errorCallback: Function = () => {}) {
        Api.postAsync(Api.endpoints.user.actions.register, {
            username,
            displayname,
            email,
            password
        }).then((response) => {
            if (response.code === 200) {
                successCallback(response);
            } else {
                Ui.notify(response.data, "error");
                errorCallback(response);
            }
        });
    }

    static mfaRequest(email: string, password: string, successCallback: Function, errorCallback: Function = () => {}) {
        Api.postAsync(Api.endpoints.user.actions.mfaRequest, {
            email,
            password
        }).then((response) => {
            if (response.code === 200 || response.code === 204) {
                successCallback && successCallback(response);
            } else {
                Ui.notify(response.data, "error");
                errorCallback && errorCallback(response);
            }
        });
    }
}