import { notify } from "./Ui.ts";
import { navigate } from "../Routing/Router.ts";
import { Signal } from "@targoninc/jess";
import { UploadableTrack } from "../Models/UploadableTrack.ts";
import { MediaUploader } from "../Api/MediaUploader.ts";
import { RoutePath } from "../Routing/routes.ts";
import { ProgressState } from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { NotificationType } from "../Enums/NotificationType.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { ProgressPart } from "../Models/ProgressPart.ts";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";

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
            text: t("DETAILS"),
            state: ProgressState.notStarted,
            retryFunction: () => this.createTrackThenNext()
        };

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
            notify(`${t("FAILED_TO_CREATE_TRACK_ERROR", error)}`, NotificationType.error);
            return;
        }

        notify(`${t("TRACK_UPLOAD_COMPLETED")}`, NotificationType.success);
        navigate(`${RoutePath.track}/${this.id}`);
    }

    async uploadAudioThenNext() {
        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: t("UPLOADING_AUDIO"),
            icon: "music_note",
            progress: 0
        });
        if (!this.state.value.audioFiles) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: t("NO_AUDIO_FILE"),
                icon: "error"
            });
            return `${t("NO_AUDIO_FILE")}`;
        }

        if (!this.id) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: t("NO_TRACK_ID"),
                icon: "error"
            });
            return `${t("NO_TRACK_ID")}`;
        }

        const error = await this.uploadMedia(MediaFileType.audio, this.id, this.state.value.audioFiles![0], (event: ProgressEvent) => {
            this.setProgressPartState({
                state: ProgressState.inProgress,
                text: t("UPLOADING_AUDIO"),
                progress: (event.loaded / event.total) * 100
            });
        });
        if (error !== true) {
            this.setProgressPartState({
                state: ProgressState.error,
                text: t("FAILED_TO_UPLOAD_AUDIO_ERROR", error),
                icon: "error"
            });
            return `${t("FAILED_TO_UPLOAD_AUDIO_ERROR", error)}`;
        } else {
            this.setProgressPartState({
                state: ProgressState.complete,
                text: t("AUDIO_UPLOADED"),
                progress: 100
            });
            return await this.uploadCoverThenNext();
        }
    }

    async uploadCoverThenNext() {
        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: t("UPLOADING_COVER"),
            icon: "add_photo_alternate",
            progress: 0
        });
        if (this.state.value.coverArtFiles) {
            if (!this.id) {
                this.setProgressPartState({
                    state: ProgressState.error,
                    text: t("NO_TRACK_ID"),
                    icon: "error"
                });
                return `${t("NO_TRACK_ID")}`;
            }

            if (!await this.uploadMedia(MediaFileType.trackCover, this.id, this.state.value.coverArtFiles![0], (event: ProgressEvent) => {
                this.setProgressPartState({
                    state: ProgressState.inProgress,
                    text: t("UPLOADING_COVER"),
                    progress: (event.loaded / event.total) * 100
                });
            })) {
                this.setProgressPartState({
                    state: ProgressState.error,
                    text: t("FAILED_UPLOADING_IMAGE"),
                    icon: "error"
                });
                return `${t("FAILED_UPLOADING_IMAGE")}`;
            }
        }

        this.setProgressPartState({
            state: ProgressState.complete,
            text: t("IMAGE_UPLOADED"),
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
