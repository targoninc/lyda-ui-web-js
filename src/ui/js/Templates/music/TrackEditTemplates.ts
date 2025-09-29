import { FormTemplates } from "../generic/FormTemplates.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { Icons } from "../../Enums/Icons.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { Images } from "../../Enums/Images.ts";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { downloadFile, target, Util } from "../../Classes/Util.ts";
import { AudioUpload } from "../../Classes/AudioUpload.ts";
import { Ui } from "../../Classes/Ui.ts";
import {
    AnyElement,
    AnyNode,
    compute,
    create,
    DomNode,
    HtmlPropertyValue,
    InputType,
    nullElement,
    Signal,
    signal,
    signalMap,
    StringOrSignal,
    TypeOrSignal,
    when,
} from "@targoninc/jess";
import { AlbumActions } from "../../Actions/AlbumActions.ts";
import { reload } from "../../Routing/Router.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import {
    button,
    checkbox,
    errorList,
    heading,
    input,
    select,
    SelectOption,
    textarea,
    toggle,
} from "@targoninc/jess-components";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { UploadInfo } from "../../Models/UploadInfo.ts";
import { UploadableTrack } from "../../Models/UploadableTrack.ts";
import { TrackCollaborator } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import { Genre } from "@targoninc/lyda-shared/src/Enums/Genre";
import { TrackValidators } from "../../Classes/Validators/TrackValidators.ts";
import { ProgressPart } from "../../Models/ProgressPart.ts";
import { CollaboratorType } from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import { Api } from "../../Api/Api.ts";
import { SearchResult } from "@targoninc/lyda-shared/src/Models/SearchResult";
import { currentUser } from "../../state.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { t } from "../../../locales";

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
        });
        const errorSections = signal<string[]>([]);
        const errorFields = signal<string[]>([]);
        const uploadInfo = signal<UploadInfo[]>([]);

        return create("div").children(
            create("progress").classes("progress").attributes("max", "100", "value", "0").styles("display", "none").build(),
            create("div").classes("success").build(),
            create("div").classes("error").build(),
            create("div").classes("flex-v").children(
                create("h3").text("Upload").build(),
                TrackEditTemplates.upDownButtons(state, true),
                TrackEditTemplates.trackUpload(state, errorSections),
                TrackEditTemplates.uploadButton(state, errorSections, errorFields),
                TrackEditTemplates.uploadInfo(uploadInfo),
            ).build(),
        ).build();
    }

    static openEditPageButton(track: Track) {
        return button({
            text: t("EDIT"),
            icon: { icon: "edit" },
            onclick: async () => {
                TrackActions.getTrackEditModal(track);
            },
        });
    }

    static addToAlbumsButton(track: Track) {
        return button({
            text: t("ADD_TO_ALBUMS"),
            icon: { icon: "forms_add_on" },
            onclick: async () => {
                await AlbumActions.openAddToAlbumModal(track);
            },
        });
    }

    static editTrackModal(track: Track, confirmCallback: Function, cancelCallback: Function) {
        const state = signal(<UploadableTrack>{
            ...track,
            release_date: new Date(track.release_date),
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
                            .text(t("EDIT_TRACK"))
                            .build(),
                    ).build(),
                create("p")
                    .text(t("EDIT_TRACK_DETAILS_BELOW"))
                    .build(),
                TrackEditTemplates.upDownButtons(state, true),
                TrackEditTemplates.trackEdit(state, signal<string[]>([])),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("SAVE"),
                            icon: { icon: "check" },
                            classes: ["positive"],
                            onclick: () => {
                                confirmCallback(state.value);
                            },
                        }),
                        button({
                            text: t("CANCEL"),
                            icon: { icon: "close" },
                            classes: ["negative"],
                            onclick: cancelCallback,
                        }),
                    ).build(),
            ).build();
    }

    static upDownButtons(state: Signal<any>, uploadEnabled = false) {
        const buttons = [
            button({
                text: t("DOWNLOAD_INFO"),
                icon: { icon: "file_save" },
                onclick: () => {
                    const json = JSON.stringify(state.value);
                    downloadFile(`${state.value.title}_${Date.now()}.json`, json);
                },
            }),
        ];

        if (uploadEnabled) {
            buttons.push(
                button({
                    text: t("UPLOAD_INFO"),
                    icon: { icon: "upload_file" },
                    onclick: () => {
                        const fileInput = document.createElement("input");
                        fileInput.type = "file";
                        fileInput.onchange = async e => {
                            const file = target(e).files![0];
                            const reader = new FileReader();
                            reader.onload = async e => {
                                const jsonString = target<FileReader>(e).result as string;
                                state.value = JSON.parse(jsonString);
                            };
                            reader.readAsText(file);
                        };
                        fileInput.click();
                    },
                }),
            );
        }

        return create("div")
            .classes("flex")
            .children(...buttons)
            .build();
    }

    static uploadInfo(uploadInfo: Signal<UploadInfo[]>) {
        return create("div").id("upload-info").children(
            signalMap(uploadInfo, create("div").classes("flex-v"), (info: UploadInfo) =>
                TrackEditTemplates.uploadInfoItem(info),
            ),
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
                    .build(),
            ).build();
    }

    static uploadButton(
        state: Signal<UploadableTrack>,
        errorSections: Signal<string[]>,
        errorFields: Signal<string[]>,
    ) {
        const errors = signal<string[]>([]);
        const disabled = compute((s: UploadableTrack) => {
            const newErrors = [];
            const requiredProps = [
                { section: "audio", field: "audioFileName" },
                { section: "info", field: "title" },
                { section: "info", field: "genre" },
                { section: "terms", field: "termsOfService" },
            ];
            if (requiredProps.some(p => !s[p.field])) {
                newErrors.push(`${t("MISSING_REQUIRED_FIELDS")}`);
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
        const buttonClass = compute((d): string => (d ? "disabled" : "positive"), disabled);
        const progressState = signal<ProgressPart | null>(null);

        return vertical(
            horizontal(
                button({
                    text: t("UPLOAD"),
                    disabled,
                    classes: [buttonClass, "special", "bigger-input", "rounded-max"],
                    onclick: e => new AudioUpload(e, state, progressState),
                    icon: { icon: "upload" },
                }),
                GenericTemplates.progressSectionPart(progressState),
            ),
            errorList(errors),
        );
    }

    static filesSection(isNewTrack = false, state: Signal<UploadableTrack>, errorSections: Signal<string[]>) {
        return create("div").classes("flex-v").children(
            TrackEditTemplates.sectionCard(
                t("AUDIO"),
                errorSections,
                "audio",
                [TrackEditTemplates.audioFile(isNewTrack, state)],
                "music_note",
                ["flex-grow"],
            ),
            TrackEditTemplates.sectionCard(
                t("ARTWORK"),
                errorSections,
                "artwork",
                [TrackEditTemplates.coverFile(state), TrackEditTemplates.imagePreview("cover-file")],
                "image",
                ["flex-grow"],
            ),
        ).build();
    }

    static trackEdit(state: Signal<UploadableTrack>, errorSections: Signal<string[]>) {
        const isPrivate = compute(s => s.visibility === "private", state);

        return create("div")
            .classes("flex-v")
            .children(
                TrackEditTemplates.trackDetails(errorSections, isPrivate, state),
                create("div")
                    .classes("flex-v")
                    .children(TrackEditTemplates.monetizationSection(errorSections, state))
                    .build(),
            ).build();
    }

    private static trackDetails(
        errorSections: Signal<string[]>,
        isPrivate: Signal<boolean>,
        state: Signal<UploadableTrack>,
    ) {
        return TrackEditTemplates.sectionCard(
            t("TRACK_DETAILS"),
            errorSections,
            "info",
            [
                TrackEditTemplates.visibilityToggle(isPrivate, state),
                TrackEditTemplates.titleInput(state),
                TrackEditTemplates.creditsInput(state),
                TrackEditTemplates.artistNameInput(state),
                TrackEditTemplates.linkedUsers(state.value.collaborators, state as Signal<UploadableTrack | Track>, true),
                GenericTemplates.releaseDateInput(state),
                TrackEditTemplates.genreInput(state),
                TrackEditTemplates.isrcInput(state),
                TrackEditTemplates.upcInput(state),
                TrackEditTemplates.descriptionInput(state),
            ],
            "info",
            ["flex-grow"],
        );
    }

    private static visibilityToggle(isPrivate: Signal<boolean>, state: Signal<UploadableTrack>) {
        return create("div")
            .classes("flex")
            .children(
                toggle({
                    name: "visibility",
                    label: t("PRIVATE"),
                    text: t("PRIVATE"),
                    checked: isPrivate,
                    onchange: v => {
                        state.value = {
                            ...state.value,
                            visibility: v ? "private" : "public",
                        };
                    },
                }),
            ).build();
    }

    private static monetizationSection(errorSections: Signal<string[]>, state: Signal<UploadableTrack>) {
        return TrackEditTemplates.sectionCard(
            t("MONETIZATION"),
            errorSections,
            "monetization",
            [
                TrackEditTemplates.monetizationInfo(),
                TrackEditTemplates.priceInput(state),
            ],
            "attach_money",
        );
    }

    private static priceInput(state: Signal<UploadableTrack>) {
        return input<number>({
            type: InputType.number,
            name: "price",
            label: t("MINIMUM_TRACK_PRICE_USD"),
            placeholder: t("ONE_DOLLAR"),
            value: compute(s => s.price ?? 0, state),
            validators: [
                v => {
                    if (v < 0) {
                        return [`${t("MINIMUM_TRACK_PRICE_MUST_BE_NUMBER")}`];
                    }
                },
            ],
            onchange: v => {
                state.value = { ...state.value, price: v };
            },
        });
    }

    private static titleInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            required: true,
            name: "title",
            label: t("TITLE_STAR"),
            placeholder: t("TRACK_TITLE"),
            value: compute(s => s.title ?? "", state),
            validators: TrackValidators.titleValidators,
            onchange: v => {
                state.value = { ...state.value, title: v };
            },
        });
    }

    private static creditsInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "credits",
            label: t("COLLABORATORS"),
            placeholder: t("EXAMPLE_COLLABORATORS"),
            validators: TrackValidators.creditsValidators,
            value: compute(s => s.credits ?? "", state),
            onchange: v => {
                state.value = { ...state.value, credits: v };
            },
        });
    }

    private static descriptionInput(state: Signal<UploadableTrack>) {
        return textarea({
            name: "description",
            label: t("DESCRIPTION"),
            placeholder: t("EXAMPLE_TRACK_NAME"),
            validators: TrackValidators.descriptionValidators,
            value: compute(s => s.description ?? "", state),
            onchange: v => {
                state.value = { ...state.value, description: v };
            },
        });
    }

    private static upcInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "upc",
            label: t("UPC"),
            placeholder: t("EXAMPLE_UPC"),
            validators: TrackValidators.upcValidators,
            value: compute(s => s.upc ?? "", state),
            onchange: v => {
                state.value = { ...state.value, upc: v };
            },
        });
    }

    static genreInput(parentState: Signal<UploadableTrack>) {
        const genres = Object.values(Genre).map((genre: string) => ({
            name: genre,
            id: genre,
        })) as SelectOption<string>[];
        const value = compute(p => p.genre ?? "other", parentState);
        value.subscribe((v, changed) => {
            if (!changed) {
                return;
            }

            parentState.value = {
                ...parentState.value,
                genre: v,
            };
        });
        return FormTemplates.dropDownField(t("GENRE"), signal(genres), value);
    }

    private static isrcInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "isrc",
            label: t("ISRC"),
            placeholder: t("EXAMPLE_ISRC"),
            validators: TrackValidators.isrcValidators,
            value: compute(s => s.isrc ?? "", state),
            onchange: v => {
                state.value = { ...state.value, isrc: v };
            },
        });
    }

    private static artistNameInput(state: Signal<UploadableTrack>) {
        return input<string>({
            type: InputType.text,
            name: "artistname",
            label: t("ARTIST_DISPLAY_NAME"),
            placeholder: t("EXAMPLE_ARTIST_DISPLAY_NAME"),
            validators: TrackValidators.artistnameValidators,
            value: compute(s => s.artistname ?? "", state),
            onchange: v => {
                state.value = { ...state.value, artistname: v };
            },
        });
    }

    static trackUpload(
        state: Signal<UploadableTrack>,
        errorSections: Signal<string[]>,
        enableTos = true,
    ) {
        const isPrivate = compute(s => s.visibility === "private", state);

        return create("div")
            .classes("flex")
            .children(
                TrackEditTemplates.trackDetails(errorSections, isPrivate, state),
                create("div")
                    .classes("flex-v")
                    .children(
                        TrackEditTemplates.filesSection(true, state, errorSections),
                        TrackEditTemplates.monetizationSection(errorSections, state),
                        enableTos
                            ? TrackEditTemplates.sectionCard(t("COPYRIGHT"), errorSections, "terms",
                                [
                                    checkbox({
                                        name: "termsOfService",
                                        text: t("I_HAVE_ALL_NECESSARY_RIGHTS"),
                                        checked: compute(s => s.termsOfService, state),
                                        required: true,
                                        onchange: () => {
                                            const old = state.value;
                                            state.value = {
                                                ...old,
                                                termsOfService: !old.termsOfService,
                                            };
                                        },
                                    }),
                                ], "gavel") : null,
                    ).build(),
            ).build();
    }

    static sectionCard(
        title: HtmlPropertyValue,
        errorSections: Signal<string[]>,
        id: string,
        children: (TypeOrSignal<DomNode> | TypeOrSignal<AnyElement> | TypeOrSignal<AnyNode> | null)[],
        icon: string | null = null,
        classes: StringOrSignal[] = [],
    ) {
        const hasError = compute((e: string[]) => e.includes(id), errorSections);

        return create("div")
            .classes("border-card", "flex-v", ...classes)
            .children(GenericTemplates.cardLabel(title, icon, hasError), ...children)
            .build();
    }

    static audioFile(canOverwriteTitle = false, parentState: Signal<UploadableTrack>) {
        return FormTemplates.fileField(
            t("AUDIO_FILE"),
            t("CHOOSE_AUDIO_FILE"),
            "audio-file",
            "audio/*",
            true,
            async (fileName: string, files) => {
                if (canOverwriteTitle) {
                    if (fileName) {
                        const safeName = fileName.replace(/\.[^/.]+$/, "");
                        if (parentState) {
                            parentState.value = {
                                ...parentState.value,
                                title: safeName,
                                audioFileName: safeName,
                            };
                        }
                    }
                }
                parentState.value = {
                    ...parentState.value,
                    audioFiles: files,
                };
            },
        );
    }

    static coverFile(parentState: Signal<UploadableTrack>) {
        return FormTemplates.fileField(
            t("COVER_FILE"),
            `${t("CHOOSE_IMAGE_FILE")}`,
            "cover-file",
            "image/*",
            false,
            async (fileName: string, files) => {
                if (fileName) {
                    if (parentState) {
                        const safeName = fileName.replace(/\.[^/.]+$/, "");
                        parentState.value = { ...parentState.value, coverArtFileName: safeName };
                    }
                }
                parentState.value = {
                    ...parentState.value,
                    coverArtFiles: files,
                };
            },
        );
    }

    static imagePreview(name: HtmlPropertyValue) {
        return create("img")
            .id(name + "-preview")
            .classes("image-preview", "hidden")
            .build();
    }

    static monetizationInfo() {
        return create("span")
            .text(t("TRACK_WILL_BE_MONETIZED"))
            .build();
    }

    static deleteTrackButton(trackId: number) {
        return button({
            text: t("DELETE"),
            icon: { icon: "delete" },
            classes: ["negative"],
            onclick: async () => {
                await Ui.getConfirmationModal(
                    t("DELETE_TRACK"),
                    t("SURE_DELETE_TRACK"),
                    t("YES"),
                    t("NO"),
                    () => TrackActions.deleteTrack(trackId),
                    () => {},
                    Icons.WARNING,
                );
            },
        });
    }

    static linkedUsers(
        linkedUsers: Partial<TrackCollaborator>[] = [],
        parentState: Signal<UploadableTrack | Track> | null = null,
        editable: boolean,
    ) {
        const linkedUserState = signal(linkedUsers);
        linkedUserState.subscribe((newValue: any[]) => {
            if (parentState && JSON.stringify(parentState.value.collaborators) !== JSON.stringify(newValue)) {
                parentState.value = {
                    ...parentState.value,
                    collaborators: newValue,
                };
            }
        });
        const id = compute(s => s.id, parentState ?? signal(<UploadableTrack | Track>{}));
        const collabTypes = signal<CollaboratorType[]>([]);
        Api.getCollabTypes().then(types => (collabTypes.value = types ?? []));
        const hasLus = linkedUsers.length > 0;

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                when(hasLus, create("label")
                    .text(t("LINKED_USERS"))
                    .build()),
                vertical(
                    signalMap(linkedUserState, horizontal(), collaborator => {
                        const user = collaborator.user;
                        if (!user) {
                            return nullElement();
                        }
                        const avatarState = signal(Images.DEFAULT_AVATAR);
                        if (user.has_avatar) {
                            avatarState.value = Util.getUserAvatar(user.id);
                        }

                        if (editable) {
                            return UserTemplates.editableLinkedUser(
                                user.id,
                                user.username,
                                user.displayname,
                                avatarState,
                                signal(collaborator.collab_type?.id.toString() ?? ""),
                                linkedUserState,
                                collabTypes,
                                collaborator.approved ?? false,
                                collaborator.denied ?? false,
                            );
                        }

                        return UserTemplates.linkedUser(
                            user.id,
                            user.username,
                            user.displayname,
                            avatarState,
                            signal(collaborator.collab_type?.id.toString() ?? ""),
                            collabTypes,
                            collaborator.approved ?? false,
                            collaborator.denied ?? false,
                        );
                    }),
                    when(editable, TrackEditTemplates.linkedUsersEditor(linkedUserState, id, collabTypes)),
                ),
            ).build();
    }

    static replaceAudioButton(track: Track) {
        const loading = signal(false);

        return button({
            text: t("REPLACE_AUDIO"),
            icon: { icon: "upload" },
            disabled: loading,
            onclick: async () => {
                await TrackActions.replaceAudio(track.id, true, loading, () => {
                    PlayManager.removeTrackFromAllStates(track.id);
                    reload();
                });
            },
        });
    }

    static downloadAudioButton(track: Track) {
        const loading = signal(false);

        return button({
            text: t("DOWNLOAD_AUDIO"),
            icon: { icon: "download" },
            disabled: loading,
            onclick: async () => {
                if (loading.value) {
                    return;
                }

                loading.value = true;
                try {
                    await TrackActions.downloadTrack(track);
                } finally {
                    loading.value = false;
                }
            },
        });
    }

    private static linkedUsersEditor(
        linkedUserState: Signal<Partial<TrackCollaborator>[]>,
        referenceId: Signal<number | undefined>,
        collabTypes: Signal<CollaboratorType[]>,
    ) {
        return TrackEditTemplates.linkedUsersAdder(linkedUserState, async (username: string) => {
            const newUser = await Util.getUserByNameAsync(username);
            const ct = collabTypes.value.at(0);

            if (ct && !linkedUserState.value.some(tc => tc.user_id === newUser.id)) {
                linkedUserState.value = [
                    ...linkedUserState.value,
                    {
                        user_id: newUser.id,
                        user: newUser,
                        type: ct.id,
                        collab_type: ct,
                        track_id: referenceId.value,
                        created_at: new Date(),
                        updated_at: new Date(),
                        approved: false,
                        denied: false,
                    },
                ];
            }
        });
    }

    static collaboratorTypeSelect(collabType: Signal<string>, collabTypes: Signal<CollaboratorType[]>) {
        const collabTypeOptions = compute(types => {
            return types.map(
                t => ({
                    name: t.name,
                    id: t.id.toString(),
                } as SelectOption<string>),
            );
        }, collabTypes);

        return compute(
            opts =>
                select({
                    options: signal(opts),
                    value: collabType,
                    onchange: v => collabType.value = v,
                }),
            collabTypeOptions,
        );
    }

    static linkedUsersAdder(
        linkedUserState: Signal<Partial<TrackCollaborator>[]>,
        addUser: (username: string) => void,
    ) {
        const selectedState = signal(0);
        const users = signal<SearchResult[]>([]);
        let lastSearch = "";
        const alreadyHasUser = compute(
            (tcs, s) => tcs.find(tc => tc.user_id === s) !== undefined,
            linkedUserState,
            selectedState,
        );
        const disabled = compute(
            (s, u, a) => u.find(u => u.id === s) === undefined || a,
            selectedState,
            users,
            alreadyHasUser,
        );

        return create("div").classes("flex-v").children(
            create("p")
                .text(t("LINKING_USER_WILL_REQUEST_APPROVAL"))
                .build(),
            horizontal(
                input({
                    id: "addUserSearch",
                    name: "addUserSearch",
                    type: InputType.text,
                    placeholder: t("SEARCH_FOR_USER"),
                    value: "",
                    debounce: 200,
                    onchange: async search => {
                        if (search.trim().length > 0 && search.trim() !== lastSearch) {
                            lastSearch = search.trim();
                            const newUsers = (await Api.searchUsers(search.trim())) ?? [];
                            users.value = newUsers.filter(u => u.id !== currentUser.value?.id);
                        }
                    },
                }),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("ADD"),
                            disabled: disabled,
                            onclick: async () => {
                                const user = users.value.find(u => u.id === selectedState.value);
                                if (!user) {
                                    return;
                                }

                                addUser(user.subtitle?.substring(1) ?? "");
                            },
                            icon: {
                                icon: "person_add",
                            },
                            classes: ["positive"],
                        }),
                    ).build(),
            ),
            create("div")
                .classes("flex-v")
                .styles("max-height", "200px", "overflow", "auto", "flex-wrap", "nowrap")
                .children(
                    signalMap(users, create("div").classes("flex-v"), user =>
                        GenericTemplates.addUserLinkSearchResult(user, selectedState),
                    ),
                ).build(),
        ).build();
    }

    static editableTrackInList(track: Track, tracks: Signal<Track[]>) {
        const state = signal<UploadableTrack>(track as UploadableTrack);
        const changed = compute(s => {
            return s.title !== track.title ||
                s.credits !== track.credits ||
                s.artistname !== track.artistname ||
                s.visibility !== track.visibility ||
                s.price !== track.price;
        }, state);
        const loading = signal(false);
        const coverLoading = signal(false);
        const imageState = signal("");
        const isPrivate = compute(s => s.visibility === "private", state);

        return horizontal(
            vertical(
                horizontal(
                    TrackEditTemplates.titleInput(state),
                    TrackEditTemplates.artistNameInput(state),
                ),
                horizontal(
                    TrackEditTemplates.creditsInput(state),
                    TrackEditTemplates.priceInput(state),
                ),
                TrackEditTemplates.visibilityToggle(isPrivate, state),
            ),
            vertical(
                horizontal(
                    TrackEditTemplates.replaceAudioButton(track),
                    TrackEditTemplates.downloadAudioButton(track),
                ).classes("align-end"),
                horizontal(
                    create("span")
                        .text(t("ARTWORK"))
                        .build(),
                    MusicTemplates.entityCoverButtons(MediaFileType.trackCover, track, imageState, coverLoading),
                    when(coverLoading, GenericTemplates.loadingSpinner()),
                ).classes("align-end"),
                when(changed, horizontal(
                    create("span")
                        .classes("warning")
                        .text(t("UNSAVED_CHANGES"))
                        .build(),
                    button({
                        disabled: loading,
                        classes: ["positive"],
                        icon: { icon: "save" },
                        text: t("SAVE"),
                        onclick: async () => Api.updateTrackFull(state.value).then(() => {
                            Api.getTrackById(track.id).then(t => {
                                tracks.value = tracks.value.map(t2 => {
                                    if (t2.id === track.id) {
                                        return t?.track ?? t2;
                                    }
                                    return t2;
                                });
                            });
                        }),
                    }),
                    button({
                        disabled: loading,
                        icon: { icon: "undo" },
                        text: t("REVERT"),
                        onclick: () => state.value = track as UploadableTrack,
                    }),
                ).classes("align-end", "align-children").build()),
            ),
        ).classes("card", "space-between")
         .build();
    }

    static batchEditTracksPage() {
        const tracks = signal<Track[]>([]);
        Api.getTracksByUser(currentUser.value?.username ?? "", currentUser.value?.id).then(t => tracks.value = t ?? []);

        return vertical(
            heading({
                level: 1,
                text: t("EDIT_TRACKS"),
            }),
            signalMap(tracks, vertical(), t => TrackEditTemplates.editableTrackInList(t, tracks)),
        ).build();
    }
}
