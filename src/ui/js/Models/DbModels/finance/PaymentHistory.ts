export interface PaymentHistory {
    id: number;
    received_at: Date;
    user_id: number;
    product_id: number;
    subscription_id: number;
    currency: string;
    payment_processor: string;
    external_id: string;
    total: number;
    fees: number;
    received: number;
    succeeded: boolean;
}