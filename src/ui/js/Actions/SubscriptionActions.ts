import {Api} from "../Api/Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {AvailableSubscription} from "../Models/DbModels/finance/AvailableSubscription.ts";
import {Subscription} from "../Models/DbModels/finance/Subscription.ts";
import {CreateSubscriptionActions, loadScript,
    OnApproveActions, OnApproveData, PayPalButtonsComponentOptions, PayPalNamespace} from "@paypal/paypal-js";

const clientId = "AUw6bB-HQTIfqy5fhk-s5wZOaEQdaCIjRnCyIC3WDCRxVKc9Qvz1c6xLw7etCit1CD1qSHY5Pv-3xgQN";
// @ts-ignore
const paypal: PayPalNamespace = await loadScript({
    clientId,
    vault: true,
    intent: "subscription",
});
if (!paypal) {
    console.warn("PayPal SDK could not initialized");
}

export class SubscriptionActions {
    static async startSubscription(id: number, subPlanId: string, optionMessage: Signal<string>) {
        SubscriptionActions.initializeDomForSubStart(id, optionMessage);
        SubscriptionActions.initializePaypalButton(subPlanId, "paypal-button-" + id, optionMessage, async (paypalData: any) => {
            await SubscriptionActions.subscriptionSuccess(paypalData, {
                id,
                subscriptionId: subPlanId,
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
        optionMessage.value = "Click the button below to start your subscription";
    }

    static initializePaypalButton(plan_id: string, button_id: string, message: Signal<string>, onApprove: Function) {
        const buttons = paypal.Buttons!(<PayPalButtonsComponentOptions>{
            createSubscription(data: Record<string, unknown>, actions: CreateSubscriptionActions) {
                return actions.subscription.create({
                    "plan_id": plan_id
                });
            },
            onClick(data: any, actions: any) {
                message.value = "Opened PayPal popup";
            },
            async onApprove(data: OnApproveData, actions: OnApproveActions) {
                await onApprove(data, actions);
            },
            onError(err: Record<string, unknown>) {
                notify("Failed to start subscription: " + err, NotificationType.error);
                message.value = "Failed to start subscription";
            },
            onCancel() {
                notify("Subscription creation cancelled", NotificationType.info);
                message.value = "Subscription creation cancelled";
            },
            style: {
                color: "silver",
                shape: "pill",
                layout: "horizontal",
                tagline: false
            }
        });
        buttons.render("#" + button_id);
    }

    static async subscriptionSuccess(data: any, parameters: any) {
        const res = await Api.postAsync(ApiRoutes.subscribe, {...parameters});
        if (res.code === 200) {
            notify("Subscription started", NotificationType.success);
        } else {
            notify("Error when starting subscription: " + getErrorMessage(res), NotificationType.error);
        }
    }

    static async cancelSubscriptionWithConfirmationAsync(id: number) {
        await Ui.getConfirmationModal(
            "Cancel subscription",
            "Are you sure you want to cancel this subscription?",
            "Yes", "No",
            () => SubscriptionActions.cancelSubscriptionAsync(id),
            () => {}
        );
    }

    static async cancelSubscriptionAsync(id: number) {
        const res = await Api.postAsync(ApiRoutes.unsubscribe, {id});
        if (res.code !== 200) {
            notify("Error while cancelling subscription: " + getErrorMessage(res), NotificationType.error);
            return false;
        }

        notify("Subscription cancelled", NotificationType.success);
        return true;
    }

    static async loadSubscriptionOptions() {
        const res = await Api.getAsync<{
            options: AvailableSubscription[],
            currentSubscription: Subscription|null
        }>(ApiRoutes.getSubscriptionOptions);
        if (res.code !== 200) {
            notify("Failed to load subscription options", NotificationType.error);
            return;
        }

        return res.data;
    }
}