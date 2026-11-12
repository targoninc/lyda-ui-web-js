export interface PlayableTrackLike {
    processed?: boolean | number | string | null;
}

export function isPlayableTrack(track: PlayableTrackLike | null | undefined): boolean {
    return !!track && (track.processed === true || track.processed === 1 || track.processed === "1");
}
