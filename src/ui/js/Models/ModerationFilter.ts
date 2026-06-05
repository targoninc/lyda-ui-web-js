export interface ModerationFilter {
    potentiallyHarmful: boolean,
    username: string | null,
    contentFilter: string | null,
    offset: number,
    limit: number,
    hasReports?: boolean,
}