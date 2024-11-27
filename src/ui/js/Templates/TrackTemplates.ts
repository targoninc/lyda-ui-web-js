import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {Icons} from "../Enums/Icons.js";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {AlbumTemplates} from "./AlbumTemplates.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {PlaylistTemplates} from "./PlaylistTemplates.ts";
import {DragActions} from "../Actions/DragActions.ts";
import {Images} from "../Enums/Images.ts";
import {TrackEditTemplates} from "./TrackEditTemplates.ts";
import {CustomText} from "../Classes/Helpers/CustomText.ts";
import {CommentTemplates} from "./CommentTemplates.ts";
import {TrackProcessor} from "../Classes/Helpers/TrackProcessor.ts";
import {AnyElement, AnyNode, create, HtmlPropertyValue, ifjs} from "../../fjsc/src/f2.ts";
import {navigate} from "../Routing/Router.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {User} from "../Models/DbModels/User.ts";
import {TrackCollaborator} from "../Models/DbModels/TrackCollaborator.ts";
import {TrackLike} from "../Models/DbModels/TrackLike.ts";
import {Repost} from "../Models/DbModels/Repost.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {FJSC} from "../../fjsc";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {PlaylistTrack} from "../Models/DbModels/PlaylistTrack.ts";
import {AlbumTrack} from "../Models/DbModels/AlbumTrack.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {Signal, signal} from "../../fjsc/src/signals.ts";
import {CollaboratorType} from "../Models/DbModels/CollaboratorType.ts";

