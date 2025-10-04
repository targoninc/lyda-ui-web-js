import { TrackActions } from "../../Actions/TrackActions.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { copy, getPlayIcon, Util } from "../../Classes/Util.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { AlbumTemplates } from "./AlbumTemplates.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import { PlaylistTemplates } from "./PlaylistTemplates.ts";
import { DragActions } from "../../Actions/DragActions.ts";
import { Images } from "../../Enums/Images.ts";
import { TrackEditTemplates } from "./TrackEditTemplates.ts";
import { CustomText } from "../../Classes/Helpers/CustomText.ts";
import { CommentTemplates } from "../CommentTemplates.ts";
import { navigate } from "../../Routing/Router.ts";
import {
    compute,
    create,
    InputType,
    nullElement,
    Signal,
    signal,
    signalMap,
    TypeOrSignal,
    when,
} from "@targoninc/jess";
import {
    currentTrackId,
    currentTrackPosition,
    currentUser,
    loadingAudio,
    manualQueue,
    playingHere,
} from "../../state.ts";
import { Ui } from "../../Classes/Ui.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { MediaActions } from "../../Actions/MediaActions.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { button, input } from "@targoninc/jess-components";
import { TrackCollaborator } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { Repost } from "@targoninc/lyda-shared/src/Models/db/lyda/Repost";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { CollaboratorType } from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { get } from "../../Api/ApiClient.ts";
import { UploadableTrack } from "../../Models/UploadableTrack.ts";
import { t } from "../../../locales";

export class TrackTemplates {
    static collabIndicator(collab: TrackCollaborator): any {
        return create("div")
            .classes("pill", "padded-inline", "flex", "rounded-max", "bordered")
            .children(
                create("div")
                    .classes("align-center", "text-small", "nopointer")
                    .text(collab.collab_type?.name)
                    .build(),
            ).build();
    }

