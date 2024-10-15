import {create, signal} from "https://fjs.targoninc.com/f.js";
import {FormTemplates} from "./FormTemplates.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Icons} from "../Enums/Icons.mjs";
import {UserTemplates} from "./UserTemplates.mjs";
import {Images} from "../Enums/Images.mjs";
import {TrackActions} from "../Actions/TrackActions.mjs";
import {Genres} from "../Enums/Genres.mjs";
import {Util} from "../Classes/Util.mjs";
import {AudioUpload} from "../Classes/AudioUpload.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class TrackEditTemplates {
    static getStateWithParentUpdate(key, value, parentState) {
        const state = signal(value);
        state.onUpdate = (newValue) => {
            if (parentState) parentState.value = {...parentState.value, [key]: newValue};
        };
        parentState.onUpdate = (newValue) => {
            if (newValue[key] !== state.value) {
                state.value = newValue[key];
            }
        };
        return state;
    }

    static uploadForm(title, collaborators, releaseDate, visibility, genre, isrc, upc, description, monetization, price, linkedUsers, termsOfService) {
        const state = signal({
            title: title ?? "",
            collaborators: collaborators ?? "",
            releaseDate: releaseDate ?? Util.getDateForPicker(new Date()),
            visibility: visibility ?? "public",
            genre: genre ?? Genres.OTHER,
            isrc: isrc ?? "",
            upc: upc ?? "",
            description: description ?? "",
            monetization: monetization ?? true,
            price: price ?? "1",
            linkedUsers: linkedUsers ?? [],
        });

        return create("div")
            .classes("card")
            .children(
                create("progress")
                    .classes("progress")
                    .attributes("max", "100", "value", "0")
                    .styles("display", "none")
                    .build(),
                create("div")
                    .classes("success")
                    .build(),
                create("div")
                    .classes("error")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("h3")
                            .text("Upload a track")
                            .build(),
                        TrackEditTemplates.upDownButtons(state, true),
                        TrackEditTemplates.filesSection(true, state),
                        TrackEditTemplates.infoSection(state),
                        TrackEditTemplates.uploadButton(state),
                        TrackEditTemplates.uploadInfo(),
                    ).build(),
            ).build();
    }

    static openEditPageButton(track) {
        return GenericTemplates.action(Icons.PEN, "Edit", "editTrack", async () => {
            TrackActions.getTrackEditModal(track);
        }, [], ["secondary"]);
    }

    static editTrackModal(track, confirmCallback, cancelCallback) {
        const state = signal(track);

        return GenericTemplates.modal([
            create("div")
                .classes("flex-v")
                .children(
                    create("div")
                        .classes("flex")
                        .children(
                            create("img")
                                .classes("icon", "svg")
                                .styles("width", "30px", "height", "auto")
                                .attributes("src", Icons.PEN)
                                .build(),
                            create("h2")
                                .text("Edit track")
                                .build()
                        ).build(),
                    create("p")
                        .text("Edit the track details below")
                        .build(),
                    TrackEditTemplates.infoSection(state, false, false),
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.button("Save", () => {
                                confirmCallback(state.value);
                            }, ["positive"]),
                            GenericTemplates.button("Cancel", cancelCallback, ["negative"])
                        ).build()
                ).build(),
        ], ["confirmationModal"]
        );
    }

    static upDownButtons(state, uploadEnabled = false) {
        const buttons = [
            GenericTemplates.action(Icons.ARROW_DOWN, "Download Info", "downloadInfo", () => {
                const json = JSON.stringify(state.value);
                Util.downloadFile(`${state.value.title}_${Date.now()}.json`, json);
            }, [
                "title", "At the moment, linked users are not included in the download. This will be fixed soon™️."
            ], ["secondary"]),
        ];

        if (uploadEnabled) {
            buttons.push(GenericTemplates.action(Icons.UPLOAD, "Upload Info", "uploadInfo", () => {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const jsonString = e.target.result;
                        state.value = JSON.parse(jsonString);
                    };
                    reader.readAsText(file);
                };
                fileInput.click();
            }, [], ["secondary"]));
        }

        return create("div")
            .classes("flex")
            .children(...buttons)
            .build();
    }

    static uploadInfo() {
        return create("div")
            .id("upload-info")
            .classes("flex-v")
            .children(
                TrackEditTemplates.uploadInfoItem("info", "0%"),
                TrackEditTemplates.uploadInfoItem("cover", "0%"),
                TrackEditTemplates.uploadInfoItem("audio", "0%"),
            ).build();
    }

    static uploadInfoItem(type, value) {
        return create("div")
            .classes("flex-v")
            .children(
                create("span")
                    .id("upload-info-" + type)
                    .classes("upload-info-item", "hidden")
                    .text(value)
                    .build()
            )
            .build();
    }

    static uploadButton(state) {
        return create("button")
            .classes("positive")
            .onclick(e => {
                Util.showButtonLoader(e);
                Util.closeAllDetails();
                new AudioUpload(e, state);
            })
            .children(
                create("span")
                    .classes("nopointer")
                    .text("Upload")
                    .build(),
                create("div")
                    .classes("loader", "bright", "hidden")
                    .build()
            )
            .build();
    }

    static filesSection(isNewTrack = false, state) {
        return TrackEditTemplates.detailsSection("Files", "upload-files", [
            TrackEditTemplates.sectionCard("Audio", [TrackEditTemplates.audioFile(isNewTrack, state)]),
            TrackEditTemplates.sectionCard("Artwork", [
                TrackEditTemplates.coverFile(),
                TrackEditTemplates.imagePreview("cover-file")
            ]),
        ]);
    }

    static infoSection(state, enableTos = true, enableLinkedUsers = true) {
        return TrackEditTemplates.detailsSection("Info", "upload-details", [
            TrackEditTemplates.sectionCard("Track Details", [
                FormTemplates.visibility(state.value.visibility, state),
                TrackEditTemplates.title(state.value.title, state),
                TrackEditTemplates.collaborators(state.value.collaborators, state),
                enableLinkedUsers ? TrackEditTemplates.linkedUsers(state.value.linkedUsers, state) : null,
                TrackEditTemplates.releaseDate(state.value.releaseDate, state),
                FormTemplates.genre(state.value.genre, state),
                TrackEditTemplates.isrc(state.value.isrc, state),
                TrackEditTemplates.upc(state.value.upc, state),
                TrackEditTemplates.description(state.value.description, state),
            ]),
            TrackEditTemplates.sectionCard("Monetization", [
                TrackEditTemplates.monetization(),
                TrackEditTemplates.price(state.value.price, state)
            ]),
            enableTos ? TrackEditTemplates.sectionCard("Terms of Service", [
                TrackEditTemplates.termsOfService(state.value.termsOfService, state)
            ]) : null,
        ]);
    }
    static sectionCard(title, children) {
        return create("div")
            .classes("border-card", "flex-v")
            .children(
                create("h4")
                    .text(title)
                    .build(),
                ...children
            )
            .build();
    }
    static detailsSection(title, cssClass, children, open = true) {
        return create("details")
            .classes(cssClass, "flex-v")
            .children(
                create("summary")
                    .text(title)
                    .build(),
                ...children
            )
            .attributes("open", open)
            .build();
    }

    static audioFile(canOverwriteTitle = false, parentState = null) {
        return FormTemplates.fileField("Audio File", "Choose file", "audio-file", "audio/*", true, (fileName) => {
            if (canOverwriteTitle) {
                if (fileName) {
                    const titleInput = document.querySelector("input#title");
                    if (titleInput) {
                        titleInput.value = fileName.replace(/\.[^/.]+$/, "");
                        if (parentState) {
                            parentState.value = {...parentState.value, title: titleInput.value};
                        }
                    }
                }
            }
        });
    }
    static coverFile() {
        return FormTemplates.fileField("Cover File", "Choose file (.jpg,.jpeg,.png,.gif)", "cover-file", "jpg,jpeg,png,gif", false);
    }
    static imagePreview(name) {
        return create("img")
            .id(name + "-preview")
            .classes("image-preview", "hidden")
            .build();
    }
    static termsOfService(checked = false, parentState = null) {
        const state = this.getStateWithParentUpdate("termsOfService", checked, parentState);
        return FormTemplates.checkBoxField("Terms of Service", "agreement", "I have read and agree to the Terms of Service and Privacy Policy", state, true, v => {
            state.value = v;
        });
    }
    static monetization() {
        return create("span")
            .text("This track will be monetized through streaming subscriptions and available for buying.")
            .build();
    }
    static description(value = "", parentState = null) {
        const state = this.getStateWithParentUpdate("description", value, parentState);
        return FormTemplates.textAreaField("Description", "description", "Description", state, false, 5, v => {
            state.value = v;
        });
    }
    static upc(value = "", parentState = null) {
        const state = this.getStateWithParentUpdate("upc", value, parentState);
        return FormTemplates.textField("UPC", "upc", "00888072469600", "text", state, false, v => {
            state.value = v;
        });
    }
    static isrc(value = "", parentState = null) {
        const state = this.getStateWithParentUpdate("isrc", value, parentState);
        return FormTemplates.textField("ISRC", "isrc", "QZNWX2227540", "text", state, false, v => {
            state.value = v;
        });
    }
    static releaseDate(value = Util.getDateForPicker(new Date()), parentState = null) {
        const state = this.getStateWithParentUpdate("releaseDate", value, parentState);
        return FormTemplates.textField("Release Date", "release_date", "YYYY-MM-DD", "date", state, false, v => {
            state.value = v;
        });
    }
    static collaborators(value = "", parentState = null) {
        const state = this.getStateWithParentUpdate("collaborators", value, parentState);
        return FormTemplates.textField("Collaborators", "collaborators", "Collaborators", "text", state, false, v => {
            state.value = v;
        });
    }
    static title(value = "", parentState = null) {
        const state = this.getStateWithParentUpdate("title", value, parentState);
        return FormTemplates.textField("Title", "title", "Title", "text", state, true, v => {
            state.value = v;
        });
    }
    static price(value = "1", parentState) {
        const state = this.getStateWithParentUpdate("price", value, parentState);
        return FormTemplates.textField("Minimum track price in USD", "price", "1", "number", state, false, v => {
            state.value = v;
        });
    }

    static removeLinkedUser(removeUserId, linkedUserState) {
        return GenericTemplates.inlineAction("Remove", Icons.X, "", "remove_linked_user_" + removeUserId, () => {
            linkedUserState.value = linkedUserState.value.filter(id => id !== removeUserId);
        }, [], ["negative"]);
    }

    static deleteTrackButton(trackId) {
        return GenericTemplates.action(
            Icons.DELETE,
            "Delete",
            trackId,
            async (e) => {
                await Ui.getConfirmationModal("Delete track", "Are you sure you want to delete this track?", "Yes", "No", TrackActions.deleteTrackFromElement.bind(null, e), () => {
                }, Icons.WARNING);
            },
            [],
            ["secondary", "negative"]
        );
    }

    static addLinkedUserButton(callback, classes = []) {
        return GenericTemplates.action(Icons.FOLLOW, "Add User", "add_linked_user", () => {
            Ui.getAddLinkedUserModal("Link a user", "Enter the username of the user you want to link", "", "Link", "Cancel", callback, () => {}, Icons.FOLLOW);
        }, [], classes);
    }

    static linkedUsers(linkedUsers = [], parentState = null) {
        const linkedUserState = signal(linkedUsers);
        const userMap = new Map();
        linkedUserState.onUpdate = (newValue) => {
            const container = document.getElementById("linked_users_container");
            container.innerHTML = "";
            for (const id of newValue) {
                const user = userMap.get(id);
                const avatarState = signal(Images.DEFAULT_AVATAR);
                Util.getAvatarFromUserIdAsync(user.id).then((avatar) => {
                    avatarState.value = avatar;
                });
                container.appendChild(UserTemplates.linkedUser(user.id, user.username, user.displayname, avatarState, user.collab_type.name, TrackEditTemplates.removeLinkedUser(user.id, linkedUserState), [], ["no-redirect"]));
            }
            const sendValue = newValue.map(id => userMap.get(id));
            document.getElementsByName("linked_users")[0].value = JSON.stringify(sendValue);
            if (parentState && parentState.value.linkedUsers !== sendValue) {
                parentState.value = {
                    ...parentState.value,
                    linkedUsers: sendValue
                };
            }
        };

        return create("div")
            .classes("flex", "space-outwards")
            .children(
                create("label")
                    .text("Linked Users")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        create("div")
                            .classes("flex")
                            .id("linked_users_container")
                            .build(),
                        create("input")
                            .classes("hidden")
                            .value(linkedUsers)
                            .name("linked_users")
                            .build(),
                        TrackEditTemplates.addLinkedUserButton((newUsername, newUser) => {
                            userMap.set(newUser.id, newUser);
                            if (!linkedUserState.value.includes(newUser.id)) {
                                linkedUserState.value = [...linkedUserState.value, newUser.id];
                            }
                        }, ["align-center"])
                    ).build(),
            )
            .build();
    }
}