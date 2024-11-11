import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/f2.ts";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {ProgressPart} from "../Models/ProgressPart.ts";
import {ProgressState} from "../Enums/ProgressState.ts";

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
                text: "Details",
                state: ProgressState.notStarted,
                retryFunction: () => this.createTrackThenNext()
            },
            {
                id: "audio",
                icon: "music_note",
                text: "Audio",
                state: ProgressState.notStarted,
                retryFunction: () => this.uploadAudioThenNext()
            },
            {
                id: "cover",
                icon: "add_photo_alternate",
                text: "Cover",
                state: ProgressState.notStarted,
                retryFunction: () => this.uploadCoverThenNext()
            }
        ]

        this.uploadTrack().then();
    }

    setProgressPartState(id: string, state: ProgressState, title?: string) {
        this.progress.value = this.progress.value.map(p => {
            if (p.id === id) {
                p.state = state;
                p.title = title;
            }
            return p;
        });
    }

    async uploadTrack() {
        await this.createTrackThenNext();

        notify("Track upload completed", "success");
        navigate(`track/${this.id}`);
    }

    async uploadAudioThenNext() {
        this.setProgressPartState("audio", ProgressState.inProgress, "Uploading audio");
        if (!this.state.value.audioFiles) {
            this.setProgressPartState("audio", ProgressState.error, "No audio file");
            return;
        }

        if (!this.id) {
            this.setProgressPartState("audio", ProgressState.error, "No track id");
            return;
        }

        if (!await this.uploadMedia(MediaFileType.audio, this.id, this.state.value.audioFiles![0])) {
            this.setProgressPartState("audio", ProgressState.error, "Failed to upload audio");
        } else {
            this.setProgressPartState("audio", ProgressState.complete);
            await this.uploadCoverThenNext();
        }
    }

    async uploadCoverThenNext() {
        this.setProgressPartState("cover", ProgressState.inProgress, "Uploading cover");
        if (this.state.value.coverArtFiles) {
            if (!this.id) {
                this.setProgressPartState("cover", ProgressState.error, "No track id");
                return;
            }

            if (!await this.uploadMedia(MediaFileType.trackCover, this.id, this.state.value.coverArtFiles![0])) {
                this.setProgressPartState("cover", ProgressState.error, "Failed to upload cover");
                return;
            }
        }

        this.setProgressPartState("cover", ProgressState.complete);
    }

    async createTrackThenNext() {
        this.setProgressPartState("details", ProgressState.inProgress, "Creating track...");
        const track = await this.createTrack();
        if (!track) {
            this.setProgressPartState("details", ProgressState.error);
        } else {
            this.id = track.id;
            this.setProgressPartState("details", ProgressState.complete);
            await this.uploadAudioThenNext();
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
            return null;
        }

        return res.data;
    }

    private async uploadMedia(type: MediaFileType, id: number, file: File) {
        try {
            await MediaUploader.upload(type, id, file);
            return true;
        } catch (e) {
            return false;
        }
    }
}
