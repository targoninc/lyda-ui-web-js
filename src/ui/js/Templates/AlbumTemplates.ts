import {Icons} from "../Enums/Icons.js";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {computedSignal, create, signal} from "../../fjsc/f2.ts";
import {Album} from "../DbModels/Album.ts";

export class AlbumTemplates {
    static async addToAlbumModal(track, albums) {
        let albumList = [];
        if (albums.length === 0) {
            albumList.push(create("span")
                .classes("nopointer")
                .text("No albums found")
                .build());
        } else {
            albumList = await Promise.all(albums.map(async album => {
                return await AlbumTemplates.albumInAddList(album, album.albumtracks.find(t => t.id === track.id) !== undefined);
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
                            .attributes("src", Icons.ALBUM_ADD)
                            .build(),
                        create("h5")
                            .text(`Add ${track.title} to album`)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ...albumList,
                    )
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.button("Ok", async () => {
                            await AlbumActions.addTrackToAlbums(track.id);
                        }, ["positive"]),
                        GenericTemplates.button("Cancel", Util.removeModal, ["negative"])
                    )
                    .build()
            )
            .build();
    }
	
    static async albumInAddList(album, isChecked) {
        return create("div")
            .classes("flex", "rounded", "padded", "card")
            .onclick(() => {
                let checkbox = document.getElementById("album_" + album.id);
                checkbox.checked = !checkbox.checked;
            })
            .children(
                GenericTemplates.checkbox("album_" + album.id, isChecked, "", false),
                await AlbumTemplates.smallAlbumCover(album),
                create("span")
                    .classes("nopointer")
                    .text(album.name)
                    .build(),
            )
            .build();
    }

    static newAlbumModal() {
        const album = signal(<Album>{
            name: "",
            upc: "",
            description: "",
            release_date: new Date(),
            visibility: "private",
        });
        const name = computedSignal<string>(album, (s: Album) => s.name);
        const upc = computedSignal<string>(album, (s: Album) => s.upc);
        const description = computedSignal<string>(album, (s: Album) => s.description);
        const releaseDate = computedSignal<string>(album, (s: Album) => s.release_date);

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        create("img")
                            .styles("width", "30px", "height", "auto")
                            .classes("inline-icon", "svg", "nopointer")
                            .attributes("src", Icons.ALBUM_ADD)
                            .build(),
                        create("h2")
                            .text("New album")
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex-v")
                    .id("newAlbumForm")
                    .children(
                        FormTemplates.textField("Name", "name", "Album name", "text", name, true, v => {
                            album.value = { ...album.value, name: v };
                        }),
                        FormTemplates.textField("UPC", "upc", "UPC", "text", upc, false, v => {
                            album.value = { ...album.value, upc: v };
                        }),
                        FormTemplates.textAreaField("Description", "description", "Description", description, false, 5, v => {
                            album.value = { ...album.value, description: v };
                        }),
                        FormTemplates.textField("Release Date", "release_date", "YYYY-MM-DD", "date", releaseDate, false, v => {
                            album.value = { ...album.value, release_date: v };
                        }),
                        FormTemplates.visibility("public", album, v => {
                            album.value = { ...album.value, visibility: v ? "private" : "public" };
                        }),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Create album",
                            onclick: async () => {
                                await AlbumActions.createNewAlbum(album.value);
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

    static noAlbumsYet(isOwnProfile) {
        let children;
        if (isOwnProfile === true) {
            children = [
                create("p")
                    .text("You have not created any albums yet.")
                    .build(),
                create("div")
                    .classes("button-container")
                    .children(GenericTemplates.newAlbumButton(["secondary"]))
                    .build(),
            ];
        } else {
            children = [
                create("p")
                    .text("This user has not created any albums yet.")
                    .build()
            ];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    /**
     *
     * @param album {Album}
     * @param user {User}
     * @param isSecondary
     */
    static albumCard(album, user, isSecondary = false) {
        const icons = [];
        if (album.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(album.userId).then((src) => {
            avatarState.value = src;
        });

        return create("div")
            .classes("album-card", "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        AlbumTemplates.albumCover(album, "120px"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                AlbumTemplates.title(album.name, album.id, icons),
                                UserTemplates.userWidget(album.userId, album.user.username, album.user.displayname, avatarState,
                                    Util.arrayPropertyMatchesUser(album.user.follows, "followingUserId", user)),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(album.releaseDate))
                                    .build(),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("stats-container", "flex", "rounded")
                    .children(
                        StatisticsTemplates.likesIndicator("album", album.id, album.albumlikes.length,
                            Util.arrayPropertyMatchesUser(album.albumlikes, "userId", user)),
                        StatisticsTemplates.likeListOpener(album.id, album.albumlikes, user),
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
                    .attributes("album_id", id)
                    .onclick(AlbumActions.openAlbumFromElement)
                    .build(),
                ...icons,
            ).build();
    }

    /**
     *
     * @param album {Album}
     * @param overwriteWidth
     * @returns {Promise<*>}
     */
    static albumCover(album, overwriteWidth = null) {
        const srcState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromAlbumIdAsync(album.id, album.userId).then((src) => {
            srcState.value = src;
        });

        return create("div")
            .classes("cover-container", "relative", "pointer")
            .attributes("album_id", album.id)
            .styles("width", overwriteWidth ?? "min(200px, 100%)")
            .id(album.id)
            .onclick(async () => {
                PlayManager.playFrom("album", album.name, album.id);
                QueueManager.setContextQueue(album.albumtracks.map(t => t.id));
                const firstTrack = album.albumtracks[0];
                if (!firstTrack) {
                    Ui.notify("This album has no tracks", "error");
                    return;
                }
                PlayManager.addStreamClientIfNotExists(firstTrack.id, firstTrack.length);
                await PlayManager.startAsync(firstTrack.id);
            })
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .src(srcState)
                    .alt(album.name)
                    .build(),
                create("img")
                    .classes("play-button-icon", "centeredInParent", "showOnParentHover", "inline-icon", "svgInverted", "nopointer")
                    .src(Icons.PLAY)
                    .build(),
            )
            .build();
    }

    static async smallAlbumCover(album) {
        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(await Util.getCoverFileFromAlbumIdAsync(album.id, album.userId))
            .alt(album.name)
            .build();
    }

    static albumCardsContainer(children) {
        return create("div")
            .classes("profileContent", "albums", "flex")
            .children(...children)
            .build();
    }

    static async albumPage(data, user) {
        const album = data.album;
        const tracks = album.albumtracks;
        const a_user = album.user;
        const trackChildren = [];
        const positionMap = tracks.map(t => t.id);
        const positionsState = signal(positionMap);

        async function startCallback(trackId) {
            await AlbumActions.startTrackInAlbum(album, trackId);
        }

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (data.canEdit) {
                trackChildren.push(GenericTemplates.dragTargetInList((data) => {
                    TrackActions.reorderTrack("album", album.id, data.id, positionsState, i);
                }, i.toString()));
            }
            trackChildren.push(TrackTemplates.listTrackInAlbumOrPlaylist(track, user, data.canEdit, album, positionsState, "album", startCallback));
        }
        if (tracks.length === 0) {
            trackChildren.push(
                create("div")
                    .classes("card")
                    .children(
                        create("span")
                            .text("This album has no tracks.")
                            .build()
                    ).build()
            );
        }
        const editActions = [];
        if (data.canEdit) {
            editActions.push(
                GenericTemplates.action(Icons.DELETE, "Delete", album.id, async (e) => {
                    await Ui.getConfirmationModal("Delete album", "Are you sure you want to delete this album?", "Yes", "No", AlbumActions.deleteAlbumFromElement.bind(null, e), () => {
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
                            .text(album.name)
                            .build(),
                        UserTemplates.userWidget(a_user.id, a_user.username, a_user.displayname, await Util.getAvatarFromUserIdAsync(a_user.id),
                            Util.arrayPropertyMatchesUser(a_user.follows, "followingUserId", user),
                            [], ["widget-secondary"])
                    )
                    .build(),
                create("div")
                    .classes("album-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", data.canEdit ? "pointer" : "_")
                            .attributes("album_id", album.id, "canEdit", data.canEdit)
                            .onclick(AlbumActions.replaceCover)
                            .children(
                                create("div")
                                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                                    .id("cover-loader")
                                    .build(),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(await Util.getCoverFileFromAlbumIdAsync(album.id, album.userId))
                                    .alt(album.name)
                                    .build()
                            )
                            .build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                AlbumTemplates.audioActions(album, user, editActions),
                                create("div")
                                    .classes("album-title-container", "flex-v", "small-gap")
                                    .children(
                                        create("span")
                                            .classes("date", "text-small")
                                            .text("Released " + Util.formatDate(album.releaseDate))
                                            .build()
                                    )
                                    .build(),
                                create("div")
                                    .classes("stats-container", "flex", "rounded")
                                    .children(
                                        StatisticsTemplates.likesIndicator("album", album.id, album.albumlikes.length,
                                            Util.arrayPropertyMatchesUser(album.albumlikes, "userId", user)),
                                        StatisticsTemplates.likeListOpener(album.id, album.albumlikes, user),
                                    )
                                    .build(),
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

    static audioActions(album, user, editActions = []) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === album.id;
        const manualQueue = QueueManager.getManualQueue();
        const allTracksInQueue = album.albumtracks.every((t) =>
            manualQueue.includes(t.trackId),
        );

        let actions = [];
        if (user) {
            actions = [
                GenericTemplates.action(isPlaying ? Icons.PAUSE : Icons.PLAY, isPlaying ? "Pause" : "Play", album.id, async () => {
                    const firstTrack = album.albumtracks[0];
                    await AlbumActions.startTrackInAlbum(album, firstTrack.id, true);
                }, ["duration", album.duration], [album.albumtracks.length === 0 ? "nonclickable" : "_", "secondary"]),
                GenericTemplates.action(allTracksInQueue ? Icons.UNQUEUE : Icons.QUEUE, allTracksInQueue ? "Unqueue" : "Queue", album.id, () => {
                    for (let track of album.albumtracks) {
                        if (!manualQueue.includes(track.trackId)) {
                            QueueManager.addToManualQueue(track.trackId);
                        }
                    }
                }, [], [allTracksInQueue ? "audio-queueremove" : "audio-queueadd", "secondary"]),
                GenericTemplates.action(Icons.PLAYLIST_ADD, "Add to playlist", album.id, async () => {
                    await PlaylistActions.openAddToPlaylistModal(album, "album");
                }, [], ["secondary"])
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