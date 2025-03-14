import {SubscriptionStatus} from "../../enums/SubscriptionStatus.js";

export interface Subscription {
    id: number;
    user_id: number;
    subscription_id: number;
    status: SubscriptionStatus;
    created_at: Date;
    updated_at: Date;
    cancelled_at: Date;
    previous_subscription: number;
    external_subscription_id: string;
    external_order_id: string;
    gifted_by_user_id: number;
    next_billing_time: Date;
    outstanding_balance: string;
    currency_code: string;
}