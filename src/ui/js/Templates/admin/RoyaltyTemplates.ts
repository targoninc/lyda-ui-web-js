import { compute, create, nullElement, Signal, signal, when } from "@targoninc/jess";
import { FormTemplates } from "../generic/FormTemplates.ts";
import { notify } from "../../Classes/Ui.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { permissions } from "../../state.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { LogTemplates } from "./LogTemplates.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, SelectOption, toggle } from "@targoninc/jess-components";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import { RoyaltyMonth } from "@targoninc/lyda-shared/src/Models/RoyaltyMonth";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";

export class RoyaltyTemplates {
    static royaltyCalculator(royaltyInfo: RoyaltyInfo, refresh: () => void) {
        const months = royaltyInfo.calculatableMonths.map((m: any) => {
            return <SelectOption>{
                id: (m.year * 100 + m.month).toString(),
                name: m.year + "-" + m.month + (m.calculated ? " (calculated)" : ""),
            };
        });
        const selectedState = signal<string>(months[0]?.id ?? null);
        const selectedMonth = compute(id => royaltyInfo.calculatableMonths.find(m => (m.year * 100 + m.month).toString() === id), selectedState);
        const hasEarnings = compute(month => month?.hasEarnings ?? false, selectedMonth);
        const isApproved = compute(month => month?.approved ?? false, selectedMonth);
        const earnings = compute(month => currency((month?.earnings ?? 0) / 100), selectedMonth);
        const artistRoyalties = compute(month => currency((month?.artistRoyalties ?? 0) / 100), selectedMonth);
        const trackRoyalties = compute(month => currency((month?.trackRoyalties ?? 0) / 100), selectedMonth);

        return create("div")
            .classes("flex-v")
            .children(
                RoyaltyTemplates.royaltyActions(months, selectedState, selectedMonth, hasEarnings, isApproved, refresh),
                when(hasEarnings, create("div")
                    .classes("flex-v")
                    .children(
                        LogTemplates.signalProperty("Earnings", earnings),
                        LogTemplates.signalProperty("Artist royalties", artistRoyalties),
                        LogTemplates.signalProperty("Track royalties", trackRoyalties),
                    ).build())
            ).build();
    }

    private static royaltyActions(months: SelectOption[], selectedState: Signal<string>, selectedMonth: Signal<RoyaltyMonth | undefined>,
                                  hasEarnings: Signal<boolean>, isApproved: Signal<any>, refresh: () => void) {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        FormTemplates.dropDownField("Month", signal(months), selectedState),
                    ).build(),
                compute(month => {
                    if (!month) {
                        return nullElement();
                    }

                    return create("div")
                        .classes("flex", "align-children")
                        .children(
                            create("span")
                                .text(`Available actions for ${month.year}-${month.month}:`)
                                .build(),
                            button({
                                text: "Calculate earnings",
                                icon: { icon: "account_balance" },
                                classes: ["positive"],
                                onclick: async () => {
                                    await Api.calculateEarnings(month);
                                    notify("Earnings calculated", NotificationType.success);
                                    refresh();
                                },
                            }),
                            when(hasEarnings, button({
                                text: "Calculate royalties",
                                icon: { icon: "calculate" },
                                classes: ["positive"],
                                onclick: async () => {
                                    await Api.calculateRoyalties(month);
                                    notify("Royalties calculated", NotificationType.success);
                                    refresh();
                                }
                            })),
                            when(hasEarnings, toggle({
                                text: "Royalties approved and visible",
                                checked: isApproved,
                                onchange: async (v) => {
                                    await Api.setRoyaltyActivation(month, v);
                                    notify("Switched approval status", NotificationType.success);
                                    refresh();
                                }
                            }))
                        ).build();
                }, selectedMonth),
            ).build();
    }

    static royaltyManagement() {
        const royaltyInfo = signal<any>(null);
        const refresh = () => {
            Api.getRoyaltyInfo().then(res => {
                if (res) {
                    royaltyInfo.value = res;
                }
            });
        };
        refresh();

        return create("div")
            .classes("flex-v")
            .children(
                compute(r => r ? RoyaltyTemplates.royaltyOverview(r, refresh) : nullElement(), royaltyInfo),
            ).build();
    }

    static royaltyOverview(royaltyInfo: RoyaltyInfo, refresh: () => void) {
        if (!royaltyInfo.calculatableMonths) {
            return nullElement();
        }

        const canCalculateRoyalties = compute(p => p.some(p => p.name === Permissions.canCalculateRoyalties), permissions);

        return create("div")
            .children(
                when(canCalculateRoyalties, create("div")
                    .classes("card", "flex-v")
                    .children(
                        create("h2")
                            .text("Royalty overview")
                            .build(),
                        RoyaltyTemplates.royaltyCalculator(royaltyInfo, refresh),
                    ).build())
            ).build();
    }

    static royaltyManagementPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canCalculateRoyalties],
            RoyaltyTemplates.royaltyManagement()
        );
    }
}