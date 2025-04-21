import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {signal} from "../../../fjsc/src/signals.ts";
import {create} from "../../../fjsc/src/f2.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {PaymentHistory} from "../../Models/DbModels/finance/PaymentHistory.ts";
import {InputType} from "../../../fjsc/src/Types.ts";

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
            Api.getAsync<PaymentHistory[]>(ApiRoutes.getPayments, {
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
            .classes("flex")
            .children(
                create("span")
                    .text(p.id)
                    .build(),
            ).build()
    }
}