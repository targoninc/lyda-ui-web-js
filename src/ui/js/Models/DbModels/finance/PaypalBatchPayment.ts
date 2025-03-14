import type {PaypalBatchStatus} from "../../../utility/Paypal/models/PaypalBatchStatus.ts";

export interface PaypalBatchPayment {
    id: number;
    paypal_batch_id: string;
    request_items_json: string;
    paypal_batch_status: PaypalBatchStatus;
    created_at: Date;
    updated_at: Date;
}