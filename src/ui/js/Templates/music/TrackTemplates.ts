import {TrackActions} from "../../Actions/TrackActions.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {copy, Util} from "../../Classes/Util.ts";
import {Icons} from "../../Enums/Icons.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {StatisticsTemplates} from "../StatisticsTemplates.ts";
import {AlbumTemplates} from "./AlbumTemplates.ts";
import {PlaylistActions} from "../../Actions/PlaylistActions.ts";
import {PlaylistTemplates} from "./PlaylistTemplates.ts";
import {DragActions} from "../../Actions/DragActions.ts";
import {Images} from "../../Enums/Images.ts";
import {TrackEditTemplates} from "./TrackEditTemplates.ts";
import {CustomText} from "../../Classes/Helpers/CustomText.ts";
import {CommentTemplates} from "../CommentTemplates.ts";
import {AnyElement, AnyNode, create, HtmlPropertyValue, ifjs, signalMap} from "../../../fjsc/src/f2.ts";
import {navigate} from "../../Routing/Router.ts";
import {Track} from "../../Models/DbModels/lyda/Track.ts";
import {User} from "../../Models/DbModels/lyda/User.ts";
import {TrackCollaborator} from "../../Models/DbModels/lyda/TrackCollaborator.ts";
import {TrackLike} from "../../Models/DbModels/lyda/TrackLike.ts";
import {Repost} from "../../Models/DbModels/lyda/Repost.ts";
import {Album} from "../../Models/DbModels/lyda/Album.ts";
import {FJSC} from "../../../fjsc";
import {Playlist} from "../../Models/DbModels/lyda/Playlist.ts";
import {compute, Signal, signal} from "../../../fjsc/src/signals.ts";
import {CollaboratorType} from "../../Models/DbModels/lyda/CollaboratorType.ts";
import {currentTrackId, currentUser, manualQueue} from "../../state.ts";
import {PillOption} from "../../Models/PillOption.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {Ui} from "../../Classes/Ui.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {Comment} from "../../Models/DbModels/lyda/Comment.ts";
import {ListTrack} from "../../Models/ListTrack.ts";
import {MediaActions} from "../../Actions/MediaActions.ts";
import {MediaFileType} from "../../Enums/MediaFileType.ts";
import {RoutePath} from "../../Routing/routes.ts";

export class TrackTemplates {
    static trackCard(track: Track, profileId: number) {
        const icons = [];
        const isPrivate = track.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }
        if (!track.collaborators) {
            throw new Error(`Track ${track.id} has no collaborators`);
        }
        if (!track.user) {
            throw new Error(`Track ${track.id} has no user`);
        }
        if (!track.likes) {
            throw new Error(`Track ${track.id} has no likes`);
        }
        if (!track.reposts) {
            throw new Error(`Track ${track.id} has no reposts`);
        }
        if (!track.comments) {
            throw new Error(`Track ${track.id} has no comments`);
        }
        const collab = track.collaborators!.find((collab: TrackCollaborator) => collab.user_id === profileId);
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (track.user.has_avatar) {
            avatarState.value = Util.getUserAvatar(track.user_id);
        }

