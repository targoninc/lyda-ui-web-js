import {Api, ApiResponse} from "./Api.ts";
import {Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "./ApiRoutes.ts";

export class AuthApi {
    static userExists(email: string, successCallback: Function = () => {
    }, errorCallback: Function = () => {
    }) {
        Api.getAsync(ApiRoutes.userExists, {email: encodeURIComponent(email)}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            } else {
                errorCallback(response.code, response.data);
            }
        });
    }

    static login(email: string, password: string, mfaCode: string, successCallback: Function, errorCallback: Function = () => {}) {
        Api.postAsync(ApiRoutes.login, {
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
        Api.getAsync(ApiRoutes.getUser, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            }
        });
    }

    static register(username: string, displayname: string, email: string, password: string, successCallback: Function, errorCallback: Function = () => {}) {
        Api.postAsync(ApiRoutes.register, {
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
        Api.postAsync(ApiRoutes.requestMfaCode, {
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

    static async requestPasswordReset(email: string): Promise<ApiResponse<any>> {
        return Api.postAsync(ApiRoutes.requestPasswordReset, {
            email
        });
    }

    static async resetPassword(token: string, newPassword: string, newPasswordConfirm: string): Promise<ApiResponse<any>> {
        return Api.postAsync(ApiRoutes.resetPassword, {
            token,
            newPassword,
            newPasswordConfirm
        });
    }
}