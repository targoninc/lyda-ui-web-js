export interface PaginatedLineChartOptions {
    title: string;
    endpoint: string;
    params?: Record<string, any>;
    cumulative?: boolean;
    timeType?: "year" | "month" | "day" | string;
}
