import { notify, Ui } from "../Classes/Ui.ts";
import { Signal } from "@targoninc/jess";
import { reload } from "../Routing/Router.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Api } from "../Api/Api.ts";
import { StripeService } from "../Services/StripeService.ts";
import { t } from "../../locales";

export class SubscriptionActions {
    static async startStripeSubscription(id: number, subPlanId: string, optionMessage: Signal<string>) {
        try {
            optionMessage.value = `${t("REDIRECTING_TO_STRIPE")}`;
            await StripeService.subscribe(id, subPlanId);
        } catch (e: any) {
            notify(`${t("FAILED_STARTING_SUBSCRIPTION_ERROR", e.message)}`, NotificationType.error);
            optionMessage.value = `${t("FAILED_STARTING_SUBSCRIPTION")}`;
        }
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
