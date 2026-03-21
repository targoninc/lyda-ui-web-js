import { AnyElement, compute, create, signal, Signal, when } from "@targoninc/jess";
import { button, heading } from "@targoninc/jess-components";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { MusicTemplates } from "../music/MusicTemplates.ts";
import { FormTemplates } from "../generic/FormTemplates.ts";
import { createModal } from "../../Classes/Ui.ts";
import { Util } from "../../Classes/Util.ts";
import { Api } from "../../Api/Api.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { t } from "../../../locales";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { PaymentProvider } from "@targoninc/lyda-shared/src/Enums/PaymentProvider";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { loadScript } from "@paypal/paypal-js";
import {
    CreateOrderActions,
    CreateOrderData,
    OnApproveActions,
    OnApproveData,
} from "@paypal/paypal-js/types/components/buttons";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { StripeService } from "../../Services/StripeService.ts";

export type BuyableEntity = {
    type: "track";
    entity: Track;
} | {
    type: "album";
    entity: Album;
};

export class BuyTemplates {
    static getMinPrice(item: BuyableEntity): number {
        if (item.type === "album" && !item.entity.price) {
            return (item.entity.tracks ?? []).reduce((sum, at) => sum + (at.track?.price ?? 0), 0);
        }
        return item.entity.price;
    }

    static openBuyModal(item: BuyableEntity, onSuccess: () => void) {
        const price = BuyTemplates.getMinPrice(item);
        const entityType = item.type === "track" ? EntityType.track : EntityType.album;
        const title = item.type === "track" ? item.entity.title : item.entity.title;
        const id = item.entity.id;

        const amount = signal<number | null>(null);
        const amountValid = compute(a => a !== null && a >= price && a <= price * 100, amount);
        const providers = signal<PaymentProvider[]>([]);
        Api.getPaymentProviders().then(p => providers.value = p ?? []);

        let modal: AnyElement | null = null;
        const onClose = () => modal ? Util.removeModal(modal) : undefined;
        const inCheckout = signal(false);
        const bought = signal(false);
        const estTotal = compute(a => (a ?? price) * 1.19, amount);

        modal = createModal([
            vertical(
                horizontal(
                    GenericTemplates.title(t("BUY_ITEM")),
                    button({
                        text: t("CLOSE"),
                        icon: { icon: "close" },
                        onclick: onClose,
                    }),
                ).classes("space-between"),
                when(bought, vertical(
                    horizontal(
                        MusicTemplates.cover(entityType, item.entity, CoverContext.inline),
                        MusicTemplates.title(entityType, title, id, [], TextSize.large, false),
                    ).classes("align-children"),
                    create("p")
                        .text(t("BUY_ITEM_INFO_TEXT"))
                        .build(),
                    create("p")
                        .text(t("BUY_ITEM_DELETE_WARNING"))
                        .build(),
                    create("hr"),
                    horizontal(
                        when(inCheckout, vertical(
                            horizontal(
                                create("span")
                                    .classes(TextSize.xxLarge, "align-end")
                                    .styles("line-height", "1")
                                    .text("$"),
                                FormTemplates.moneyField(t("AMOUNT_IN_USD"), "amount", currency(price) + "+", amount, false, val => amount.value = val, price, price * 100, 0.10, ["bigger-input"]),
                            ),
                            create("span")
                                .text(compute(total => `${t("EST_TOTAL", currency(total))}`, estTotal)),
                        ).build(), true),
                        when(inCheckout, button({
                            text: t("CONTINUE_TO_CHECKOUT"),
                            icon: { icon: "shopping_cart" },
                            classes: ["rounded-max", TextSize.xLarge, "align-end", "positive"],
                            disabled: compute(v => !v, amountValid),
                            onclick: async () => inCheckout.value = true,
                        }), true),
                        when(compute(p => p.includes(PaymentProvider.stripe), providers), BuyTemplates.stripeButton(item, onSuccess)),
                        when(compute(p => p.includes(PaymentProvider.paypal), providers), BuyTemplates.paypalButton(item, estTotal, inCheckout, () => {
                            bought.value = true;
                            onSuccess();
                        })),
                    ).classes("space-between"),
                    when(compute(a => a !== null && a > price * 100, amount), create("span")
                        .classes("warning")
                        .text(t("AMOUNT_MUST_BE_BETWEEN", currency(price), currency(price * 100)))
                        .build()),
                ).build(), true),
                when(bought, vertical(
                    horizontal(
                        heading({
                            level: 2,
                            text: t("ITEM_BOUGHT"),
                        }),
                    ).classes("align-children", "card", TextSize.large, "animated-background"),
                    create("p")
                        .text(t("ITEM_BOUGHT_INFO"))
                        .build(),
                ).build()),
            ).styles("max-width", "500px"),
        ], `buy-${item.type}`);
    }

