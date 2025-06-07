import {create, compute, signal} from "@targoninc/jess";
import {HttpClient} from "../../Api/HttpClient.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {currency} from "../../Classes/Helpers/Num.ts";
import {permissions} from "../../state.ts";
import {copy} from "../../Classes/Util.ts";
import {PaymentHistory} from "@targoninc/lyda-shared/src/Models/db/finance/PaymentHistory";

export class PaymentTemplates {
    static paymentsPage() {
        const payments = signal<PaymentHistory[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            HttpClient.getAsync<PaymentHistory[]>(ApiRoutes.getPaymentHistory, {
                skip: skip.value,
                ...(filter ?? {})
            }).then(e => payments.value = e.data)
                .finally(() => loading.value = false);
        }
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Payment history")
                    .build(),
                compute(p => {
                    return GenericTemplates.searchWithFilter(payments, PaymentTemplates.payment, skip, loading, load);
                }, permissions),
            ).build();
    }

    static payment(p: PaymentHistory) {
        return create("div")
            .classes("flex", "card", "space-outwards")
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
                                    .text(`${currency(p.fees, p.currency)} fees by payment provider`)
                                    .build(),
                                create("span")
                                    .classes("text-small", "clickable")
                                    .text(`External transaction ID: ${p.external_id}`)
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