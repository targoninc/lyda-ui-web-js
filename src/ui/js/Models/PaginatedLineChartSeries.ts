import {Statistic} from "@targoninc/lyda-shared/src/Models/Statistic";

export interface PaginatedLineChartSeries {
    label: string;
    value: (statistic: Statistic) => number;
    color?: string;
}
