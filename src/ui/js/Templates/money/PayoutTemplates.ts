import {create, compute, signal} from "@targoninc/jess";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {currency} from "../../Classes/Helpers/Num.ts";
import {permissions} from "../../state.ts";
import {Payout} from "@targoninc/lyda-shared/dist/Models/db/finance/Payout";
import {PaymentStatus} from "@targoninc/lyda-shared/dist/Enums/PaymentStatus";

export class PayoutTemplates {
    static payoutsPage() {
        const payouts = signal<Payout[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getAsync<Payout[]>(ApiRoutes.getPayouts, {
                skip: skip.value,
                ...(filter ?? {})
            }).then(e => payouts.value = e.data)
                .finally(() => loading.value = false);
        }
        const loading = signal(false);
        load();

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Payout history")
                    .build(),
                compute(p => {
                    return GenericTemplates.searchWithFilter(payouts, PayoutTemplates.payout, skip, loading, load);
                }, permissions),
            ).build();
    }

    static payout(p: Payout) {
        return create("div")
            .classes("flex", "card", "space-outwards")
            .children(
                create("div")
                    .classes("flex-v", p.status !== PaymentStatus.failed ? "positive" : "negative")
                    .children(
                        create("span")
                            .text(currency(p.amount_ct / 100, "USD"))
                            .build(),
                    ).build(),
                create("span")
                    .classes("text-small")
                    .text(Time.agoUpdating(new Date(p.created_at)))
                    .build(),
            ).build()
    }
}