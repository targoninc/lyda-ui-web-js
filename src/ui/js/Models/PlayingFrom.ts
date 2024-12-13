export interface PlayingFrom {
    type: "album" | "playlist" | string;
    name: string;
    id: number;
}