    static noTracksUploadedYet(isOwnProfile: boolean) {
        let children;
        if (isOwnProfile) {
            children = [
                create("p")
                    .text(t("SHARE_WHAT_YOU_MAKE"))
                    .build(),
                GenericTemplates.newTrackButton(["secondary"]),
            ];
        } else {
            children = [create("p").text(t("NO_TRACKS_FOUND")).build()];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    static noRepostsYet(isOwnProfile: boolean) {
        let children;
        if (isOwnProfile) {
            children = [
                create("p")
                    .text(t("FIND_GOOD_STUFF_TO_SHARE"))
                    .build(),
                button({
                    text: t("EXPLORE"),
                    icon: {
                        icon: "explore",
                    },
                    classes: ["positive"],
                    onclick: () => navigate(RoutePath.explore),
                }),
            ];
        } else {
            children = [create("p").text(t("NO_REPOSTS_FOUND")).build()];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    static trackCover(track: Track, coverType: string, startCallback: Function | null = null) {
        const imageState = signal(DefaultImages[EntityType.track]);
        if (track.has_cover) {
            imageState.value = Util.getImage(track.id, MediaFileType.trackCover);
        }
        const coverLoading = signal(false);
        const start = async () => {
            if (!startCallback) {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.startAsync(track.id);
            } else {
                await startCallback(track.id);
            }
        };
        const isOwnTrack = compute(u => u?.id === track.user_id, currentUser);
        const alwaysShowClass = compute((id): string => (track.id === id ? "always-show" : "_"), currentTrackId);

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
            .attributes("track_id", track.id)
            .id(track.id)
            .children(
                create("img")
                    .classes("cover", "blurOnParentHover")
                    .src(imageState)
                    .alt(track.title)
                    .onclick(() => {
                        Ui.showImageModal(imageState);
                    }).build(),
                when(
                    isOwnTrack,
                    create("div")
                        .classes(
                            "hidden",
                            coverType === "cover" ? "showOnParentHover" : "_",
                            "centeredInParent",
                            "flex",
                        ).children(
                        GenericTemplates.deleteIconButton("delete-image-button", () =>
                            MediaActions.deleteMedia(MediaFileType.trackCover, track.id, imageState, coverLoading),
                        ),
                        GenericTemplates.uploadIconButton("replace-image-button", () =>
                            TrackActions.replaceCover(track.id, true, imageState, coverLoading),
                        ),
                        when(coverLoading, GenericTemplates.loadingSpinner()),
                    ).build(),
                ),
                when(
                    coverType !== "cover",
                    create("div")
                        .classes(
                            "centeredInParent",
                            "hidden",
                            coverType !== "cover" ? "showOnParentHover" : "_",
                            alwaysShowClass,
                        ).children(GenericTemplates.playButton(track.id, start))
                        .build(),
                ),
            ).build();
    }

    static smallListTrackCover(track: Track, startCallback: Function | null = null) {
        return TrackTemplates.trackCover(track, "small-cover", startCallback);
    }

    static trackListWithPagination(
        tracksState: Signal<Track[]>,
        pageState: Signal<number>,
        type: string,
        search: Signal<string>,
        nextDisabled: Signal<boolean>,
        hasSearch: TypeOrSignal<boolean>,
    ) {
        const empty = compute(t => t.length === 0, tracksState);

        return create("div")
            .classes("flex-v", "fullHeight")
            .children(
                horizontal(
                    horizontal(
                        TrackTemplates.paginationControls(pageState, nextDisabled),
                        when(hasSearch, input({
                            type: InputType.text,
                            validators: [],
                            name: "tracks-filter",
                            placeholder: t("SEARCH"),
                            onchange: value => search.value = value,
                            value: search,
                        })),
                    ).classes("align-children"),
                    type === "following" ? TrackTemplates.feedFilters(search) : nullElement(),
                ).classes("space-between", "align-children")
                 .build(),
                compute(
                    list =>
                        TrackTemplates.trackList(
                            list.reverse().map(track => MusicTemplates.feedEntry(EntityType.track, track)),
                        ),
                    tracksState,
                ),
                when(empty, GenericTemplates.noTracks()),
                TrackTemplates.paginationControls(pageState, nextDisabled),
            ).build();
    }

    static feedFilters(filterState: Signal<string>) {
        const tabs = [`${t("ALL")}`, `${t("ORIGINALS")}`, `${t("REPOSTS")}`];

        return GenericTemplates.combinedSelector(
            tabs,
            (i: number) => {
                filterState.value = tabs[i].toLowerCase();
            },
            0,
        );
    }

    static trackList(trackList: any[]) {
        return create("div")
            .classes("flex-v", "reverse", "track-list")
            .children(...trackList)
            .build();
    }

    static paginationControls(pageState: Signal<number>, nextDisabled: Signal<boolean>) {
        const previousCallback = () => pageState.value = pageState.value - 1;
        const nextCallback = () => pageState.value = pageState.value + 1;

        return compute((newPage, nd) => TrackTemplates.#paginationControls(newPage, previousCallback, nextCallback, nd), pageState, nextDisabled);
    }

    static #paginationControls(currentPage: number, previousCallback: Function, nextCallback: Function, nextDisabled = false) {
        return horizontal(
            GenericTemplates.roundIconButton({ icon: "arrow_back_ios_new" }, previousCallback, "", [currentPage === 1 ? "disabled" : "_"]),
            GenericTemplates.roundIconButton({ icon: "arrow_forward_ios" }, nextCallback, "", [(currentPage === Infinity || nextDisabled) ? "disabled" : "_"]),
        ).build();
    }

    static waveform(track: Track, loudnessData: number[], small = false) {
        if (!track.processed) {
            return create("div")
                .classes("waveform", small ? "waveform-small" : "_", "processing-box", "rounded-max", "relative", "flex", "nogap")
                .title(t("STILL_PROCESSING_CHECK_LATER"))
                .build();
        }

        return create("div")
            .classes("waveform", small ? "waveform-small" : "_", "relative", "flex", "nogap", "pointer")
            .id(track.id)
            .onmousedown(async e => {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.scrubFromElement(e, track.id);
            })
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e, track.id);
                }
            })
            .children(
                ...loudnessData.map((loudness, index) => {
                    const barClass = compute(
                        (p, id): string => {
                            const barsBefore = Math.floor(p.relative * loudnessData.length);
                            if (index < barsBefore && id === track.id) {
                                return "active";
                            }
                            return "_";
                        },
                        currentTrackPosition,
                        currentTrackId,
                    );

                    return create("div")
                        .classes("waveform-bar", "nopointer", index % 2 === 0 ? "even" : "odd", barClass)
                        .styles("height", loudness * 100 + "%")
                        .build();
                }),
            ).build();
    }

