import {PaginatedLineChartSeries} from "./PaginatedLineChartSeries.ts";

export interface PaginatedLineChartOptions {
    title: string;
    endpoint: string;
    params?: Record<string, any>;
    cumulative?: boolean;
    currency?: boolean;
    timeType?: "year" | "month" | "day" | string;
    primarySeriesLabel?: string;
    secondarySeries?: PaginatedLineChartSeries;
}
