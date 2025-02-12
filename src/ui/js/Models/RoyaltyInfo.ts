import {RoyaltyMonth} from "./RoyaltyMonth.ts";

export interface RoyaltyInfo {
    calculatableMonths: RoyaltyMonth[];
    trackRoyaltyValues: any;
    meanTrackRoyalty: number;
    paidTotal: number;
    available: number,
    totalRoyalties: number,
    paypalMail: string | null,
}