    static repostIndicator(repost: Repost) {
        if (!repost.user) {
            throw new Error(`Repost has no user`);
        }

        return button({
            text: "@" + repost.user.username,
            icon: {
                icon: "redo",
                adaptive: true,
            },
            classes: ["special-floating", "rounded-max", "align-center", "text-small"],
            onclick: () => navigate(`${RoutePath.profile}/` + repost.user!.username),
        });
    }

    static trackInList(
        listTrack: ListTrack,
        canEdit: boolean,
        list: Album | Playlist,
        tracks: Signal<ListTrack[]>,
        type: "album" | "playlist",
        startCallback: Function | null = null,
    ) {
        const icons = [];
        const track = listTrack.track;
        if (!track) {
            throw new Error("Track is missing on list track");
        }
        if (!track.likes) {
            throw new Error("Track on list track is missing likes");
        }

        if (track.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }

        const graphics = [];
        if (track.processed) {
            graphics.push(TrackTemplates.waveform(track, JSON.parse(track.loudness_data), true));
        } else {
            graphics.push(TrackTemplates.waveform(track, [], true));
        }

        const dragData = {
            type: "track",
            id: track.id,
        };

        let item = create("div").classes("flex", "fadeIn", "track-in-list", "fullWidth");

        if (canEdit) {
            item = item
                .attributes("draggable", "true")
                .ondragstart(async (e: DragEvent) => {
                    DragActions.showDragTargets();
                    e.dataTransfer!.setData("text/plain", JSON.stringify(dragData));
                    e.dataTransfer!.effectAllowed = "move";
                    e.stopPropagation();
                })
                .ondragend(async e => {
                    DragActions.hideDragTargets();
                    e.preventDefault();
                    e.stopPropagation();
                });
        }

        const playingClass = compute((id): string => (id === track.id ? "playing" : "_"), currentTrackId);

        return item
            .children(
                create("div")
                    .classes("feed-track", "flex", "padded", "rounded", "fullWidth", "card", playingClass)
                    .styles("max-width", "100%")
                    .ondblclick(async () => {
                        if (!startCallback) {
                            PlayManager.addStreamClientIfNotExists(track.id, track.length);
                            await PlayManager.startAsync(track.id);
                        } else {
                            await startCallback(track.id);
                        }
                    })
                    .children(
                        when(canEdit, GenericTemplates.verticalDragIndicator()),
                        TrackTemplates.smallListTrackCover(track, startCallback),
                        create("div")
                            .classes("flex", "align-children", "flex-grow", "space-between")
                            .children(
                                vertical(
                                    horizontal(
                                        MusicTemplates.title(EntityType.track, track.title, track.id, icons),
                                        create("span")
                                            .classes("nopointer", "text-small", "align-center")
                                            .text(Time.format(track.length))
                                            .build(),
                                        create("span")
                                            .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                            .text(Time.ago(track.created_at))
                                            .build(),
                                    ),
                                    ...graphics,
                                ),
                                vertical(
                                    when(
                                        canEdit,
                                        TrackTemplates.trackInListActions(track, list, listTrack, tracks, type),
                                    ),
                                    horizontal(
                                        TrackTemplates.addToQueueButton(track),
                                        InteractionTemplates.interactions(EntityType.track, track),
                                    ),
                                ).classes("align-children-end"),
                            ).build(),
                    ).build(),
            ).build();
    }

