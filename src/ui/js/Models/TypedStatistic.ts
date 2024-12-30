import {Statistic} from "./Statistic.js";
import {ActivityTableName} from "../Enums/ActivityTableName.ts";

export interface TypedStatistic {
    type: ActivityTableName,
    stats: Statistic[]
}