        return create("div")
            .classes("track-card", "noflexwrap", "small-gap", "padded", "flex-v", currentTrackId.value === track.id ? "playing" : "_")
            .attributes("track_id", track.id)
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        TrackTemplates.title(track.title, track.id, icons),
                        collab ? TrackTemplates.collabIndicator(collab) : null,
                    ).build(),
                create("div")
                    .classes("flex", "noflexwrap")
                    .children(
                        TrackTemplates.trackCover(track, "card-cover"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                UserTemplates.userWidget(track.user, Util.arrayPropertyMatchesUser(track.user.follows ?? [], "following_user_id"), [], [], UserWidgetContext.card),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(track.release_date ?? track.created_at))
                                    .build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                                            Util.arrayPropertyMatchesUser(track.likes, "user_id")),
                                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "user_id")),
                                    ).build()
                            ).build(),
                    ).build(),
            ).build();
    }

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
                    .text("We would love to hear what you make.")
                    .build(),
                create("div")
                    .classes("button-container")
                    .children(GenericTemplates.newTrackButton(["secondary"]))
                    .build()
            ];
        } else {
            children = [
                create("p")
                    .text("Nothing here.")
                    .build()
            ];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    static trackCover(track: Track, coverType: string, startCallback: Function|null = null) {
        const imageState = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            imageState.value = Util.getTrackCover(track.id);
        }
        const coverLoading = signal(false);
        const start = async () => {
            if (!startCallback) {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.startAsync(track.id);
            } else {
                await startCallback(track.id);
            }
        }

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
            .attributes("track_id", track.id)
            .id(track.id)
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .src(imageState)
                    .alt(track.title)
                    .build(),
                create("div")
                    .classes("hidden", coverType === "cover" ? "showOnParentHover" : "_", "centeredInParent", "flex")
                    .children(
                        GenericTemplates.deleteIconButton("delete-image-button", () => MediaActions.deleteMedia(MediaFileType.trackCover, track.id, imageState, coverLoading)),
                        GenericTemplates.uploadIconButton("replace-image-button", () => TrackActions.replaceCover(track.id, true, imageState, coverLoading)),
                        ifjs(coverLoading, GenericTemplates.loadingSpinner()),
                    ).build(),
                ifjs(coverType !== "cover", create("div")
                    .classes("centeredInParent", "hidden", coverType !== "cover" ? "showOnParentHover" : "_")
                    .children(
                        GenericTemplates.playButton(track.id, start)
                    ).build()),
            ).build();
    }

    static feedTrackCover(track: Track) {
        return TrackTemplates.trackCover(track, "inline-cover");
    }

    static smallListTrackCover(track: Track, startCallback: Function|null = null) {
        return TrackTemplates.trackCover(track, "small-cover", startCallback);
    }

    static trackCardsContainer(children: AnyNode[]) {
        return create("div")
            .classes("profileContent", "tracks", "flex")
            .children(...children)
            .build();
    }

    static async trackList(tracksState: Signal<Track[]>, pageState: Signal<number>, type: string, filterState: Signal<string>, loadingState: Signal<boolean>) {
        const trackList = tracksState.value.map(track => TrackTemplates.feedTrack(track));
        const trackListContainer = signal(TrackTemplates.#trackList(trackList));
        tracksState.onUpdate = async (newTracks) => {
            const trackList = newTracks.map(track => TrackTemplates.feedTrack(track));
            trackListContainer.value = TrackTemplates.#trackList(trackList);
        };

        return create("div")
            .classes("flex-v")
            .children(
                type === "following" ? TrackTemplates.feedFilters(filterState, loadingState) : null,
                TrackTemplates.paginationControls(pageState),
                trackListContainer,
                TrackTemplates.paginationControls(pageState)
            ).build();
    }

    static feedFilters(filterState: Signal<string>, loadingState: Signal<boolean>) {
        const filterMap: Record<string, Partial<PillOption>> = {
            all: {
                text: "All",
                icon: "filter_list_off"
            },
            originals: {
                text: "Originals",
                icon: "draw"
            },
            reposts: {
                text: "Reposts",
                icon: "share"
            },
        };
        const options = Object.keys(filterMap).map(k => {
            return {
                ...filterMap[k],
                value: k,
                onclick: () => {
                    filterState.value = k;
                }
            };
        }) as PillOption[];

        return GenericTemplates.pills(options, filterState, [], loadingState);
    }

    static #trackList(trackList: any[]) {
        return create("div")
            .classes("flex-v", "track-list")
            .children(...trackList)
            .build();
    }

    static paginationControls(pageState: Signal<number>) {
        const previousCallback = () => {
            pageState.value = pageState.value - 1;
        };
        const nextCallback = () => {
            pageState.value = pageState.value + 1;
        };

        const controls = signal(TrackTemplates.#paginationControls(pageState.value, previousCallback, nextCallback));
        pageState.onUpdate = (newPage) => {
            controls.value = TrackTemplates.#paginationControls(newPage, previousCallback, nextCallback);
        };

        return controls;
    }

    static #paginationControls(currentPage: number, previousCallback: Function, nextCallback: Function) {
        return create("div")
            .classes("flex")
            .children(
                FJSC.button({
                    text: "Previous page",
                    icon: { icon: "arrow_left" },
                    onclick: previousCallback,
                    disabled: currentPage === 1,
                    classes: ["previousPage"],
                }),
                FJSC.button({
                    text: "Next page",
                    icon: { icon: "arrow_right" },
                    onclick: nextCallback,
                    disabled: currentPage === Infinity,
                }),
            ).build();
    }

    static waveform(track: Track, loudnessData: number[], small = false) {
        if (!track.processed) {
            return create("div")
                .classes("waveform", small ? "waveform-small" : "_", "processing-box", "rounded-max", "relative", "flex", "nogap")
                .title("This track is still processing, please check back later.")
                .build();
        }
        return create("div")
            .classes("waveform", small ? "waveform-small" : "_", "relative", "flex", "nogap", "pointer")
            .id(track.id)
            .onmousedown(async (e) => {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.scrubFromElement(e);
            })
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e);
                }
            })
            .children(
                ...loudnessData.map((loudness, index) => {
                    return create("div")
                        .classes("waveform-bar", "nopointer", index % 2 === 0 ? "even" : "odd")
                        .styles("height", (loudness * 100) + "%")
                        .build();
                })
            ).build();
    }

    static repostIndicator(repost: Repost) {
        if (!repost.user) {
            throw new Error(`Repost has no user`);
        }

        return FJSC.button({
            text: "@" + repost.user.username,
            icon: {
                icon: Icons.REPOST,
                classes: ["inline-icon", "svg"],
                isUrl: true,
                adaptive: true },
            classes: ["special", "rounded-max", "align-center", "text-small"],
            onclick: () => navigate(`${RoutePath.profile}/` + repost.user!.username)
        });
    }

    static feedTrack(track: Track) {
        const icons = [];
        const isPrivate = track.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        const graphics = [];
        if (track.processed) {
            graphics.push(TrackTemplates.waveform(track, JSON.parse(track.loudness_data)));
        } else {
            graphics.push(TrackTemplates.waveform(track, []));
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (track.user?.has_avatar) {
            avatarState.value = Util.getUserAvatar(track.user_id);
        }
        const inQueue = signal(QueueManager.isInManualQueue(track.id));
        if (!track.comments || !track.likes || !track.reposts) {
            throw new Error(`Track ${track.id} has no comments, likes or reposts`);
        }

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("list-track", "flex", "padded", "rounded", "fullWidth", "card", currentTrackId.value === track.id ? "playing" : "_")
                    .styles("max-width", "100%")
                    .children(
                        TrackTemplates.feedTrackCover(track),
                        create("div")
                            .classes("flex-v", "flex-grow")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        create("div")
                                            .classes("flex-v", "flex-grow", "small-gap")
                                            .children(
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        TrackTemplates.title(track.title, track.id, icons),
                                                        track.repost ? TrackTemplates.repostIndicator(track.repost) : null,
                                                    ).build(),
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        UserTemplates.userWidget(track.user!, Util.arrayPropertyMatchesUser(track.user!.follows ?? [], "following_user_id"), [], [], UserWidgetContext.card),
                                                        create("span")
                                                            .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                            .text(Time.ago(track.created_at))
                                                            .build(),
                                                    ).build()
                                            ).build(),
                                    ).build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                                            Util.arrayPropertyMatchesUser(track.likes, "user_id")),
                                        StatisticsTemplates.likeListOpener(track.likes),
                                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "user_id")),
                                        isPrivate ? null : StatisticsTemplates.repostListOpener(track.reposts),
                                        FJSC.button({
                                            text: compute((q: boolean): string => q ? "Unqueue" : "Queue", inQueue),
                                            icon: {
                                                icon: compute((q: boolean): string => q ? "remove" : "switch_access_shortcut_add", inQueue),
                                                adaptive: true },
                                            classes: [compute((q: boolean): string => q ? "negative" : "positive", inQueue)],
                                            onclick: () => {
                                                QueueManager.toggleInManualQueue(track.id);
                                                inQueue.value = QueueManager.isInManualQueue(track.id);
                                            }
                                        }),
                                    ).build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        ...graphics,
                                        create("span")
                                            .classes("nopointer", "text-small", "align-center")
                                            .text(Time.format(track.length))
                                            .build(),
                                    ).build(),
                            ).build()
                    ).build()
            ).build();
    }

    static trackInList(listTrack: ListTrack, canEdit: boolean, list: Album|Playlist,
                       tracks: Signal<ListTrack[]>, type: "album" | "playlist", startCallback: Function | null = null) {
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

        let item = create("div")
            .classes("flex", "fadeIn", "track-in-list");

        if (canEdit) {
            item = item
                .attributes("draggable", "true")
                .ondragstart(async (e: DragEvent) => {
                    DragActions.showDragTargets();
                    e.dataTransfer!.setData("text/plain", JSON.stringify(dragData));
                    e.dataTransfer!.effectAllowed = "move";
                    e.stopPropagation();
                })
                .ondragend(async (e) => {
                    DragActions.hideDragTargets();
                    e.preventDefault();
                    e.stopPropagation();
                });
        }

        const playingClasses = currentTrackId.value === track.id ? ["playing"] : [];

        return item.children(
            create("div")
                .classes("list-track", "flex", "padded", "rounded", "fullWidth", "card", ...playingClasses)
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
                    ifjs(canEdit, GenericTemplates.verticalDragIndicator()),
                    TrackTemplates.smallListTrackCover(track, startCallback),
                    create("div")
                        .classes("flex-v", "flex-grow")
                        .children(
                            create("div")
                                .classes("flex")
                                .children(
                                    create("div")
                                        .classes("flex-v", "flex-grow", "small-gap")
                                        .children(
                                            create("div")
                                                .classes("flex", "align-children")
                                                .children(
                                                    StatisticsTemplates.likesIndicator("track", track.id, track.likes.length ?? [],
                                                        Util.arrayPropertyMatchesUser(track.likes, "user_id")),
                                                    TrackTemplates.title(track.title, track.id, icons),
                                                    create("span")
                                                        .classes("nopointer", "text-small", "align-center")
                                                        .text(Time.format(track.length))
                                                        .build(),
                                                    create("span")
                                                        .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                        .text(Time.ago(track.created_at))
                                                        .build(),
                                                    create("div")
                                                        .classes("flex-grow")
                                                        .build(),
                                                    ifjs(canEdit, TrackTemplates.trackInListActions(track, list, listTrack, tracks, type)),
                                                ).build(),
                                        ).build(),
                                ).build(),
                            create("div")
                                .classes("flex")
                                .children(
                                    ...graphics,
                                ).build(),
                        ).build()
                ).build()
        ).build();
    }

    static trackInListActions(track: Track, list: Album|Playlist,
                              listTrack: ListTrack, tracks: Signal<ListTrack[]>, type: "album" | "playlist") {
        return create("div")
            .classes("flex")
            .children(
                FJSC.button({
                    text: "Move up",
                    icon: { icon: "keyboard_arrow_up" },
                    classes: ["positive"],
                    disabled: compute(p => p[0].track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position - 1);
                    }
                }),
                FJSC.button({
                    text: "Move down",
                    icon: { icon: "keyboard_arrow_down" },
                    classes: ["positive"],
                    disabled: compute(p => p[p.length - 1].track_id === track.id, tracks),
                    onclick: async () => {
                        await TrackActions.reorderTrack(type, list.id, track.id, tracks, listTrack.position + 1);
                    }
                }),
                FJSC.button({
                    text: "Remove from " + type,
                    icon: { icon: "close" },
                    classes: ["negative"],
                    onclick: async () => {
                        await TrackActions.removeTrackFromList(tracks, list, type, listTrack);
                    }
                })
            ).build();
    }

    static tracksInList(noTracks: Signal<boolean>, tracks: Signal<ListTrack[]>, canEdit: boolean, list: Album|Playlist,
                        type: "album" | "playlist", startCallback: (trackId: number) => Promise<void>) {
        return create("div")
            .classes("flex-v")
            .children(
                ifjs(noTracks, create("div")
                    .classes("card")
                    .children(
                        create("span")
                            .text(`This ${type} has no tracks.`)
                            .build()
                    ).build()),
                signalMap(tracks, create("div").classes("flex-v"), (track, i) => {
                    return create("div")
                        .classes("flex-v", "relative")
                        .children(
                            ifjs(canEdit, GenericTemplates.dragTargetInList(async (data: any) => {
                                await TrackActions.reorderTrack(type, list.id, data.id, tracks, i);
                            }, i.toString())),
                            TrackTemplates.trackInList(track, canEdit, list, tracks, type, startCallback)
                        ).build();
                })
            ).build();
    }

    static title(title: HtmlPropertyValue, id: number, icons: any[]) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .onclick(() => navigate(`${RoutePath.track}/` + id))
                    .build(),
                ...icons,
            ).build();
    }

    static collaborator(track: Track, collaborator: TrackCollaborator): any {
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (collaborator.user?.has_avatar) {
            avatarState.value = Util.getUserAvatar(collaborator.user_id);
        }
        let actionButton = null, classes = [];
        const user = currentUser.value;
        if (user && user.id === track.user_id) {
            actionButton = GenericTemplates.action(Icons.X, "Remove", track.id, async () => {
                await TrackActions.removeCollaboratorFromTrack(track.id, collaborator.user_id);
            });
            classes.push("no-redirect");
        }
        if (!collaborator.user) {
            throw new Error(`Collaborator ${collaborator.user_id} has no user`);
        }
        if (!collaborator.collab_type) {
            throw new Error(`Collaborator ${collaborator.user_id} has no collab_type`);
        }

        return UserTemplates.linkedUser(collaborator.user_id, collaborator.user.username, collaborator.user.displayname, avatarState, collaborator.collab_type.name, actionButton, [], classes);
    }

    static async trackPage(trackData: any) {
        if (!trackData.track) {
            console.log(trackData);
            console.error("Invalid track data");
            return null;
        }
        const track = trackData.track as Track;
        if (!track.likes || !track.reposts || !track.comments) {
            throw new Error(`Track ${track.id} is missing property likes, reposts or comments`);
        }
        const liked = compute(u => !!(track.likes?.some((like: TrackLike) => like.user_id === u?.id)), currentUser);
        const reposted = compute(u => !!(track.reposts?.some(repost => repost.user_id === u?.id)), currentUser);
        const collaborators = track.collaborators ?? [];
        const toAppend = [];
        const linkedUserState = signal(collaborators);

        function collabList(collaborators: TrackCollaborator[]) {
            return create("div")
                .classes("flex")
                .children(
                    ...collaborators.map(collaborator => TrackTemplates.collaborator(track, collaborator)),
                    trackData.canEdit ? TrackEditTemplates.addLinkedUserButton(async (newUsername: string, newUser: TrackCollaborator) => {
                        const newCollab = await TrackActions.addCollaboratorToTrack(track.id, newUser.user_id, newUser.type);
                        if (!newCollab) {
                            return;
                        }
                        linkedUserState.value = [...linkedUserState.value, newCollab];
                    }, ["secondary"]) : null
                ).build();
        }

        const collaboratorChildren = signal(collabList(collaborators));
        linkedUserState.onUpdate = (newCollaborators: TrackCollaborator[]) => {
            collaboratorChildren.value = collabList(newCollaborators);
        };

        toAppend.push(TrackTemplates.collaboratorSection(collaboratorChildren, linkedUserState));
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
            editActions.push(TrackEditTemplates.openEditPageButton(track));
            editActions.push(TrackEditTemplates.deleteTrackButton(track.id));
        }

        const description = create("span")
            .id("track-description")
            .classes("description", "break-lines")
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
        const showComments = signal(false);
        const comments = signal<Comment[]>([]);
        Api.getAsync<Comment[]>(ApiRoutes.getCommentsByTrackId, {track_id: track.id}).then((c) => {
            if (!c.data || c.data.error) {
                return;
            }
            comments.value = c.data;
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
                            displayname: (track.artistname && track.artistname.trim().length > 0) ? track.artistname.trim() : trackUser.displayname
                        }, Util.arrayPropertyMatchesUser(trackUser.follows ?? [], "following_user_id"), [], [], UserWidgetContext.singlePage),
                    ).build(),
                ...toAppend,
                create("div")
                    .classes("track-title-container", "flex-v", "small-gap")
                    .children(
                        create("span")
                            .classes("collaborators")
                            .text(track.credits)
                            .build(),
                        ifjs(track.description.length > 0, description),
                        create("div")
                            .classes("flex")
                            .children(
                                create("span")
                                    .classes("date", "text-small")
                                    .text("Uploaded " + Util.formatDate(track.created_at))
                                    .build(),
                                create("span")
                                    .classes("playcount", "text-small")
                                    .text(track.plays + " plays")
                                    .build()
                            ).build()
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
                                        create("div")
                                            .classes("flex", "align-children")
                                            .children(
                                                TrackTemplates.playButton(track),
                                                TrackTemplates.addToQueueButton(track),
                                                ifjs(trackData.canEdit, TrackEditTemplates.replaceAudioButton(track)),
                                            ).build(),
                                        create("div")
                                            .classes("stats-container", "flex", "rounded")
                                            .children(
                                                StatisticsTemplates.likesIndicator("track", track.id, track.likes.length, liked),
                                                StatisticsTemplates.likeListOpener(track.likes),
                                                ifjs(isPrivate, StatisticsTemplates.repostIndicator(track.id, track.reposts.length, reposted), true),
                                                ifjs(isPrivate, StatisticsTemplates.repostListOpener(track.reposts), true),
                                                CommentTemplates.commentButton(true, comments, showComments)
                                            ).build(),
                                    ).build()
                            ).build(),
                    ).build(),
                TrackTemplates.audioActions(track, editActions),
                create("div")
                    .classes("flex")
                    .children(
                        CommentTemplates.commentListFullWidth(track.id, comments, showComments)
                    ).build(),
                TrackTemplates.inAlbumsList(track),
                await TrackTemplates.inPlaylistsList(track)
            ).build();
    }

    static collaboratorSection(collaboratorChildren: AnyNode|Signal<AnyElement>, linkedUserState: Signal<TrackCollaborator[]>) {
        const collabText = signal("");
        linkedUserState.subscribe((newCollaborators: TrackCollaborator[]) => {
            collabText.value = newCollaborators.length > 0 ? "Collaborators" : "";
        });

        return create("div")
            .classes("flex-v", "nogap")
            .children(
                create("span")
                    .classes("text-small")
                    .text(collabText)
                    .build(),
                create("div")
                    .classes("flex")
                    .id("linked_users_container")
                    .children(collaboratorChildren)
                    .build(),
            ).build();
    }

    static inAlbumsList(track: Track) {
        if (!track.albums || track.albums.length === 0) {
            return create("div")
                .classes("flex-v", "track-contained-list")
                .build();
        }

        const albumCards = track.albums.map((album: Album) => {
            return AlbumTemplates.albumCard(album, true);
        });

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                create("h2")
                    .text("In Albums")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        ...albumCards
                    ).build()
            ).build();
    }

    static async inPlaylistsList(track: Track) {
        if (!track.playlists || track.playlists.length === 0) {
            return create("div")
                .classes("flex-v", "track-contained-list")
                .build();
        }

        const playlistCards = track.playlists.map(playlist => {
            return PlaylistTemplates.playlistCard(playlist, true);
        });

        return create("div")
            .classes("flex-v", "track-contained-list")
            .children(
                create("h2")
                    .text("In Playlists")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        ...playlistCards
                    ).build()
            ).build();
    }

    static audioActions(track: Track, editActions: AnyNode[]) {
        return create("div")
            .classes("audio-actions", "flex")
            .children(
                ifjs(currentUser, FJSC.button({
                    text: "Add to playlist",
                    icon: { icon: "playlist_add" },
                    onclick: async () => {
                        await PlaylistActions.openAddToPlaylistModal(track, "track");
                    }
                })),
                ...editActions
            ).build();
    }

    private static addToQueueButton(track: Track,) {
        const inQueue = compute(q => q.includes(track.id), manualQueue);
        const text = compute((q: boolean): string => q ? "Unqueue" : "Queue", inQueue);
        const icon = compute((q: boolean): string => q ? "remove" : "switch_access_shortcut_add", inQueue);
        const queueClass = compute((q: boolean): string => q ? "negative" : "positive", inQueue);

        return FJSC.button({
            text,
            icon: {icon},
            classes: [queueClass],
            onclick: () => {
                QueueManager.toggleInManualQueue(track.id);
                inQueue.value = QueueManager.isInManualQueue(track.id);
            }
        });
    }

    static playButton(track: Track) {
        const isPlaying = PlayManager.isPlaying(track.id);

        return FJSC.button({
            text: isPlaying ? "Pause": "Play",
            icon: {
                icon: isPlaying ? Icons.PAUSE : Icons.PLAY,
                classes: ["inline-icon", "svg", "nopointer"],
                isUrl: true
            },
            classes: ["audio-player-toggle"],
            id: track.id,
            onclick: async () => {
                PlayManager.addStreamClientIfNotExists(track.id, track.length);
                await PlayManager.togglePlayAsync(track.id);
            },
        });
    }

    static toBeApprovedTrack(collabType: CollaboratorType, track: TrackCollaborator, user: User) {
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (track.user?.has_avatar) {
            avatarState.value = Util.getUserAvatar(track.user_id);
        }
        if (!track.user) {
            throw new Error("User not set on to be approved track with ID ${track.track_id}");
        }
        if (!track.track) {
            throw new Error(`Track not set on to be approved track with ID ${track.track_id}`);
        }
        if (!track.user.follows) {
            throw new Error(`User follows not set on to be approved track with ID ${track.track_id}`);
        }

        return create("div")
            .classes("flex", "card", "collab")
            .id(track.track_id)
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("text-large")
                            .text(track.track.title)
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(Time.ago(track.created_at))
                            .build(),
                        UserTemplates.userWidget(track.user, track.user.follows.some(follow => follow.following_user_id === user.id), [], [], UserWidgetContext.card),
                        create("span")
                            .text("Requested you to be " + collabType.name)
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.action(Icons.CHECK, "Approve", track.track_id, async () => {
                                    await TrackActions.approveCollab(track.track_id, track.track!.title);
                                }, [], ["secondary", "positive"]),
                                GenericTemplates.action(Icons.X, "Deny", track.track_id, async () => {
                                    await TrackActions.denyCollab(track.track_id, track.track!.title);
                                }, [], ["secondary", "negative"]),
                            ).build(),
                    ).build(),
            ).build();
    }

    static unapprovedTracks(tracks: TrackCollaborator[], user: User) {
        const trackList = tracks.map((track: TrackCollaborator) => {
            if (!track.collab_type) {
                throw new Error(`Track Collab type is not set for unapproved track with ID ${track.track_id}`);
            }
            return TrackTemplates.toBeApprovedTrack(track.collab_type, track, user);
        });
        return create("div")
            .classes("flex-v")
            .children(...trackList)
            .build();
    }

    static copyPrivateLinkButton(id: number, code: string) {
        return FJSC.button({
            text: "Copy private link",
            icon: { icon: "link" },
            classes: ["special"],
            onclick: async () => copy(window.location.origin + "/track/" + id + "/" + code)
        });
    }
}