    static trackInListActions(
        track: Track,
        list: Album | Playlist,
        listTrack: ListTrack,
        tracks: Signal<ListTrack[]>,
        type: "album" | "playlist",
    ) {
        return create("div")
            .classes("flex")
            .children(
                button({
                    text: t("UP"),
                    icon: { icon: "keyboard_arrow_up" },
                    classes: ["align-children"],
                    disabled: compute(p => p[0].track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position - 1);
                    },
                }),
                button({
                    text: t("DOWN"),
                    icon: { icon: "keyboard_arrow_down" },
                    classes: ["align-children"],
                    disabled: compute(p => p[p.length - 1].track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position + 1);
                    },
                }),
                button({
                    text: t("REMOVE"),
                    icon: { icon: "close" },
                    classes: ["negative", "align-children"],
                    onclick: async () => {
                        await TrackActions.removeTrackFromList(tracks, list, type, listTrack);
                    },
                }),
            ).build();
    }

    static tracksInList(
        noTracks: Signal<boolean>,
        tracks: Signal<ListTrack[]>,
        canEdit: boolean,
        list: Album | Playlist,
        type: "album" | "playlist",
        startCallback: (trackId: number) => Promise<void>,
    ) {
        return create("div")
            .classes("flex-v")
            .children(
                when(
                    noTracks,
                    create("div")
                        .classes("card")
                        .children(
                            create("span")
                                .text(t("NO_TRACKS_FOUND"))
                                .build(),
                        ).build(),
                ),
                signalMap(tracks, create("div").classes("flex-v"), (track, i) => {
                    let parent = horizontal().classes("fullWidth");
                    if (canEdit) {
                        parent = GenericTemplates.dragTargetInList(async (data: any) => {
                            await TrackActions.reorderTrack(type, list.id, data.id, tracks, i);
                        }, i.toString()).classes("fullWidth");
                    }

                    return create("div")
                        .classes("flex-v", "relative")
                        .children(
                            parent
                                .children(TrackTemplates.trackInList(track, canEdit, list, tracks, type, startCallback))
                                .build(),
                        ).build();
                }),
            ).build();
    }

    static async trackPage(trackData: any) {
        if (!trackData.track) {
            console.log(trackData);
            console.error("Invalid track data");
            return null;
        }
        const track = trackData.track as Track;
        const collaborators = track.collaborators ?? [];
        const toAppend = [];
        const linkedUserState = signal(collaborators);
        const track$ = signal(track as Track | UploadableTrack);

        toAppend.push(TrackTemplates.collaboratorSection(track$, linkedUserState));
        const icons = [];
        const isPrivate = track.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        const trackUser = track.user;
        if (!trackUser) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const editActions = [];
        if (trackData.canEdit) {
            editActions.push(TrackEditTemplates.addToAlbumsButton(track));
            if (isPrivate) {
                editActions.push(TrackTemplates.copyPrivateLinkButton(track.id, track.secretcode));
            }
            editActions.push(TrackEditTemplates.replaceAudioButton(track));
            editActions.push(TrackEditTemplates.downloadAudioButton(track));
            editActions.push(TrackEditTemplates.openEditPageButton(track));
            editActions.push(TrackEditTemplates.deleteTrackButton(track.id));
        }

        const description = create("span")
            .id("track-description")
            .classes("description", "break-lines", "card")
            .html(CustomText.renderToHtml(track.description))
            .build();

        setTimeout(() => {
            if (description.clientHeight < description.scrollHeight) {
                description.classList.add("overflowing");
            }
        }, 200);
        const coverFile = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverFile.value = Util.getTrackCover(track.id);
        }
        const showComments = signal(true);
        const comments = signal<Comment[]>([]);
        get<Comment[]>(ApiRoutes.getCommentsByTrackId, { track_id: track.id }).then(c => {
            comments.value = c ?? [];
        });

        return create("div")
            .classes("single-page", "noflexwrap", "padded-large", "rounded-large", "flex-v")
            .children(
                create("div")
                    .classes("flex-v", "nogap")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                create("span")
                                    .classes("text-xxlarge")
                                    .text(track.title)
                                    .build(),
                                ...icons,
                            ).build(),
                        UserTemplates.userWidget({
                            ...trackUser,
                            displayname:
                                track.artistname && track.artistname.trim().length > 0
                                    ? track.artistname.trim()
                                    : trackUser.displayname,
                        }, [], [], UserWidgetContext.singlePage),
                    ).build(),
                ...toAppend,
                create("div")
                    .classes("track-title-container", "flex-v", "small-gap")
                    .children(
                        create("span").classes("collaborators").text(track.credits).build(),
                        create("div")
                            .classes("flex")
                            .children(
                                create("span")
                                    .classes("date", "text-small")
                                    .text(t("UPLOADED_AT", Util.formatDate(track.created_at)))
                                    .build(),
                                create("span")
                                    .classes("playcount", "text-small")
                                    .text(t("PLAYS_AMOUNT", track.plays))
                                    .build(),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("track-info-container", "flex", "align-bottom")
                    .children(
                        TrackTemplates.trackCover(track, "cover"),
                        create("div")
                            .classes("flex-v")
                            .children(
                                TrackTemplates.waveform(track, track.processed ? JSON.parse(track.loudness_data) : []),
                                create("div")
                                    .classes("flex-v")
                                    .children(
                                        horizontal(
                                            TrackTemplates.playButton(track),
                                            InteractionTemplates.interactions(EntityType.track, track),
                                            when(
                                                currentUser,
                                                horizontal(
                                                    button({
                                                        text: t("ADD_TO_PLAYLIST"),
                                                        icon: { icon: "playlist_add" },
                                                        onclick: async () => {
                                                            await PlaylistActions.openAddToPlaylistModal(track, "track");
                                                        },
                                                    }),
                                                    TrackTemplates.addToQueueButton(track),
                                                ).build(),
                                            ),
                                        ).build(),
                                    ).build(),
                            ).build(),
                    ).build(),
                horizontal(...editActions),
                when(track.description.length > 0, description),
                CommentTemplates.commentListFullWidth(track.id, comments, showComments),
                TrackTemplates.inAlbumsList(track),
                await TrackTemplates.inPlaylistsList(track),
            ).build();
    }

    static collaboratorSection(
        track$: Signal<Track | UploadableTrack>,
        linkedUsers$: Signal<TrackCollaborator[]>,
    ) {
        return horizontal(
            TrackEditTemplates.linkedUsers(linkedUsers$.value, track$, false),
        ).build();
    }

    static inAlbumsList(track: Track) {
        if (!track.albums || track.albums.length === 0) {
            return create("div").classes("flex-v", "track-contained-list").build();
        }

        const albumCards = track.albums.map((album: Album) => {
            return AlbumTemplates.albumCard(album, true);
        });

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                create("h2")
                    .text(t("IN_ALBUMS"))
                    .build(),
                create("div")
                    .classes("flex")
                    .children(...albumCards)
                    .build(),
            ).build();
    }

    static async inPlaylistsList(track: Track) {
        if (!track.playlists || track.playlists.length === 0) {
            return create("div").classes("flex-v", "track-contained-list").build();
        }

        const playlistCards = track.playlists.map(playlist => {
            return PlaylistTemplates.playlistCard(playlist, true);
        });

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                create("h2")
                    .text(t("IN_PLAYLISTS"))
                    .build(),
                create("div")
                    .classes("flex")
                    .children(...playlistCards)
                    .build(),
            ).build();
    }

    public static addToQueueButton(track: Track) {
        const inQueue = compute(q => q.includes(track.id), manualQueue);
        const text = compute((q: boolean): string => (q ? `${t("UNQUEUE")}` : `${t("QUEUE")}`), inQueue);
        const icon = compute((q: boolean): string => (q ? "remove" : "switch_access_shortcut_add"), inQueue);
        const queueClass = compute((q: boolean): string => (q ? "negative" : "_"), inQueue);

        return button({
            text,
            icon: { icon },
            classes: [queueClass],
            onclick: () => {
                QueueManager.toggleInManualQueue(track.id);
                inQueue.value = QueueManager.isInManualQueue(track.id);
            },
        });
    }

    static playButton(track: Track) {
        const isPlaying = compute((id, ph) => id === track.id && ph, currentTrackId, playingHere);
        const text = compute((p): string => (p ? `${t("PAUSE")}` : `${t("PLAY")}`), isPlaying);
        const icon = getPlayIcon(isPlaying, loadingAudio);

        return button({
            text,
            icon: {
                icon,
                classes: ["inline-icon", "svg", "nopointer"],
                isUrl: true,
            },
            classes: ["special", "bigger-input", "rounded-max"],
            id: track.id,
            onclick: async () => {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.togglePlayAsync(track.id);
            },
        });
    }

    static toBeApprovedTrack(collabType: CollaboratorType, data: TrackCollaborator) {
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (data.user?.has_avatar) {
            avatarState.value = Util.getUserAvatar(data.user_id);
        }
        if (!data.user) {
            throw new Error(`User not set on to be approved track with ID ${data.track_id}`);
        }
        if (!data.track) {
            throw new Error(`Track not set on to be approved track with ID ${data.track_id}`);
        }
        if (!data.user.follows) {
            throw new Error(`User follows not set on to be approved track with ID ${data.track_id}`);
        }
        const loading = signal(false);

        return horizontal(
            horizontal(
                MusicTemplates.cover(EntityType.track, data.track, "inline-cover"),
                vertical(
                    MusicTemplates.title(EntityType.track, data.track.title, data.track.id),
                    horizontal(
                        UserTemplates.userWidget(data.user, [], [], UserWidgetContext.card),
                        create("span")
                            .text(t("REQUESTED_YOU_TO_BE"))
                            .build(),
                        create("span")
                            .classes("warning")
                            .text(collabType.name)
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(Time.ago(data.created_at))
                            .build(),
                    ).classes("small-gap", "align-children"),
                ),
            ),
            horizontal(
                button({
                    text: t("APPROVE"),
                    icon: {
                        icon: "check",
                    },
                    disabled: loading,
                    onclick: async () => {
                        loading.value = true;
                        await TrackActions.approveCollab(data.track_id);
                        loading.value = false;
                    },
                    classes: ["positive"],
                }),
                button({
                    text: t("DENY"),
                    icon: {
                        icon: "close",
                    },
                    disabled: loading,
                    onclick: async () => {
                        loading.value = true;
                        await TrackActions.denyCollab(data.track_id, data.track!.title);
                        loading.value = false;
                    },
                    classes: ["negative"],
                }),
                when(loading, GenericTemplates.loadingSpinner()),
            ),
        ).classes("card", "collab", "space-between", "align-children")
         .id(data.track_id)
         .build();
    }

    static unapprovedTracks(tracks: TrackCollaborator[]) {
        const trackList = tracks.map((track: TrackCollaborator) => {
            if (!track.collab_type) {
                throw new Error(`Track collab type is not set for unapproved track with ID ${track.track_id}`);
            }
            return TrackTemplates.toBeApprovedTrack(track.collab_type, track);
        });
        return create("div")
            .classes("flex-v")
            .children(...trackList)
            .build();
    }

    static copyPrivateLinkButton(id: number, code: string) {
        return button({
            text: t("COPY_PRIVATE_LINK"),
            icon: { icon: "link" },
            classes: ["special"],
            onclick: async () => copy(window.location.origin + "/track/" + id + "/" + code),
        });
    }
}