export class TrackTemplates {
    static trackCard(track: Track, user: User, profileId: number) {
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
        Util.getAvatarFromUserIdAsync(track.user_id).then((src) => {
            avatarState.value = src;
        });

        return create("div")
            .classes("track-card", "noflexwrap", "small-gap", "padded", "flex-v", window.currentTrackId === track.id ? "playing" : "_")
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
                        TrackTemplates.trackCover(track, "120px"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                UserTemplates.userWidget(track.user_id, track.user.username, track.user.displayname, avatarState,
                                    Util.arrayPropertyMatchesUser(track.user.follows, "followingUserId", user)),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(track.release_date ?? track.created_at))
                                    .build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                                            Util.arrayPropertyMatchesUser(track.likes, "user_id", user)),
                                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "userId", user)),
                                        CommentTemplates.commentsIndicator(track.id, track.comments.length),
                                    ).build()
                            ).build(),
                    ).build(),
            ).build();
    }

    /**
     *
     * @param collab {TrackCollaborator}
     * @returns {*}
     */
    static collabIndicator(collab) {
        return create("div")
            .classes("pill", "padded-inline", "flex", "rounded-max", "bordered")
            .children(
                create("div")
                    .classes("align-center", "text-small", "nopointer")
                    .text(collab.collaboratorType.name)
                    .build(),
            ).build();
    }

    static noTracksUploadedYet(isOwnProfile) {
        let children;
        if (isOwnProfile === true) {
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

    static trackCover(track: Track, overwriteWidth: string | null = null, startCallback: Function|null = null) {
        const imageState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromTrackIdAsync(track.id, track.user_id).then((src) => {
            imageState.value = src;
        });

        return create("div")
            .classes("cover-container", "relative", "pointer")
            .attributes("track_id", track.id)
            .styles("width", overwriteWidth ?? "min(200px, 100%)")
            .id(track.id)
            .onclick(async () => {
                if (!startCallback) {
                    PlayManager.addStreamClientIfNotExists(track.id, track.length);
                    await PlayManager.startAsync(track.id);
                } else {
                    await startCallback(track.id);
                }
            })
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .styles("min-width", overwriteWidth ?? "100px")
                    .src(imageState)
                    .alt(track.title)
                    .build(),
                create("img")
                    .classes("play-button-icon", "centeredInParent", "showOnParentHover", "inline-icon", "svgInverted", "nopointer")
                    .src(Icons.PLAY)
                    .build(),
            )
            .build();
    }

    static feedTrackCover(track: Track) {
        return TrackTemplates.trackCover(track, "var(--inline-track-height)");
    }

    static smallListTrackCover(track: Track, startCallback: Function|null = null) {
        return TrackTemplates.trackCover(track, "var(--small-track-height)", startCallback);
    }

    static trackCardsContainer(children: AnyNode[]) {
        return create("div")
            .classes("profileContent", "tracks", "flex")
            .children(...children)
            .build();
    }

    static async trackList(tracksState: Signal<Track[]>, pageState, type, filterState, loadingState, user) {
        const trackList = tracksState.value.map(track => TrackTemplates.feedTrack(track, user));
        const trackListContainer = signal(TrackTemplates.#trackList(trackList));
        tracksState.onUpdate = async (newTracks) => {
            const trackList = newTracks.map(track => TrackTemplates.feedTrack(track, user));
            trackListContainer.value = TrackTemplates.#trackList(trackList);
        };

        return create("div")
            .classes("flex-v")
            .children(
                type === "following" ? TrackTemplates.feedFilters(filterState, loadingState) : null,
                TrackTemplates.paginationControls(pageState),
                trackListContainer,
                TrackTemplates.paginationControls(pageState)
            )
            .build();
    }

    static feedFilters(filterState, loadingState) {
        const filterMap = {
            all: "All",
            originals: "Originals",
            reposts: "Reposts",
        };
        const options = Object.keys(filterMap).map(k => {
            return {
                text: filterMap[k],
                value: k,
                onclick: () => {
                    filterState.value = k;
                }
            };
        });

        return GenericTemplates.pills(options, filterState, [], loadingState);
    }

    static #trackList(trackList) {
        return create("div")
            .classes("flex-v", "track-list")
            .children(...trackList)
            .build();
    }

    static paginationControls(pageState) {
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

    static #paginationControls(currentPage, previousCallback, nextCallback) {
        return create("div")
            .classes("flex")
            .children(
                GenericTemplates.action(Icons.ARROW_LEFT, "Previous page", "previousPage", previousCallback, [], [currentPage === 1 ? "nonclickable" : "_"]),
                GenericTemplates.action(Icons.ARROW_RIGHT, "Next page", "nextPage", nextCallback),
            ).build();
    }

    static waveform(track_id, processed, track_length, loudnessData, small = false) {
        if (!processed) {
            return create("div")
                .classes("waveform", small ? "waveform-small" : "_", "processing-box", "rounded-max", "relative", "flex", "nogap")
                .title("This track is still processing, please check back later.")
                .build();
        }
        return create("div")
            .classes("waveform", small ? "waveform-small" : "_", "relative", "flex", "nogap", "pointer")
            .id(track_id)
            .attributes("duration", track_length)
            .onmousedown(async (e) => {
                PlayManager.addStreamClientIfNotExists(e.target.id, e.target.getAttribute("duration"));
                await PlayManager.scrubFromElement(e);
            })
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e);
                }
            })
            .children(
                ...loudnessData.map((loudness) => {
                    return create("div")
                        .classes("waveform-bar", "nopointer")
                        .styles("height", (loudness * 100) + "%")
                        .build();
                })
            ).build();
    }

    static repostIndicator(repost: Repost) {
        if (!repost.user) {
            throw new Error(`Repost has no user`);
        }

        return create("div")
            .classes("pill", "padded-inline", "flex", "rounded-max", "repost-indicator", "clickable", "fakeButton")
            .onclick(() => {
                navigate("profile/" + repost.user!.username);
            })
            .children(
                create("div")
                    .classes("align-center", "text-small", "nopointer")
                    .text("@" + repost.user.username)
                    .build(),
                create("img")
                    .classes("inline-icon", "svg", "align-center", "nopointer")
                    .src(Icons.REPOST)
                    .build(),
            ).build();
    }

    static feedTrack(track, user) {
        const icons = [];
        const isPrivate = track.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        const graphics = [];
        if (track.processed) {
            graphics.push(TrackTemplates.waveform(track.id, track.processed, track.length, JSON.parse(track.loudnessData)));
        } else {
            graphics.push(TrackTemplates.waveform(track.id, track.processed, track.length, []));
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(track.user_id).then((src) => {
            avatarState.value = src;
        });
        const inQueue = signal(QueueManager.isInManualQueue(track.id));
        const queueSubState = inQueue.boolValues({
            text: {onTrue: "Unqueue", onFalse: "Queue"},
            icon: {onTrue: Icons.UNQUEUE, onFalse: Icons.QUEUE},
        });

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("list-track", "flex", "padded", "rounded", "fullWidth", "card", window.currentTrackId === track.id ? "playing" : "_")
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
                                                        UserTemplates.userWidget(track.user_id, track.user.username, track.user.displayname, avatarState,
                                                            Util.arrayPropertyMatchesUser(track.user.follows, "followingUserId", user),
                                                            [], ["align-center", "widget-secondary"]),
                                                        create("span")
                                                            .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                            .text(Time.ago(track.createdAt))
                                                            .build(),
                                                    ).build()
                                            ).build(),
                                    ).build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                                            Util.arrayPropertyMatchesUser(track.likes, "userId", user)),
                                        StatisticsTemplates.likeListOpener(track.likes, user),
                                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "userId", user)),
                                        isPrivate ? null : StatisticsTemplates.repostListOpener(track.reposts, user),
                                        CommentTemplates.commentsIndicator(track.id, track.comments.length),
                                        CommentTemplates.commentListOpener(track.id, track.comments, user),
                                        GenericTemplates.action(queueSubState.icon, queueSubState.text, track.id, () => {
                                            QueueManager.toggleInManualQueue(track.id);
                                            inQueue.value = QueueManager.isInManualQueue(track.id);
                                        }, [], ["secondary"]),
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

    static listTrackInAlbumOrPlaylist(playlistTrack: PlaylistTrack|AlbumTrack, user: User, canEdit: boolean, list: Album|Playlist, positionsState: Signal<any>, type: string, startCallback: Function | null = null) {
        const icons = [];
        const track = playlistTrack.track;
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
            graphics.push(TrackTemplates.waveform(track.id, track.processed, track.length, JSON.parse(track.loudness_data), true));
        } else {
            graphics.push(TrackTemplates.waveform(track.id, track.processed, track.length, [], true));
        }

        const trackActions = [];
        const positions = positionsState.value;
        const upState = signal((positions[0] !== track.id && canEdit) ? "_" : "nonclickable");
        const downState = signal((canEdit && positions[positions.length - 1] !== track.id) ? "_" : "nonclickable");
        positionsState.onUpdate = (newMap) => {
            upState.value = (newMap[0] !== track.id && canEdit) ? "_" : "nonclickable";
            downState.value = (canEdit && newMap[newMap.length - 1] !== track.id) ? "_" : "nonclickable";
        };
        if (canEdit) {
            trackActions.push(GenericTemplates.action(Icons.ARROW_UP, "Move up", list.id, async () => {
                await TrackActions.moveTrackUpInList(positionsState, playlistTrack, type, list);
            }, [], [upState]));
            trackActions.push(GenericTemplates.action(Icons.ARROW_DOWN, "Move down", list.id, async () => {
                await TrackActions.moveTrackDownInList(positionsState, playlistTrack, type, list);
            }, [], [downState]));

            trackActions.push(GenericTemplates.action(Icons.X, "Remove from " + type, list.id, async () => {
                await TrackActions.removeTrackFromList(positionsState, playlistTrack, type, list);
            }));
        }

        const dragData = {
            type: "track",
            id: track.id,
        };

        let item = create("div")
            .classes("flex", "fadeIn", "track-in-list")
            .attributes("track_id", track.id);

        if (canEdit) {
            item = item
                .attributes("draggable", "true")
                .ondragstart(async (e) => {
                    DragActions.showDragTargets();
                    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = "move";
                    e.stopPropagation();
                })
                .ondragend(async (e) => {
                    DragActions.hideDragTargets();
                    e.preventDefault();
                    e.stopPropagation();
                });
        }

        const playingClasses = window.currentTrackId === track.id ? ["playing"] : [];

        return item.children(
            create("div")
                .classes("list-track", "flex", "padded", "rounded", "fullWidth", "card", ...playingClasses)
                .attributes("track_id", track.id)
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
                                                .classes("flex")
                                                .children(
                                                    TrackTemplates.title(track.title, track.id, icons),
                                                    create("span")
                                                        .classes("nopointer", "text-small", "align-center")
                                                        .text(Time.format(track.length))
                                                        .build(),
                                                    create("span")
                                                        .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                        .text(Time.ago(track.created_at))
                                                        .build(),
                                                    StatisticsTemplates.likesIndicator("track", track.id, track.likes.length ?? [],
                                                        Util.arrayPropertyMatchesUser(track.likes, "user_id", user)),
                                                    create("div")
                                                        .classes("flex-grow")
                                                        .build(),
                                                    ...trackActions
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

    static title(title: HtmlPropertyValue, id: number, icons: any[]) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .onclick(() => {
                        navigate("track/" + id);
                    }).build(),
                ...icons,
            ).build();
    }

    static collaborator(track: Track, user: User, collaborator: TrackCollaborator): any {
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(collaborator.user_id).then((src) => {
            avatarState.value = src;
        });
        let actionButton = null, classes = [];
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

    static async trackPage(trackData: any, user: User) {
        if (!trackData.track) {
            console.log(trackData);
            console.error("Invalid track data");
            return;
        }
        const track = trackData.track as Track;
        const trackState = signal(TrackProcessor.forDownload(track));
        if (!track.likes || !track.reposts || !track.comments) {
            throw new Error(`Track ${track.id} is missing property likes, reposts or comments`);
        }
        const liked = user ? track.likes.some((like: TrackLike) => like.user_id === user.id) : false;
        const reposted = user ? track.reposts.some(repost => repost.user_id === user.id) : false;
        const collaborators = track.collaborators ?? [];
        const toAppend = [];
        const linkedUserState = signal(collaborators);

        function collabList(collaborators: TrackCollaborator[]) {
            return create("div")
                .classes("flex")
                .children(
                    ...collaborators.map(collaborator => TrackTemplates.collaborator(track, user, collaborator)),
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

        const trackUser: User = track.user;
        if (!trackUser) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const editActions = [];
        if (trackData.canEdit) {
            editActions.push(TrackEditTemplates.addToAlbumsButton(track));
            editActions.push(TrackTemplates.copyPrivateLinkButton(track.id, track.secretcode));
            editActions.push(TrackEditTemplates.openEditPageButton(track));
            editActions.push(TrackEditTemplates.upDownButtons(trackState));
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
        const coverLoading = signal(false);

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
                                    .classes("text-xlarge")
                                    .text(track.title)
                                    .attributes("track_id", track.id)
                                    .build(),
                                ...icons,
                            ).build(),
                        UserTemplates.userWidget(trackUser.id, trackUser.username, trackUser.displayname, await Util.getAvatarFromUserIdAsync(trackUser.id),
                            Util.arrayPropertyMatchesUser(trackUser.follows, "followingUserId", user),
                            [], ["widget-secondary"]),
                    ).build(),
                ...toAppend,
                create("div")
                    .classes("track-title-container", "flex-v", "small-gap")
                    .children(
                        create("span")
                            .classes("collaborators")
                            .text(track.credits)
                            .build(),
                        description,
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
                        create("div")
                            .classes("cover-container", "relative", trackData.canEdit ? "pointer" : "_")
                            .attributes("track_id", track.id, "canEdit", trackData.canEdit)
                            .onclick(e => TrackActions.replaceCover(e, coverLoading))
                            .children(
                                ifjs(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(await Util.getCoverFileFromTrackIdAsync(track.id, trackUser.id))
                                    .alt(track.title)
                                    .build()
                            ).build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                TrackTemplates.waveform(track.id, track.processed, track.length, track.processed ? JSON.parse(track.loudness_data) : []),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        TrackTemplates.playButton(track),
                                        create("div")
                                            .classes("stats-container", "flex", "rounded")
                                            .children(
                                                StatisticsTemplates.likesIndicator("track", track.id, track.likes.length, liked),
                                                StatisticsTemplates.likeListOpener(track.likes, user),
                                                isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, reposted),
                                                isPrivate ? null : StatisticsTemplates.repostListOpener(track.reposts, user),
                                                CommentTemplates.commentsIndicator(track.id, track.comments.length),
                                                CommentTemplates.commentListSingleOpener()
                                            ).build(),
                                    ).build()
                            ).build(),
                    ).build(),
                TrackTemplates.audioActions(track, user, editActions),
                create("div")
                    .classes("flex")
                    .children(
                        CommentTemplates.commentListFullWidth(track.id, track.comments, user)
                    ).build(),
                TrackTemplates.inAlbumsList(track, user),
                await TrackTemplates.inPlaylistsList(track, user)
            ).build();
    }

    static collaboratorSection(collaboratorChildren, linkedUserState: Signal<TrackCollaborator[]>) {
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

    static inAlbumsList(track: Track, user: User) {
        if (!track.albums || track.albums.length === 0) {
            return create("div")
                .classes("flex-v", "track-contained-list")
                .build();
        }

        const albumCards = track.albums.map((album: Album) => {
            return AlbumTemplates.albumCard(album, user, true);
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

    static async inPlaylistsList(track: Track, user: User) {
        if (!track.playlists || track.playlists.length === 0) {
            return create("div")
                .classes("flex-v", "track-contained-list")
                .build();
        }

        const playlistCards = track.playlists.map(playlist => {
            return PlaylistTemplates.playlistCard(playlist, user, true);
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

    static audioActions(track: Track, user: User, editActions: AnyNode[]) {
        const inQueue = signal(QueueManager.isInManualQueue(track.id));
        const queueSubState = inQueue.boolValues({
            text: {onTrue: "Unqueue", onFalse: "Queue"},
            icon: {onTrue: "remove", onFalse: "switch_access_shortcut_add"},
        });

        let actions: AnyElement[] = [];
        if (user) {
            actions = [
                FJSC.button({
                    text: queueSubState.text,
                    icon: { icon: queueSubState.icon },
                    onclick: () => {
                        QueueManager.toggleInManualQueue(track.id);
                        inQueue.value = QueueManager.isInManualQueue(track.id);
                    }
                }),
                FJSC.button({
                    text: "Add to playlist",
                    icon: { icon: "playlist_add" },
                    onclick: async () => {
                        await PlaylistActions.openAddToPlaylistModal(track, "track");
                    }
                })
            ];
        }

        return create("div")
            .classes("audio-actions", "flex")
            .children(
                ...actions,
                ...editActions
            ).build();
    }

    static playButton(track: Track) {
        const isPlaying = PlayManager.isPlaying(track.id);
        PlayManager.addStreamClientIfNotExists(track.id, track.length);

        return FJSC.button({
            text: isPlaying ? "Pause": "Play",
            icon: {
                icon: isPlaying ? Icons.PAUSE : Icons.PLAY,
                classes: ["inline-icon", "svg", "nopointer", isPlaying ? "pause-adjust" : "play-adjust"],
                isUrl: true
            },
            classes: ["audio-player-toggle"],
            id: track.id,
            onclick: () => PlayManager.togglePlayAsync(track.id),
        });
    }

    static toBeApprovedTrack(collabType: CollaboratorType, track: TrackCollaborator, user: User) {
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(track.user_id).then((src) => {
            avatarState.value = src;
        });
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
                        UserTemplates.userWidget(track.user_id, track.user.username, track.user.displayname, avatarState, track.user.follows.some(follow => follow.following_user_id === user.id)),
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
            onclick: async () => {
                await Util.copyToClipboard(window.location.origin + "/track/" + id + "/" + code);
            }
        });
    }
}