import {compute, Signal, signal, create, when, nullElement} from "@targoninc/jess";
import {FormTemplates} from "../generic/FormTemplates.ts";
import {notify} from "../../Classes/Ui.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {getErrorMessage} from "../../Classes/Util.ts";
import {Permissions} from "@targoninc/lyda-shared/dist/Enums/Permissions";
import {permissions} from "../../state.ts";
import {currency} from "../../Classes/Helpers/Num.ts";
import {LogTemplates} from "./LogTemplates.ts";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {button, SelectOption, toggle } from "@targoninc/jess-components";
import {RoyaltyInfo} from "@targoninc/lyda-shared/dist/Models/RoyaltyInfo";
import {RoyaltyMonth} from "@targoninc/lyda-shared/dist/Models/RoyaltyMonth";
import {NotificationType} from "../../Enums/NotificationType.ts";

export class RoyaltyTemplates {
    static royaltyCalculator(royaltyInfo: RoyaltyInfo) {
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
                RoyaltyTemplates.royaltyActions(months, selectedState, selectedMonth, hasEarnings, isApproved),
                when(hasEarnings, create("div")
                    .classes("flex-v")
                    .children(
                        LogTemplates.signalProperty("Earnings", earnings),
                        LogTemplates.signalProperty("Artist royalties", artistRoyalties),
                        LogTemplates.signalProperty("Track royalties", trackRoyalties),
                    ).build())
            ).build();
    }

    private static royaltyActions(months: SelectOption[], selectedState: Signal<string>, selectedMonth: Signal<RoyaltyMonth | undefined>, hasEarnings: Signal<boolean>, isApproved: Signal<any>) {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        FormTemplates.dropDownField("Month", signal(months), selectedState),
                    ).build(),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        button({
                            text: "Calculate earnings",
                            icon: {icon: "account_balance"},
                            classes: ["positive"],
                            onclick: async () => {
                                const month = selectedMonth.value;
                                if (!month) {
                                    notify("Please select a month", NotificationType.error);
                                    return;
                                }
                                const res = await Api.postAsync(ApiRoutes.calculateEarnings, {
                                    month: month.month,
                                    year: month.year,
                                });
                                if (res.code !== 200) {
                                    notify(getErrorMessage(res), NotificationType.error);
                                    return;
                                }
                                notify("Earnings calculated", NotificationType.success);
                            }
                        }),
                        button({
                            text: "Calculate royalties",
                            icon: {icon: "calculate"},
                            classes: ["positive"],
                            disabled: compute(has => !has, hasEarnings),
                            onclick: async () => {
                                const month = selectedMonth.value;
                                if (!month) {
                                    notify("Please select a month", NotificationType.error);
                                    return;
                                }
                                const res = await Api.postAsync(ApiRoutes.calculateRoyalties, {
                                    month: month.month,
                                    year: month.year,
                                });
                                if (res.code !== 200) {
                                    notify(getErrorMessage(res), NotificationType.error);
                                    return;
                                }
                                notify("Royalties calculated", NotificationType.success);
                            }
                        }),
                        toggle({
                            text: "Approve monthly earnings",
                            checked: isApproved,
                            onchange: async (v) => {
                                const month = selectedMonth.value;
                                if (!month) {
                                    notify("Please select a month", NotificationType.error);
                                    return;
                                }
                                await Api.postAsync(ApiRoutes.setRoyaltyActivation, {
                                    month: month.month,
                                    year: month.year,
                                    approved: v,
                                });
                                notify("Switched approval status", NotificationType.success);
                            }
                        })
                    ).build(),
            ).build();
    }

    static royaltyManagement() {
        const royaltyInfo = signal<any>(null);
        Api.getAsync<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo).then(res => {
            if (res.data) {
                royaltyInfo.value = res.data;
            }
        });

        return create("div")
            .classes("flex-v")
            .children(
                compute(r => r ? RoyaltyTemplates.royaltyOverview(r) : nullElement(), royaltyInfo)
            ).build();
    }

    static royaltyOverview(royaltyInfo: RoyaltyInfo) {
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
                        RoyaltyTemplates.royaltyCalculator(royaltyInfo)
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