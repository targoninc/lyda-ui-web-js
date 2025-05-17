import {Statistic} from "./Statistic.js";
import {ActivityTableName} from "../EnumsShared/ActivityTableName.ts";

export interface TypedStatistic {
    type: ActivityTableName,
    stats: Statistic[]
}