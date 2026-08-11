import { Api } from "../Api/Api.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { PaymentProvider } from "@targoninc/lyda-shared/src/Enums/PaymentProvider";

export class StripeService {
    static async checkout(type: "album" | "track", entityId: number, amount: number): Promise<boolean> {
        const initResponse = await Api.createOrder({
            type,
            entityId,
            paymentProvider: PaymentProvider.stripe,
            orderId: "new",
            amount
        });

        if (!initResponse) {
            throw new Error("Failed to get order creation response");
        }

        const url = initResponse.url;
        if (!url) {
            throw new Error("Missing checkout url from backend");
        }

        // Hosted Checkout: Stripe collects the card on its own page. The order
        // is fulfilled by the payment_intent.succeeded webhook, so there is
        // nothing to confirm client-side.
        const opened = window.open(url, "_blank");
        if (!opened) {
            throw new Error("Popup blocked. Allow popups for this site to start checkout.");
        }

        return true;
    }

    static async subscribe(id: number, planId: string, targetUserId?: number) {
        try {
            const response = await Api.subscribe({
                id,
                planId,
                targetUserId,
                provider: PaymentProvider.stripe
            });

            if (response?.url) {
                window.open(response.url, '_blank');
            } else {
                throw new Error("Failed to create subscription session: No URL returned");
            }
        } catch (e: any) {
            console.error("Stripe subscription failed", e);
            throw e;
        }
    }

    static async startOnboarding(): Promise<{ url: string } | { completed: boolean }> {
        const returnPath = window.location.pathname + window.location.search + window.location.hash;
        const response = await Api.get<{
            url?: string;
            completed: boolean;
            stripeAccountId?: string;
            chargesEnabled?: boolean;
            payoutsEnabled?: boolean;
            detailsSubmitted?: boolean;
        }>(ApiRoutes.stripeOnboarding, { returnPath });

        if (!response) {
            throw new Error("Failed to start Stripe onboarding");
        }

        if (response.url) {
            window.location.href = response.url;
            return { url: response.url };
        }

        return { completed: response.completed };
    }

    static async getAccountStatus(): Promise<{
        connected: boolean;
        stripeAccountId?: string;
        onboardingComplete?: boolean;
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        detailsSubmitted?: boolean;
        country?: string;
        pendingVerification?: string[];
    }> {
        return await Api.get(ApiRoutes.stripeAccount) ?? { connected: false };
    }

    static async getBalance(): Promise<{
        available: number;
        pending: number;
        currency: string;
    }> {
        return await Api.get(ApiRoutes.stripeBalance) ?? { available: 0, pending: 0, currency: "eur" };
    }
}
