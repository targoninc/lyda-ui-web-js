import { compute, create, Signal, signal, signalMap, when } from "@targoninc/jess";
import { currency } from "../Classes/Helpers/Num.ts";
import { getSubscriptionLink, SubscriptionActions } from "../Actions/SubscriptionActions.ts";
import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { Time } from "../Classes/Helpers/Time.ts";
import { RoutePath } from "../Routing/routes.ts";
import { navigate } from "../Routing/Router.ts";
import { button } from "@targoninc/jess-components";
import { AvailableSubscription } from "@targoninc/lyda-shared/src/Models/db/finance/AvailableSubscription";
import { Subscription } from "@targoninc/lyda-shared/src/Models/db/finance/Subscription";
import { SubscriptionStatus } from "@targoninc/lyda-shared/src/Enums/SubscriptionStatus";

export class SubscriptionTemplates {
    static page() {
        const options = signal<AvailableSubscription[]>([]);
        const currentSubscription = signal<Subscription|null>(null);
        SubscriptionActions.loadSubscriptionOptions().then(res => {
            options.value = res.options;
            currentSubscription.value = res.currentSubscription;
        });
        const currency = "USD";
        const selectedOption = signal<number | null>(null);
        const optionsLoading = compute(o => o.length === 0, options);

        return create("div")
            .classes("flex-v", "card")
            .children(
                create("h1")
                    .text("Lyda subscription")
                    .build(),
                when(currentSubscription, create("span")
                    .classes("color-dim")
                    .text("You do not have an active subscription. Choose any of the options below to start. All prices are in USD.")
                    .build(), true),
                create("h2")
                    .text("Your benefits")
                    .build(),
                SubscriptionTemplates.subscriptionBenefits(),
                when(optionsLoading, GenericTemplates.loadingSpinner()),
                signalMap(options, create("div").classes("flex"),
                    (option) => SubscriptionTemplates.option(currentSubscription, selectedOption, currency, option)),
                button({
                    text: "Payment history",
                    icon: {icon: "receipt"},
                    onclick: () => navigate(RoutePath.payments)
                }),
            ).build();
    }

    static subscriptionBenefits() {
        return create("div")
            .classes("marquee")
            .styles("max-width", "min(500px, 100%)")
            .children(
                create("div")
                    .classes("scrolling", "flex")
                    .children(
                        GenericTemplates.benefit("Listen in higher quality", "hearing"),
                        GenericTemplates.benefit("Artists earn money through you", "attach_money"),
                        GenericTemplates.benefit("No ads", "ad_group_off"),
                        GenericTemplates.benefit("Comment on tracks", "comment"),
                        GenericTemplates.benefit("Listen in higher quality", "hearing"),
                        GenericTemplates.benefit("Artists earn money through you", "attach_money"),
                        GenericTemplates.benefit("No ads", "ad_group_off"),
                        GenericTemplates.benefit("Comment on tracks", "comment"),
                    ).build()
            ).build();
    }

    static paypalButton(button_id: string) {
        return create("div")
            .classes("paypalButton")
            .children(
                create("div")
                    .id(button_id)
                    .build()
            ).build();
    }

