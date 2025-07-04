import {FormTemplates} from "../generic/FormTemplates.ts";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {Icons} from "../../Enums/Icons.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {Images} from "../../Enums/Images.ts";
import {TrackActions} from "../../Actions/TrackActions.ts";
import {downloadFile, target, Util} from "../../Classes/Util.ts";
import {AudioUpload} from "../../Classes/AudioUpload.ts";
import {Ui} from "../../Classes/Ui.ts";
import {
    AnyElement,
    AnyNode,
    compute,
    create,
    DomNode,
    HtmlPropertyValue,
    InputType,
    Signal,
    signal,
    signalMap,
    StringOrSignal,
    TypeOrSignal,
    when
} from "@targoninc/jess";
import {AlbumActions} from "../../Actions/AlbumActions.ts";
import {reload} from "../../Routing/Router.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {button, checkbox, errorList, input, SelectOption, textarea, toggle} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {UploadInfo} from "../../Models/UploadInfo.ts";
import {UploadableTrack} from "../../Models/UploadableTrack.ts";
import {TrackCollaborator} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {TrackValidators} from "../../Classes/Validators/TrackValidators.ts";
import {ProgressPart} from "../../Models/ProgressPart.ts";

export class TrackEditTemplates {
    static uploadPage() {
        const state = signal({
            title: "",
            credits: "",
            artistname: "",
            release_date: new Date(),
            visibility: "public",
            genre: Genre.OTHER,
            isrc: "",
            upc: "",
            description: "",
            monetization: true,
            price: 1,
            collaborators: [],
            termsOfService: false,
        } satisfies UploadableTrack);
        const errorSections = signal<string[]>([]);
        const errorFields = signal<string[]>([]);
        const uploadInfo = signal<UploadInfo[]>([]);

        return create("div")
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
                            .text("Upload")
                            .build(),
                        TrackEditTemplates.upDownButtons(state, true),
                        TrackEditTemplates.trackUpload(state, errorSections),
                        TrackEditTemplates.uploadButton(state, errorSections, errorFields),
                        TrackEditTemplates.uploadInfo(uploadInfo),
                    ).build(),
            ).build();
    }

    static openEditPageButton(track: Track) {
        return button({
            text: "Edit",
            icon: {icon: "edit"},
            onclick: async () => {
                TrackActions.getTrackEditModal(track);
            }
        });
    }

    static addToAlbumsButton(track: Track) {
        return button({
            text: "Add to albums",
            icon: {icon: "forms_add_on"},
            onclick: async () => {
                await AlbumActions.openAddToAlbumModal(track);
            }
        });
    }

    static editTrackModal(track: Track, confirmCallback: Function, cancelCallback: Function) {
        const state = signal(<UploadableTrack>{
            ...track,
            release_date: new Date(track.release_date)
        });

        return create("div")
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
                    TrackEditTemplates.upDownButtons(state, true),
                    TrackEditTemplates.trackEdit(state, signal<string[]>([]), false),
                    create("div")
                        .classes("flex")
                        .children(
                            button({
                                text: "Save",
                                icon: {icon: "check"},
                                classes: ["positive"],
                                onclick: () => {
                                    confirmCallback(state.value);
                                }
                            }),
                            button({
                                text: "Cancel",
                                icon: {icon: "close"},
                                classes: ["negative"],
                                onclick: cancelCallback
                            }),
                        ).build()
                ).build();
    }

    static upDownButtons(state: Signal<any>, uploadEnabled = false) {
        const buttons = [
            button({
                text: "Download Info",
                icon: {icon: "file_save"},
                onclick: () => {
                    const json = JSON.stringify(state.value);
                    downloadFile(`${state.value.title}_${Date.now()}.json`, json);
                }
            }),
        ];

        if (uploadEnabled) {
            buttons.push(button({
                text: "Upload Info",
                icon: {icon: "upload_file"},
                onclick: () => {
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.onchange = async (e) => {
                        const file = target(e).files![0];
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const jsonString = target<FileReader>(e).result as string;
                            state.value = JSON.parse(jsonString);
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                },
            }));
        }

        return create("div")
            .classes("flex")
            .children(...buttons)
            .build();
    }

    static uploadInfo(uploadInfo: Signal<UploadInfo[]>) {
        return create("div")
            .id("upload-info")
            .children(
                signalMap(uploadInfo, create("div").classes("flex-v"), (info: UploadInfo) => TrackEditTemplates.uploadInfoItem(info)),
            ).build();
    }

    static uploadInfoItem(info: UploadInfo) {
        return create("div")
            .classes("flex-v")
            .children(
                create("span")
                    .id("upload-info-" + info.type)
                    .classes("upload-info-item", ...(info.classes ?? []))
                    .text(info.value)
                    .build()
            ).build();
    }

    static uploadButton(state: Signal<UploadableTrack>, errorSections: Signal<string[]>, errorFields: Signal<string[]>) {
        const errors = signal<string[]>([]);
        const disabled = compute((s: UploadableTrack) => {
            const newErrors = [];
            const requiredProps = [
                {section: "audio", field: "audioFileName"},
                {section: "info", field: "title"},
                {section: "info", field: "genre"},
                {section: "terms", field: "termsOfService"},
            ];
            if (requiredProps.some(p => !s[p.field])) {
                newErrors.push("Missing required fields");
                const errorProps = requiredProps.filter(p => !s[p.field]);
                errorSections.value = errorProps.map(p => p.section);
                errorFields.value = errorProps.map(p => p.field);
            } else {
                errorSections.value = [];
                errorFields.value = [];
            }
            errors.value = newErrors;

            return newErrors.length > 0;
        }, state);
        const buttonClass = compute((d): string => d ? "disabled" : "positive", disabled);
        const progressState = signal<ProgressPart | null>(null);

        return vertical(
            horizontal(
                button({
                    text: "Upload",
                    disabled,
                    classes: [buttonClass],
                    onclick: (e) => {
                        new AudioUpload(e, state, progressState);
                    },
                    icon: {icon: "upload"},
                }),
                GenericTemplates.progressSectionPart(progressState)
            ),
            errorList(errors),
        );
    }

    static filesSection(isNewTrack = false, state: Signal<UploadableTrack>, errorSections: Signal<string[]>) {
        return create("div")
            .classes("flex-v")
            .children(
                TrackEditTemplates.sectionCard("Audio", errorSections, "audio", [TrackEditTemplates.audioFile(isNewTrack, state)], "music_note", ["flex-grow"]),
                TrackEditTemplates.sectionCard("Artwork", errorSections, "artwork", [
                    TrackEditTemplates.coverFile(state),
                    TrackEditTemplates.imagePreview("cover-file")
                ], "image", ["flex-grow"]),
            ).build();
    }

    static trackEdit(state: Signal<UploadableTrack>, errorSections: Signal<string[]>, enableLinkedUsers = true) {
        const isPrivate = compute((s) => s.visibility === "private", state);

        return create("div")
            .classes("flex-v")
            .children(
                TrackEditTemplates.trackDetails(errorSections, isPrivate, state, enableLinkedUsers),
                create("div")
                    .classes("flex-v")
                    .children(
                        TrackEditTemplates.monetizationSection(errorSections, state),
                    ).build()
            ).build();
    }

    private static trackDetails(errorSections: Signal<string[]>, isPrivate: Signal<boolean>, state: Signal<UploadableTrack>, enableLinkedUsers: boolean) {
        return TrackEditTemplates.sectionCard("Track Details", errorSections, "info", [
            create("div")
                .classes("flex")
                .children(
                    toggle({
                        name: "visibility",
                        label: "Private",
                        text: "Private",
                        checked: isPrivate,
                        onchange: (v) => {
                            state.value = {...state.value, visibility: v ? "private" : "public"};
                        }
                    }),
                ).build(),
            TrackEditTemplates.titleInput(state),
            TrackEditTemplates.creditsInput(state),
            TrackEditTemplates.artistNameInput(state),
            when(enableLinkedUsers, TrackEditTemplates.linkedUsers(state.value.collaborators, state)),
            GenericTemplates.releaseDateInput(state),
            TrackEditTemplates.genreInput(state),
            TrackEditTemplates.isrcInput(state),
            TrackEditTemplates.upcInput(state),
            TrackEditTemplates.descriptionInput(state),
        ], "info", ["flex-grow"]);
    }

    private static monetizationSection(errorSections: Signal<string[]>, state: Signal<UploadableTrack>) {
        return TrackEditTemplates.sectionCard("Monetization", errorSections, "monetization", [
            TrackEditTemplates.monetizationInfo(),
            input<number>({
                type: InputType.number,
                name: "price",
                label: "Minimum track price in USD",
                placeholder: "1$",
                value: compute(s => s.price ?? 0, state),
                validators: [
                    (v) => {
                        if (v < 0) {
                            return ["Minimum track price must be a positive number"];
                        }
                    }
                ],
                onchange: (v) => {
                    state.value = {...state.value, price: v};
                }
            }),
        ], "attach_money");
    }

    private static titleInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            required: true,
            name: "title",
            label: "Title*",
            placeholder: "Track title",
            value: compute(s => s.title ?? "", state),
            validators: TrackValidators.titleValidators,
            onchange: (v) => {
                state.value = {...state.value, title: v};
            }
        });
    }

    private static creditsInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "credits",
            label: "Collaborators",
            placeholder: "John Music, Alice Frequency",
            validators: TrackValidators.creditsValidators,
            value: compute(s => s.credits ?? "", state),
            onchange: (v) => {
                state.value = {...state.value, credits: v};
            }
        });
    }

    private static descriptionInput(state: Signal<UploadableTrack>) {
        return textarea({
            name: "description",
            label: "Description",
            placeholder: "My cool track",
            validators: TrackValidators.descriptionValidators,
            value: compute(s => s.description ?? "", state),
            onchange: (v) => {
                state.value = {...state.value, description: v};
            }
        });
    }

    private static upcInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "upc",
            label: "UPC",
            placeholder: "00888072469600",
            validators: TrackValidators.upcValidators,
            value: compute(s => s.upc ?? "", state),
            onchange: (v) => {
                state.value = {...state.value, upc: v};
            }
        });
    }

    static genreInput(parentState: Signal<UploadableTrack>) {
        const genres = Object.values(Genre).map((genre: string) => {
            return {name: genre, id: genre};
        }) as SelectOption[];
        const value = compute(p => p.genre ?? "other", parentState);
        value.subscribe((v, changed) => {
            if (!changed) {
                return;
            }

            parentState.value = {
                ...parentState.value,
                genre: v
            };
        });
        return FormTemplates.dropDownField("Genre", signal(genres), value);
    }

    private static isrcInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "isrc",
            label: "ISRC",
            placeholder: "QZNWX2227540",
            validators: TrackValidators.isrcValidators,
            value: compute(s => s.isrc ?? "", state),
            onchange: (v) => {
                state.value = {...state.value, isrc: v};
            }
        });
    }

    private static artistNameInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "artistname",
            label: "Artist display name",
            placeholder: "My other alias",
            validators: TrackValidators.artistnameValidators,
            value: compute(s => s.artistname ?? "", state),
            onchange: (v) => {
                state.value = {...state.value, artistname: v};
            }
        });
    }

    static trackUpload(state: Signal<UploadableTrack>, errorSections: Signal<string[]>, enableTos = true, enableLinkedUsers = true) {
        const isPrivate = compute((s) => s.visibility === "private", state);

        return create("div")
            .classes("flex")
            .children(
                TrackEditTemplates.trackDetails(errorSections, isPrivate, state, enableLinkedUsers),
                create("div")
                    .classes("flex-v")
                    .children(
                        TrackEditTemplates.filesSection(true, state, errorSections),
                        TrackEditTemplates.monetizationSection(errorSections, state),
                        enableTos ? TrackEditTemplates.sectionCard("Copyright", errorSections, "terms", [
                            checkbox({
                                name: "termsOfService",
                                text: "I have all the necessary rights to distribute this content*",
                                checked: compute(s => s.termsOfService, state),
                                required: true,
                                onchange: () => {
                                    const old = state.value;
                                    state.value = {...old, termsOfService: !old.termsOfService};
                                }
                            }),
                        ], "gavel") : null,
                    ).build()
            ).build();
    }

    static sectionCard(title: HtmlPropertyValue, errorSections: Signal<string[]>, id: string, children: (TypeOrSignal<DomNode> | TypeOrSignal<AnyElement> | TypeOrSignal<AnyNode> | null)[], icon: string | null = null, classes: StringOrSignal[] = []) {
        const hasError = compute((e: string[]) => e.includes(id), errorSections);

        return create("div")
            .classes("border-card", "flex-v", ...classes)
            .children(
                GenericTemplates.cardLabel(title, icon, hasError),
                ...children
            ).build();
    }

    static audioFile(canOverwriteTitle = false, parentState: Signal<UploadableTrack>) {
        return FormTemplates.fileField("Audio File*", "Choose audio file", "audio-file", "audio/*", true, async (fileName: string, files) => {
            if (canOverwriteTitle) {
                if (fileName) {
                    const safeName = fileName.replace(/\.[^/.]+$/, "");
                    if (parentState) {
                        parentState.value = {...parentState.value, title: safeName, audioFileName: safeName};
                    }
                }
            }
            parentState.value = {
                ...parentState.value,
                audioFiles: files
            };
        });
    }

    static coverFile(parentState: Signal<UploadableTrack>) {
        return FormTemplates.fileField("Cover File", "Choose image file", "cover-file", "image/*", false, async (fileName: string, files) => {
            if (fileName) {
                if (parentState) {
                    const safeName = fileName.replace(/\.[^/.]+$/, "");
                    parentState.value = {...parentState.value, coverArtFileName: safeName};
                }
            }
            parentState.value = {
                ...parentState.value,
                coverArtFiles: files
            };
        });
    }

    static imagePreview(name: HtmlPropertyValue) {
        return create("img")
            .id(name + "-preview")
            .classes("image-preview", "hidden")
            .build();
    }

    static monetizationInfo() {
        return create("span")
            .text("This track will be monetized through streaming subscriptions and available for buying.")
            .build();
    }

    static removeLinkedUser(removeUserId: number, linkedUserState: Signal<Partial<TrackCollaborator>[]>) {
        return GenericTemplates.inlineAction("Remove", "remove", "remove_linked_user_" + removeUserId, () => {
            linkedUserState.value = linkedUserState.value.filter((tc) => tc.user_id !== removeUserId);
        }, [], ["negative"]);
    }

    static deleteTrackButton(trackId: number) {
        return button({
            text: "Delete",
            icon: {icon: "delete"},
            classes: ["negative"],
            onclick: async () => {
                await Ui.getConfirmationModal("Delete track", "Are you sure you want to delete this track?", "Yes", "No", () => TrackActions.deleteTrack(trackId), () => {
                }, Icons.WARNING);
            }
        });
    }

    static addLinkedUserButton(callback: Function, classes: string[] = []) {
        return button({
            text: "Add collaborator",
            id: "add_linked_user",
            icon: {icon: "person_add"},
            classes,
            onclick: async () => {
                await Ui.getAddLinkedUserModal("Link a user", "Enter the username of the user you want to link", "", "Link", "Cancel", callback, () => {
                }, "person_add");
            },
        });
    }

    static linkedUsers(linkedUsers: Partial<TrackCollaborator>[] = [], parentState: Signal<UploadableTrack> | null = null) {
        const linkedUserState = signal(linkedUsers);
        const sendJson = signal(JSON.stringify(linkedUsers));
        const userMap = new Map();
        const container = create("div")
            .classes("flex")
            .build();
        linkedUserState.subscribe((newValue: any[]) => {
            container.innerHTML = "";
            for (const id of newValue) {
                const user = userMap.get(id);
                const avatarState = signal(Images.DEFAULT_AVATAR);
                if (user.has_avatar) {
                    avatarState.value = Util.getUserAvatar(user.id);
                }
                container.appendChild(UserTemplates.linkedUser(user.id, user.username, user.displayname, avatarState, user.collab_type.name, TrackEditTemplates.removeLinkedUser(user.id, linkedUserState), [], ["no-redirect"]));
            }
            const sendValue = newValue.map((id: number) => userMap.get(id));
            sendJson.value = JSON.stringify(sendValue);
            if (parentState && parentState.value.collaborators !== sendValue) {
                parentState.value = {
                    ...parentState.value,
                    collaborators: sendValue
                };
            }
        });

        return create("div")
            .classes("flex-v", "small-gap")
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
                            .value(sendJson)
                            .name("linked_users")
                            .build(),
                        TrackEditTemplates.addLinkedUserButton((newUsername: string, newUser: User) => {
                            userMap.set(newUser.id, newUser);
                            if (!linkedUserState.value.some(tc => tc.user_id === newUser.id)) {
                                linkedUserState.value = [...linkedUserState.value, <Partial<TrackCollaborator>>{
                                    user_id: newUser.id,
                                    type: -1, // TODO: Use actual type?
                                    track_id: parentState ? parentState.value.id : null,
                                    approved: false,
                                    denied: false,
                                }];
                            }
                        }, ["align-center"])
                    ).build(),
            ).build();
    }

    static replaceAudioButton(track: Track) {
        const loading = signal(false);

        return button({
            text: "Replace Audio",
            icon: {icon: "upload"},
            disabled: loading,
            onclick: async () => {
                await TrackActions.replaceAudio(track.id, true, loading, () => {
                    PlayManager.removeTrackFromAllStates(track.id);
                    reload();
                });
            },
        });
    }
}