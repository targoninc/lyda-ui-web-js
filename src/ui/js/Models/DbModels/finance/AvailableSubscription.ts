export interface AvailableSubscription {
    id: number;
    product_id: number;
    name: string;
    description: string;
    service: string;
    plan_id: string;
    term_type: string;
    price_per_term: number;
}