import {compute, create, InputType, signal, Signal, when} from "@targoninc/jess";
import { UserTotp } from "@targoninc/lyda-shared/src/Models/db/lyda/UserTotp";
import {currentUser} from "../../state.ts";
import {button} from "@targoninc/jess-components";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {createModal, Ui} from "../../Classes/Ui.ts";

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

    static totpMethodInTable(method: UserTotp, loading: Signal<boolean>, userId: Signal<any>) {
        const times = compute((c, u) => `Created ${c}, updated ${u}`, Time.agoUpdating(new Date(method.created_at), true), Time.agoUpdating(new Date(method.updated_at), true));

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        create("h2")
                            .text(method.name),
                        when(method.verified, GenericTemplates.pill({
                            text: "Verified",
                            icon: "check",
                        }, signal(null), ["green"])),
                    ).build(),
                create("span")
                    .text(times)
                    .build(),
                TotpTemplates.totpMethodActions(method, loading, userId),
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
                        await Ui.getTextInputModal("Verify TOTP method", "Enter the code from this TOTP method", "", "Verify", "Cancel", () => {
                            loading.value = true;
                            /*await Api.verifyTotp(userId.value, token, "totp").then(() => {
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                            }).finally(() => loading.value = false);*/
                        }, () => {});
                    }
                }), true),
                button({
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    onclick: async () => {
                        if (!method.verified) {
                            await Ui.getConfirmationModal("Delete TOTP method", `Are you sure you want to delete TOTP method ${method.name}?`, "Delete", "Cancel", () => {
                                loading.value = true;
                                /*await Api.deleteTotpMethod(method.id, "").then(() => {
                                    Api.getUser().then(u => {
                                        currentUser.value = u;
                                    });
                                }).finally(() => loading.value = false);*/
                            }, () => {
                            });
                            return;
                        }

                        await Ui.getTextInputModal("Delete TOTP method", "Enter the code from this TOTP method to delete it", "", "Delete", "Cancel", () => {
                            loading.value = true;
                            /*await Api.deleteTotpMethod(method.id, token).then(() => {
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                            }).finally(() => loading.value = false);*/
                        }, () => {});
                    }
                })
            ).build();
    }
}