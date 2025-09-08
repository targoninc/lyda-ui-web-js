import { compute, create, Signal, signal, signalMap, when } from "@targoninc/jess";
import { button } from "@targoninc/jess-components";
import { currentUser } from "../../state";
import { Time } from "../../Classes/Helpers/Time.ts";
import {
    CredentialDescriptor,
    ExtendedAuthenticatorTransport,
    RegistrationJSON,
} from "@passwordless-id/webauthn/dist/esm/types";
import { registerWebauthnMethod, webauthnLogin } from "../../Classes/Helpers/Webauthn.ts";
import { notify, Ui } from "../../Classes/Ui.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";
import { PublicKey } from "@targoninc/lyda-shared/dist/Models/db/lyda/PublicKey";
import { SettingsTemplates } from "./SettingsTemplates.ts";

export class WebauthnTemplates {
    static devicesSection() {
        const public_keys = compute(u => u?.public_keys ?? [], currentUser);
        const hasCredentials = compute(m => m.length > 0, public_keys);
        const loading = signal(false);
        const message = signal("");

        return create("div")
            .classes("flex-v", "card")
            .children(
                SettingsTemplates.sectionHeading("Passkeys"),
                when(hasCredentials, create("span")
                    .text("You have no passkeys configured")
                    .build(), true),
                when(hasCredentials, create("div")
                    .classes("flex-v")
                    .children(
                        signalMap(public_keys, create("div").classes("flex"), key => create("div")
                            .classes("flex-v", "card")
                            .children(
                                create("span")
                                    .classes("text-large")
                                    .text(key.name)
                                    .build(),
                                create("span")
                                    .text(compute(t => `Created ${t}`, Time.agoUpdating(new Date(key.created_at), true)))
                                    .build(),
                                WebauthnTemplates.webAuthNActions(loading, key, message),
                            ).build()),
                    ).build()),
                button({
                    text: "Add passkey",
                    icon: { icon: "add" },
                    classes: ["positive", "fit-content"],
                    disabled: loading,
                    onclick: async () => {
                        await Ui.getTextInputModal(
                            "Add passkey",
                            "Enter the name for this passkey. Make sure it's something you'll recognize later on.",
                            "",
                            "Add",
                            "Cancel",
                            async (name: string) => {
                                loading.value = true;
                                await Api.getWebauthnChallenge().then(async (res) => {
                                    const user = currentUser.value;
                                    if (!user || !res) {
                                        return;
                                    }
                                    let registration: RegistrationJSON;
                                    try {
                                        registration = await registerWebauthnMethod(user, res.challenge);
                                    } catch (e: any) {
                                        notify(`Error: ${e.message}`, NotificationType.error);
                                        return;
                                    }
                                    Api.registerWebauthnMethod(registration, res.challenge, name).then(() => {
                                        Api.getUserById().then(u => {
                                            currentUser.value = u;
                                        });
                                        notify("Successfully registered passkey", NotificationType.success);
                                    });
                                }).finally(() => loading.value = false);
                            },
                            () => {},
                        );
                    },
                }),
            ).build();
    }

    private static webAuthNActions(loading: Signal<boolean>, key: PublicKey, message: Signal<string>) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                button({
                    text: "Delete",
                    icon: { icon: "delete" },
                    classes: ["negative"],
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.getWebauthnChallenge().then(async (res2) => {
                            if (!res2) {
                                return;
                            }

                            const challenge = res2.challenge;
                            const cred: CredentialDescriptor = {
                                id: key.key_id,
                                transports: key.transports.split(",") as ExtendedAuthenticatorTransport[],
                            };
                            webauthnLogin(challenge, [cred]).then(async (verification) => {
                                await Api.verifyWebauthn(verification, res2.challenge);
                                await Api.deleteWebauthnMethod(key.key_id, res2.challenge);
                                Api.getUserById().then(u => {
                                    currentUser.value = u;
                                });
                            }).catch(e => {
                                message.value = e.message;
                            }).finally(() => {
                                loading.value = false;
                            });
                        }).catch(e => {
                            message.value = e.message;
                        });
                    },
                }),
                when(message, create("span")
                    .text(message)
                    .build()),
            ).build();
    }
}