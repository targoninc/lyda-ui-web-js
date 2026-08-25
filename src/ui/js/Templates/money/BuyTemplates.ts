import { AnyElement, compute, create, signal, Signal, when } from "@targoninc/jess";
import { button } from "@targoninc/jess-components";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { MusicTemplates } from "../music/MusicTemplates.ts";
import { FormTemplates } from "../generic/FormTemplates.ts";
import {createModal, notify} from "../../Classes/Ui.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Util } from "../../Classes/Util.ts";
import { Api } from "../../Api/Api.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { t } from "../../../locales";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { PaymentProvider } from "@targoninc/lyda-shared/src/Enums/PaymentProvider";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { StripeService } from "../../Services/StripeService.ts";

const MAX_PRICE_FACTOR = 100;

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

    static openBuyModal(item: BuyableEntity) {
        const price = BuyTemplates.getMinPrice(item);
        const entityType = item.type === "track" ? EntityType.track : EntityType.album;
        const title = item.type === "track" ? item.entity.title : item.entity.title;
        const id = item.entity.id;

        const amount = signal<number>(0);
        const amountValid = compute(a => a !== null && a >= price && a <= price * MAX_PRICE_FACTOR, amount);
        const providers = signal<PaymentProvider[]>([]);
        Api.getPaymentProviders().then(p => providers.value = p ?? []);

        let modal: AnyElement | null = null;
        const onClose = () => modal ? Util.removeModal(modal) : undefined;
        const inCheckout = signal(false);
        const estTotal = compute(a => (a ?? price) * 1.19, amount);
        const rangeErrorText = t("AMOUNT_MUST_BE_BETWEEN", currency(price), currency(price * MAX_PRICE_FACTOR));
        const amountOutOfRange = compute(a => a !== null && (a < price || a > price * MAX_PRICE_FACTOR), amount);

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
                vertical(
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
                                FormTemplates.moneyField(t("AMOUNT_IN_USD"), "amount", currency(price) + "+", amount, false, val => amount.value = val, price, price * MAX_PRICE_FACTOR, 0.10, ["bigger-input"]),
                            ),
                        when(amountOutOfRange, create("span")
                            .classes("warning")
                            .text(rangeErrorText)
                            .build()),
                        when(compute(o => !o, amountOutOfRange), create("span")
                            .text(compute(total => `${t("EST_TOTAL", currency(total))}`, estTotal))
                            .build()),
                        ).build(), true),
                        when(inCheckout, button({
                            text: t("CONTINUE_TO_CHECKOUT"),
                            icon: { icon: "shopping_cart" },
                            classes: ["rounded-max", TextSize.xLarge, "align-end", "positive"],
                            disabled: compute(v => !v, amountValid),
                            onclick: async () => inCheckout.value = true,
                        }), true),
                        when(compute((checkingOut, p) => checkingOut && p.includes(PaymentProvider.stripe), inCheckout, providers), BuyTemplates.stripeButton(item, amount, onClose)),
                    ).classes("space-between"),
                ).build(),
            ).styles("max-width", "500px"),
        ], `buy-${item.type}`);
    }

    /**
     * Shows the purchase confirmation when the user returns from the hosted
     * Stripe checkout (success_url carries ?purchase=success) and strips the
     * param so a refresh does not re-show it. Shared by the track and album
     * pages.
     */
    static handlePurchaseSuccessIfPresent(params: Record<string, string>, item: BuyableEntity) {
        if (params.purchase !== "success") {
            return;
        }
        BuyTemplates.showPurchaseSuccessModal(item);
        history.replaceState({}, "", window.location.pathname + window.location.hash);
    }

    /**
     * Confirmation shown after a purchase when the user returns from the
     * hosted Stripe checkout (success_url carries ?purchase=success).
     */
    static showPurchaseSuccessModal(item: BuyableEntity) {
        const entityType = item.type === "track" ? EntityType.track : EntityType.album;
        const title = item.entity.title;
        const id = item.entity.id;

        let modal: AnyElement | null = null;
        modal = createModal([
            vertical(
                horizontal(
                    GenericTemplates.title(t("ITEM_BOUGHT")),
                    button({
                        text: t("CLOSE"),
                        icon: { icon: "close" },
                        onclick: () => modal ? Util.removeModal(modal) : undefined,
                    }),
                ).classes("space-between"),
                horizontal(
                    MusicTemplates.cover(entityType, item.entity, CoverContext.inline),
                    MusicTemplates.title(entityType, title, id, [], TextSize.large, false),
                ).classes("align-children"),
                create("p")
                    .text(t("ITEM_BOUGHT_INFO"))
                    .build(),
                create("p")
                    .text(t("BUY_ITEM_DELETE_WARNING"))
                    .build(),
            ).styles("max-width", "500px"),
        ], `bought-${item.type}`);
    }

    static stripeButton(item: BuyableEntity, amount: Signal<number>, onClose: () => void) {
        return button({
            text: "Pay with Stripe",
            icon: { icon: "credit_card" },
            classes: ["rounded-max", TextSize.medium, "align-end", "stripe-button"],
            onclick: async () => {
                try {
                    notify(t("REDIRECTING_TO_STRIPE"), NotificationType.info);
                    const success = await StripeService.checkout(item.type, item.entity.id, amount.value);
                    if (success) {
                        onClose();
                    }
                } catch (e: any) {
                    console.error("Stripe checkout failed", e);
                    notify(`${t("FAILED_CHECKOUT_ERROR", e.message)}`, NotificationType.error);
                }
            }
        });
    }


}

