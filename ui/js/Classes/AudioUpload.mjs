import {Api} from "../Classes/Api.mjs";
import {Util} from "./Util.mjs";
import {Ui} from "./Ui.mjs";

export class AudioUpload {
    constructor(e, state) {
        this.triggerEvent = e;
        this.state = state;

        if (!this.validate()) {
            return;
        }

        try {
            this.uploadInfo = {
                info: document.getElementById("upload-info-info"),
                audio: document.getElementById("upload-info-audio"),
                cover: document.getElementById("upload-info-cover"),
            };
            for (let key in this.uploadInfo) {
                this.uploadInfo[key].classList.remove("hidden");
            }
        } catch (e) {
            console.error(e);
            return;
        }

        this.writeToInfo("Waiting to start");
        this.api = new Api();
        this.ui = new Ui();
        this.ws = this.api.connectToWebsocket(this.api.websockets.uploadAudio,
            this.handleMessage.bind(this),
            this.handleError.bind(this),
            this.handleClose.bind(this),
            this.handleOpen.bind(this)
        );
    }

    writeToInfo(text, type = null) {
        if (type === undefined || type === "all" || type === null) {
            for (let key in this.uploadInfo) {
                this.uploadInfo[key].innerText = text;
            }
            return;
        }
        this.uploadInfo[type].innerText = text;
    }

    hideInfo(type) {
        this.uploadInfo[type].style.display = "none";
    }

    showInfo(type) {
        this.uploadInfo[type].style.display = "initial";
    }

    setInfoError(type) {
        this.uploadInfo[type].classList.add("error");
    }

    setInfoSuccess(type) {
        this.uploadInfo[type].classList.add("success");
    }

    validate() {
        let success = true;
        let cover_input = document.getElementById("cover-file");
        this.coverFile = cover_input.files[0];
        if (this.coverFile) {
            success = !success ?? this.validateCondition(this.audioFile.type.startsWith("image/"), "Invalid file type", "cover");
            success = !success ?? this.validateCondition(this.audioFile.size < 20 * 1024 * 1024, "Cover file too big", "cover");
        }

        let audio_input = document.getElementById("audio-file");
        this.audioFile = audio_input.files[0];
        success = !success ?? this.validateCondition(this.audioFile.type.startsWith("audio/"), "Invalid file type", "audio");
        success = !success ?? this.validateCondition(this.audioFile.size < 1000 * 1024 * 1024, "Audio file too big", "audio");

        let requiredInputs = document.querySelectorAll("[required]");
        for (let input of requiredInputs) {
            if (!input.value || input.value === "") {
                success = !success ?? this.validateCondition(false, "Missing required input: " + input.name, "info");
            }
        }
        return success;
    }

    validateCondition(condition, message, type) {
        if (!condition) {
            Ui.notify(message, "error");
            this.writeToInfo(message, type);
            this.setInfoError(type);
            return false;
        }
        return true;
    }

    handleError(e) {
        Ui.notify("Failed to upload audio: " + e.message, "error");
        this.writeToInfo("Failed to upload audio: " + e.message, "audio");
        this.setInfoError("audio");
    }

    handleMessage(ev) {
        let data = JSON.parse(ev.data);
        console.log(data);
        switch (data.type) {
        case "authenticationResponse":
            this.handleAuthenticationResponse(data);
            break;
        case "initFileUploadResponse":
            this.handleInitFileUploadResponse();
            break;
        case "fileUploadResponse":
            this.handleFileUploadResponse(data);
            break;
        case "cancelFileUploadResponse":
            this.handleCancelFileUploadResponse(data);
            break;
        case "completeFileUploadResponse":
            this.handleCompleteFileUploadResponse(data);
            break;
        default:
            console.warn("Unknown message type: ", data);
        }
    }

    async handleOpen() {
        this.writeToInfo("Creating track...", "info");
        this.id = await this.createTrack();

        if (!this.id) {
            this.writeToInfo("Failed to create track", "info");
            this.setInfoError("info");
            return;
        }

        this.writeToInfo("Authenticating...", "audio");
        this.ws.send(JSON.stringify({
            type: "authenticationRequest"
        }));
    }

    handleClose() {
        this.writeToInfo("Connection closed (This usually means there was an error with us. Please contact support if the issue persists.)", "audio");
        this.setInfoError("audio");
    }

