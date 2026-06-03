import {TrackActions} from "../../Actions/TrackActions.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {copy, getPlayIcon, Util} from "../../Classes/Util.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {GenericTemplates, horizontal, tabSelected, vertical} from "../generic/GenericTemplates.ts";
import {PopoverTemplates} from "../generic/PopoverTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {PlaylistActions} from "../../Actions/PlaylistActions.ts";
import {DragActions} from "../../Actions/DragActions.ts";
import {Images} from "../../Enums/Images.ts";
import {TrackEditTemplates} from "./TrackEditTemplates.ts";
import {CustomText} from "../../Classes/Helpers/CustomText.ts";
import {navigate} from "../../Routing/Router.ts";
import {AnyElement, compute, create, Signal, signal, signalMap, when,} from "@targoninc/jess";
import {
    currentTrackId,
    currentTrackPosition,
    currentUser,
    loadingAudio,
    manualQueue,
    playingHere,
} from "../../state.ts";
import {InteractionStateManager} from "../../Classes/InteractionStateManager.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {MusicTemplates} from "./MusicTemplates.ts";
import {button, heading} from "@targoninc/jess-components";
import {TrackCollaborator} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {InteractionType} from "@targoninc/lyda-shared/src/Enums/InteractionType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Repost} from "@targoninc/lyda-shared/src/Models/db/lyda/Repost";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {CollaboratorType} from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import {InteractionTemplates} from "../InteractionTemplates.ts";
import {get} from "../../Api/ApiClient.ts";
import {UploadableTrack} from "../../Models/UploadableTrack.ts";
import {t} from "../../../locales";
import {Api} from "../../Api/Api.ts";
import {CommentTemplates} from "../CommentTemplates.ts";
import {AlbumActions} from "../../Actions/AlbumActions.ts";
import {TrackSale} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackSale.ts";
import {TransactionTemplates} from "../money/TransactionTemplates.ts";
import {BuyTemplates} from "../money/BuyTemplates.ts";
import {CoverContext} from "../../Enums/CoverContext.ts";
import {TextSize} from "../../Enums/TextSize.ts";

export class TrackTemplates {
    static collabIndicator(collab: TrackCollaborator): any {
        return create("div")
            .classes("pill", "padded-inline", "flex", "rounded-max", "bordered")
            .children(
                create("div")
                    .classes("align-center", TextSize.small, "nopointer")
                    .text(collab.collab_type?.name)
                    .build(),
            ).build();
    }

    static feedFilters(filterState: Signal<string>) {
        const tabs = [`${t("ALL")}`, `${t("ORIGINALS")}`, `${t("REPOSTS")}`];
        const lowerTabs = tabs.map(t => t.toLowerCase());
        const initialIndex = Math.max(0, lowerTabs.indexOf(filterState.value));

        return GenericTemplates.combinedSelector(
            tabs,
            (i: number) => {
                filterState.value = tabs[i].toLowerCase();
            },
            initialIndex,
        );
    }

    static wipFilter(wipState: Signal<string>) {
        const all = `${t("ALL")}`;
        const noWips = `${t("NO_WIPS")}`;
        const wipOnly = `${t("WIP_ONLY")}`;
        const tabs = [all, noWips, wipOnly];
        const values = ["", "exclude", "only"];
        const initialIndex = Math.max(0, values.indexOf(wipState.value));

        return GenericTemplates.combinedSelector(
            tabs,
            (i: number) => {
                wipState.value = values[i];
            },
            initialIndex,
        );
    }

    static trackList(trackList: any[]) {
        return create("div")
            .classes("flex-v", "reverse", "track-list")
            .children(...trackList)
            .build();
    }

    private static downsampleData(data: number[], target: number): number[] {
        if (data.length <= target) return data;
        const step = data.length / target;
        const result: number[] = [];
        for (let i = 0; i < target; i++) {
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            let sum = 0;
            for (let j = start; j < end; j++) sum += Math.pow(data[j], 4);
            result.push(Math.pow(sum / (end - start), 0.25));
        }
        return result;
    }

