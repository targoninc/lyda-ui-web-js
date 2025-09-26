import { compute, create, nullElement, signal, when } from "@targoninc/jess";
import { notify } from "../../Classes/Ui.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { permissions } from "../../state.ts";
import { LogTemplates } from "./LogTemplates.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, toggle } from "@targoninc/jess-components";
import { RoyaltyMonth } from "@targoninc/lyda-shared/src/Models/RoyaltyMonth";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";
import { GenericTemplates, vertical } from "../generic/GenericTemplates.ts";
import { MonthIdentifier } from "../../Classes/Helpers/Date.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import {t} from "../../../locales";

export class RoyaltyTemplates {
    static royaltyCalculator(month: Partial<RoyaltyMonth>, monthIdentifier: MonthIdentifier, refresh: () => void) {
        return create("div")
            .classes("flex-v")
            .children(
                RoyaltyTemplates.royaltyActions(monthIdentifier, month.hasEarnings ?? false, month.approved ?? false, refresh),
                when(month.hasEarnings ?? false, create("div")
                    .classes("flex-v")
                    .children(
                        LogTemplates.property(t("EARNINGS"), currency((month.earnings ?? 0) / 100, "USD")),
                        LogTemplates.property(t("ARTIST_ROYALTIES"), currency((month.artistRoyalties ?? 0) / 100, "USD")),
                        LogTemplates.property(t("TRACK_ROYALTIES"), currency((month.trackRoyalties ?? 0) / 100, "USD")),
                    ).build()),
            ).build();
    }

    private static royaltyActions(monthIdentifier: MonthIdentifier,
                                  hasEarnings: boolean, isApproved: boolean, refresh: () => void) {
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
                            text: t("CALCULATE_EARNINGS"),
                            icon: { icon: "account_balance" },
                            classes: ["positive"],
                            onclick: async () => {
                                await Api.calculateEarnings(monthIdentifier);
                                notify(`${t("EARNINGS_CALCULATED")}`, NotificationType.success);
                                refresh();
                            },
                        }),
                        when(hasEarnings, button({
                            text: t("CALCULATE_ROYALTIES"),
                            icon: { icon: "calculate" },
                            classes: ["positive"],
                            onclick: async () => {
                                await Api.calculateRoyalties(monthIdentifier);
                                notify(`${t("ROYALTIES_CALCULATED")}`, NotificationType.success);
                                refresh();
                            },
                        })),
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
        const monthOffset = signal(0);
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
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text(t("ROYALTY_OVERVIEW"))
                    .build(),
                RoyaltyTemplates.royaltyCalculator(royaltyMonth, monthIdentifier, refresh),
            ).build();
    }

    static royaltyManagementPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canCalculateRoyalties],
            RoyaltyTemplates.royaltyManagement(),
        );
    }
}