    handleAuthenticationResponse(data) {
        if (!data.success) {
            this.writeToInfo("Authentication failed: " + data.message, "audio");
            this.setInfoError("audio");
            return;
        }

        this.writeToInfo("Authenticated!", "audio");
        const dotParts = this.audioFile.name.split(".");
        this.ws.send(JSON.stringify({
            type: "initFileUploadRequest",
            id: this.id,
            extension: dotParts[dotParts.length - 1]
        }));
    }

    startCoverUpload() {
        if (!this.coverFile) {
            this.writeToInfo("No cover file, skipping step.", "cover");
            this.setInfoSuccess("cover");
            Ui.notify("Track upload completed!", "success");
            window.router.navigate(`track/${this.id}`).then();
            return;
        }

        if (!this.coverFile.type.startsWith("image/") || this.coverFile.size > 20 * 1024 * 1024) {
            this.writeToInfo("Invalid cover file", "cover");
            this.setInfoError("cover");
            return;
        }

        this.writeToInfo("Uploading cover...", "cover");
        this.uploadCover().then();
    }

    async uploadCover(iteration = 0) {
        const maxIterations = 5;

        this.writeToInfo("Uploading cover...", "cover");
        const formData = new FormData();
        formData.append("id", this.id);
        formData.append("cover", this.coverFile);
        const res = await Api.postRawAsync(Api.endpoints.tracks.actions.uploadCover, formData);
        if (res.code === 200) {
            this.writeToInfo("Cover uploaded!", "cover");
            this.setInfoSuccess("cover");
            Ui.notify("File upload completed", "success");
            window.router.navigate(`track/${this.id}`).then();
        } else if (iteration < maxIterations && res.code !== 400) {
            setTimeout(() => {
                this.writeToInfo("Retrying cover upload...", "cover");
                this.uploadCover(iteration + 1).then();
            }, 5000);
        } else {
            this.writeToInfo("Failed to upload cover: " + res.data, "cover");
            this.setInfoError("cover");
        }
    }

    handleInitFileUploadResponse() {
        this.startCoverUpload();
        this.startAudioUpload();
    }

    startAudioUpload() {
        this.writeToInfo("Uploading audio...", "audio");
        let reader = new FileReader();
        reader.readAsDataURL(this.audioFile);
        reader.onload = (e) => {
            let data = e.target.result;
            this.ws.send(JSON.stringify({
                type: "fileUploadRequest",
                id: this.id,
                offset: 0,
                data: data
            }));
        };
        reader.onerror = (error) => {
            console.log("Error reading file:", error);
            this.writeToInfo("Failed to read file", "audio");
            this.setInfoError("audio");
        };
    }

    handleFileUploadResponse(data) {
        if (data.success) {
            this.ws.send(JSON.stringify({
                type: "completeFileUploadRequest",
                id: this.id
            }));
        } else {
            this.writeToInfo("Failed to upload audio: " + data.message, "audio");
            this.setInfoError("audio");
        }
    }

    handleCancelFileUploadResponse(data) {
        Ui.notify("File upload cancelled", "error");
        this.writeToInfo("File upload cancelled: " + data.message, "audio");
        this.setInfoError("audio");
    }

    handleCompleteFileUploadResponse(data) {
        Util.hideButtonLoader(this.triggerEvent.target);
        Util.openAllDetails();

        if (data.success) {
            this.writeToInfo("Audio uploaded!", "audio");
            this.setInfoSuccess("audio");
        }
    }

    async createTrack() {
        console.log(this.state.value);
        const state = this.state.value;

        const res = await Api.postAsync(Api.endpoints.tracks.actions.new, {
            title: state.title,
            isrc: state.isrc,
            upc: state.upc,
            visibility: state.visibility,
            collaborators: state.collaborators,
            linked_users: state.linkedUsers,
            release_date: state.releaseDate,
            genre: state.genre,
            description: state.description,
            price: state.price,
        });

        if (res.code !== 200) {
            this.writeToInfo("Failed to create track: " + res.data, "info");
            this.setInfoError("info");
            return;
        }

        this.writeToInfo("Track created!", "info");
        this.setInfoSuccess("info");
        return res.data;
    }
}
