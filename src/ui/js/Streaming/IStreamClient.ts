export interface IStreamClient {
    duration: number;
    playing: boolean;

    startAsync(fromBeginning?: boolean): Promise<void>;

    stopAsync(): void;

    scrubTo(time: number, relative: boolean): Promise<void>;

    getCurrentTime(relative: boolean): any;

    getVolume(): number;

    setVolume(volume: number): void;

    getBufferedLength(): any;

    setLoop(looping: boolean): void;

    setVersion(version: number | undefined): void;

    /** Releases the client's audio graph and network resources. */
    close(): void;

    /** Starts fetching/buffering without playing (used for gapless preload). */
    preload(): void;

    /** Drops the current source so the next startAsync re-fetches (quality/version change). */
    reloadSource(): void;

    /** Ramps the volume (0..1) over durationSeconds on the shared AudioContext clock. */
    rampVolume(targetVolume: number, durationSeconds: number): void;

    onEnded?: () => void;
}