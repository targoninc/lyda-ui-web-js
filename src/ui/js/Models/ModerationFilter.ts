export interface ModerationFilter {
    potentiallyHarmful: boolean,
    user_id?: number,
    username: string | null,
    contentFilter: string | null,
    offset: number,
    limit: number,
    hasReports?: boolean,
    showDeleted?: boolean,
}