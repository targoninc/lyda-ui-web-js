export interface PaginatedLineChartOptions {
    title: string;
    endpoint: string;
    params?: Record<string, any>;
    timeType?: "year" | "month" | "day" | string;
}
