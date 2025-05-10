import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {signal} from "../../../fjsc/src/signals.ts";
import {create} from "../../../fjsc/src/f2.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {PaymentHistory} from "../../Models/DbModels/finance/PaymentHistory.ts";
import {InputType} from "../../../fjsc/src/Types.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import {currency} from "../../Classes/Helpers/Num.ts";

export class PaymentTemplates {
    static paymentsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewPayments],
            PaymentTemplates.payments()
        )
    }

    static payments() {
        const payments = signal<PaymentHistory[]>([]);
        const skip = signal(0);
        const load = (filter?: any) => {
            loading.value = true;
            Api.getAsync<PaymentHistory[]>(ApiRoutes.getPayouts, {
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
                GenericTemplates.searchWithFilter(payments, PaymentTemplates.payment, skip, loading, load, [
                    {
                        key: "year",
                        type: InputType.number,
                        name: "Year",
                        default: new Date().getFullYear(),
                    },
                    {
                        key: "month",
                        type: InputType.number,
                        name: "Month",
                        default: new Date().getMonth() + 1,
                    }
                ]),
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
                            .text(currency(p.received, p.currency) + ` | ${p.payment_processor}`)
                            .build(),
                    ).build(),
                create("span")
                    .classes("text-small")
                    .text(Time.agoUpdating(new Date(p.received_at)))
                    .build(),
            ).build()
    }
}