    static waveform(track: Track, loudnessData: number[], small = false) {
        if (!track.processed) {
            return create("div")
                .classes("waveform", small ? "waveform-small" : "_", "processing-box", "rounded-max", "relative")
                .title(t("STILL_PROCESSING_CHECK_LATER"))
                .build();
        }

        if (!loudnessData || loudnessData.length === 0) {
            const n = 200;
            const cycles = 6;
            loudnessData = Array.from({length: n}, (_, i) =>
                Math.abs(Math.sin((i / n) * Math.PI * cycles))
            );
        } else if (loudnessData.every(v => v === loudnessData[0])) {
            loudnessData = loudnessData.map(() => 1);
        }

        const svgW = 1000;
        const svgH = small ? 40 : 80;

        const windowWidth$ = signal(window.innerWidth);
        const onResize = () => { windowWidth$.value = window.innerWidth; };
        window.addEventListener("resize", onResize);

        const pathD = compute(
            w => {
                let count = 200;
                if (w < 500) count = 50;
                else if (w < 800) count = 67;
                else if (w < 1100) count = 100;
                const data = TrackTemplates.downsampleData(loudnessData, count);
                return TrackTemplates.waveformPath(data, svgW, svgH);
            },
            windowWidth$,
        );

        const clipInset = compute(
            (pos, isCurrent): string => isCurrent ? `inset(0 ${(1 - pos.relative) * 100}% 0 0)` : "none",
            currentTrackPosition, compute(id => id === track.id, currentTrackId),
        );

        const blueDisplay = compute(
            (id, ph): string => id === track.id && ph ? "" : "none",
            currentTrackId, playingHere,
        );

        const el = create("div")
            .classes("waveform", small ? "waveform-small" : "_", "relative", "pointer")
            .id(track.id)
            .children(
                create("svg")
                    .classes("waveform-svg")
                    .attributes("viewBox", `0 0 ${svgW} ${svgH}`)
                    .attributes("preserveAspectRatio", "none")
                    .children(
                        create("path")
                            .attributes("d", pathD)
                            .styles("fill", "var(--fg-0)")
                            .build(),
                        create("g")
                            .styles("clip-path", clipInset, "display", blueDisplay)
                            .children(
                                create("path")
                                    .attributes("d", pathD)
                                    .styles("fill", "var(--blue)")
                                    .build(),
                            ).build(),
                    ).build(),
            )
            .onmousedown(async e => {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.scrubFromElement(e, track.id);
            })
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e, track.id);
                }
            })
            .build();
        return el;
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
            classes: ["special-floating", "rounded-max", "align-center", TextSize.small],
            onclick: () => navigate(`${RoutePath.profile}/` + repost.user!.username),
        });
    }

    static trackInList(
        listTrack: ListTrack,
        canEdit: boolean,
        list: Album | Playlist,
        tracks: Signal<ListTrack[]>,
        type: "album" | "playlist",
    ) {
        const icons = [];
        const track = listTrack.track;
        if (!track) {
            throw new Error("Track is missing on list track");
        }
        InteractionStateManager.addContext(EntityType.track, track.id, "list");

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

        const startCallback = async () => {
            if (type === "album") {
                await AlbumActions.startTrackInAlbum(list as Album, track);
            } else if (type === "playlist") {
                await PlaylistActions.startTrackInPlaylist(list as Playlist, track);
            }
        }

        return item
            .children(
                create("div")
                    .classes("feed-track", "flex", "padded", "rounded", "fullWidth", "card", "noflexwrap", playingClass)
                    .styles("max-width", "100%")
                    .ondblclick(startCallback)
                    .children(
                        when(canEdit, GenericTemplates.verticalDragIndicator()),
                        MusicTemplates.cover(EntityType.track, track, CoverContext.small, startCallback),
                        create("div")
                            .classes("flex", "align-children", "flex-grow", "space-between")
                            .children(
                                vertical(
                                    horizontal(
                                        MusicTemplates.title(EntityType.track, track.title, track.id, icons, TextSize.large, true, false, track.wip),
                                        create("span")
                                            .classes("nopointer", TextSize.small, "align-center")
                                            .text(Time.format(track.length))
                                            .build(),
                                        GenericTemplates.timestamp(track.created_at),
                                    ).classes("align-children"),
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
                                    ).classes("align-children"),
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
                    icon: {icon: "keyboard_arrow_up"},
                    classes: ["align-children"],
                    disabled: compute(p => p[0]?.track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position - 1);
                    },
                }),
                button({
                    text: t("DOWN"),
                    icon: {icon: "keyboard_arrow_down"},
                    classes: ["align-children"],
                    disabled: compute(p => p[p.length - 1]?.track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position + 1);
                    },
                }),
                button({
                    text: t("REMOVE"),
                    icon: {icon: "close"},
                    classes: ["negative", "align-children"],
                    onclick: async () => {
                        await TrackActions.removeTrackFromList(tracks, list, type, listTrack);
                    },
                }),
            ).build();
    }

    static trackPage(trackData: any) {
        if (!trackData.track) {
            console.log(trackData);
            console.error("Invalid track data");
            return null;
        }
        const track = trackData.track as Track;
        InteractionStateManager.addContext(EntityType.track, track.id, "page");
        const collaborators = track.collaborators ?? [];
        const linkedUserState = signal(collaborators);
        const track$ = signal(track as Track | UploadableTrack);

        const icons: AnyElement[] = [];
        const isPrivate = track.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        const trackUser = track.user;
        if (!trackUser) {
            throw new Error(`Track ${track.id} has no user`);
        }

        const coverFile = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverFile.value = Util.getTrackCover(track.id);
        }
        const showComments = signal(true);
        const comments = signal<Comment[]>([]);
        get<Comment[]>(ApiRoutes.getCommentsByTrackId, {track_id: track.id}).then(c => {
            comments.value = c ?? [];
        });
        const hasMenu = Util.isLoggedIn() && (trackData.canEdit || trackData.canDownload);
        const backgroundImage = compute(c => trackData.canDownload ? `url(${c})` : "none", coverFile);
        const bought = trackData.canDownload && !trackData.canEdit;
        const selectedTab$ = signal(0);
        const tabs = [t("COMMENTS"), t("ALBUMS"), t("PLAYLISTS"), t("BUYERS")];

        return create("div")
            .classes("single-page", "rounded-large", "relative")
            .children(
                when(trackData.canDownload, create("div")
                    .classes("page-background-image")
                    .styles("background-image", backgroundImage)
                    .build()),
                vertical(
                    vertical(
                        horizontal(
                            MusicTemplates.cover(EntityType.track, track, CoverContext.standalone),
                            vertical(
                                vertical(
                                    MusicTemplates.title(EntityType.track, track.title, track.id, icons, TextSize.xxLarge, false, false, track.wip),
                                    horizontal(
                                        when(bought, GenericTemplates.pill({
                                            icon: "order_approve",
                                            onclick: () => {
                                            },
                                            text: t("BOUGHT"),
                                        })),
                                        UserTemplates.userWidget(trackUser, [], [], UserWidgetContext.singlePage, track.artistname),
                                    ).classes("align-children"),
                                ).classes("nogap"),
                                TrackTemplates.collaboratorSection(track$, linkedUserState),
                                vertical(
                                    create("span").classes("collaborators").text(track.credits).build(),
                                    horizontal(
                                        create("span")
                                            .classes("date", TextSize.small)
                                            .text(t("UPLOADED_AT", Util.formatDate(track.created_at)))
                                            .build(),
                                        create("span")
                                            .classes("playcount", TextSize.small)
                                            .text(t("PLAYS_AMOUNT", track.plays))
                                            .build(),
                                    ).classes("align-children"),
                                ).classes("small-gap"),
                                when(track.description.length > 0, create("span")
                                    .id("track-description")
                                    .classes("description", "break-lines")
                                    .html(CustomText.renderToHtml(track.description))
                                    .build()),
                            ).classes("track-info-container"),
                        ).classes("big-gap"),
                        horizontal(
                            TrackTemplates.playButton(track),
                            TrackTemplates.waveform(track, track.processed ? JSON.parse(track.loudness_data) : []),
                        ).classes("align-children", "bordered", "glass", "rounded-max", "noflexwrap", "limitToContentWidth")
                            .styles("padding", "10px 20px 10px 10px"),
                    ).classes("big-gap").build(),
                    create("div")
                        .classes("flex-v", "noflexwrap")
                        .children(
                            horizontal(
                                horizontal(
                                    InteractionTemplates.interactions(EntityType.track, track, {overrideActions: [InteractionType.like, InteractionType.repost]}),
                                    when(
                                        currentUser,
                                        horizontal(
                                            TrackTemplates.addToPlaylistButton(track),
                                            TrackTemplates.addToQueueButton(track),
                                            when(trackData.canBuy, button({
                                                icon: {icon: "attach_money"},
                                                text: t("BUY"),
                                                onclick: () => {
                                                    BuyTemplates.openBuyModal({type: "track", entity: track}, () => {
                                                        window.location.reload();
                                                    });
                                                },
                                            })),
                                        ).classes("align-children").build(),
                                    ),
                                    when(hasMenu, TrackTemplates.trackMenu(isPrivate, track, trackData)),
                                ).classes("align-end"),
                                GenericTemplates.combinedSelector(tabs, (newTabIndex) => selectedTab$.value = newTabIndex, 0),
                            ).classes("space-between", "align-children"),
                            when(
                                tabSelected(selectedTab$, 0),
                                CommentTemplates.commentListFullWidth(track.id, comments, showComments),
                            ),
                            when(
                                tabSelected(selectedTab$, 1),
                                TrackTemplates.inAlbumsList(track),
                            ),
                            when(
                                tabSelected(selectedTab$, 2),
                                TrackTemplates.inPlaylistsList(track),
                            ),
                            when(
                                tabSelected(selectedTab$, 3),
                                TrackTemplates.buyersList(track),
                            ),
                        ).build(),
                ).classes("padded-large").styles("position", "inherit").build(),
            ).build();
    }

    static addToPlaylistButton(track: Track) {
        return button({
            text: t("ADD_TO_PLAYLIST"),
            classes: ["hideTextOnSmallBreakpointButton"],
            icon: {icon: "playlist_add"},
            onclick: async () => {
                await PlaylistActions.openAddToPlaylistModal(track, "track");
            },
        });
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

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                heading({
                    text: t("IN_ALBUMS"),
                    level: 2,
                }),
                create("div")
                    .classes("flex")
                    .children(
                        ...track.albums.map(a => MusicTemplates.cardItem(EntityType.album, a, true)),
                    ).build(),
            ).build();
    }

    static inPlaylistsList(track: Track) {
        if (!track.playlists || track.playlists.length === 0) {
            return create("div").classes("flex-v", "track-contained-list").build();
        }

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                create("h2")
                    .text(t("IN_PLAYLISTS"))
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        ...track.playlists.map(p => MusicTemplates.cardItem(EntityType.playlist, p, true)),
                    ).build(),
            ).build();
    }

    public static addToQueueButton(track: Track) {
        const inQueue = compute(q => q.includes(track.id), manualQueue);
        const text = compute((q: boolean): string => (q ? `${t("UNQUEUE")}` : `${t("QUEUE")}`), inQueue);
        const icon = compute((q: boolean): string => (q ? "remove" : "switch_access_shortcut_add"), inQueue);
        const queueClass = compute((q: boolean): string => (q ? "negative" : "_"), inQueue);

        return button({
            text,
            icon: {icon},
            classes: [queueClass, "hideTextOnSmallBreakpointButton"],
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
            classes: ["special", "bigger-input", "rounded-max", "hideTextOnSmallBreakpointButton"],
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
            Util.getCachedUserAvatar(data.user_id).then(url => {
                avatarState.value = url;
            });
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
                MusicTemplates.cover(EntityType.track, data.track, CoverContext.inline),
                vertical(
                    MusicTemplates.title(EntityType.track, data.track.title, data.track.id, [], TextSize.large, true, false, data.track.wip),
                    horizontal(
                        UserTemplates.userWidget(data.user, [], [], UserWidgetContext.card),
                        create("span")
                            .text(t("REQUESTED_YOU_TO_BE"))
                            .build(),
                        create("span")
                            .classes("warning")
                            .text(collabType.name)
                            .build(),
                        GenericTemplates.timestamp(data.created_at),
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
            icon: {icon: "link"},
            onclick: async () => copy(window.location.origin + "/track/" + id + "/" + code),
        });
    }

    private static waveformPath(data: number[], w: number, h: number): string {
        const n = data.length;
        const barW = 3;
        const gap = 2;
        const step = barW + gap;
        const scale = w / (n * step - gap);
        let path = "";
        for (let i = 0; i < n; i++) {
            const x = i * step * scale;
            const barH = Math.pow(data[i], 4) * h;
            if (barH <= 0) continue;
            path += `M ${x},${h} v ${-barH} h ${barW * scale} v ${barH} Z `;
        }
        return path;
    }

    private static trackMenu(isPrivate: boolean, track: Track, trackData: any) {
        const popId = `track-menu-${track.id}`;
        const popover = PopoverTemplates.manualPopover(popId,
            when(trackData.canDownload, TrackEditTemplates.downloadAudioButton(track)),
            when(trackData.canEdit, vertical(
                TrackEditTemplates.addToAlbumsButton(track),
                TrackEditTemplates.replaceAudioButton(track),
                TrackEditTemplates.openEditPageButton(track),
                TrackEditTemplates.deleteTrackButton(track.id),
            ).build()),
        );
        popover.classList.add("flex-v");

        const btn = GenericTemplates.roundIconButton(
            {icon: "more_horiz"},
            () => PopoverTemplates.toggle(popover, btn),
            "Show menu");

        return horizontal(
            when(isPrivate, TrackTemplates.copyPrivateLinkButton(track.id, track.secretcode)),
            btn,
            popover,
        ).classes("relative", "align-children").build();
    }

    private static buyersList(track: Track) {
        const buyers$ = signal<TrackSale[]>([]);
        const page$ = signal(1);
        const PAGE_SIZE = 10;
        const offset$ = compute(p => (p - 1) * PAGE_SIZE, page$);
        const nextDisabled$ = compute(b => b.length < PAGE_SIZE, buyers$);
        const loading$ = signal(false);
        const load = () => {
            loading$.value = true;
            Api.getTrackBuyers(track.id, offset$.value, PAGE_SIZE).then(b => {
                buyers$.value = b ?? [];
            }).finally(() => loading$.value = false);
        }
        load();

        return vertical(
            GenericTemplates.paginationControls(page$, nextDisabled$),
            signalMap(
                buyers$,
                vertical(),
                sale => vertical(
                    UserTemplates.userWidget(sale.user!, [], [], UserWidgetContext.singlePage),
                    horizontal(
                        TransactionTemplates.amount("in", sale.amount_ct / 100),
                        GenericTemplates.timestamp(sale.created_at),
                    ).classes("align-children")
                ).classes("card").build()
            )
        ).build();
    }
}
