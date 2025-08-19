export interface IStreamClient {
    duration: number;
    playing: boolean;

    startAsync(): Promise<void>;

    stopAsync(): void;

    scrubTo(time: number, relative: boolean, togglePlay: boolean): Promise<void>;

    getCurrentTime(relative: boolean): any;

    getVolume(): number;

    setVolume(volume: number): void;

    getBufferedLength(): any;

    setLoop(looping: boolean): void;
}