import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {signal, Signal} from "../../fjsc/src/signals.ts";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {Track} from "../Models/DbModels/lyda/Track.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {ProgressPart} from "../Models/ProgressPart.ts";
import {ProgressState} from "../Enums/ProgressState.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {RoutePath} from "../Routing/routes.ts";

export class AudioUpload {
    triggerEvent: Event;
    state: Signal<UploadableTrack>;
    id: number | undefined;
    ws: any;
    api: Api|undefined;
    private progress: Signal<ProgressPart[]>;

    constructor(e: Event, state: Signal<UploadableTrack>, progress: Signal<ProgressPart[]>) {
        this.triggerEvent = e;
        this.state = state;
        this.progress = progress;

        this.progress.value = [
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
        ]

        this.uploadTrack().then();
    }

    setProgressPartState(id: string, state: ProgressState, title?: string, progress?: number) {
        const item = this.progress.value.find(p => p.id === id);
        if (item) {
            item.state.value = state;
            if (title) {
                item.text.value = title;
            }
            if (item.progress) {
                item.progress.value = progress ?? 0;
            }
        }
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
        this.setProgressPartState("audio", ProgressState.inProgress, "Uploading audio");
        if (!this.state.value.audioFiles) {
            this.setProgressPartState("audio", ProgressState.error, "No audio file");
            return "No audio file";
        }

        if (!this.id) {
            this.setProgressPartState("audio", ProgressState.error, "No track id");
            return "No track id";
        }

        const error = await this.uploadMedia(MediaFileType.audio, this.id, this.state.value.audioFiles![0], (event: ProgressEvent) => {
            this.setProgressPartState("audio", ProgressState.inProgress, "Uploading audio...", (event.loaded / event.total) * 100);
        });
        if (error !== true) {
            this.setProgressPartState("audio", ProgressState.error, `Failed to upload audio: ${error}`);
            return `Failed to upload audio: ${error}`;
        } else {
            this.setProgressPartState("audio", ProgressState.complete);
            return await this.uploadCoverThenNext();
        }
    }

    async uploadCoverThenNext() {
        this.setProgressPartState("cover", ProgressState.inProgress, "Uploading cover");
        if (this.state.value.coverArtFiles) {
            if (!this.id) {
                this.setProgressPartState("cover", ProgressState.error, "No track id");
                return "No track id";
            }

            if (!await this.uploadMedia(MediaFileType.trackCover, this.id, this.state.value.coverArtFiles![0], (event: ProgressEvent) => {
                this.setProgressPartState("cover", ProgressState.inProgress, "Uploading cover...", (event.loaded / event.total) * 100);
            })) {
                this.setProgressPartState("cover", ProgressState.error, "Failed to upload cover");
                return "Failed to upload cover";
            }
        }

        this.setProgressPartState("cover", ProgressState.complete, "Cover uploaded");
    }

    async createTrackThenNext() {
        this.setProgressPartState("details", ProgressState.inProgress, "Creating track...");
        const result = await this.createTrack();
        if (result && result.constructor === String) {
            this.setProgressPartState("details", ProgressState.error);
            return result;
        } else if (result) {
            this.id = (result as Track).id;
            this.setProgressPartState("details", ProgressState.complete);
            return await this.uploadAudioThenNext();
        }
    }

    async createTrack() {
        const state = this.state.value;

        const res = await Api.postAsync<Track>(ApiRoutes.createTrack, {
            title: state.title,
            isrc: state.isrc,
            upc: state.upc,
            visibility: state.visibility,
            collaborators: state.collaborators,
            credits: state.credits,
            release_date: state.release_date,
            genre: state.genre,
            description: state.description,
            price: state.price,
        });

        if (res.code !== 200) {
            return res.data.error;
        }

        return res.data as Track;
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
