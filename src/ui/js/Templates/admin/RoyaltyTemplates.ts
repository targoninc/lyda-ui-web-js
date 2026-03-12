import { compute, create, nullElement, signal, signalMap, when } from "@targoninc/jess";
import { notify } from "../../Classes/Ui.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { permissions } from "../../state.ts";
import { LogTemplates } from "./LogTemplates.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, toggle } from "@targoninc/jess-components";
import { RoyaltyMonth } from "@targoninc/lyda-shared/src/Models/RoyaltyMonth";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";
import { GenericTemplates, tabSelected, vertical } from "../generic/GenericTemplates.ts";
import { MonthIdentifier } from "../../Classes/Helpers/Date.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import {t} from "../../../locales";
import { TableTemplates } from "../generic/TableTemplates.ts";
import { ArtistRoyaltySummary } from "@targoninc/lyda-shared/src/Models/ArtistRoyaltySummary.ts";

export class RoyaltyTemplates {
    static royaltyCalculator(month: Partial<RoyaltyMonth>, monthIdentifier: MonthIdentifier, refresh: () => void) {
        return create("div")
            .classes("flex-v")
            .children(
                RoyaltyTemplates.royaltyActions(monthIdentifier, month.hasEarnings ?? false, month.approved ?? false, refresh),
                when(month.hasEarnings ?? false, create("div")
                    .classes("flex-v")
                    .children(
                        LogTemplates.property(t("STREAMING_EARNINGS"), currency((month.streamingEarnings ?? 0) / 100, "USD")),
                        LogTemplates.property(t("SALE_EARNINGS"), currency((month.saleEarnings ?? 0) / 100, "USD")),
                        LogTemplates.property(t("ARTIST_ROYALTIES"), currency((month.artistRoyalties ?? 0) / 100, "USD")),
                        LogTemplates.property(t("TRACK_ROYALTIES"), currency((month.trackRoyalties ?? 0) / 100, "USD")),
                    ).build()),
            ).build();
    }

    private static royaltyActions(monthIdentifier: MonthIdentifier,
                                  hasEarnings: boolean, isApproved: boolean, refresh: () => void) {
        const activeClass = hasEarnings ? "active" : "_";

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        create("span")
                            .text(t("AVAILABLE_ACTIONS_FOR_MONTH", monthIdentifier))
                            .build(),
                        button({
                            text: t("CALCULATE_ROYALTIES"),
                            icon: { icon: "account_balance" },
                            classes: [activeClass],
                            onclick: async () => {
                                await Api.calculateRoyalties(monthIdentifier);
                                notify(`${t("ROYALTIES_CALCULATED")}`, NotificationType.success);
                                refresh();
                            },
                        }),
                        when(hasEarnings, toggle({
                            text: t("ROYALTIES_APPROVED"),
                            checked: isApproved,
                            onchange: async (v) => {
                                await Api.setRoyaltyActivation(monthIdentifier, v);
                                notify(`${t("ROYALTIES_APPROVAL_SWITCHED")}`, NotificationType.success);
                                refresh();
                            },
                        })),
                    ).build(),
            ).build();
    }

    static royaltyManagement() {
        const monthOffset = signal(10);
        const selectableMonths = signal(Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
        }));
        const selectedMonth = compute((mo, sm) => sm.at(-Math.abs(mo) - 1)!, monthOffset, selectableMonths);
        const month = signal<Partial<RoyaltyMonth> | null>(null);
        const refresh = () => {
            Api.getRoyaltyCalculationInfo(selectedMonth.value).then(res => {
                if (res) {
                    month.value = res;
                }
            });
        };
        selectedMonth.subscribe(refresh);
        refresh();
        const canCalculateRoyalties = compute(p => p.some(p => p.name === Permissions.canCalculateRoyalties), permissions);

        return create("div")
            .classes("flex-v")
            .children(
                compute(sm => GenericTemplates.combinedSelector(sm.map(m => `${m.year}-${m.month}`).reverse(), i => {
                    monthOffset.value = i;
                }), selectableMonths),
                when(canCalculateRoyalties, vertical(
                    compute((rm, sm) => rm ? RoyaltyTemplates.royaltyOverview(rm, sm, refresh) : nullElement(), month, selectedMonth),
                ).build()),
            ).build();
    }

    static royaltyOverview(royaltyMonth: Partial<RoyaltyMonth>, monthIdentifier: MonthIdentifier, refresh: () => void) {
        const selectedTab = signal(0);
        const artistsByMonth = signal<ArtistRoyaltySummary[]>([]);
        const artistsAvailable = signal<ArtistRoyaltySummary[]>([]);

        Api.getRoyaltyArtistsByMonth(monthIdentifier).then(res => {
            if (res) artistsByMonth.value = res;
        });
        Api.getRoyaltyArtistsAvailable().then(res => {
            if (res) artistsAvailable.value = res;
        });

        const tabs = [`${t("ROYALTIES_THIS_MONTH")}`, `${t("ROYALTIES_AVAILABLE")}`];

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text(t("ROYALTY_OVERVIEW"))
                    .build(),
                RoyaltyTemplates.royaltyCalculator(royaltyMonth, monthIdentifier, refresh),
                GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i),
                when(
                    tabSelected(selectedTab, 0),
                    RoyaltyTemplates.artistRoyaltiesTable(artistsByMonth),
                ),
                when(
                    tabSelected(selectedTab, 1),
                    RoyaltyTemplates.artistRoyaltiesTable(artistsAvailable),
                ),
            ).build();
    }

    private static artistRoyaltiesTable(artists: ReturnType<typeof signal<ArtistRoyaltySummary[]>>) {
        return TableTemplates.table(
            false,
            TableTemplates.tableHeaders<ArtistRoyaltySummary>([
                { title: t("ARTIST"), property: "displayname" },
                { title: t("AMOUNT"), property: "amount_ct" },
            ]),
            signalMap(
                artists,
                create("tbody"),
                (a: ArtistRoyaltySummary) => TableTemplates.tr({
                    cellClasses: [],
                    data: [
                        create("span").text(a.displayname).build(),
                        create("span").text(currency(a.amount_ct / 100, "USD")).build(),
                    ],
                }),
            ),
        );
    }

    static royaltyManagementPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canCalculateRoyalties],
            RoyaltyTemplates.royaltyManagement(),
        );
    }
}