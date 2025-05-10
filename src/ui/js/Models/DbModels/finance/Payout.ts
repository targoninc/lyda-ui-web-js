import {PaymentStatus} from "../../../Enums/PaymentStatus.ts";

export interface Payout {
    id: number;
    payout_batch_id: string;
    user_id: number;
    amount_ct: number;
    status: PaymentStatus;
    created_at: Date;
    updated_at: Date;
}