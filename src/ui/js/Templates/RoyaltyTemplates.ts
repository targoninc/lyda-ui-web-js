import {RoyaltyInfo} from "../Models/RoyaltyInfo.ts";
import {create, ifjs, nullElement} from "../../fjsc/src/f2.ts";
import {SelectOption} from "../../fjsc/src/Types.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {RoyaltyMonth} from "../Models/RoyaltyMonth.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {FJSC} from "../../fjsc";
import {notify, Ui} from "../Classes/Ui.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {Permissions} from "../Enums/Permissions.ts";
import {permissions} from "../state.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {currency} from "../Classes/Helpers/Num.ts";
import {StatisticTemplates, usedColors} from "./StatisticTemplates.ts";
import {LogTemplates} from "./LogTemplates.ts";

export class RoyaltyTemplates {
    static artistRoyaltyActions(royaltyInfo: any) {
        const hasPayableRoyalties = royaltyInfo.available && parseFloat(royaltyInfo.available) >= 0.5;
        const paypalMailExistsState = signal(royaltyInfo.paypalMail !== null);
        const visibilityClass = signal(paypalMailExistsState.value ? "visible" : "hidden");
        const invertVisibilityClass = signal(paypalMailExistsState.value ? "hidden" : "visible");
        paypalMailExistsState.onUpdate = (exists) => {
            visibilityClass.value = exists ? "visible" : "hidden";
            invertVisibilityClass.value = exists ? "hidden" : "visible";
        };

        return create("div")
            .classes("flex-v", "card")
            .children(
                RoyaltyTemplates.royaltyInfo(royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        ifjs(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.action(Icons.PAYPAL, "Set PayPal mail", "setPaypalMail", async () => {
                                    await Ui.getTextInputModal("Set PayPal mail", "The account you will receive payments with", "", "Save", "Cancel", async (address: string) => {
                                        const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
                                            key: UserSettings.paypalMail,
                                            value: address
                                        });
                                        if (res.code !== 200) {
                                            notify(getErrorMessage(res), NotificationType.error);
                                            return;
                                        }
                                        notify("PayPal mail set", NotificationType.success);
                                        paypalMailExistsState.value = true;
                                    }, () => {
                                    }, Icons.PAYPAL);
                                }, [], [invertVisibilityClass, "secondary"]),
                                GenericTemplates.action(Icons.PAYPAL, "Remove PayPal mail", "removePaypalMail", async () => {
                                    await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                                        const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
                                            setting: "paypalMail",
                                            value: ""
                                        });
                                        if (res.code !== 200) {
                                            notify(getErrorMessage(res), NotificationType.error);
                                            return;
                                        }
                                        notify("PayPal mail removed", NotificationType.success);
                                        paypalMailExistsState.value = false;
                                    }, () => {
                                    }, Icons.WARNING);
                                }, [], [visibilityClass, "secondary"]),
                                GenericTemplates.action(Icons.PAY, "Request payment", "requestPayment", async () => {
                                    const res = await Api.postAsync(ApiRoutes.requestPayment);
                                    if (res.code !== 200) {
                                        notify(getErrorMessage(res), NotificationType.error);
                                        return;
                                    }
                                    notify("Payment requested", NotificationType.success);
                                }, [], [visibilityClass, "secondary"])
                            ).build())
                    ).build()
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
                            .text(currency(royaltyInfo.available))
                            .title(royaltyInfo.available < 0.5 ? "You need at least 50ct to request a payment" : "")
                            .build(),
                        create("span")
                            .text("Available")
                            .build(),
                    ).build(),
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("h1")
                            .text(currency(royaltyInfo.totalRoyalties))
                            .build(),
                        create("span")
                            .text("Total royalties")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("royalty-info-text", "card", "secondary")
                            .text(currency(royaltyInfo.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("royalty-info-text", "card", "secondary")
                            .text(currency(royaltyInfo.meanTrackRoyalty) + " average track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        StatisticTemplates.boxPlotChart([royaltyInfo.trackRoyaltyValues], "Average track royalty", "averageTrackRoyaltyChart", usedColors)
                    ).build(),
            ).build();
    }

    static royaltyCalculator(royaltyInfo: RoyaltyInfo) {
        const months = royaltyInfo.calculatableMonths.map((m: any) => {
            return <SelectOption>{
                id: m.year * 100 + m.month,
                name: m.year + "-" + m.month + (m.calculated ? " (calculated)" : ""),
            };
        });
        const selectedState = signal(months[0]?.id ?? null);
        const selectedMonth = compute(id => royaltyInfo.calculatableMonths.find(m => m.year * 100 + m.month === id), selectedState);
        const hasEarnings = compute(month => month?.hasEarnings ?? false, selectedMonth);
        const isApproved = compute(month => month?.approved ?? false, selectedMonth);
        const earnings = compute(month => currency((month?.earnings ?? 0) / 100), selectedMonth);
        const artistRoyalties = compute(month => currency((month?.artistRoyalties ?? 0) / 100), selectedMonth);
        const trackRoyalties = compute(month => currency((month?.trackRoyalties ?? 0) / 100), selectedMonth);

        return create("div")
            .classes("flex-v")
            .children(
                RoyaltyTemplates.royaltyActions(months, selectedState, selectedMonth, hasEarnings, isApproved),
                ifjs(hasEarnings, create("div")
                    .classes("flex-v")
                    .children(
                        LogTemplates.signalProperty("Earnings", earnings),
                        LogTemplates.signalProperty("Artist royalties", artistRoyalties),
                        LogTemplates.signalProperty("Track royalties", trackRoyalties),
                    ).build())
            ).build();
    }

    private static royaltyActions(months: SelectOption[], selectedState: Signal<any>, selectedMonth: Signal<RoyaltyMonth | undefined>, hasEarnings: Signal<boolean>, isApproved: Signal<any>) {
        return create("div")
            .classes("flex", "align-children")
            .children(
                FormTemplates.dropDownField("Month", signal(months), selectedState),
                FJSC.button({
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
                FJSC.button({
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
                FJSC.toggle({
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
            ).build();
    }

    static royaltyOverview(royaltyInfo: RoyaltyInfo) {
        if (!royaltyInfo.calculatableMonths) {
            return nullElement();
        }

        const canCalculateRoyalties = compute(p => p.some(p => p.name === Permissions.canCalculateRoyalties), permissions);

        return create("div")
            .children(
                ifjs(canCalculateRoyalties, create("div")
                    .classes("card", "flex-v")
                    .children(
                        create("h2")
                            .text("Royalty overview")
                            .build(),
                        RoyaltyTemplates.royaltyCalculator(royaltyInfo)
                    ).build())
            ).build();
    }
}