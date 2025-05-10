export function dayFromValue(value: number|string|Date|null) {
    if (!value) {
        return new Date().toISOString().split("T")[0];
    }
    const date = new Date(value);
    return date.toISOString().split("T")[0];
}

export interface MonthIdentifier {
    year: number;
    month: number;
}

export function yearAndMonthByOffset(offset: number): MonthIdentifier {
    const date = new Date();
    date.setMonth(date.getMonth() - offset);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
    }
}