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
import {AnyNode, computedSignal, create, ifjs, signal} from "../../fjsc/f2.ts";
import {Album} from "../DbModels/Album.ts";
import {CheckboxConfig} from "../../fjsc/Types.ts";
import {Track} from "../DbModels/Track.ts";
import {User} from "../DbModels/User.ts";

export class AlbumTemplates {
    static async addToAlbumModal(track: Track, albums: Album[]) {
        let albumList: AnyNode[] = [];
        if (albums.length === 0) {
            albumList.push(create("span")
                .classes("nopointer")
                .text("No albums found")
                .build());
        } else {
            albumList = await Promise.all(albums.map(async (album: Album) => {
                if (!album.tracks) {
                    console.warn("Album has no tracks: ", album);
                    return;
                }

                return await AlbumTemplates.albumInAddList(album, album.tracks.find((t: Track) => t.id === track.id) !== undefined);
            })) as AnyNode[];
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
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.button("Ok", async () => {
                            await AlbumActions.addTrackToAlbums(track.id);
                        }, ["positive"]),
                        GenericTemplates.button("Cancel", Util.removeModal, ["negative"])
                    ).build()
            ).build();
    }
	
    static async albumInAddList(album: Album, isChecked: boolean) {
        const checked = signal(isChecked);

        return create("div")
            .classes("flex", "rounded", "padded", "card")
            .onclick(() => {
                checked.value = !checked.value;
            })
            .children(
                FJSC.checkbox(<CheckboxConfig>{
                    name: "album_" + album.id,
                    checked,
                }),
                await AlbumTemplates.smallAlbumCover(album),
                create("span")
                    .classes("nopointer")
                    .text(album.name)
                    .build(),
            ).build();
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
                            album.value = { ...album.value, release_date: new Date(v) };
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
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static noAlbumsYet(isOwnProfile: boolean) {
        let children;
        if (isOwnProfile) {
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

    static albumCard(album: Album, user: User, isSecondary = false) {
        if (!album.user) {
            throw new Error("Album has no user: ", album);
        }

        const icons = [];
        if (album.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(album.user_id).then((src) => {
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
                                UserTemplates.userWidget(album.user_id, album.user.username, album.user.displayname, avatarState,
                                    Util.arrayPropertyMatchesUser(album.user.follows, "followingUserId", user)),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(album.release_date))
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

    static albumCover(album: Album, overwriteWidth: string|null = null) {
        if (!album.tracks) {
            throw new Error(`Album ${album.id} has no tracks`);
        }

        const srcState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromAlbumIdAsync(album.id, album.user_id).then((src) => {
            srcState.value = src;
        });

        return create("div")
            .classes("cover-container", "relative", "pointer")
            .attributes("album_id", album.id)
            .styles("width", overwriteWidth ?? "min(200px, 100%)")
            .id(album.id)
            .onclick(async () => {
                PlayManager.playFrom("album", album.name, album.id);
                QueueManager.setContextQueue(album.tracks!.map(t => t.id));
                const firstTrack = album.tracks![0];
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

    static async smallAlbumCover(album: Album) {
        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(await Util.getCoverFileFromAlbumIdAsync(album.id, album.user_id))
            .alt(album.name)
            .build();
    }

    static albumCardsContainer(children: AnyNode[]) {
        return create("div")
            .classes("profileContent", "albums", "flex")
            .children(...children)
            .build();
    }

    static async albumPage(data: any, user: User) {
        const album = data.album as Album;
        const tracks = album.tracks;
        if (!tracks) {
            throw new Error(`Album ${album.id} has no tracks`);
        }
        const a_user = album.user;
        const trackChildren = [];
        const positionMap = tracks.map((t: Track) => t.id);
        const positionsState = signal(positionMap);

        async function startCallback(trackId: number) {
            await AlbumActions.startTrackInAlbum(album, trackId);
        }

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (data.canEdit) {
                trackChildren.push(GenericTemplates.dragTargetInList((data: any) => {
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
        const coverLoading = signal(false);

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
                            .onclick(e => AlbumActions.replaceCover(e, coverLoading))
                            .children(
                                ifjs(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
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

    static audioActions(album, user, editActions: AnyNode[] = []) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === album.id;
        const manualQueue = QueueManager.getManualQueue();
        const allTracksInQueue = album.albumtracks.every((t) =>
            manualQueue.includes(t.trackId),
        );

        let actions: AnyNode[] = [];
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