import { compute, create, InputType, signal, Signal, signalMap, when } from "@targoninc/jess";
import { UserTotp } from "@targoninc/lyda-shared/src/Models/db/lyda/UserTotp";
import { button, input } from "@targoninc/jess-components";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {Ui} from "../../Classes/Ui.ts";
import { Api } from "../../Api/Api.ts";
import { currentUser } from "../../state.ts";
import { Util } from "../../Classes/Util.ts";

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
        const times = compute((c, u) => `Created ${c}, updated ${u}`, Time.agoUpdating(new Date(method.created_at), true), Time.agoUpdating(new Date(method.updated_at), true));

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
                    .text("Add TOTP method")
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
                                    placeholder: "Token",
                                    attributes: ["autocomplete", "off"],
                                    value: token,
                                    onchange: (v) => token.value = v
                                }),
                            ).build(),
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                button({
                                    text: "Verify",
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
                                    text: "Cancel",
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
                    text: "Verify",
                    icon: {icon: "verified"},
                    classes: ["positive"],
                    onclick: async () => {
                        await Ui.getTextInputModal(
                            "Verify TOTP method",
                            "Enter the code from this TOTP method",
                            "",
                            "Verify",
                            "Cancel",
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
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    onclick: async () => {
                        if (!method.verified) {
                            await Ui.getConfirmationModal(
                                "Delete TOTP method",
                                `Are you sure you want to delete TOTP method ${method.name}?`,
                                "Delete",
                                "Cancel",
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

                        await Ui.getTextInputModal("Delete TOTP method", "Enter the code from this TOTP method to delete it", "", "Delete", "Cancel", async (token: string) => {
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