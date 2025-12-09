import { compute, create, signal } from "@targoninc/jess";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { permissions } from "../../state.ts";
import { copy } from "../../Classes/Util.ts";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { SubscriptionPayment } from "@targoninc/lyda-shared/dist/Models/db/finance/SubscriptionPayment";

export class PaymentTemplates {
    static paymentsPage() {
        const payments = signal<SubscriptionPayment[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getPaymentHistory(skip.value, filter)
                .then(e => payments.value = e ?? [])
                .finally(() => loading.value = false);
        }
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("PAYMENT_HISTORY"))
                    .build(),
                compute(p => {
                    return GenericTemplates.searchWithFilter(payments, PaymentTemplates.payment, skip, loading, load);
                }, permissions),
            ).build();
    }

    static payment(p: SubscriptionPayment) {
        return create("div")
            .classes("flex", "card", "space-between")
            .children(
                create("div")
                    .classes("flex-v", p.succeeded ? "positive" : "negative")
                    .children(
                        create("span")
                            .classes("text-large")
                            .text(currency(p.total, p.currency))
                            .build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                create("span")
                                    .classes("text-small")
                                    .text(t("FEES_BY_PAYMENT_PROVIDER", currency(p.fees, p.currency)))
                                    .build(),
                                create("span")
                                    .classes("text-small", "clickable")
                                    .text(t("EXTERNAL_TRANSACTION_ID", p.external_id))
                                    .onclick(() => copy(p.external_id))
                                    .build(),
                            ).build()
                    ).build(),
                create("div")
                    .classes("flex", "small-gap")
                    .children(
                        create("span")
                            .classes("text-small")
                            .text(new Date(p.received_at).toLocaleDateString() + ",")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(Time.agoUpdating(new Date(p.received_at)))
                            .build(),
                    ).build()
            ).build()
    }
}