import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Api } from "../Api/Api.ts";
import { CreateOrderRequest } from "@targoninc/lyda-shared/src/Models/CreateOrderRequest";
import { PaymentProvider } from "@targoninc/lyda-shared/src/Enums/PaymentProvider";

export class StripeService {
    private static stripe: Stripe | null = null;
    private static publicKey: string = "pk_test_51P2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2UqfP2Uqf"; // Replace with your key

    static async getStripe() {
        if (!this.stripe) {
            this.stripe = await loadStripe(this.publicKey);
        }
        return this.stripe;
    }

    static async checkout(type: "album" | "track", entityId: number) {
        const stripe = await this.getStripe();
        if (!stripe) throw new Error("Stripe failed to load");

        // Step 1: Initialize payment on backend to get client secret
        const initResponse = await Api.createOrder({
            type,
            entityId,
            paymentProvider: PaymentProvider.stripe,
            orderId: "new"
        });

        const { clientSecret, id } = initResponse;

        if (!clientSecret) {
            throw new Error("Missing client secret from backend");
        }

        // Step 2: Confirm payment on client
        const result = await stripe.confirmCardPayment(clientSecret);

        if (result.error) {
            throw new Error(result.error.message);
        }

        if (result.paymentIntent?.status === "succeeded") {
            // Step 3: Notify backend that payment is complete
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
        // planId is the external plan/price id (e.g. Stripe Price ID)
        const response = await Api.subscribe({
            id,
            planId,
            targetUserId,
            provider: "stripe"
        });

        if (response?.url) {
            window.location.href = response.url;
        } else {
            throw new Error("Failed to create subscription session");
        }
    }
}
