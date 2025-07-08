import { Api } from "./Api.ts";

export class AuthApi {
    static userExists(email: string, successCallback: Function = () => {
    }, errorCallback: Function = () => {
    }) {
        Api.userExists(email)
            .then(user => successCallback(user))
            .catch((e) => errorCallback(e));
    }

    static async login(email: string, password: string, challenge: string|undefined, successCallback: Function, errorCallback: Function = () => {}) {
        try {
            const data = await Api.login(email, password, challenge);
            successCallback(data);
        } catch (error) {
            errorCallback(error);
        }
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