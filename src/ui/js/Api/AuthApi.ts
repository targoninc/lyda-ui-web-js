import {Api, ApiResponse} from "./Api.ts";
import {notify} from "../Classes/Ui.ts";
import {ApiRoutes} from "./ApiRoutes.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {User} from "../Models/DbModels/lyda/User.ts";

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
                notify(response.data.error ?? "Unknown error while logging in", NotificationType.error);
                errorCallback(response.code, response.data);
            }
        });
    }

    static user(id: number|null, successCallback: (user: User) => void) {
        Api.getAsync(ApiRoutes.getUser, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data as User);
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
                notify(response.data.error ?? "Unknown error while registering", NotificationType.error);
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
                notify(response.data.error ?? "Unknown error while requesting MFA", NotificationType.error);
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

    static async sendActivationEmail() {
        return Api.postAsync(ApiRoutes.sendActivationEmail);
    }
}