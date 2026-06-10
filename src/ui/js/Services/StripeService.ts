import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Api } from "../Api/Api.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { PaymentProvider } from "@targoninc/lyda-shared/src/Enums/PaymentProvider";

export class StripeService {
    private static stripe: Stripe | null = null;
    private static publicKey: string = "";

    static async init() {
        try {
            const res = await fetch(ApiRoutes.getStripePublicKey);
            const data = await res.json();
            if (data?.publicKey) {
                this.publicKey = data.publicKey;
            }
        } catch {
            console.warn("Stripe public key not available");
        }
    }

    static setPublicKey(key: string) {
        this.publicKey = key;
    }

    static async getStripe() {
        if (!this.stripe) {
            if (!this.publicKey) {
                await this.init();
            }
            if (!this.publicKey) {
                throw new Error("Stripe public key not configured");
            }
            this.stripe = await loadStripe(this.publicKey);
        }
        return this.stripe;
    }

    static async checkout(type: "album" | "track", entityId: number, amount: number) {
        const stripe = await this.getStripe();
        if (!stripe) throw new Error("Stripe failed to load");

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
        const { clientSecret, id } = initResponse;

        if (!clientSecret) {
            throw new Error("Missing client secret from backend");
        }

        const result = await stripe.confirmCardPayment(clientSecret);

        if (result.error) {
            throw new Error(result.error.message);
        }

        if (result.paymentIntent?.status === "succeeded") {
            await Api.createOrder({
                type,
                entityId,
                paymentProvider: PaymentProvider.stripe,
                orderId: id!
            });
            return true;
        }

        return false;
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
        const response = await Api.get<{
            url?: string;
            completed: boolean;
            stripeAccountId?: string;
            chargesEnabled?: boolean;
            payoutsEnabled?: boolean;
            detailsSubmitted?: boolean;
        }>(ApiRoutes.stripeOnboarding);

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
