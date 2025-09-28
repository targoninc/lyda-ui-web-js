import { notify, Ui } from "../Classes/Ui.ts";
import { Signal } from "@targoninc/jess";
import {
    CreateSubscriptionActions,
    loadScript,
    OnApproveActions,
    OnApproveData,
    PayPalButtonsComponentOptions,
} from "@paypal/paypal-js";
import { reload } from "../Routing/Router.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Subscription } from "@targoninc/lyda-shared/src/Models/db/finance/Subscription";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";

const clientId = "AUw6bB-HQTIfqy5fhk-s5wZOaEQdaCIjRnCyIC3WDCRxVKc9Qvz1c6xLw7etCit1CD1qSHY5Pv-3xgQN";
const paypal = (await loadScript({
    clientId,
    vault: true,
    intent: "subscription",
}));
if (!paypal) {
    console.warn("PayPal SDK could not be initialized");
}

export class SubscriptionActions {
    static async startSubscription(id: number, subPlanId: string, optionMessage: Signal<string>) {
        SubscriptionActions.initializeDomForSubStart(id, optionMessage);
        SubscriptionActions.initializePaypalButton(subPlanId, "paypal-button-" + id, optionMessage, async (paypalData: any) => {
            await SubscriptionActions.subscriptionSuccess({
                id,
                planId: subPlanId,
                orderId: paypalData.orderID,
                externalSubscriptionId: paypalData.subscriptionID
            });
        });
    }

    static initializeDomForSubStart(id: number, optionMessage: Signal<string>) {
        const subStarter = document.querySelector(".subStarter[id=\"" + id + "\"]");
        if (!subStarter) {
            console.warn("Could not find subStarter with id " + id);
            return;
        }
        subStarter.classList.add("selected");
        optionMessage.value = `${t("CLICK_BUTTON_BELOW_START_SUBSCRIPTION")}`;
    }

    static initializePaypalButton(plan_id: string, button_id: string, message: Signal<string>, onApprove: Function) {
        const buttons = paypal?.Buttons!(<PayPalButtonsComponentOptions>{
            createSubscription(_: Record<string, unknown>, actions: CreateSubscriptionActions) {
                return actions.subscription.create({
                    "plan_id": plan_id
                });
            },
            onClick() {
                message.value = `${t("OPENED_PAYPAL_POPUP")}`;
            },
            async onApprove(data: OnApproveData, actions: OnApproveActions) {
                await onApprove(data, actions);
            },
            onError(err: Record<string, unknown>) {
                notify(`${t("FAILED_STARTING_SUBSCRIPTION_ERROR", err)}`, NotificationType.error);
                message.value = `${t("FAILED_STARTING_SUBSCRIPTION")}`;
            },
            onCancel() {
                notify(`${t("SUSBCRIPTION_CREATION_CANCELLED")}`, NotificationType.info);
                message.value = `${t("SUSBCRIPTION_CREATION_CANCELLED")}`;
            },
            style: {
                color: "silver",
                shape: "pill",
                layout: "horizontal",
                tagline: false
            }
        });
        buttons?.render("#" + button_id);
    }

    static async subscriptionSuccess(parameters: any) {
        await Api.subscribe(parameters);
        notify(`${t("SUBSCRIPTION_STARTED")}`, NotificationType.success);
        reload();
    }

    static async cancelSubscriptionWithConfirmationAsync(subscriptionId: number) {
        await Ui.getConfirmationModal(
            t("CANCEL_SUBSCRIPTION"),
            t("SURE_CANCEL_SUBSCRIPTION"),
            t("YES"), t("NO"),
            () => SubscriptionActions.cancelSubscriptionAsync(subscriptionId),
            () => {},
            "contract_delete"
        );
    }

    static async cancelSubscriptionAsync(id: number) {
        await Api.unsubscribe(id);
        notify(`${t("SUBSCRIPTION_CANCELLED")}`, NotificationType.success);
        reload();
        return true;
    }

    static async loadSubscriptionOptions() {
        return (await Api.getSubscriptionOptions()) ?? {
            options: [],
            currentSubscription: null
        };
    }
}

export function getSubscriptionLink(subscription: Subscription|null) {
    if (!subscription) {
        return "";
    }

    const providerLinkMap: Record<string, string> = {
        paypal: "https://www.paypal.com/myaccount/autopay/connect/",
    };
    return providerLinkMap["paypal"] + subscription.external_subscription_id;
}