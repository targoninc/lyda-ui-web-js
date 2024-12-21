export interface SearchResult {
    id: number;
    url: string;
    exactMatch: boolean;
    type: string;
    display: string;
    subtitle?: string;
    hasImage?: boolean;
}