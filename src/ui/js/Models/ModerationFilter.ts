export interface ModerationFilter {
    potentiallyHarmful: boolean,
    user_id: number | null,
    offset: number,
    limit: number
}