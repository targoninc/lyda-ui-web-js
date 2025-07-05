import {HttpClient} from "./HttpClient.ts";
import {ApiRoutes} from "./ApiRoutes.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Api } from "./Api.ts";

export class AuthApi {
    static userExists(email: string, successCallback: Function = () => {
    }, errorCallback: Function = () => {
    }) {
        HttpClient.getAsync(ApiRoutes.userExists, { email: encodeURIComponent(email) }).then(
            response => {
                if (response.code === 200) {
                    successCallback(response.data);
                } else {
                    errorCallback(response.code, response.data);
                }
            }
        );
    }

    static async login(email: string, password: string, challenge: string|undefined, successCallback: Function, errorCallback: Function = () => {}) {
        try {
            const data = await Api.login(email, password, challenge);
            successCallback(data);
        } catch (error) {
            errorCallback(error);
        }
    }

    static user(id: number|null, successCallback: (user: User) => void) {
        HttpClient.getAsync(ApiRoutes.getUser, {id}).then((response) => {
            if (response.code === 200) {
                successCallback(response.data as User);
            }
        });
    }

    static async register(username: string, displayname: string, email: string, password: string, successCallback: Function, errorCallback: Function = () => {}) {
        try {
            await Api.register(username, displayname, email, password);
        } catch (e) {
            errorCallback(e);
        }
        successCallback();
    }
}