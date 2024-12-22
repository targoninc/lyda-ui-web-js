import {Api} from "../Api/Api.ts";
import {SubscriptionTemplates} from "../Templates/SubscriptionTemplates.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {AvailableSubscription} from "../Models/DbModels/finance/AvailableSubscription.ts";
import {Subscription} from "../Models/DbModels/finance/Subscription.ts";

export class SubscriptionActions {
    static clientId = "AUw6bB-HQTIfqy5fhk-s5wZOaEQdaCIjRnCyIC3WDCRxVKc9Qvz1c6xLw7etCit1CD1qSHY5Pv-3xgQN";

    static async startSubscription(id: number, planId: string, optionMessage: Signal<string>) {
        const client_id = SubscriptionActions.clientId;
        SubscriptionActions.initializeDomForSubStart(id, optionMessage);
        SubscriptionActions.initializePaypalButton(client_id, planId, "paypal-button-" + id, optionMessage, async (data: any) => {
            await SubscriptionActions.subscriptionSuccess(data, {
                id,
                planId,
                orderId: data.orderID,
                subscriptionId: data.subscriptionID
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

    static addPaypalSdkIfNotExists(client_id: string) {
        if (document.getElementById("paypalSdk") === null) {
            const paypalSdk = SubscriptionTemplates.paypalSdk(client_id);
            document.body.appendChild(paypalSdk);
        }
    }

    static initializePaypalButton(client_id: string, plan_id: string, button_id: string, message: Signal<string>, onApprove: Function) {
        const buttons = window.paypal.Buttons({
            createSubscription: function (data: any, actions: any) {
                return actions.subscription.create({
                    "plan_id": plan_id
                });
            },
            onApprove: function (data: any, actions: any) {
                onApprove(data, actions);
            },
            onError: function (err: any) {
                notify("Failed to start subscription: " + err, NotificationType.error);
                message.value = "Failed to start subscription";
            },
            onCancel: function () {
                notify("Subscription cancelled", NotificationType.info);
                message.value = "Subscription cancelled";
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

    static async cancelSubscriptionAsync(id: string) {
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