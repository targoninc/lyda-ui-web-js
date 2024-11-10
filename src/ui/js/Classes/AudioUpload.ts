import {Api} from "../Api/Api.ts";
import {notify, Ui} from "./Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/f2.ts";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {UploadInfo} from "../Models/UploadInfo.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class AudioUpload {
    triggerEvent: Event;
    state: Signal<UploadableTrack>;
    uploadInfo: Signal<UploadInfo[]>;
    id: number | undefined;
    ws: any;
    api: Api|undefined;
    coverFile: File|undefined;
    audioFile: File|undefined;

    constructor(e: Event, state: Signal<UploadableTrack>, uploadInfo: Signal<UploadInfo[]>) {
        this.triggerEvent = e;
        this.state = state;
        this.uploadInfo = uploadInfo;

        if (!this.validate()) {
            return;
        }

        try {
            this.uploadInfo.value = [
                {
                    type: "info",
                    value: "0%"
                },
                {
                    type: "cover",
                    value: "0%"
                },
                {
                    type: "audio",
                    value: "0%"
                },
            ];
        } catch (e) {
            console.error(e);
            return;
        }

        this.uploadTrack().then();
    }

    async uploadTrack() {
        this.writeToInfo("Creating track...", "info");
        const track = await this.createTrack();
        if (!track) {
            this.writeToInfo("Failed to create track", "info");
            this.setInfoError("info");
            return;
        }
        this.id = track.id;

        if (!this.audioFile) {
            this.writeToInfo("No audio file, aborting upload", "audio");
            this.setInfoError("audio");
            return;
        }
        this.writeToInfo("Uploading audio...", "audio");
        try {
            await this.uploadMedia(MediaFileType.audio, this.id, this.state.value.audioFiles![0]);
        } catch (e) {
            this.writeToInfo("Failed to upload audio: " + e, "audio");
            this.setInfoError("audio");
            return;
        }
        this.writeToInfo("Uploaded audio", "audio");

        if (this.coverFile) {
            this.writeToInfo("Uploading cover...", "cover");
            await this.uploadMedia(MediaFileType.trackCover, this.id, this.coverFile);
            this.writeToInfo("Cover uploaded!", "cover");
            this.setInfoSuccess("cover");
        } else {
            this.writeToInfo("No cover file, skipping step.", "cover");
            this.setInfoSuccess("cover");
        }

        notify("Track upload completed", "success");
        navigate(`track/${this.id}`);
    }

    writeToInfo(text: string, type: string|null|undefined = null) {
        if (type === undefined || type === "all" || type === null) {
            this.uploadInfo.value = this.uploadInfo.value.map((info: UploadInfo) => {
                info.value = text;
                return info;
            });
        } else {
            this.uploadInfo.value = this.uploadInfo.value.map((info: UploadInfo) => {
                if (info.type === type) {
                    info.value = text;
                }
                return info;
            });
        }
    }

    setInfoError(type: string) {
        this.uploadInfo.value = this.uploadInfo.value.map((info: UploadInfo) => {
            if (info.type === type) {
                info.classes = ["error"];
            }
            return info;
        });
    }

    setInfoSuccess(type: string) {
        this.uploadInfo.value = this.uploadInfo.value.map((info: UploadInfo) => {
            if (info.type === type) {
                info.classes = ["success"];
            }
            return info;
        });
    }

    // Maybe move this info input validation so user knows earlier what's wrong
    validate() {
        let success = true;
        if (this.state.value.coverArtFiles) {
            this.coverFile = this.state.value.coverArtFiles![0];
            success = !success ?? this.validateCondition(this.coverFile.type.startsWith("image/"), "Invalid file type", "cover");
            success = !success ?? this.validateCondition(this.coverFile.size < 20 * 1024 * 1024, "Cover file too big", "cover");
        }

        if (this.state.value.audioFiles) {
            this.audioFile = this.state.value.audioFiles![0];
            success = !success ?? this.validateCondition(this.audioFile.type.startsWith("audio/"), "Invalid file type", "audio");
            success = !success ?? this.validateCondition(this.audioFile.size < 1000 * 1024 * 1024, "Audio file too big", "audio");
        }

        return success;
    }

    validateCondition(condition: boolean, message: string, type: string) {
        if (!condition) {
            notify(message, "error");
            this.writeToInfo(message, type);
            this.setInfoError(type);
            return false;
        }
        return true;
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
            this.writeToInfo("Failed to create track: " + res.data, "info");
            this.setInfoError("info");
            return null;
        }

        this.writeToInfo("Track created!", "info");
        this.setInfoSuccess("info");
        return res.data;
    }

    private async uploadMedia(type: MediaFileType, id: number, file: File) {
        return await MediaUploader.upload(type, id, file);
    }
}
