export interface Expense {
    id: bigint;
    year: number;
    month: number;
    day: number;
    amount_ct: number;
    label: string;
    expense_group: string;
}