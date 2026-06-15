import { compute, create, nullElement, signal, when } from "@targoninc/jess";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { Api } from "../../Api/Api.ts";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import { button } from "@targoninc/jess-components";
import { navigate, reload } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { notify } from "../../Classes/Ui.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { ChartTemplates } from "../generic/ChartTemplates.ts";
import { yearAndMonthByOffset } from "../../Classes/Helpers/Date.ts";
import { downloadFile } from "../../Classes/Util.ts";
import { t } from "../../../locales";
import { TextSize } from "../../Enums/TextSize.ts";
import { paymentsEnabled } from "../../state.ts";
import { StripeService } from "../../Services/StripeService.ts";
import { StripeConnectTemplates } from "./StripeConnectTemplates.ts";

const AVAILABLE_THRESHOLD_USD = 25;

export class PayoutTemplates {
    static artistRoyaltyActions() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        const royaltiesLoading = signal(true);
        const stripeStatus = signal<{ connected: boolean; payoutsEnabled?: boolean } | null>(null);
        const stripeLoading = signal(true);
        const requestLoading = signal(false);

        const loadRoyalties = () => {
            royaltiesLoading.value = true;
            Api.getRoyaltyInfo()
                .then(ri => royaltyInfo.value = ri)
                .finally(() => royaltiesLoading.value = false);
        };
        const loadStripe = () => {
            stripeLoading.value = true;
            StripeService.getAccountStatus()
                .then(d => stripeStatus.value = d)
                .catch(() => stripeStatus.value = { connected: false })
                .finally(() => stripeLoading.value = false);
        };
        loadRoyalties();
        loadStripe();

        const hasPayableRoyalties = compute((ri, pe, sl) => pe && !sl && !!(ri && ri.personal.available && ri.personal.available >= AVAILABLE_THRESHOLD_USD), royaltyInfo, paymentsEnabled, stripeLoading);
        const hasTaxInfo$ = compute(ri => !!(ri && ri.personal.hasTaxInfo), royaltyInfo);
        const stripeConnected$ = compute(s => s?.connected ?? false, stripeStatus);
        const stripePayoutsEnabled$ = compute(s => s?.payoutsEnabled ?? false, stripeStatus);
        const canRequestPayout$ = compute((ri, sc, spe, sl) => {
            if (!ri || !ri.personal.hasTaxInfo || sl) return false;
            if (sc && spe) return true;
            return false;
        }, royaltyInfo, stripeConnected$, stripePayoutsEnabled$, stripeLoading);

        return create("div")
            .classes("flex-v", "card")
            .children(
                StripeConnectTemplates.balanceCard(),
                compute(ri => ri ? PayoutTemplates.royaltyInfo(ri) : nullElement(), royaltyInfo),
                when(royaltiesLoading, GenericTemplates.loadingSpinner()),
                when(hasTaxInfo$, create("a")
                    .classes("error", "clickable")
                    .text(t("TAX_INFO_REQUIRED_FOR_PAYOUT"))
                    .onclick((e: MouseEvent) => {
                        e.preventDefault();
                        navigate(RoutePath.settings);
                        setTimeout(() => document.getElementById("tax-info-section")?.scrollIntoView({ behavior: "smooth" }), 500);
                    })
                    .build(), true),
                when(stripeLoading, GenericTemplates.loadingSpinner()),
                when(compute((sc, sl) => !sc && !sl, stripeConnected$, stripeLoading),
                    create("span").classes("color-dim").text(t("CONNECT_STRIPE_TO_RECEIVE_PAYOUTS")).build()),
                when(compute((sc, spe, sl) => sc && !spe && !sl, stripeConnected$, stripePayoutsEnabled$, stripeLoading),
                    create("span").classes("warning").text(t("STRIPE_PAYOUTS_DISABLED_MSG")).build()),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("TRANSACTIONS"),
                            icon: { icon: "payments" },
                            onclick: () => navigate(RoutePath.transactions),
                        }),
                        when(canRequestPayout$, button({
                            text: t("REQUEST_PAYOUT"),
                            icon: { icon: "mintmark" },
                            classes: ["positive"],
                            disabled: requestLoading,
                            onclick: async () => {
                                await Ui.getConfirmationModal(
                                    t("REQUEST_PAYOUT"),
                                    t("SURE_REQUEST_PAYOUT"),
                                    t("YES"), t("NO"),
                                    async () => {
                                        requestLoading.value = true;
                                        try {
                                            await Api.requestPayout();
                                            notify(t("PAYOUT_REQUESTED"), NotificationType.success);
                                            reload();
                                        } catch (e: any) {
                                            notify(t("PAYOUT_FAILED"), NotificationType.error);
                                        } finally {
                                            requestLoading.value = false;
                                        }
                                    },
                                    () => {},
                                    "wallet"
                                );
                            },
                        })),
                        when(requestLoading, GenericTemplates.loadingSpinner()),
                    ).build(),
                when(compute((ri, pe) => pe && !!(ri && ri.personal.available && ri.personal.available < AVAILABLE_THRESHOLD_USD), royaltyInfo, paymentsEnabled),
                    create("span")
                        .classes("color-dim", "small")
                        .text(compute(ri => ri ? t("PAYOUT_THRESHOLD_NOT_MET", currency(AVAILABLE_THRESHOLD_USD, "USD")) : "", royaltyInfo))
                        .build()),
            ).build();
    }

    static royaltyInfo(royaltyInfo: RoyaltyInfo) {
        return horizontal(
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
                        .classes(TextSize.small)
                        .text(t("TOTAL_ROYALTIES", currency(royaltyInfo.personal.totalRoyalties)))
                        .build(),
                    create("span")
                        .classes(TextSize.small)
                        .text(t("PAID_OUT_AMOUNT", currency(royaltyInfo.personal.paidTotal)))
                        .build(),
                    create("span")
                        .classes(TextSize.small)
                        .text(t("MEDIAN_TRACK_ROYALTY", currency(royaltyInfo.personal.meanTrackRoyalty)))
                        .build(),
                ).build(),
            vertical(
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
        const exportLoading = signal(false);

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
                                    disabled: exportLoading,
                                    onclick: async () => {
                                        exportLoading.value = true;
                                        try {
                                            const royalties = await Api.getRoyaltiesForExport(month.value, types[selectedTypeIndex.value]);
                                            if (royalties) {
                                                let extension = types[selectedTypeIndex.value];
                                                if (extension === "excel") {
                                                    extension = "xlsx";
                                                }
                                                downloadFile(`Lyda Royalties ${month.value.year}-${month.value.month}.${extension}`, royalties);
                                            }
                                        } catch {
                                            notify(t("EXPORT_FAILED"), NotificationType.error);
                                        } finally {
                                            exportLoading.value = false;
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
