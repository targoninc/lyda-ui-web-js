import {HttpClient, ApiResponse} from "./HttpClient.ts";
import {notify} from "../Classes/Ui.ts";
import {ApiRoutes} from "./ApiRoutes.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {WebauthnVerificationRequest} from "@targoninc/lyda-shared/dist/Models/WebauthnVerificationRequest";
import {AuthenticationJSON, CredentialDescriptor, RegistrationJSON} from "@passwordless-id/webauthn/dist/esm/types";
import {MfaOption} from "@targoninc/lyda-shared/dist/Enums/MfaOption";

export class AuthApi {
    static userExists(email: string, successCallback: Function = () => {
    }, errorCallback: Function = () => {
    }) {
        HttpClient.getAsync(ApiRoutes.userExists, {email: encodeURIComponent(email)}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data);
            } else {
                errorCallback(response.code, response.data);
            }
        });
    }

    static login(email: string, password: string, challenge: string|undefined, successCallback: Function, errorCallback: Function = () => {}) {
        HttpClient.postAsync(ApiRoutes.login, {
            email,
            password,
            challenge
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
        HttpClient.getAsync(ApiRoutes.getUser, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data as User);
            }
        });
    }

    static register(username: string, displayname: string, email: string, password: string, successCallback: Function, errorCallback: Function = () => {}) {
        HttpClient.postAsync(ApiRoutes.register, {
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

    static async requestPasswordReset(email: string): Promise<ApiResponse<any>> {
        return HttpClient.postAsync(ApiRoutes.requestPasswordReset, {
            email
        });
    }

    static async resetPassword(token: string, newPassword: string, newPasswordConfirm: string): Promise<ApiResponse<any>> {
        return HttpClient.postAsync(ApiRoutes.resetPassword, {
            token,
            newPassword,
            newPasswordConfirm
        });
    }

    static async sendActivationEmail() {
        return HttpClient.postAsync(ApiRoutes.sendActivationEmail);
    }

    static async verifyTotp(userId: number, token: string, type?: string) {
        return await HttpClient.postAsync(ApiRoutes.verifyTotp, {
            userId,
            token,
            type
        });
    }

    static async deleteTotpMethod(id: number, token: string) {
        return await HttpClient.postAsync(ApiRoutes.deleteTotp, {
            id,
            token
        });
    }

    static addTotpMethod(name: string) {
        return HttpClient.postAsync<{
            secret: string;
            qrDataUrl: string;
        }>(ApiRoutes.addTotp, {
            name
        });
    }

    static getWebauthnChallenge() {
        return HttpClient.postAsync<WebauthnVerificationRequest>(ApiRoutes.challengeWebauthn);
    }

    static registerWebauthnMethod(registration: RegistrationJSON, challenge: string, name: string) {
        return HttpClient.postAsync(ApiRoutes.registerWebauthn, {
            registration,
            challenge,
            name
        });
    }

    static verifyWebauthn(json: AuthenticationJSON, challenge: string) {
        return HttpClient.postAsync(ApiRoutes.verifyWebauthn, {
            verification: json,
            challenge
        });
    }

    static async deleteWebauthnMethod(key_id: string, challenge: string) {
        return await HttpClient.postAsync(ApiRoutes.deleteWebauthn, {
            key_id,
            challenge
        });
    }

    static async getMfaOptions(email: string, password: string) {
        return await HttpClient.postAsync<{
            userId: number,
            options: { type: MfaOption }[]
        }>(ApiRoutes.mfaOptions, {
            email,
            password
        });
    }

    static mfaRequest(email: string, password: string, method: MfaOption) {
        return HttpClient.postAsync<{
            mfa_needed: boolean;
            type?: MfaOption;
            credentialDescriptors?: CredentialDescriptor[];
            userId?: number;
            user?: User;
        }>(ApiRoutes.requestMfaCode, {
            email,
            password,
            method
        });
    }
}