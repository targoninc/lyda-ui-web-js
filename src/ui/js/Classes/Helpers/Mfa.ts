import {Signal} from "@targoninc/jess";
import {MfaOption} from "@targoninc/lyda-shared/dist/Enums/MfaOption";
import {AuthApi} from "../../Api/AuthApi.ts";
import {notify} from "../Ui.ts";
import {getErrorMessage} from "../Util.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {webauthnLogin} from "./Webauthn.ts";
import {AuthData} from "../../Templates/LandingPageTemplates.ts";

function loginWithWebauthn(credentialDescriptors: any, loading: Signal<boolean>, step: Signal<string>, user: Signal<AuthData>) {
    AuthApi.getWebauthnChallenge()
        .then(async (res2) => {
            if (res2.code !== 200) {
                notify(getErrorMessage(res2), NotificationType.error);
                return;
            }
            const challenge = res2.data.challenge;
            webauthnLogin(challenge, credentialDescriptors)
                .then(async (verification) => {
                    user.value = {
                        ...user.value,
                        verification,
                        challenge
                    };
                    step.value = "logging-in";
                }).catch(e => notify(e.message, NotificationType.error))
                .finally(() => loading.value = false);
        }).catch(e => notify(e.message, NotificationType.error))
        .finally(() => loading.value = false);
}

export function sendMfaRequest(loading: Signal<boolean>, step: Signal<string>, user: Signal<AuthData>, selected: MfaOption) {
    loading.value = true;
    AuthApi.mfaRequest(user.value.email, user.value.password, selected)
        .then(async (res) => {
            if (res.data.mfa_needed) {
                switch (res.data.type) {
                    case "webauthn":
                        loginWithWebauthn(res.data.credentialDescriptors, loading, step, user);
                        break;
                }
            } else {
                step.value = "logging-in";
            }
        }).catch(e => notify(e.message, NotificationType.error))
        .finally(() => loading.value = false);
}