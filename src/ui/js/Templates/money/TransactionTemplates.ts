import { TableTemplates } from "../generic/TableTemplates.ts";
import { t } from "../../../locales";
import { horizontal, text, vertical } from "../generic/GenericTemplates.ts";
import { create, Signal, signal, signalMap } from "@targoninc/jess";
import { Api } from "../../Api/Api.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Transaction } from "@targoninc/lyda-shared/dist/Models/Transaction";
import { currency } from "../../Classes/Helpers/Num.ts";

export class TransactionTemplates {
    static transactions(transactions: Signal<Transaction[]>) {
        return TableTemplates.table(
            false,
            TableTemplates.tableHeaders<Transaction>([
                { title: t("AMOUNT_IN_USD"), property: "total" },
                { title: t("PAYMENT_PROCESSOR"), property: "paymentProcessor" },
                { title: t("ITEM"), property: "item_name" },
                { title: t("DATE"), property: "date" },
            ]),
            signalMap(
                transactions,
                create("tbody"),
                t => TransactionTemplates.transaction(t)
            ),
        )
    }

    static transaction(t: Transaction) {
        return TableTemplates.tr({
            cellClasses: [],
            data: [
                TransactionTemplates.amount(t),
                text(t.paymentProcessor),
                text(t.item_name),
                text(Time.agoUpdating(t.date)),
            ]
        });
    }

    static amount(t: Transaction) {
        if (t.direction === "out") {
            return horizontal(
                text("-"),
                text(currency(t.total))
            ).classes("nogap", "error");
        }

        return horizontal(
            text(currency(t.total))
        ).classes("positive");
    }

    static page() {
        const skip$ = signal(0);
        const trans$ = signal<Transaction[]>([]);
        const loading$ = signal(false);
        const load = (skip: number) => {
            loading$.value = true;
            Api.getTransactions(skip).then(r => {
                trans$.value = r ?? [];
            }).finally(() => loading$.value = false);
        }
        load(skip$.value);

        return vertical(
            TransactionTemplates.transactions(trans$)
        ).build();
    }
}