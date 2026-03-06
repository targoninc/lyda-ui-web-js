import { compute, create, InputType, signal, signalMap, when } from "@targoninc/jess";
import { button, input } from "@targoninc/jess-components";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { SubscriptionPayment } from "@targoninc/lyda-shared/src/Models/db/finance/SubscriptionPayment";
import { Api } from "../../Api/Api.ts";
import { TableTemplates } from "../generic/TableTemplates.ts";
import { GenericTemplates, horizontal, text, vertical } from "../generic/GenericTemplates.ts";
import { notify } from "../../Classes/Ui.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { currency } from "../../Classes/Helpers/Num.ts";
import { t } from "../../../locales";
import { FormTemplates } from "../generic/FormTemplates.ts";

export class SubscriptionPaymentsTemplates {
    static page() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canRefund],
            SubscriptionPaymentsTemplates.paymentsView(),
        );
    }

    private static paymentsView() {
        const payments = signal<SubscriptionPayment[]>([]);
        const loading = signal(false);

        const load = () => {
            loading.value = true;
            Api.getPaymentHistory(0)
                .then(r => payments.value = r ?? [])
                .finally(() => loading.value = false);
        };
        load();

        return vertical(
            create("h1").text(t("SUBSCRIPTION_PAYMENTS")).build(),
            when(loading, GenericTemplates.loadingSpinner()),
            TableTemplates.table(
                false,
                TableTemplates.tableHeaders<SubscriptionPayment>([
                    { title: "ID", property: "id" },
                    { title: t("USER"), property: "user_id" },
                    { title: t("DATE"), property: "received_at" },
                    { title: t("TOTAL"), property: "total" },
                    { title: t("RECEIVED"), property: "received" },
                    { title: t("REFUNDED"), property: "refunded" },
                    { title: t("PROCESSOR"), property: "payment_processor" },
                    { title: t("ACTIONS"), property: undefined },
                ]),
                signalMap(
                    payments,
                    create("tbody"),
                    p => SubscriptionPaymentsTemplates.paymentRow(p, load),
                ),
            ),
        ).build();
    }

    private static paymentRow(payment: SubscriptionPayment, reload: () => void) {
        const maxRefundable = payment.received - payment.refunded;
        const refundAmount = signal<number | null>(maxRefundable);
        const note = signal<string>("");
        const isRefunding = signal(false);
        const alreadyRefunded = payment.refunded > 0;

        const doRefund = async () => {
            if (!refundAmount.value || refundAmount.value <= 0 || refundAmount.value > maxRefundable) {
                notify(`${t("INVALID_REFUND_AMOUNT")}`, NotificationType.error);
                return;
            }
            isRefunding.value = true;
            try {
                await Api.refundSubscriptionPayment(payment.id, refundAmount.value, note.value || undefined);
                notify(`${t("REFUND_SUCCESSFUL")}`, NotificationType.success);
                reload();
            } catch (e: any) {
                notify(`${t("REFUND_FAILED")}: ${e?.message ?? e}`, NotificationType.error);
            } finally {
                isRefunding.value = false;
            }
        };

        const refundControls = horizontal(
            FormTemplates.moneyField(
                t("REFUND_AMOUNT"),
                "refundAmount",
                "0.00",
                refundAmount,
                true,
                v => refundAmount.value = v,
                0.01,
                maxRefundable,
                0.01,
            ),
            input<string>({
                type: InputType.text,
                name: "note",
                label: t("NOTE"),
                placeholder: t("OPTIONAL_NOTE"),
                value: note,
                onchange: v => note.value = v,
            }),
            button({
                text: compute((r): string => r ? `${t("REFUNDING")}` : `${t("REFUND")}`, isRefunding),
                icon: { icon: "undo" },
                classes: ["negative"],
                onclick: doRefund,
            }),
        ).build();

        return TableTemplates.tr({
            cellClasses: [],
            data: [
                text(String(payment.id)),
                text(String(payment.user_id)),
                text(Time.agoUpdating(payment.received_at)),
                text(currency(payment.total)),
                text(currency(payment.received)),
                horizontal(
                    text(currency(payment.refunded)),
                    when(alreadyRefunded, create("span").classes("color-dim").text(` (${t("PARTIAL_REFUND")})`).build()),
                ).build(),
                text(payment.payment_processor),
                maxRefundable > 0 ? refundControls : create("span").classes("color-dim").text(t("FULLY_REFUNDED")).build(),
            ],
        });
    }
}

