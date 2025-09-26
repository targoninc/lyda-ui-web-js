import { compute, create, InputType, signal, Signal, signalMap, when } from "@targoninc/jess";
import { UserTotp } from "@targoninc/lyda-shared/src/Models/db/lyda/UserTotp";
import { button, input } from "@targoninc/jess-components";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Ui } from "../../Classes/Ui.ts";
import { Api } from "../../Api/Api.ts";
import { currentUser } from "../../state.ts";
import { Util } from "../../Classes/Util.ts";
import { t } from "../../../locales";

export class TotpTemplates {
    static qrCode(dataUrl: string) {
        return create("div")
            .classes("qr-code")
            .children(
                create("img")
                    .attributes("src", dataUrl)
                    .build(),
            ).build();
    }

    static totpDevices(totpMethods: Signal<UserTotp[]>, loading: Signal<boolean>, userId: Signal<any>) {
        return signalMap(totpMethods, create("div").classes("flex"), method => TotpTemplates.totpMethodInTable(method, loading, userId));
    }

    static totpMethodInTable(method: UserTotp, loading: Signal<boolean>, userId: Signal<any>) {
        const times = compute((c, u) => `${t("CREATED")} ${c}, ${t("UPDATED")} ${u}`, Time.agoUpdating(new Date(method.created_at), true), Time.agoUpdating(new Date(method.updated_at), true));

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("div")
                    .classes("flex", "center-items", "text-small")
                    .children(
                        create("span")
                            .classes("text-large")
                            .text(method.name),
                        when(method.verified, GenericTemplates.verifiedWithDate(method.created_at)),
                    ).build(),
                create("span")
                    .text(times)
                    .build(),
                TotpTemplates.totpMethodActions(method, loading, userId),
            ).build();
    }

    static verifyTotpAddModal(secret: string, qrDataUrl: string) {
        const token = signal("");

        return create("div")
            .classes("flex-v")
            .children(
                TotpTemplates.qrCode(qrDataUrl),
                create("h2")
                    .classes("flex")
                    .text(t("ADD_TOTP"))
                    .build(),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        create("span")
                            .text(secret)
                            .build()
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                input({
                                    type: InputType.text,
                                    name: "token",
                                    placeholder: t("TOKEN"),
                                    attributes: ["autocomplete", "off"],
                                    value: token,
                                    onchange: (v) => token.value = v
                                }),
                            ).build(),
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                button({
                                    text: t("VERIFY"),
                                    icon: {icon: "verified"},
                                    classes: ["positive"],
                                    onclick: async (e) => {
                                        if (!token.value) {
                                            return;
                                        }
                                        await Api.verifyTotp(currentUser.value?.id ?? 0, token.value, "totp").then(() => {
                                            Api.getUserById().then(u => {
                                                currentUser.value = u;
                                            });
                                        });
                                        Util.removeModal();
                                    }
                                }),
                                button({
                                    text: t("CANCEL"),
                                    icon: {icon: "cancel"},
                                    classes: ["negative"],
                                    onclick: async () => {
                                        Util.removeModal();
                                    }
                                }),
                            ).build()
                    ).build()
            ).build();
    }

    private static totpMethodActions(method: UserTotp, loading: Signal<boolean>, userId: Signal<any>) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                when(method.verified, button({
                    text: t("VERIFY"),
                    icon: {icon: "verified"},
                    classes: ["positive"],
                    onclick: async () => {
                        await Ui.getTextInputModal(
                            t("VERIFY_TOTP"),
                            t("ENTER_CODE_TOTP"),
                            "",
                            t("VERIFY"),
                            t("CANCEL"),
                            async (token: string) => {
                                loading.value = true;
                                await Api.verifyTotp(userId.value, token, "totp")
                                    .then(() => {
                                        Api.getUserById().then(u => {
                                            currentUser.value = u;
                                        });
                                    })
                                    .finally(() => (loading.value = false));
                            },
                            () => {}
                        );
                    }
                }), true),
                button({
                    text: t("DELETE"),
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    onclick: async () => {
                        if (!method.verified) {
                            await Ui.getConfirmationModal(
                                t("DELETE_TOTP"),
                                t("DELETE_TOTP_SURE", method.name),
                                t("DELETE"),
                                t("CANCEL"),
                                async () => {
                                    loading.value = true;
                                    await Api.deleteTotpMethod(method.id, "")
                                        .then(() => {
                                            Api.getUserById().then(u => {
                                                currentUser.value = u;
                                            });
                                        })
                                        .finally(() => (loading.value = false));
                                },
                                () => {}
                            );
                            return;
                        }

                        await Ui.getTextInputModal(t("DELETE_TOTP"), t("ENTER_CODE_TOTP"), "", t("DELETE"), t("CANCEL"), async (token: string) => {
                            loading.value = true;
                            await Api.deleteTotpMethod(method.id, token).then(() => {
                                Api.getUserById().then(u => {
                                    currentUser.value = u;
                                });
                            }).finally(() => loading.value = false);
                        }, () => {}, "delete");
                    }
                })
            ).build();
    }
}