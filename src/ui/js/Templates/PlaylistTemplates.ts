import {computedSignal, create, signal} from "https://fjs.targoninc.com/f.js";
import {Icons} from "../Enums/Icons.js";
import {GenericTemplates} from "./GenericTemplates.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {Form} from "../Classes/Helpers/Form.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";

export class PlaylistTemplates {
    static async addTrackToPlaylistModal(track, playlists) {
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async playlist => {
                return await PlaylistTemplates.playlistInAddList(playlist, playlist.playlisttracks?.find(t => t.id === track.id) !== undefined);
            }));
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        create("img")
                            .styles("width", "30px", "height", "auto")
                            .classes("inline-icon", "svg", "nopointer")
                            .attributes("src", Icons.PLAYLIST_ADD)
                            .build(),
                        create("h5")
                            .text(`Add ${track.title} to playlist`)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ...playlistList,
                    )
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.button("Ok", async () => {
                            await PlaylistActions.addTrackToPlaylists(track.id);
                        }, ["positive"]),
                        GenericTemplates.button("Cancel", Util.removeModal, ["negative"])
                    )
                    .build()
            )
            .build();
    }

    static async addAlbumToPlaylistModal(album, playlists) {
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async playlist => {
                return await PlaylistTemplates.playlistInAddList(playlist, playlist.playlisttracks.find(t => t.id === album.id) !== undefined);
            }));
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        create("img")
                            .styles("width", "30px", "height", "auto")
                            .classes("inline-icon", "svg", "nopointer")
                            .attributes("src", Icons.PLAYLIST_ADD)
                            .build(),
                        create("h5")
                            .text(`Add ${album.name} to playlist`)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ...playlistList,
                    )
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.button("Ok", async () => {
                            await PlaylistActions.addAlbumToPlaylists(album.id);
                        }, ["positive"]),
                        GenericTemplates.button("Cancel", Util.removeModal, ["negative"])
                    )
                    .build()
            )
            .build();
    }

    static async playlistInAddList(playlist, isChecked) {
        return create("div")
            .classes("flex", "rounded", "padded", "card")
            .onclick(() => {
                let checkbox = document.getElementById("playlist_" + playlist.id);
                checkbox.checked = !checkbox.checked;
            })
            .children(
                GenericTemplates.checkbox("playlist_" + playlist.id, isChecked, "", false),
                await PlaylistTemplates.smallPlaylistCover(playlist),
                create("span")
                    .classes("nopointer")
                    .text(playlist.name)
                    .build(),
            )
            .build();
    }

    static newPlaylistModal() {
        const state = signal({
            name: "",
            description: "",
            visibility: "public",
        });
        const name = computedSignal(state, s => s.name);
        const description = computedSignal(state, s => s.description);

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .children(
                        GenericTemplates.icon("playlist_add", true),
                        create("span")
                            .text("New playlist")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .id("newPlaylistForm")
                    .children(
                        FormTemplates.textField("Name", "name", "Playlist name", "text", name, true, v => {
                            state.value = { ...state.value, name: v };
                        }),
                        FormTemplates.textAreaField("Description", "description", "Description", description, false, 5, v => {
                            state.value = { ...state.value, description: v };
                        }),
                        FormTemplates.visibility("public", state),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Create playlist",
                            onclick: async () => {
                                await PlaylistActions.createNewPlaylist(state.value);
                                Util.removeModal();
                            },
                            icon: {
                                icon: "playlist_add"
                            },
                            classes: ["positive"],
                        }),
                        FJSC.button({
                            text: "Cancel",
                            onclick: Util.removeModal,
                            classes: ["negative"],
                            icon: { icon: "close" }
                        }),
                    ).build()
            ).build();
    }

    static noPlaylistsYet(isOwnProfile) {
        let children;
        if (isOwnProfile === true) {
            children = [
                create("p")
                    .text("You have not created any playlists yet.")
                    .build(),
                create("div")
                    .classes("button-container")
                    .children(GenericTemplates.newPlaylistButton(["secondary"]))
                    .build(),
            ];
        } else {
            children = [
                create("p")
                    .text("This user has not created any playlists yet.")
                    .build()
            ];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    static playlistCard(playlist, user, isSecondary) {
        const icons = [];
        if (playlist.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }
        const coverState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.userId).then(cover => {
            coverState.value = cover;
        });

        return create("div")
            .classes("playlist-card", "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        PlaylistTemplates.playlistCover(playlist, "120px"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                PlaylistTemplates.title(playlist.name, playlist.id, icons),
                                UserTemplates.userWidget(playlist.userId, playlist.user.username, playlist.user.displayname, coverState,
                                    Util.arrayPropertyMatchesUser(playlist.user.follows, "followingUserId", user)),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(playlist.createdAt))
                                    .build(),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("stats-container", "flex", "rounded")
                    .children(
                        StatisticsTemplates.likesIndicator("playlist", playlist.id, playlist.playlistlikes.length,
                            Util.arrayPropertyMatchesUser(playlist.playlistlikes, "userId", user)),
                        StatisticsTemplates.likeListOpener(playlist.id, playlist.playlistlikes, user),
                    ).build()
            ).build();
    }

    static title(title, id, icons) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .attributes("playlist_id", id)
                    .onclick(PlaylistActions.openPlaylistFromElement)
                    .build(),
                ...icons,
            ).build();
    }

    static playlistCover(playlist, overwriteWidth = null) {
        const coverState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.userId).then(cover => {
            coverState.value = cover;
        });

        return create("div")
            .classes("cover-container", "relative", "pointer")
            .attributes("playlist_id", playlist.id)
            .styles("width", overwriteWidth ?? "min(200px, 100%)")
            .id(playlist.id)
            .onclick(async () => {
                Ui.notify("Starting playlist " + playlist.id, "info");
                PlayManager.playFrom("playlist", playlist.name, playlist.id);
                QueueManager.setContextQueue(playlist.playlisttracks.map(t => t.id));
                const firstTrack = playlist.playlisttracks[0];
                if (!firstTrack) {
                    Ui.notify("This playlist has no tracks", "error");
                    return;
                }
                PlayManager.addStreamClientIfNotExists(firstTrack.id, firstTrack.length);
                await PlayManager.startAsync(firstTrack.id);
            })
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .src(coverState)
                    .alt(playlist.name)
                    .build(),
                create("img")
                    .classes("play-button-icon", "centeredInParent", "showOnParentHover", "inline-icon", "svgInverted", "nopointer")
                    .src(Icons.PLAY)
                    .build(),
            )
            .build();
    }

    static async smallPlaylistCover(playlist) {
        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(await Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.userId))
            .alt(playlist.name)
            .build();
    }

    static playlistCardsContainer(children) {
        return create("div")
            .classes("profileContent", "playlists", "flex")
            .children(...children)
            .build();
    }

    static async playlistPage(data, user) {
        const playlist = data.playlist;
        const tracks = playlist.playlisttracks;
        const a_user = playlist.user;
        const trackChildren = [];
        const positionMap = tracks.map(t => t.id);
        const positionsState = signal(positionMap);

        async function startCallback(trackId) {
            await PlaylistActions.startTrackInPlaylist(playlist, trackId);
        }

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            trackChildren.push(GenericTemplates.dragTargetInList((data) => {
                TrackActions.reorderTrack("playlist", playlist.id, data.id, positionsState, i);
            }, i.toString()));
            trackChildren.push(TrackTemplates.listTrackInAlbumOrPlaylist(track, user, data.canEdit, playlist, positionsState, "playlist", startCallback));
        }
        if (tracks.length === 0) {
            trackChildren.push(
                create("div")
                    .classes("card")
                    .children(
                        create("span")
                            .text("This playlist has no tracks.")
                            .build()
                    ).build()
            );
        }
        const editActions = [];
        if (data.canEdit) {
            editActions.push(
                GenericTemplates.action(Icons.DELETE, "Delete", playlist.id, async (e) => {
                    await Ui.getConfirmationModal("Delete playlist", "Are you sure you want to delete this playlist?", "Yes", "No", PlaylistActions.deletePlaylistFromElement.bind(null, e), () => {
                    }, Icons.WARNING);
                }, [], ["secondary", "negative"])
            );
        }

        return create("div")
            .classes("single-page", "noflexwrap", "padded-large", "rounded-large", "flex-v")
            .children(
                create("div")
                    .classes("flex-v", "nogap")
                    .children(
                        create("span")
                            .classes("title", "wordwrap")
                            .text(playlist.name)
                            .build(),
                        UserTemplates.userWidget(a_user.id, a_user.username, a_user.displayname, await Util.getAvatarFromUserIdAsync(a_user.id),
                            Util.arrayPropertyMatchesUser(a_user.follows, "followingUserId", user),
                            [], ["widget-secondary"])
                    )
                    .build(),
                create("div")
                    .classes("playlist-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", data.canEdit ? "pointer" : "_")
                            .attributes("playlist_id", playlist.id, "canEdit", data.canEdit)
                            .onclick(PlaylistActions.replaceCover)
                            .children(
                                create("div")
                                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                                    .id("cover-loader")
                                    .build(),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(await Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.userId))
                                    .alt(playlist.name)
                                    .build()
                            )
                            .build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                PlaylistTemplates.audioActions(playlist, user, editActions),
                                create("div")
                                    .classes("playlist-title-container", "flex-v", "small-gap")
                                    .children(
                                        create("span")
                                            .classes("date", "text-small")
                                            .text("Created " + Util.formatDate(playlist.createdAt))
                                            .build()
                                    )
                                    .build(),
                                create("div")
                                    .classes("stats-container", "flex", "rounded")
                                    .children(
                                        StatisticsTemplates.likesIndicator("playlist", playlist.id, playlist.playlistlikes.length,
                                            Util.arrayPropertyMatchesUser(playlist.playlistlikes, "userId", user)),
                                        StatisticsTemplates.likeListOpener(playlist.id, playlist.playlistlikes, user),
                                    ).build(),
                            )
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ...trackChildren
                    ).build()
            )
            .build();
    }

    static audioActions(playlist, user, editActions = []) {
        const inQueue = QueueManager.isInManualQueue(playlist.id);
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === playlist.id;
        const manualQueue = QueueManager.getManualQueue();
        const allTracksInQueue = playlist.playlisttracks.every((t) =>
            manualQueue.includes(t.trackId),
        );
        PlayManager.addStreamClientIfNotExists(playlist.id, playlist.duration);

        let actions = [];
        if (user) {
            actions = [
                GenericTemplates.action(isPlaying ? Icons.PAUSE : Icons.PLAY, isPlaying ? "Pause" : "Play", playlist.id, async () => {
                    const firstTrack = playlist.playlisttracks[0];
                    await PlaylistActions.startTrackInPlaylist(playlist, firstTrack.id, true);
                }, ["duration", playlist.duration], [playlist.playlisttracks.length === 0 ? "nonclickable" : "_", "secondary"]),
                GenericTemplates.action(allTracksInQueue ? Icons.UNQUEUE : Icons.QUEUE, allTracksInQueue ? "Unqueue" : "Queue", playlist.id, () => {
                    for (let track of playlist.albumtracks) {
                        if (!manualQueue.includes(track.trackId)) {
                            QueueManager.addToManualQueue(track.trackId);
                        }
                    }
                }, [], [inQueue ? "audio-queueremove" : "audio-queueadd", "secondary"])
            ];
        }

        return create("div")
            .classes("audio-actions", "flex")
            .children(
                ...actions,
                ...editActions
            )
            .build();
    }
}