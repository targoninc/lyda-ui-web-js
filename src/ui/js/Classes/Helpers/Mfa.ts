import {Signal} from "@targoninc/jess";
import {MfaOption} from "@targoninc/lyda-shared/dist/Enums/MfaOption";
import {notify} from "../Ui.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {webauthnLogin} from "./Webauthn.ts";
import {AuthData} from "../../Templates/LandingPageTemplates.ts";
import { Api } from "../../Api/Api.ts";

function loginWithWebauthn(credentialDescriptors: any, loading: Signal<boolean>, step: Signal<string>, user: Signal<AuthData>) {
    Api.getWebauthnChallenge()
        .then(async (res2) => {
            if (!res2) {
                return;
            }
            const challenge = res2.challenge;
            webauthnLogin(challenge, credentialDescriptors)
                .then(async (verification) => {
                    user.value = {
                        ...user.value,
                        verification,
                        challenge
                    };
                    Api.verifyWebauthn(verification, challenge).then(() => step.value = "logging-in");
                }).catch(e => notify(e.message, NotificationType.error))
                .finally(() => loading.value = false);
        }).catch(e => notify(e.message, NotificationType.error))
        .finally(() => loading.value = false);
}

export function sendMfaRequest(loading: Signal<boolean>, step: Signal<string>, user: Signal<AuthData>, selected: MfaOption) {
    loading.value = true;
    Api.mfaRequest(user.value.email, user.value.password, selected)
        .then(async (res) => {
            if (!res) {
                return;
            }

            if (res.mfa_needed) {
                switch (res.type) {
                    case "webauthn":
                        loginWithWebauthn(res.credentialDescriptors, loading, step, user);
                        break;
                }
            } else {
                step.value = "logging-in";
            }
        }).catch(e => notify(e.message, NotificationType.error))
        .finally(() => loading.value = false);
}