import {Icons} from "../Enums/Icons.js";
import {AlbumActions} from "../Actions/AlbumActions.ts";
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
import {notify, Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {AnyNode, computedSignal, create, HtmlPropertyValue, ifjs, Signal, signal} from "../../fjsc/f2.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {InputType} from "../../fjsc/Types.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {User} from "../Models/DbModels/User.ts";
import {navigate} from "../Routing/Router.ts";

export class AlbumTemplates {
    static async addToAlbumModal(track: Track, albums: Album[]) {
        if (albums.some(a => !a.tracks)) {
            throw new Error(`No album tracks for some of ids ${albums.map(a => a.id)}`);
        }

        const checkedAlbums = signal(albums.filter(a => a.tracks!.some(t => t.track_id === track.id)).map(a => a.id));
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

                return await AlbumTemplates.albumInAddList(album, checkedAlbums);
            })) as AnyNode[];
        }
        const buttonText = computedSignal<string>(checkedAlbums, (ch: number[]) => `Add to ${ch.length} albums`);

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
                    .classes("check-list")
                    .children(
                        ...albumList,
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: buttonText,
                            classes: ["positive"],
                            icon: { icon: "forms_add_on" },
                            disabled: computedSignal(checkedAlbums, (ch: number[]) => ch.length === 0),
                            onclick: async () => {
                                await AlbumActions.addTrackToAlbums(track.id);
                            }
                        }),
                        FJSC.button({
                            text: "Cancel",
                            classes: ["negative"],
                            icon: { icon: "close" },
                            onclick: Util.removeModal
                        }),
                    ).build()
            ).build();
    }
	
    static async albumInAddList(album: Album, checkedAlbums: Signal<number[]>) {
        const checked = computedSignal(checkedAlbums, (ch: number[]) => ch.includes(album.id));
        const checkedClass = computedSignal<string>(checked, (c: boolean) => c ? "active" : "_");

        return create("div")
            .classes("flex", "padded", "check-list-item", checkedClass)
            .onclick(() => {
                if (checked.value) {
                    checkedAlbums.value = checkedAlbums.value.filter(id => id !== album.id);
                } else {
                    checkedAlbums.value = [...checkedAlbums.value, album.id];
                }
            })
            .children(
                await AlbumTemplates.smallAlbumCover(album),
                create("span")
                    .text(album.title)
                    .build(),
            ).build();
    }

    static newAlbumModal() {
        const album = signal(<Partial<Album>>{
            title: "",
            upc: "",
            description: "",
            release_date: new Date(),
            visibility: "private",
        });
        const name = computedSignal<string>(album, (s: Album) => s.title);
        const upc = computedSignal<string>(album, (s: Album) => s.upc);
        const description = computedSignal<string>(album, (s: Album) => s.description);
        const releaseDate = computedSignal<Date>(album, (s: Album) => s.release_date.toISOString().split("T")[0]);
        const visibility = computedSignal<boolean>(album, (s: Album) => s.visibility === "private");
        const disabled = computedSignal<boolean>(album, (s: Album) => {
            return !s.title || (s.title === "");
        });

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
                        FJSC.input<string>({
                            type: InputType.text,
                            required: true,
                            name: "name",
                            label: "Name",
                            placeholder: "Album name",
                            value: name,
                            onchange: (v) => {
                                album.value = { ...album.value, title: v };
                            }
                        }),
                        FJSC.input<string>({
                            type: InputType.text,
                            name: "upc",
                            label: "UPC",
                            placeholder: "12-digit number",
                            value: upc,
                            onchange: (v) => {
                                album.value = { ...album.value, upc: v };
                            }
                        }),
                        FJSC.textarea({
                            name: "description",
                            label: "Description",
                            placeholder: "My cool album",
                            value: description,
                            onchange: (v) => {
                                album.value = { ...album.value, description: v };
                            }
                        }),
                        FJSC.input<Date>({
                            type: InputType.date,
                            name: "release_date",
                            label: "Release Date",
                            placeholder: "YYYY-MM-DD",
                            value: releaseDate,
                            onchange: (v) => {
                                album.value = { ...album.value, release_date: new Date(v) };
                            }
                        }),
                        FJSC.toggle({
                            name: "visibility",
                            label: "Private",
                            text: "Private",
                            checked: visibility,
                            onchange: (v) => {
                                album.value = { ...album.value, visibility: v ? "private" : "public" };
                            }
                        }),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Create album",
                            disabled,
                            onclick: async () => {
                                await AlbumActions.createNewAlbum(album.value);
                                Util.removeModal();
                            },
                            icon: { icon: "playlist_add" },
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
            throw new Error(`Album has no user: ${album.id}`);
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
                                AlbumTemplates.title(album.title, album.id, icons),
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
                        StatisticsTemplates.likesIndicator("album", album.id, album.likes.length,
                            Util.arrayPropertyMatchesUser(album.likes, "user_id", user)),
                        StatisticsTemplates.likeListOpener(album.likes, album.user),
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
                        navigate("album/" + id);
                    })
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
                PlayManager.playFrom("album", album.title, album.id);
                QueueManager.setContextQueue(album.tracks!.map(t => t.track_id));
                const firstTrack = album.tracks![0];
                if (!firstTrack) {
                    notify("This album has no tracks", "error");
                    return;
                }
                PlayManager.addStreamClientIfNotExists(firstTrack.track_id, firstTrack.track?.length ?? 0);
                await PlayManager.startAsync(firstTrack.track_id);
            })
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .src(srcState)
                    .alt(album.title)
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
            .alt(album.title)
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
        if (!a_user) {
            throw new Error(`Album ${album.id} has no user`);
        }
        const trackChildren = [];
        const positionMap = tracks.map(t => t.track_id);
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
                            .text(album.title)
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
                            .onclick(e => AlbumActions.replaceCover(e, album.id, coverLoading))
                            .children(
                                ifjs(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(await Util.getCoverFileFromAlbumIdAsync(album.id, album.user_id))
                                    .alt(album.title)
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
                                            .text("Released " + Util.formatDate(album.release_date))
                                            .build()
                                    ).build(),
                                create("div")
                                    .classes("stats-container", "flex", "rounded")
                                    .children(
                                        StatisticsTemplates.likesIndicator("album", album.id, album.likes.length,
                                            Util.arrayPropertyMatchesUser(album.likes, "user_id", user)),
                                        StatisticsTemplates.likeListOpener(album.likes, user),
                                    ).build(),
                            ).build()
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ...trackChildren
                    ).build()
            ).build();
    }

    static audioActions(album: Album, user: User, editActions: AnyNode[] = []) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === album.id;
        const manualQueue = QueueManager.getManualQueue();
        if (!album.tracks) {
            throw new Error(`Album ${album.id} has no tracks`);
        }
        const allTracksInQueue = album.tracks.every((t) =>
            manualQueue.includes(t.track_id),
        );
        const duration = album.tracks.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);

        let actions: AnyNode[] = [];
        if (user) {
            actions = [
                GenericTemplates.action(isPlaying ? Icons.PAUSE : Icons.PLAY, isPlaying ? "Pause" : "Play", album.id, async () => {
                    const firstTrack = (album.tracks!)[0];
                    await AlbumActions.startTrackInAlbum(album, firstTrack.track_id, true);
                }, ["duration", duration], [album.tracks.length === 0 ? "nonclickable" : "_", "secondary"]),
                GenericTemplates.action(allTracksInQueue ? Icons.UNQUEUE : Icons.QUEUE, allTracksInQueue ? "Unqueue" : "Queue", album.id, () => {
                    for (let track of album.tracks!) {
                        if (!manualQueue.includes(track.track_id)) {
                            QueueManager.addToManualQueue(track.track_id);
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
            ).build();
    }
}