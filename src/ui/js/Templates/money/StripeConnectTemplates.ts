import { compute, create, signal, when, Signal } from "@targoninc/jess";
import { button } from "@targoninc/jess-components";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { StripeService } from "../../Services/StripeService.ts";
import { notify, Ui } from "../../Classes/Ui.ts";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { t } from "../../../locales";
import { TextSize } from "../../Enums/TextSize.ts";

export class StripeConnectTemplates {
    static balanceCard() {
        const accountStatus = signal<{
            connected: boolean;
            stripeAccountId?: string;
            onboardingComplete?: boolean;
            chargesEnabled?: boolean;
            payoutsEnabled?: boolean;
            detailsSubmitted?: boolean;
            country?: string;
            pendingVerification?: string[];
        } | null>(null);
        const balance = signal<{
            available: number;
            pending: number;
            currency: string;
        } | null>(null);
        const loading = signal(true);
        const error = signal("");
        const onboardingInProgress = signal(false);

        const load = () => {
            loading.value = true;
            error.value = "";
            StripeService.getAccountStatus()
                .then(d => {
                    accountStatus.value = d;
                    if (d?.connected) {
                        StripeService.getBalance()
                            .then(b => balance.value = b)
                            .catch(() => {});
                    }
                })
                .catch(e => error.value = String(e.message ?? e))
                .finally(() => loading.value = false);
        };
        load();

        const connected = compute(s => s?.connected ?? false, accountStatus);
        const chargesEnabled = compute(s => s?.chargesEnabled ?? false, accountStatus);
        const payoutsEnabled = compute(s => s?.payoutsEnabled ?? false, accountStatus);
        const detailsSubmitted = compute(s => s?.detailsSubmitted ?? false, accountStatus);
        const onboardingComplete = compute(s => s?.onboardingComplete ?? false, accountStatus);
        const notLoadingNoError = compute((l, e) => !l && !e, loading, error);

        return create("div")
            .classes("flex-v", "card")
            .children(
                create("h2").text(t("STRIPE_BALANCE")).build(),
                when(loading, GenericTemplates.loadingSpinner()),
                when(error, create("div").classes("flex-v", "small-gap").children(
                    create("span").classes("error").text(error).build(),
                    button({
                        text: t("RETRY"),
                        icon: { icon: "refresh" },
                        onclick: () => load(),
                    }),
                ).build()),
                when(notLoadingNoError, vertical(
                    when(connected, vertical(
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                create("span")
                                    .classes(TextSize.xxLarge)
                                    .text(compute(b => `${(b?.available ?? 0) / 100} ${b?.currency?.toUpperCase() ?? "EUR"}`, balance))
                                    .build(),
                                create("span").classes("color-dim", "small").text(t("AVAILABLE")).build(),
                                when(compute(b => (b?.pending ?? 0) > 0, balance),
                                    create("span")
                                        .classes("color-dim")
                                        .text(compute(b => `${t("PENDING_BALANCE")}: ${(b?.pending ?? 0) / 100} ${b?.currency?.toUpperCase() ?? "EUR"}`, balance))
                                        .build()),
                            ).build(),
                        when(compute((o, c) => o && !c, onboardingComplete, chargesEnabled),
                            create("span").classes("warning", "padded").text(t("STRIPE_ONBOARDING_PENDING")).build()),
                        when(compute((o, c) => o && c, onboardingComplete, chargesEnabled),
                            create("span").classes("positive-text", "padded").text(t("STRIPE_ACCOUNT_READY")).build()),
                        horizontal(
                            GenericTemplates.pill({
                                icon: chargesEnabled ? "check_circle" : "pending",
                                text: compute(c => c ? t("CHARGES_ENABLED") : t("CHARGES_DISABLED"), chargesEnabled),
                            }),
                            GenericTemplates.pill({
                                icon: payoutsEnabled ? "check_circle" : "pending",
                                text: compute(p => p ? t("PAYOUTS_ENABLED") : t("PAYOUTS_DISABLED"), payoutsEnabled),
                            }),
                        ).build(),
                        when(compute(d => !d, detailsSubmitted), create("span")
                            .classes("color-dim", "small")
                            .text(t("STRIPE_VERIFICATION_NEEDED"))
                            .build()),
                        when(compute(s => !!(s?.pendingVerification?.length), accountStatus),
                            create("span").classes("warning", "small")
                                .text(compute(s => `${t("STRIPE_PENDING_VERIFICATION", s?.pendingVerification?.join(", ") ?? "")}`, accountStatus))
                                .build()),
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            onclick: () => load(),
                        }),
                    ).build()),
                    when(compute(s => s && !s.connected, accountStatus), vertical(
                        when(compute(o => o, onboardingInProgress), GenericTemplates.loadingSpinner()),
                        create("span").classes("color-dim").text(t("STRIPE_PAYOUT_DESCRIPTION")).build(),
                        button({
                            text: compute(o => `${o ? t("OPENING_ONBOARDING") : t("CONNECT_STRIPE_ACCOUNT")}`, onboardingInProgress),
                            icon: { icon: "link" },
                            classes: ["special"],
                            disabled: onboardingInProgress,
                            onclick: async () => {
                                onboardingInProgress.value = true;
                                try {
                                    const result = await StripeService.startOnboarding();
                                    if ("completed" in result && result.completed) {
                                        notify(t("STRIPE_ONBOARDING_COMPLETE"), NotificationType.success);
                                        load();
                                    }
                                } catch (e: any) {
                                    notify(t("STRIPE_ONBOARDING_FAILED"), NotificationType.error);
                                } finally {
                                    onboardingInProgress.value = false;
                                }
                            },
                        }),
                    ).build()),
                ).build()),
            ).build();
    }
}
