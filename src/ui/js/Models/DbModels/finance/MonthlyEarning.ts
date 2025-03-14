export interface MonthlyEarning {
    id: number;
    generated_at: Date;
    month: string;
    amount: number;
    product_id: number;
}