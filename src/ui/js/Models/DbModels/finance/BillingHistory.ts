export interface BillingHistory {
    id: number;
    user_id: number;
    product_id: number;
    billing_type: string;
    amount: number;
    created_at: Date;
}