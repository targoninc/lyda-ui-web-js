import { TableTemplates } from "../generic/TableTemplates.ts";
import { t } from "../../../locales";
import { GenericTemplates, horizontal, tabSelected, text, vertical } from "../generic/GenericTemplates.ts";
import { compute, create, signal, signalMap, StringOrSignal, when } from "@targoninc/jess";
import { Api } from "../../Api/Api.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Transaction } from "@targoninc/lyda-shared/dist/Models/Transaction";
import { currency } from "../../Classes/Helpers/Num.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { TransactionInfo } from "@targoninc/lyda-shared/src/Models/TransactionInfo.ts";

export class TransactionTemplates {
    static page() {
        const tabs = [`${t("PERSONAL")}`, `${t("GLOBAL")}`];
        const selectedTab = signal(0);

        return create("div")
            .classes("statistics", "flex-v")
            .children(
                GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i),
                when(
                    tabSelected(selectedTab, 0),
                    TransactionTemplates.personalTransactions(),
                ),
                when(
                    tabSelected(selectedTab, 1),
                    TransactionTemplates.globalTransactionInfo(),
                ),
            ).build();
    }

    static personalTransactions() {
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
        const received = compute(t => t.filter(tr => tr.direction === "in")
                              .reduce((a, b) => a + (b.total - b.fees - b.tax), 0), trans$);
        const paid = compute(t => t.filter(tr => tr.direction === "out")
                                   .reduce((a, b) => a + b.total, 0), trans$);

        return vertical(
            horizontal(
                compute((r, p) => TransactionTemplates.transactionOverview(r, p), received, paid),
                when(loading$, GenericTemplates.loadingSpinner())
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
                    trans$,
                    create("tbody"),
                    t => TransactionTemplates.transaction(t)
                ),
            )
        ).build();
    }

    private static globalTransactionInfo() {
        const info$ = signal<TransactionInfo>({ paid: 0, received: 0 });
        const loading$ = signal(false);
        Api.getGlobalTransactionInfo().then(r => {
            info$.value = r ?? { paid: 0, received: 0 };
        }).finally(() => loading$.value = false);
        const received = compute(i => i.paid, info$);
        const paid = compute(i => i.received, info$);

        return vertical(
            compute((r, p) => TransactionTemplates.transactionOverview(r, p), received, paid),
            when(loading$, GenericTemplates.loadingSpinner())
        ).build();
    }

    static transactionOverview(received: number, paid: number) {
        return horizontal(
            TransactionTemplates.amountCard(received, t("TOTAL_RECEIVED")),
            TransactionTemplates.amountCard(paid, t("TOTAL_PAID")),
        ).build();
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

    private static amountCard(amount: number, label: StringOrSignal) {
        return vertical(
            text(currency(amount)).classes("text-xxlarge"),
            text(label),
        ).classes("card", "nogap").build();
    }
}