import {compute, Signal, signal} from "../../../fjsc/src/signals.ts";
import {PaypalWebhook} from "../../Models/DbModels/finance/PaypalWebhook.ts";
import {create, ifjs, signalMap} from "../../../fjsc/src/f2.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {FJSC} from "../../../fjsc";
import {copy, target} from "../../Classes/Util.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {notify} from "../../Classes/Ui.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {InputType} from "../../../fjsc/src/Types.ts";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";

export class EventsTemplates {
    static eventsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canTriggerEventHandling],
            EventsTemplates.eventsPageInternal()
        );
    }

    private static eventsPageInternal() {
        const events = signal<PaypalWebhook[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getAsync<PaypalWebhook[]>(ApiRoutes.getEvents, {
                skip: skip.value,
                ...(filter ?? {})
            }).then(e => events.value = e.data)
                .finally(() => loading.value = false);
        }
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
                                    icon: "data_object"
                                }, () => copy(JSON.stringify(JSON.parse(event.content), null, 2)), "Copy content"),
                                ifjs(typeIconMap[event.type], GenericTemplates.icon(typeIconMap[event.type], true)),
                                create("span")
                                    .text(event.type)
                                    .build(),
                                FJSC.button({
                                    text: "Trigger",
                                    icon: {icon: "start"},
                                    classes: ["positive"],
                                    onclick: () => {
                                        Api.postAsync(ApiRoutes.triggerEventHandling, {
                                            id: event.id,
                                        }).then(() => {
                                            notify("Event triggered", NotificationType.success);
                                        }).catch(e => {
                                            notify("Failed to trigger event: " + e, NotificationType.error);
                                        });
                                    }
                                }),
                            ).build(),
                        create("div")
                            .classes("flex", "align-children")
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "content_copy"
                                }, () => copy(event.id), "Copy ID"),
                                create("span")
                                    .classes("text-small")
                                    .text("E | " + event.id)
                                    .build(),
                                GenericTemplates.roundIconButton({
                                    icon: "content_copy"
                                }, () => copy(resourceId), "Copy resource ID"),
                                create("span")
                                    .classes("text-small")
                                    .text("R | " + resourceId)
                                    .build(),
                            ).build(),
                        ifjs(referenceId, create("div")
                            .classes("flex", "align-children")
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "fingerprint"
                                }, () => copy(referenceId), "Copy reference ID"),
                                create("span")
                                    .classes("text-small")
                                    .text(referenceId)
                                    .build()
                            ).build()),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex", "no-gap")
                            .children(
                                create("span")
                                    .classes("text-small")
                                    .text(compute(t => `Received ${t}`, Time.agoUpdating(event.received_at)))
                                    .title(new Date(event.received_at).toLocaleDateString())
                                    .build(),
                                create("span")
                                    .classes("text-small")
                                    .text(compute(t => `, Updated ${t}`, Time.agoUpdating(event.updated_at)))
                                    .title(new Date(event.updated_at).toLocaleDateString())
                                    .build(),
                            ).build(),
                    ).build(),
            ).build();
    }
}