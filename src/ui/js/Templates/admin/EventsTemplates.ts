import { compute, create, signal, signalMap, when } from "@targoninc/jess";
import { copy } from "../../Classes/Util.ts";
import { GenericTemplates, horizontal } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { notify } from "../../Classes/Ui.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, input } from "@targoninc/jess-components";
import { InputType } from "@targoninc/jess";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { WebhookEvent } from "../../Api/Api.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { TextSize } from "../../Enums/TextSize.ts";

export class EventsTemplates {
    static eventsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canTriggerEventHandling],
            EventsTemplates.eventsPageInternal(),
        );
    }

    private static eventsPageInternal() {
        const events = signal<WebhookEvent[]>([]);
        const skip = signal(0);
        const includeStripe = signal(true);
        const includePaypal = signal(false);
        const loading = signal(false);

        const load = () => {
            loading.value = true;
            Api.getEvents(skip.value, { stripe: includeStripe.value, paypal: includePaypal.value })
               .then(e => events.value = e ?? [])
               .finally(() => loading.value = false);
        };

        skip.subscribe(() => load());
        includeStripe.subscribe(() => { skip.value = 0; load(); });
        includePaypal.subscribe(() => { skip.value = 0; load(); });
        load();

        const localSearch = signal("");
        const filteredResults = compute(
            (r, f) => {
                if (!r) return [];
                return r.filter(e => JSON.stringify(e).includes(f));
            },
            events,
            localSearch,
        );

        return create("div")
            .classes("flex-v")
            .children(
                create("div").classes("flex", "align-children", "fixed-bar").children(
                    button({
                        text: t("REFRESH"),
                        icon: { icon: "refresh" },
                        classes: ["positive"],
                        disabled: loading,
                        onclick: () => load(),
                    }),
                    button({
                        text: t("PREVIOUS_PAGE"),
                        icon: { icon: "skip_previous" },
                        disabled: compute((l, s) => l || s <= 0, loading, skip),
                        onclick: () => { skip.value = Math.max(0, skip.value - 100); },
                    }),
                    button({
                        text: t("NEXT_PAGE"),
                        icon: { icon: "skip_next" },
                        disabled: compute((l, e) => l || e.length < 100, loading, events),
                        onclick: () => { skip.value = skip.value + 100; },
                    }),
                    GenericTemplates.toggle("Stripe", "stripe-toggle", () => { includeStripe.value = !includeStripe.value; }, [], true),
                    GenericTemplates.toggle("PayPal", "paypal-toggle", () => { includePaypal.value = !includePaypal.value; }, [], false),
                    input<string>({
                        type: InputType.text,
                        name: "filter",
                        placeholder: t("FILTER"),
                        value: localSearch,
                        onchange: (newValue: string) => { localSearch.value = newValue; },
                    }),
                    create("span")
                        .text(compute(e => `${t("N_RESULTS", e.length)}`, events))
                        .build(),
                    GenericTemplates.inlineLink("https://developer.paypal.com/api/rest/webhooks/event-names/", t("DOCS"), true),
                ).build(),
                signalMap(filteredResults, create("div").classes("flex-v", "fixed-bar-content"), EventsTemplates.event),
            ).build();
    }

    static event(event: WebhookEvent) {
        const isStripe = event.provider === "stripe";
        const parsed = JSON.parse(event.content);
        const resourceId = isStripe ? parsed.data?.object?.id : parsed.resource?.id;
        const eventType = isStripe ? parsed.type : parsed.event_type;
        const stripeIconMap: Record<string, string> = {
            "payment_intent.succeeded": "price_check",
            "payment_intent.created": "credit_card",
            "checkout.session.completed": "shopping_cart_checkout",
            "customer.subscription.created": "line_start_circle",
            "customer.subscription.updated": "sync",
            "customer.subscription.deleted": "money_off",
            "invoice.paid": "finance_chip",
            "invoice.payment_succeeded": "paid",
            "invoice.created": "description",
            "invoice.finalized": "check_circle",
        };
        const typeIcon = isStripe ? stripeIconMap[eventType] : undefined;
        const paypalIconMap: Record<string, string> = {
            "PAYMENT.SALE.COMPLETED": "price_check",
            "BILLING.SUBSCRIPTION.CREATED": "line_start",
            "BILLING.SUBSCRIPTION.ACTIVATED": "line_start_circle",
            "PAYMENT.PAYOUTSBATCH.PROCESSING": "pending",
            "PAYMENT.PAYOUTSBATCH.SUCCESS": "finance_chip",
            "PAYMENT.PAYOUTSBATCH.DENIED": "money_off",
        };
        const icon = isStripe ? stripeIconMap[eventType] : paypalIconMap[eventType];

        return create("div")
            .classes("card", "flex", "space-between")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("flex", "align-children", TextSize.large)
                            .children(
                                GenericTemplates.roundIconButton({
                                    icon: "data_object",
                                }, () => copy(JSON.stringify(parsed, null, 2)), t("COPY_CONTENT")),
                                create("span")
                                    .classes("pill", isStripe ? "stripe-pill" : "paypal-pill")
                                    .text(isStripe ? "STRIPE" : "PAYPAL")
                                    .build(),
                                when(icon, GenericTemplates.icon(icon, true)),
                                create("span")
                                    .text(eventType)
                                    .build(),
                                button({
                                    text: t("TRIGGER"),
                                    icon: { icon: "start" },
                                    classes: ["positive"],
                                    onclick: () => {
                                        const trigger = isStripe ? Api.triggerStripeEventHandling(event.id) : Api.triggerEventHandling(event.id);
                                        trigger.then(() => {
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
                                    .classes(TextSize.small)
                                    .text("E | " + event.id)
                                    .build(),
                                when(resourceId,
                                    create("span")
                                        .classes("flex", "align-children")
                                        .children(
                                            GenericTemplates.roundIconButton({
                                                icon: "content_copy",
                                            }, () => copy(resourceId), t("COPY_RESOURCE_ID")),
                                            create("span")
                                                .classes(TextSize.small)
                                                .text("R | " + resourceId)
                                                .build(),
                                        ).build()),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        horizontal(
                            create("span")
                                .classes(TextSize.small)
                                .text(compute(time => `${t("RECEIVED_AT", time)}`, Time.agoUpdating(event.received_at)))
                                .title(new Date(event.received_at).toLocaleDateString())
                                .build(),
                            create("span")
                                .classes(TextSize.small)
                                .text(compute(time => `${t("UPDATED_AT", time)}`, Time.agoUpdating(event.updated_at)))
                                .title(new Date(event.updated_at).toLocaleDateString())
                                .build(),
                        ).build(),
                    ).build(),
            ).build();
    }
}
