import { compute, create, nullElement, signal, when } from "@targoninc/jess";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
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
import { t } from "../../../locales";

const AVAILABLE_THRESHOLD_USD = 25;

export class PayoutTemplates {
    static payoutsPage() {
        const payouts = signal<Payout[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getPayouts(skip.value, filter)
                .then(e => payouts.value = e ?? [])
                .finally(() => loading.value = false);
        };
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("PAYOUT_HISTORY"))
                    .build(),
                compute(_ => {
                    return GenericTemplates.searchWithFilter(payouts, PayoutTemplates.payout, skip, loading, load);
                }, permissions),
            ).build();
    }

    static payout(p: Payout) {
        return create("div")
            .classes("flex", "card", "space-between")
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
            ).build();
    }

    static artistRoyaltyActions() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);
        const hasPayableRoyalties = compute(ri => ri && ri.personal.available && ri.personal.available >= AVAILABLE_THRESHOLD_USD, royaltyInfo);
        const paypalMailExists$ = compute(ri => ri && ri.personal.paypalMail !== null, royaltyInfo);

        return create("div")
            .classes("flex-v", "card")
            .children(
                compute(ri => ri ? PayoutTemplates.royaltyInfo(ri) : nullElement(), royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("PAYOUT_HISTORY"),
                            icon: { icon: "account_balance" },
                            onclick: () => navigate(RoutePath.payouts),
                        }),
                        when(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                when(paypalMailExists$, button({
                                    text: t("SET_PAYPAL_MAIL"),
                                    icon: { icon: "mail" },
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getTextInputModal(t("SET_PAYPAL_MAIL"), t("ACCOUNT_RECEIVE_PAYMENTS"), "", t("SAVE"), t("CANCEL"), async (address: string) => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, address);
                                            notify(t("PAYPAL_MAIL_SET"), NotificationType.success);
                                            paypalMailExists$.value = true;
                                        }, () => {
                                        }, "mail");
                                    },
                                }), true),
                                when(paypalMailExists$, button({
                                    text: t("REMOVE_PAYPAL_MAIL"),
                                    title: t("WONT_RECEIVE_PAYMENTS_WITHOUT_MAIL"),
                                    icon: { icon: "unsubscribe" },
                                    classes: ["negative"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal(t("REMOVE_PAYPAL_MAIL"), t("SURE_DELETE_PAYPAL_MAIL"), t("YES"), t("NO"), async () => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, "");
                                            notify(`${t("PAYPAL_MAIL_REMOVED")}`, NotificationType.success);
                                            paypalMailExists$.value = false;
                                        }, () => {
                                        }, "warning");
                                    },
                                })),
                                when(paypalMailExists$, button({
                                    text: compute(ri => ri ? `${t("REQUEST_PAYOUT_TO", anonymize(ri.personal.paypalMail, 2, 8))}` : "", royaltyInfo),
                                    icon: { icon: "mintmark" },
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal(t("REQUEST_PAYOUT"), t("SURE_REQUEST_PAYOUT"), t("YES"), t("NO"), async () => {
                                            await Api.requestPayout();
                                            notify(`${t("PAYOUT_REQUESTED")}`, NotificationType.success);
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
                            .title(royaltyInfo.personal.available < AVAILABLE_THRESHOLD_USD ? `${t("PAYOUT_THRESHOLD_NOT_MET", currency(AVAILABLE_THRESHOLD_USD, "USD"))}` : "")
                            .build(),
                        create("span")
                            .text("Available")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(t("TOTAL_ROYALTIES", currency(royaltyInfo.personal.totalRoyalties)))
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(t("PAID_OUT_AMOUNT", currency(royaltyInfo.personal.paidTotal)))
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(t("MEDIAN_TRACK_ROYALTY", currency(royaltyInfo.personal.meanTrackRoyalty)))
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ChartTemplates.boxPlotChart(royaltyInfo.personal.trackRoyaltyValues, `${t("AVERAGE_TRACK_ROYALTY")}`, "averageTrackRoyaltyChart"),
                    ).build(),
            ).build();
    }

    static globalRoyaltyInfo(royaltyInfo: RoyaltyInfo) {
        return vertical(
            horizontal(
                GenericTemplates.pill({
                    icon: "attach_money",
                    text: t("TOTAL_ROYALTIES", currency(royaltyInfo.global.totalRoyalties)),
                }),
                GenericTemplates.pill({
                    icon: "account_balance",
                    text: t("PAID_OUT_AMOUNT", currency(royaltyInfo.global.paidTotal)),
                }),
                GenericTemplates.pill({
                    icon: "bar_chart",
                    text: t("MEDIAN_TRACK_ROYALTY", currency(royaltyInfo.global.meanTrackRoyalty)),
                }),
            ).build(),
            horizontal(
                GenericTemplates.pill({
                    icon: "group",
                    text: `${t("AMOUNT_USERS", royaltyInfo.global.counts.users)}`,
                }),
                GenericTemplates.pill({
                    icon: "audio_file",
                    text: t("AMOUNT_TRACKS", royaltyInfo.global.counts.tracks),
                }),
                GenericTemplates.pill({
                    icon: "album",
                    text: t("AMOUNT_ALBUMS", royaltyInfo.global.counts.albums),
                }),
                GenericTemplates.pill({
                    icon: "playlist_play",
                    text: t("AMOUNT_PLAYLISTS", royaltyInfo.global.counts.playlists),
                }),
            ).build(),
            ChartTemplates.boxPlotChart(royaltyInfo.global.trackRoyaltyValues, `${t("AVERAGE_TRACK_ROYALTY")}`, "averageTrackRoyaltyChart"),
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
                            .text(t("ROYALTY_DATA_EXPORT"))
                            .build(),
                        create("span")
                            .text(compute(m => `${t("MONTH", m)}`, month))
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.combinedSelector(types, (i: number) => selectedTypeIndex.value = i, 0),
                                button({
                                    text: t("DOWNLOAD"),
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
                            text: t("PREVIOUS"),
                            icon: { icon: "skip_previous" },
                            onclick: () => offset.value += 1,
                        }),
                        button({
                            text: t("NEXT"),
                            icon: { icon: "skip_next" },
                            disabled: compute(o => o <= 0, offset),
                            onclick: () => {
                                if (offset.value > 0) {
                                    offset.value -= 1;
                                }
                            },
                        }),
                        button({
                            text: t("CURRENT"),
                            icon: { icon: "today" },
                            onclick: () => offset.value = 0,
                        }),
                    ).build(),
            ).build();
    }
}