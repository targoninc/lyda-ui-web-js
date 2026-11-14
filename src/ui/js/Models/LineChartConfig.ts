import {LineChartSeries} from "./LineChartSeries.ts";

export interface LineChartConfig {
    valueTitle: string;
    includeZero?: boolean;
    currency?: boolean;
    title: string;
    series?: LineChartSeries[];
}
