import {Api} from "./Api.mjs";
import {Util} from "./Util.mjs";
import {Ui} from "./Ui.mjs";

export class AuthApi {
    static userExists(email, successCallback = () => {
    }, errorCallback = () => {
    }) {
        Api.getAsync(Api.endpoints.user.userExists, {email: encodeURIComponent(email)}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            } else {
                errorCallback(response.code, response.data);
            }
        });
    }

    static login(email, password, mfaCode, successCallback, errorCallback) {
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

    static user(id, successCallback) {
        Api.getAsync(Api.endpoints.user.get, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            }
        });
    }

    static register(username, displayname, email, password, successCallback, errorCallback) {
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

    static mfaRequest(email, password, successCallback, errorCallback) {
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