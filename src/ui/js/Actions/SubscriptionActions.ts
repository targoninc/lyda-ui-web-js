import {Api} from "../Classes/Api.ts";
import {SubscriptionTemplates} from "../Templates/SubscriptionTemplates.ts";
import {Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Classes/ApiRoutes.ts";

export class SubscriptionActions {
    static clientId = "AUw6bB-HQTIfqy5fhk-s5wZOaEQdaCIjRnCyIC3WDCRxVKc9Qvz1c6xLw7etCit1CD1qSHY5Pv-3xgQN";

    static async startSubscription(id, planId, previousId, optionMessage) {
        const client_id = SubscriptionActions.clientId;
        SubscriptionActions.initializeDomForSubStart(id, previousId, optionMessage);
        SubscriptionActions.initializePaypalButton(client_id, planId, "paypal-button-" + id, optionMessage, async (data) => {
            await SubscriptionActions.subscriptionSuccess(data, {
                id,
                planId,
                orderId: data.orderID,
                subscriptionId: data.subscriptionID
            });
        });
    }

    static initializeDomForSubStart(id, previousId, optionMessage) {
        const subStarters = document.querySelectorAll(".subStarter");
        for (const subStarter of subStarters) {
            subStarter.classList.remove("selected");
        }
        document.querySelector(".subStarter[id=\"" + id + "\"]").classList.add("selected");
        optionMessage.value = "Click the button below to start your subscription";
    }

    static addPaypalSdkIfNotExists(client_id) {
        if (document.getElementById("paypalSdk") === null) {
            const paypalSdk = SubscriptionTemplates.paypalSdk(client_id);
            document.body.appendChild(paypalSdk);
        }
    }

    static initializePaypalButton(client_id, plan_id, button_id, message, onApprove) {
        const buttons = window.paypal.Buttons({
            createSubscription: function (data, actions) {
                return actions.subscription.create({
                    "plan_id": plan_id
                });
            },
            onApprove: function (data, actions) {
                onApprove(data, actions);
            },
            onError: function (err) {
                Ui.notify("Failed to start subscription: " + err, "error");
                message.value = "Failed to start subscription";
            },
            onCancel: function () {
                Ui.notify("Subscription cancelled", "info");
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

    static async subscriptionSuccess(data, parameters) {
        const response = await Api.postAsync(ApiRoutes.subscribe, {...parameters});
        if (response.code === 200) {
            Ui.notify("Subscription started", "success");
        } else {
            Ui.notify(response.data, "error");
        }
    }

    static async cancelSubscriptionWithConfirmationAsync(id) {
        await Ui.getConfirmationModal(
            "Cancel subscription",
            "Are you sure you want to cancel this subscription?",
            "Yes", "No",
            () => SubscriptionActions.cancelSubscriptionAsync(id),
            () => {}
        );
    }

    static async cancelSubscriptionAsync(id) {
        const response = await Api.postAsync(ApiRoutes.unsubscribe, {id});
        if (response.code !== 200) {
            Ui.notify(response.data, "error");
            return false;
        }

        Ui.notify("Subscription cancelled", "success");
        return true;
    }

    static togglePayments(e) {
        const id = e.currentTarget.id.split("_")[1];
        const payments = document.querySelector("#payments_" + id);
        payments.classList.toggle("hidden");
    }

    static async loadSubscriptionOptions() {
        const res = await Api.getAsync(ApiRoutes.getSubscriptionOptions);
        if (res.code !== 200) {
            Ui.notify("Failed to load subscription options", "error");
            return;
        }

        return res.data;
    }
}