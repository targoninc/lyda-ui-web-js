export function dayFromValue(value: number|string|Date|null) {
    if (!value) {
        return localDateString(new Date());
    }
    return localDateString(new Date(value));
}

function localDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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