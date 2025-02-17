export interface RoyaltyMonth {
    month: number;
    year: number;
    hasEarnings: boolean;
    earnings: number;
    artistRoyalties: number;
    trackRoyalties: number;
    calculated: boolean;
    approved: boolean;
}