    static option(currentSubscription: Signal<Subscription | null>, selectedOption: Signal<number | null>, cur: string, option: AvailableSubscription) {
        const active = compute(sub => sub && sub.subscription_id === option.id && sub.status === SubscriptionStatus.active, currentSubscription);
        const pending = compute(sub => sub && sub.subscription_id === option.id && sub.status === SubscriptionStatus.pending, currentSubscription);
        const enabled = compute((a, p) => !a && !p, active, pending);
        const activeClass = compute((a): string => a ? "active" : "_", active);
        const pendingClass = compute((a): string => a ? "pending" : "_", pending);
        const isSelectedOption = compute(selected => selected === option.id, selectedOption);
        const selectedClass = compute((s): string => s === option.id ? "selected" : "_", selectedOption);
        const gifted = compute(s => (s && s.gifted_by_user_id !== null && s.subscription_id === option.id), currentSubscription);
        const createdAt = compute(s => s && new Date(s.created_at), currentSubscription);
        const previousId = compute(s => s && s.previous_subscription, currentSubscription);
        const startSubClass = compute(p => "startSubscription_" + option.id + "_" + p, previousId);
        const optionMessage = signal("Available payment providers:");
        const buttonText = compute((a): string => a ? "Switch plan" : "Subscribe", currentSubscription);
        const link = compute(sub => getSubscriptionLink(sub), currentSubscription);

        return create("div")
            .classes("flex-v", "card", "relative", "subscription-option", selectedClass, activeClass, pendingClass)
            .children(
                when(active, GenericTemplates.checkInCorner("This subscription is active")),
                create("div")
                    .classes("flex-v", "space-outwards")
                    .children(
                        create("div")
                            .classes("flex-v", "no-gap")
                            .children(
                                create("h2")
                                    .classes("limitToContentWidth", "flex")
                                    .text(option.name)
                                    .children(
                                        when(gifted, GenericTemplates.giftIcon("This subscription has been gifted to you"))
                                    ).build(),
                                create("span")
                                    .text(option.description)
                                    .build(),
                            ).build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                create("div")
                                    .classes("flex", "align-bottom", "small-gap")
                                    .styles("line-height", "1")
                                    .children(
                                        create("span")
                                            .classes("text-xlarge")
                                            .text(currency(option.price_per_term, cur))
                                            .build(),
                                        create("span")
                                            .classes("text-small")
                                            .text("/" + option.term_type)
                                            .build(),
                                    ).build(),
                                when(pending, create("span")
                                    .classes("text-small", "text-positive")
                                    .title("Waiting for confirmation from payment provider")
                                    .text("Pending")
                                    .build()),
                                when(active, SubscriptionTemplates.subscribedFor(createdAt))
                            ).build(),
                        create("div")
                            .classes("flex-v", startSubClass)
                            .children(
                                when(active, GenericTemplates.inlineLink(link, "Manage on PayPal")),
                                create("div")
                                    .classes("flex", "small-gap", "align-children")
                                    .children(
                                        when(active, button({
                                            classes: ["negative"],
                                            id: option.id,
                                            text: "Cancel",
                                            onclick: async () => {
                                                const currentSub = currentSubscription.value;
                                                if (!currentSub) {
                                                    console.warn("Can't cancel subscription, no current subscription. How did you get here?");
                                                    return;
                                                }
                                                await SubscriptionActions.cancelSubscriptionWithConfirmationAsync(currentSub.id);
                                            }
                                        })),
                                        when(enabled, button({
                                            classes: ["special", selectedClass, "rounded-max"],
                                            text: buttonText,
                                            disabled: isSelectedOption,
                                            id: option.id,
                                            onclick: async () => {
                                                selectedOption.value = option.id;
                                                await SubscriptionActions.startSubscription(option.id, option.plan_id, optionMessage);
                                            }
                                        })),
                                        when(isSelectedOption, button({
                                            classes: [selectedClass, "cancel-button", "rounded-max"],
                                            text: "Cancel",
                                            id: option.id,
                                            onclick: async () => {
                                                selectedOption.value = null;
                                            }
                                        })),
                                    ).build(),
                                when(isSelectedOption, create("span")
                                    .classes("color-dim")
                                    .text(optionMessage)
                                    .build()),
                                when(isSelectedOption, SubscriptionTemplates.paypalButton("paypal-button-" + option.id))
                            ).build()
                    ).build()
            ).build();
    }

    static subscribedFor(created_at: Signal<Date | null>) {
        const subscribedAgo = compute(c => "Subscribed " + Time.ago(c ?? new Date()), created_at);

        return create("div")
            .classes("flex-v")
            .children(
                create("span")
                    .classes("text-positive")
                    .text(subscribedAgo)
                    .build()
            ).build();
    }
}