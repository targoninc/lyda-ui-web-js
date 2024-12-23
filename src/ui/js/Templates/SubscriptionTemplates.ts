import {create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {Num as NumberFormatter} from "../Classes/Helpers/Num.ts";
import {SubscriptionActions} from "../Actions/SubscriptionActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
import {AvailableSubscription} from "../Models/DbModels/finance/AvailableSubscription.ts";
import {Subscription} from "../Models/DbModels/finance/Subscription.ts";

export class SubscriptionTemplates {
    static page(currency: string, options: Signal<AvailableSubscription[]>, currentSubscription: Signal<Subscription | null>) {
        const selectedOption = signal<number | null>(null);
        const optionsLoading = compute(o => o.length === 0, options);

        return create("div")
            .classes("flex-v")
            .children(
                ifjs(currentSubscription, create("span")
                    .classes("color-dim")
                    .text("You do not have an active subscription. Choose any of the options below to start. All prices are in USD.")
                    .build(), true),
                ifjs(currentSubscription, create("h1")
                    .text("Your benefits")
                    .build(), true),
                ifjs(currentSubscription, SubscriptionTemplates.subscriptionBenefits(), true),
                ifjs(optionsLoading, GenericTemplates.loadingSpinner()),
                signalMap(options, create("div")
                        .classes("flex"),
                    (option) => SubscriptionTemplates.option(currentSubscription, selectedOption, currency, option)),
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
                        SubscriptionTemplates.subscriptionBenefit("Listen in higher quality", "hearing"),
                        SubscriptionTemplates.subscriptionBenefit("Artists earn money through you", "attach_money"),
                        SubscriptionTemplates.subscriptionBenefit("No ads", "ad_group_off"),
                        SubscriptionTemplates.subscriptionBenefit("Comment on tracks", "comment"),
                        SubscriptionTemplates.subscriptionBenefit("Listen in higher quality", "hearing"),
                        SubscriptionTemplates.subscriptionBenefit("Artists earn money through you", "attach_money"),
                        SubscriptionTemplates.subscriptionBenefit("No ads", "ad_group_off"),
                        SubscriptionTemplates.subscriptionBenefit("Comment on tracks", "comment"),
                    ).build()
            ).build();
    }

    static subscriptionBenefit(benefit: string, icon: string) {
        return create("div")
            .classes("subscription-benefit")
            .children(
                GenericTemplates.icon(icon, true),
                create("span")
                    .text(benefit)
                    .build()
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

    static option(currentSubscription: Signal<Subscription | null>, selectedOption: Signal<number | null>, currency: string, option: AvailableSubscription) {
        const active = compute(sub => sub && sub.subscription_id === option.id, currentSubscription);
        const enabled = compute(a => !a, active);
        const activeClass = compute((a): string => a ? "active" : "_", active);
        const isSelectedOption = compute(selected => selected === option.id, selectedOption);
        const selectedClass = compute((s): string => s === option.id ? "selected" : "_", selectedOption);
        const gifted = compute(s => !!(s && s.gifted), currentSubscription);
        const createdAt = compute(s => s && s.created_at, currentSubscription);
        const previousId = compute(s => s && s.previous_subscription, currentSubscription);
        const startSubClass = compute(p => "startSubscription_" + option.id + "_" + p, previousId);
        const optionMessage = signal("Available payment providers:");

        return create("div")
            .classes("flex-v", "card", "relative", "subscription-option", selectedClass, activeClass)
            .children(
                ifjs(active, GenericTemplates.checkInCorner("This subscription is active")),
                create("div")
                    .classes("flex-v", "space-outwards")
                    .children(
                        create("div")
                            .classes("flex-v")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        create("h1")
                                            .classes("limitToContentWidth")
                                            .text(option.name)
                                            .build(),
                                        ifjs(gifted, GenericTemplates.giftIcon("This subscription has been gifted to you"))
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
                                            .text(NumberFormatter.currency(option.price_per_term, currency))
                                            .build(),
                                        create("span")
                                            .classes("text-small")
                                            .text("/" + option.term_type)
                                            .build(),
                                    ).build(),
                                ifjs(currentSubscription, SubscriptionTemplates.subscribedFor(createdAt))
                            ).build(),
                        create("div")
                            .classes("flex-v", startSubClass)
                            .children(
                                ifjs(enabled, create("button")
                                    .classes("fjsc", "special", selectedClass)
                                    .id(option.id)
                                    .text("Subscribe")
                                    .onclick(async () => {
                                        selectedOption.value = option.id;
                                        await SubscriptionActions.startSubscription(option.id, option.plan_id, optionMessage);
                                    }).build()),
                                ifjs(isSelectedOption, create("span")
                                    .classes("color-dim")
                                    .text(optionMessage)
                                    .build()),
                                ifjs(isSelectedOption, SubscriptionTemplates.paypalButton("paypal-button-" + option.id))
                            ).build()
                    ).build()
            ).build();
    }

    static subscribedFor(created_at: Signal<Date | null>) {
        const subscribedAgo = compute(c => Time.ago(c ?? new Date()), created_at);

        return create("div")
            .classes("flex-v")
            .children(
                create("span")
                    .classes("text-positive")
                    .text("Subscribed " + subscribedAgo)
                    .build()
            ).build();
    }
}