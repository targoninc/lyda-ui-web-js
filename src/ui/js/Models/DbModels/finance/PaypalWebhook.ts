export interface PaypalWebhook {
    id: string;
    type: string;
    received_at: Date;
    content: string;
    paypal_user_id: string;
    handled: boolean;
    updated_at: Date;
}