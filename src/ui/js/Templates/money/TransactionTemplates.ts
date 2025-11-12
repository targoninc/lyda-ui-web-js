import { TableTemplates } from "../generic/TableTemplates.ts";
import { t } from "../../../locales";
import { GenericTemplates, horizontal, text, vertical } from "../generic/GenericTemplates.ts";
import { compute, create, Signal, signal, signalMap, StringOrSignal } from "@targoninc/jess";
import { Api } from "../../Api/Api.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Transaction } from "@targoninc/lyda-shared/dist/Models/Transaction";
import { currency } from "../../Classes/Helpers/Num.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";

export class TransactionTemplates {
    static transactions(transactions: Signal<Transaction[]>) {
        return vertical(
            horizontal(
                compute(trans => TransactionTemplates.amountCard(
                    trans.filter(tr => tr.direction === "in")
                        .reduce((a, b) => a + (b.total - b.fees - b.tax), 0),
                    t("TOTAL_RECEIVED"),
                ), transactions),
                compute(trans => TransactionTemplates.amountCard(
                    trans.filter(tr => tr.direction === "out")
                        .reduce((a, b) => a + b.total, 0),
                    t("TOTAL_PAID"),
                ), transactions),
            ),
            TableTemplates.table(
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
        )
    }

    static transaction(t: Transaction) {
        return TableTemplates.tr({
            cellClasses: [],
            data: [
                TransactionTemplates.amount(t),
                text(t.paymentProcessor),
                TransactionTemplates.itemName(t),
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

    static itemName(t: Transaction) {
        switch (t.item_type) {
            case "subscription":
                return GenericTemplates.inlineLink(() => navigate(RoutePath.subscribe), t.item_name);
            case "track":
                return GenericTemplates.inlineLink(() => navigate(`${RoutePath.track}/${t.item_id}`), t.item_name);
            case "album":
                return GenericTemplates.inlineLink(() => navigate(`${RoutePath.album}/${t.item_id}`), t.item_name);
        }

        return text(t.item_name);
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

    private static amountCard(amount: number, label: StringOrSignal) {
        return vertical(
            text(currency(amount)).classes("text-xxlarge"),
            text(label),
        ).classes("card", "nogap").build();
    }
}