import { compute, create, signal, when } from "@targoninc/jess";
import { copy } from "../../Classes/Util.ts";
import { GenericTemplates, horizontal } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { notify } from "../../Classes/Ui.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button } from "@targoninc/jess-components";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { PaypalWebhook } from "@targoninc/lyda-shared/src/Models/db/finance/PaypalWebhook";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";

export class EventsTemplates {
    static eventsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canTriggerEventHandling],
            EventsTemplates.eventsPageInternal(),
        );
    }

    private static eventsPageInternal() {
        const events = signal<PaypalWebhook[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getEvents(skip.value, filter)
               .then(e => events.value = e ?? [])
               .finally(() => loading.value = false);
        };
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.searchWithFilter(events, EventsTemplates.event, skip, loading, load, [], "https://developer.paypal.com/api/rest/webhooks/event-names/"),
            ).build();
    }

    static event(event: PaypalWebhook) {
        const typeIconMap: Record<string, string> = {
            "PAYMENT.SALE.COMPLETED": "price_check",
            "BILLING.SUBSCRIPTION.CREATED": "line_start",
            "BILLING.SUBSCRIPTION.ACTIVATED": "line_start_circle",
            "PAYMENT.PAYOUTSBATCH.PROCESSING": "pending",
            "PAYMENT.PAYOUTSBATCH.SUCCESS": "finance_chip",
            "PAYMENT.PAYOUTSBATCH.DENIED": "money_off",
        };

        const resourceId = JSON.parse(event.content).resource?.id;
        const relevantReferenceIdMap: Record<string, Function> = {
            "PAYMENT.SALE.COMPLETED": (e: PaypalWebhook) => JSON.parse(e.content).resource?.billing_agreement_id,
            "BILLING.SUBSCRIPTION.CREATED": (e: PaypalWebhook) => JSON.parse(e.content).resource?.plan_id,
            "BILLING.SUBSCRIPTION.ACTIVATED": (e: PaypalWebhook) => JSON.parse(e.content).resource?.plan_id,
            "PAYMENT.PAYOUTSBATCH.PROCESSING": (e: PaypalWebhook) => JSON.parse(e.content).resource?.batch_header.sender_batch_header.sender_batch_id,
            "PAYMENT.PAYOUTSBATCH.SUCCESS": (e: PaypalWebhook) => JSON.parse(e.content).resource?.batch_header.sender_batch_header.sender_batch_id,
            "PAYMENT.PAYOUTSBATCH.DENIED": (e: PaypalWebhook) => JSON.parse(e.content).resource?.batch_header.sender_batch_header.sender_batch_id,
        };
        const referenceId = (relevantReferenceIdMap[event.type] ?? (() => null))(event);

        return create("div")
            .classes("card", "flex", "space-outwards")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("flex", "align-children", "text-large")
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "data_object",
                                }, () => copy(JSON.stringify(JSON.parse(event.content), null, 2)), t("COPY_CONTENT")),
                                when(typeIconMap[event.type], GenericTemplates.icon(typeIconMap[event.type], true)),
                                create("span")
                                    .text(event.type)
                                    .build(),
                                button({
                                    text: t("TRIGGER"),
                                    icon: { icon: "start" },
                                    classes: ["positive"],
                                    onclick: () => {
                                        Api.triggerEventHandling(event.id).then(() => {
                                            notify(`${t("EVENT_TRIGGERED")}`, NotificationType.success);
                                        }).catch(e => {
                                            notify(`${t("FAILED_EVENT_TRIGGER")}`, NotificationType.error);
                                        });
                                    },
                                }),
                            ).build(),
                        create("div")
                            .classes("flex", "align-children")
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "content_copy",
                                }, () => copy(event.id), t("COPY_ID")),
                                create("span")
                                    .classes("text-small")
                                    .text("E | " + event.id)
                                    .build(),
                                GenericTemplates.roundIconButton({
                                    icon: "content_copy",
                                }, () => copy(resourceId), t("COPY_RESOURCE_ID")),
                                create("span")
                                    .classes("text-small")
                                    .text("R | " + resourceId)
                                    .build(),
                            ).build(),
                        when(referenceId, create("div")
                            .classes("flex", "align-children")
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "fingerprint",
                                }, () => copy(referenceId), t("COPY_REFERENCE_ID")),
                                create("span")
                                    .classes("text-small")
                                    .text(referenceId)
                                    .build(),
                            ).build()),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        horizontal(
                            create("span")
                                .classes("text-small")
                                .text(compute(time => `${t("RECEIVED_AT", time)}`, Time.agoUpdating(event.received_at)))
                                .title(new Date(event.received_at).toLocaleDateString())
                                .build(),
                            create("span")
                                .classes("text-small")
                                .text(compute(time => `${t("UPDATED_AT", time)}`, Time.agoUpdating(event.updated_at)))
                                .title(new Date(event.updated_at).toLocaleDateString())
                                .build(),
                        ).build(),
                    ).build(),
            ).build();
    }
}