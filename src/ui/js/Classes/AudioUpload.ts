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

interface AudioUploadOptions {
    trackId?: number;
    navigateOnSuccess?: boolean;
    notifyOnComplete?: boolean;
    notifyOnError?: boolean;
    skipCover?: boolean;
    enableRetry?: boolean;
}

export interface AudioUploadResult {
    id?: number;
    error?: string;
}

export class AudioUpload {
    triggerEvent: Event | null;
    state: Signal<UploadableTrack>;
    id: number | undefined;
    private readonly progress: Signal<ProgressPart|null>;
    private readonly options: AudioUploadOptions;
    private readonly completion: Promise<string | undefined>;

    constructor(
        e: Event | null,
        state: Signal<UploadableTrack>,
        progress: Signal<ProgressPart | null>,
        loadingUpdate: (loading: boolean) => void,
        options: AudioUploadOptions = {},
    ) {
        this.triggerEvent = e;
        this.state = state;
        this.progress = progress;
        this.options = options;
        this.id = options.trackId;
        loadingUpdate(true);

        this.progress.value = <ProgressPart>{
            icon: "info",
            text: t("DETAILS"),
            state: ProgressState.notStarted,
            retryFunction: this.options.enableRetry === false ? undefined : () => this.createTrackThenNext()
        };

        this.completion = this.uploadTrack().finally(() => loadingUpdate(false));
    }

    /** Upload a track without navigating; used by the bulk upload queue. */
    static async upload(
        state: Signal<UploadableTrack>,
        progress: Signal<ProgressPart | null>,
        options: Pick<AudioUploadOptions, "trackId"> = {},
    ): Promise<AudioUploadResult> {
        const uploader = new AudioUpload(null, state, progress, () => {}, {
            ...options,
            navigateOnSuccess: false,
            notifyOnComplete: false,
            notifyOnError: false,
            skipCover: true,
            enableRetry: false,
        });
        const error = await uploader.completion;
        return {id: uploader.id, error};
    }

    setProgressPartState(update: Partial<ProgressPart>) {
        this.progress.value = <ProgressPart>{
            ...this.progress.value,
            ...update,
        };
    }

    async uploadTrack(): Promise<string | undefined> {
        const error = await this.createTrackThenNext();
        if (error) {
            if (this.options.notifyOnError !== false) {
                notify(`${t("FAILED_TO_CREATE_TRACK_ERROR", error)}`, NotificationType.error);
            }
            return error;
        }

        if (this.options.notifyOnComplete !== false) {
            notify(`${t("TRACK_UPLOAD_COMPLETED")}`, NotificationType.success);
        }
        if (this.options.navigateOnSuccess !== false) {
            navigate(`${RoutePath.track}/${this.id}`);
        }
        return undefined;
    }

    async uploadAudioThenNext(): Promise<string | undefined> {
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
        }, { versionIndex: 1 });
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

    async uploadCoverThenNext(): Promise<string | undefined> {
        if (this.options.skipCover) {
            this.setProgressPartState({
                state: ProgressState.complete,
                text: t("AUDIO_UPLOADED"),
                progress: 100
            });
            return;
        }

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

    async createTrackThenNext(): Promise<string | undefined> {
        if (this.id !== undefined) {
            return await this.uploadAudioThenNext();
        }

        this.setProgressPartState({
            state: ProgressState.inProgress,
            text: `Creating track...`,
            progress: 0
        });
        const result = await this.createTrack();
        if (!result) {
            const error = `${t("FAILED_TO_CREATE_TRACK_ERROR", "")}`;
            this.setProgressPartState({
                state: ProgressState.error,
                text: error,
                icon: "error"
            });
            return error;
        } else if (result.constructor === String) {
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

    private async uploadMedia(type: MediaFileType, id: number, file: File, onProgress?: (event: ProgressEvent) => void, options?: { versionIndex?: number }) {
        try {
            await MediaUploader.upload(type, id, file, onProgress, options);
            return true;
        } catch (e) {
            return e;
        }
    }
}
