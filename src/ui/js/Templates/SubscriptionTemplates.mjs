import {computedSignal, create, ifjs, signal, signalMap} from "https://fjs.targoninc.com/f.js";
import {Num as NumberFormatter} from "../Classes/Helpers/Num.mjs";
import {SubscriptionActions} from "../Actions/SubscriptionActions.mjs";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Time} from "../Classes/Helpers/Time.mjs";

export class SubscriptionTemplates {
    static page(user, currency, options) {
        const anyActive = computedSignal(options, (opts) => opts.some((o) => o.active));
        const selectedOption = signal(null);

        return create("div")
            .classes("flex-v")
            .children(
                signalMap(options, create("div")
                    .classes("flex"),
                (option) => SubscriptionTemplates.option(user, anyActive, selectedOption, currency, option))
            ).build();
    }

    static paypalContainer(availableSub) {
        return create("div")
            .id("startSubscription_" + availableSub.id)
            .classes("flex")
            .build();
    }

    static paypalSdk(client_id) {
        return create("script")
            .id("paypalSdk")
            .src("https://www.paypal.com/sdk/js?client-id=" + client_id + "&vault=true&intent=subscription")
            .build();
    }

    static paypalButton(button_id) {
        return create("div")
            .classes("paypalButton")
            .children(
                create("div")
                    .id(button_id)
                    .build()
            ).build();
    }

    static option(user, anyActive, selectedOption, currency, option) {
        const enabled = computedSignal(anyActive, (active) => !active);
        const active = signal(!!option.active);
        const activeClass = computedSignal(active, (a) => a ? "active" : "_");
        const optionMessage = signal(null);
        const paypalButtonShown = computedSignal(selectedOption, (selected) => selected === option.id);
        const gifted = signal(!!option.gifted);

        return create("div")
            .classes("flex-v", "card", "relative", activeClass)
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
                                create("h4")
                                    .text(NumberFormatter.currency(option.price_per_term, currency) + " per " + option.term_type)
                                    .build(),
                                ifjs(!!option.created_at, SubscriptionTemplates.subscribedFor(option.created_at))
                            ).build(),
                        create("div")
                            .classes("flex-v", "startSubscription_" + option.id + "_" + option.previous_id)
                            .children(
                                ifjs(enabled, create("button")
                                    .classes("subStarter")
                                    .id(option.id)
                                    .text("Subscribe")
                                    .onclick(async () => {
                                        selectedOption.value = option.id;
                                        await SubscriptionActions.startSubscription(option.id, option.plan_id, option.previous_id, optionMessage);
                                    })
                                    .build()),
                                ifjs(paypalButtonShown, create("span")
                                    .text(optionMessage)
                                    .build()),
                                ifjs(paypalButtonShown, SubscriptionTemplates.paypalButton("paypal-button-" + option.id))
                            ).build()
                    ).build()
            ).build();
    }

    static subscribedFor(created_at) {
        const subscribedAgo = Time.ago(created_at);

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