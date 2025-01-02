import {SubscriptionStatus} from "../../../Enums/SubscriptionStatus.ts";

export interface Subscription {
    id: number;
    user_id: number;
    subscription_id: number;
    status: SubscriptionStatus;
    billed: number;
    paid: number;
    created_at: Date;
    updated_at: Date;
    cancelled_at: Date;
    previous_subscription: number;
    external_subscription_id: string;
    external_order_id: string;
    gifted: boolean;
}