    static stripeButton(item: BuyableEntity, onSuccess: () => void) {
        return button({
            text: "Pay with Stripe",
            icon: { icon: "credit_card" },
            classes: ["rounded-max", TextSize.medium, "align-end", "stripe-button"],
            onclick: async () => {
                try {
                    const success = await StripeService.checkout(item.type, item.entity.id);
                    if (success) {
                        onSuccess();
                    }
                } catch (e: any) {
                    console.error("Stripe checkout failed", e);
                    // Handle error (e.g. show a toast or message)
                }
            }
        });
    }

    static paypalButton(item: BuyableEntity, amount: Signal<number>, inCheckout: Signal<boolean>, onSuccess: () => void) {
        const id = `buy-button-${item.type}-${item.entity.id}`;
        const visibleClass = compute((v): string => v ? "visible" : "hidden", inCheckout);

        async function initPaypal(selector: string) {
            let paypal;
            try {
                paypal = await loadScript({
                    clientId: "AUw6bB-HQTIfqy5fhk-s5wZOaEQdaCIjRnCyIC3WDCRxVKc9Qvz1c6xLw7etCit1CD1qSHY5Pv-3xgQN",
                });
            } catch (error) {
                console.error("failed to load the PayPal JS SDK script", error);
            }

            if (paypal) {
                try {
                    if (paypal.Buttons) {
                        await paypal.Buttons({
                            createOrder: async (data: CreateOrderData, actions: CreateOrderActions) => {
                                return actions.order.create({
                                    purchase_units: [{
                                        amount: {
                                            value: amount.value.toFixed(2),
                                        },
                                    }],
                                });
                            },
                            onApprove: async (data: OnApproveData, actions: OnApproveActions) => {
                                return actions.order.capture().then(async function(details: any) {
                                    console.log("Transaction completed by " + details.payer.name.given_name);

                                    await Api.createOrder({
                                        type: item.type,
                                        orderId: data.orderID,
                                        paymentProvider: PaymentProvider.paypal,
                                        entityId: item.entity.id,
                                    });

                                    onSuccess();

                                    return details;
                                });
                            },
                            style: {
                                layout: "horizontal",
                                color: "gold",
                                shape: "pill",
                                label: "paypal",
                                tagline: false,
                            },
                        }).render(selector);
                    }
                } catch (error) {
                    console.error("failed to render the PayPal Buttons", error);
                }
            }
        }

        setTimeout(() => initPaypal(`#${id}`).then(), 100);

        return vertical()
            .classes(visibleClass)
            .children(
                horizontal(
                    GenericTemplates.roundIconButton({
                        icon: "arrow_back_ios_new",
                        adaptive: true,
                    }, () => inCheckout.value = false, "Go back", ["align-children"]),
                    heading({
                        text: compute(a => `${t("CHOOSE_CHECKOUT_OPTION", a)}`, amount),
                        level: 3,
                    }),
                ).classes("align-children"),
                horizontal()
                    .classes("align-children", "flex-grow")
                    .styles("max-width", "300px")
                    .id(id),
            ).build();
    }
}

