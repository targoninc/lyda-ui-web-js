import { compute, create, nullElement, signal, when } from "@targoninc/jess";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { permissions } from "../../state.ts";
import { Payout } from "@targoninc/lyda-shared/src/Models/db/finance/Payout";
import { PaymentStatus } from "@targoninc/lyda-shared/src/Enums/PaymentStatus";
import { Api } from "../../Api/Api.ts";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import { button } from "@targoninc/jess-components";
import { navigate, reload } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { notify, Ui } from "../../Classes/Ui.ts";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { anonymize } from "../../Classes/Helpers/CustomText.ts";
import { ChartTemplates } from "../generic/ChartTemplates.ts";
import { yearAndMonthByOffset } from "../../Classes/Helpers/Date.ts";
import { downloadFile } from "../../Classes/Util.ts";

export class PayoutTemplates {
    static payoutsPage() {
        const payouts = signal<Payout[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getPayouts(skip.value, filter)
                .then(e => payouts.value = e ?? [])
                .finally(() => loading.value = false);
        }
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Payout history")
                    .build(),
                compute(_ => {
                    return GenericTemplates.searchWithFilter(payouts, PayoutTemplates.payout, skip, loading, load);
                }, permissions),
            ).build();
    }

    static payout(p: Payout) {
        return create("div")
            .classes("flex", "card", "space-outwards")
            .children(
                create("div")
                    .classes("flex-v", p.status !== PaymentStatus.failed ? "positive" : "negative")
                    .children(
                        create("span")
                            .text(currency(p.amount_ct / 100, "USD"))
                            .build(),
                    ).build(),
                create("span")
                    .classes("text-small")
                    .text(Time.agoUpdating(new Date(p.created_at)))
                    .build(),
            ).build()
    }

    static artistRoyaltyActions() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);
        const hasPayableRoyalties = compute(ri => ri && ri.personal.available && ri.personal.available >= 0.5, royaltyInfo);
        const paypalMailExists$ = compute(ri => ri && ri.personal.paypalMail !== null, royaltyInfo);

        return create("div")
            .classes("flex-v", "card")
            .children(
                compute(ri => ri ? PayoutTemplates.royaltyInfo(ri) : nullElement(), royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Payout history",
                            icon: { icon: "account_balance" },
                            onclick: () => navigate(RoutePath.payouts),
                        }),
                        when(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                when(paypalMailExists$, button({
                                    text: "Set PayPal mail",
                                    icon: { icon: "mail" },
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getTextInputModal("Set PayPal mail", "The account you will receive payments with", "", "Save", "Cancel", async (address: string) => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, address);
                                            notify("PayPal mail set", NotificationType.success);
                                            paypalMailExists$.value = true;
                                        }, () => {
                                        }, "mail");
                                    },
                                }), true),
                                when(paypalMailExists$, button({
                                    text: "Remove PayPal mail",
                                    title: "You won't be able to receive payments until you set a mail address again",
                                    icon: { icon: "unsubscribe" },
                                    classes: ["negative"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, "");
                                            notify("PayPal mail removed", NotificationType.success);
                                            paypalMailExists$.value = false;
                                        }, () => {
                                        }, "warning");
                                    },
                                })),
                                when(paypalMailExists$, button({
                                    text: compute(ri => ri ? `Request payout to ${anonymize(ri.personal.paypalMail, 2, 8)}` : "", royaltyInfo),
                                    icon: { icon: "mintmark" },
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Request payment", "Are you sure you want to request a payment?", "Yes", "No", async () => {
                                            await Api.requestPayout();
                                            notify("Payment requested", NotificationType.success);
                                            reload();
                                        }, () => {
                                        }, "wallet");
                                    },
                                })),
                            ).build()),
                    ).build(),
            ).build();
    }

    static royaltyInfo(royaltyInfo: RoyaltyInfo) {
        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("h1")
                            .text(currency(royaltyInfo.personal.available))
                            .title(royaltyInfo.personal.available < 0.5 ? "You need at least 50ct to request a payment" : "")
                            .build(),
                        create("span")
                            .text("Available")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.personal.totalRoyalties) + " Total royalties")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.personal.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.personal.meanTrackRoyalty) + " median track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ChartTemplates.boxPlotChart(royaltyInfo.personal.trackRoyaltyValues, "Average track royalty", "averageTrackRoyaltyChart"),
                    ).build(),
            ).build();
    }

    static globalRoyaltyInfo(royaltyInfo: RoyaltyInfo) {
        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.global.totalRoyalties) + " Total royalties")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.global.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.global.meanTrackRoyalty) + " median track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ChartTemplates.boxPlotChart(royaltyInfo.global.trackRoyaltyValues, "Average track royalty", "averageTrackRoyaltyChart"),
                    ).build(),
            ).build();
    }

    static dataExport() {
        const offset = signal(0);
        const month = compute(yearAndMonthByOffset, offset);
        const types = ["excel", "csv", "json"];
        const selectedTypeIndex = signal(0);

        return create("div")
            .classes("flex-v", "card")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        create("h1")
                            .text("Royalty data export")
                            .build(),
                        create("span")
                            .text(compute(m => `Month: ${m.year}-${m.month}`, month))
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.combinedSelector(types, (i: number) => selectedTypeIndex.value = i, 0),
                                button({
                                    text: "Download",
                                    icon: { icon: "download" },
                                    onclick: async () => {
                                        const royalties = await Api.getRoyaltiesForExport(month.value, types[selectedTypeIndex.value]);
                                        if (royalties) {
                                            let extension = types[selectedTypeIndex.value];
                                            if (extension === "excel") {
                                                extension = "xlsx";
                                            }
                                            downloadFile(`Lyda Royalties ${month.value.year}-${month.value.month}.${extension}`, royalties);
                                        }
                                    },
                                }),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Previous",
                            icon: { icon: "skip_previous" },
                            onclick: () => offset.value += 1,
                        }),
                        button({
                            text: "Next",
                            icon: { icon: "skip_next" },
                            disabled: compute(o => o <= 0, offset),
                            onclick: () => {
                                if (offset.value > 0) {
                                    offset.value -= 1;
                                }
                            },
                        }),
                        button({
                            text: "Current",
                            icon: { icon: "today" },
                            onclick: () => offset.value = 0,
                        }),
                    ).build(),
            ).build();
    }
}