import {notify} from "./Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "@targoninc/jess";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {RoutePath} from "../Routing/routes.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {NotificationType} from "../Enums/NotificationType.ts";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {ProgressPart} from "../Models/ProgressPart.ts";
import { Api } from "../Api/Api.ts";

export class AudioUpload {
    triggerEvent: Event;
    state: Signal<UploadableTrack>;
    id: number | undefined;
    private progress: Signal<ProgressPart|null>;

    constructor(e: Event, state: Signal<UploadableTrack>, progress: Signal<ProgressPart|null>) {
        this.triggerEvent = e;
        this.state = state;
        this.progress = progress;

        this.progress.value = <ProgressPart>{
            icon: "info",
            text: "Details",
            state: ProgressState.notStarted,
            retryFunction: () => this.createTrackThenNext()
        };
        /*this.progress.value = [
            {
                id: "details",
                icon: "info",
                text: signal("Details"),
                state: signal<ProgressState>(ProgressState.notStarted),
                retryFunction: () => this.createTrackThenNext()
            },
            {
                id: "audio",
                icon: "music_note",
                text: signal("Audio"),
                state: signal<ProgressState>(ProgressState.notStarted),
                retryFunction: () => this.uploadAudioThenNext(),
                progress: signal(0)
            },
            {
                id: "cover",
                icon: "add_photo_alternate",
                text: signal("Cover"),
                state: signal<ProgressState>(ProgressState.notStarted),
                retryFunction: () => this.uploadCoverThenNext(),
                progress: signal(0)
            }
        ]*/

        this.uploadTrack().then();
    }

    setProgressPartState(update: Partial<ProgressPart>) {
        this.progress.value = <ProgressPart>{
            ...this.progress.value,
            ...update,
        };
    }

    async uploadTrack() {
        const error = await this.createTrackThenNext();
        if (error) {
            notify(`Failed to create track: ${error}`, NotificationType.error);
            return;
        }

        notify("Track upload completed", NotificationType.success);
        navigate(`${RoutePath.track}/${this.id}`);
    }

    async uploadAudioThenNext() {
        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: "Uploading audio",
            icon: "music_note",
            progress: 0
        });
        if (!this.state.value.audioFiles) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: "No audio file",
                icon: "error"
            });
            return "No audio file";
        }

        if (!this.id) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: "No track id",
                icon: "error"
            });
            return "No track id";
        }

        const error = await this.uploadMedia(MediaFileType.audio, this.id, this.state.value.audioFiles![0], (event: ProgressEvent) => {
            this.setProgressPartState({
                state: ProgressState.inProgress,
                text: "Uploading audio...",
                progress: (event.loaded / event.total) * 100
            });
        });
        if (error !== true) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: `Failed to upload audio: ${error}`,
                icon: "error"
            });
            return `Failed to upload audio: ${error}`;
        } else {
            this.setProgressPartState({
                state: ProgressState.complete,
                text: `Audio uploaded`,
                progress: 100
            });
            return await this.uploadCoverThenNext();
        }
    }

    async uploadCoverThenNext() {
        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: "Uploading cover",
            icon: "add_photo_alternate",
            progress: 0
        });
        if (this.state.value.coverArtFiles) {
            if (!this.id) {
                this.setProgressPartState({
                    state: ProgressState.error,
                    text: "No track id",
                    icon: "error"
                });
                return "No track id";
            }

            if (!await this.uploadMedia(MediaFileType.trackCover, this.id, this.state.value.coverArtFiles![0], (event: ProgressEvent) => {
                this.setProgressPartState({
                    state: ProgressState.inProgress,
                    text: "Uploading cover...",
                    progress: (event.loaded / event.total) * 100
                });
            })) {
                this.setProgressPartState({
                    state: ProgressState.error,
                    text: "Failed to upload cover",
                    icon: "error"
                });
                return "Failed to upload cover";
            }
        }

        this.setProgressPartState({
            state: ProgressState.complete,
            text: `Cover uploaded`,
            progress: 100
        });
    }

    async createTrackThenNext() {
        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: `Creating track...`,
            progress: 0
        });
        const result = await this.createTrack();
        if (result && result.constructor === String) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: result,
                icon: "error"
            });
            return result;
        } else if (result) {
            this.id = (result as Track).id;
            this.setProgressPartState({
                state: ProgressState.complete,
                text: "Track created",
                icon: "check"
            });
            return await this.uploadAudioThenNext();
        }
    }

    async createTrack() {
        const state = this.state.value;
        return Api.createTrack(state);
    }

    private async uploadMedia(type: MediaFileType, id: number, file: File, onProgress?: (event: ProgressEvent) => void) {
        try {
            await MediaUploader.upload(type, id, file, onProgress);
            return true;
        } catch (e) {
            return e;
        }
    }
}
