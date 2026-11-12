import {Signal} from "@targoninc/jess";
import {UploadableTrack} from "./UploadableTrack.ts";
import {ProgressPart} from "./ProgressPart.ts";

export interface BatchEditTrackRowState {
    state: Signal<UploadableTrack>;
    audioExists: Signal<boolean>;
    progress: Signal<ProgressPart | null>;
    loading: Signal<boolean>;
    coverLoading: Signal<boolean>;
    imageState: Signal<string>;
}
