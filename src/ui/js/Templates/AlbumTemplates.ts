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
import {AnyNode, create, HtmlPropertyValue, ifjs} from "../../fjsc/src/f2.ts";
import {Album} from "../Models/DbModels/lyda/Album.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {Track} from "../Models/DbModels/lyda/Track.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {navigate} from "../Routing/Router.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

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
        const buttonText = compute((ch: number[]) => `Add to ${ch.length} albums`, checkedAlbums);

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
                            disabled: compute((ch: number[]) => ch.length === 0, checkedAlbums),
                            onclick: async () => {
                                await AlbumActions.addTrackToAlbums(track.id, checkedAlbums.value);
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
	
    static async albumInAddList(item: Album, checkedItems: Signal<number[]>) {
        const checked = compute((ch) => ch.includes(item.id), checkedItems);
        const checkedClass = compute((c): string => c ? "active" : "_", checked);

        return create("div")
            .classes("flex", "padded", "check-list-item", checkedClass)
            .onclick(() => {
                if (checked.value) {
                    checkedItems.value = checkedItems.value.filter(id => id !== item.id);
                } else {
                    checkedItems.value = [...checkedItems.value, item.id];
                }
            })
            .children(
                await AlbumTemplates.smallAlbumCover(item),
                create("span")
                    .text(item.title)
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
        const name = compute((s) => s.title ?? "", album);
        const upc = compute((s) => s.upc ?? "", album);
        const description = compute((s) => s.description ?? "", album);
        const releaseDate = compute((s) => s.release_date ?? new Date(), album);
        const visibility = compute((s) => s.visibility === "private", album);
        const disabled = compute((s) => {
            return !s.title || s.title === "";
        }, album);

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

    static albumCard(album: Album, isSecondary = false) {
        if (!album.user) {
            throw new Error(`Album has no user: ${album.id}`);
        }

        const icons = [];
        if (album.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }

        return create("div")
            .classes("album-card", "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        AlbumTemplates.albumCover(album, "card-cover"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                AlbumTemplates.title(album.title, album.id, icons),
                                UserTemplates.userWidget(album.user, Util.arrayPropertyMatchesUser(album.user.follows ?? [], "following_user_id"), [], [], UserWidgetContext.card),
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
                            Util.arrayPropertyMatchesUser(album.likes, "user_id")),
                        StatisticsTemplates.likeListOpener(album.likes),
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

    static albumCover(album: Album, coverType: string) {
        if (!album.tracks) {
            throw new Error(`Album ${album.id} has no tracks`);
        }

        const srcState = signal(Images.DEFAULT_COVER_ALBUM);
        if (album.has_cover) {
            Util.getAlbumCover(album.id).then((src) => {
                srcState.value = src;
            });
        }

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
            .attributes("album_id", album.id)
            .id(album.id)
            .onclick(async () => {
                PlayManager.playFrom("album", album.title, album.id);
                QueueManager.setContextQueue(album.tracks!.map(t => t.track_id));
                const firstTrack = album.tracks![0];
                if (!firstTrack) {
                    notify("This album has no tracks", NotificationType.error);
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
        const coverState = signal(Images.DEFAULT_COVER_ALBUM);
        if (album.has_cover) {
            Util.getAlbumCover(album.id).then((src) => {
                coverState.value = src;
            });
        }

        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(coverState)
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
            editActions.push(FJSC.button({
                text: "Delete",
                icon: { icon: "delete" },
                classes: ["negative"],
                onclick: async (e) => {
                    await Ui.getConfirmationModal("Delete album", "Are you sure you want to delete this album?", "Yes", "No", AlbumActions.deleteAlbumFromElement.bind(null, e), () => {
                    }, Icons.WARNING);
                }
            }));
        }
        const coverLoading = signal(false);
        const coverState = signal(Images.DEFAULT_COVER_ALBUM);
        if (album.has_cover) {
            Util.getAlbumCover(album.id).then((src) => {
                coverState.value = src;
            });
        }

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
                        UserTemplates.userWidget(a_user, Util.arrayPropertyMatchesUser(a_user.follows ?? [], "following_user_id"), [], [], UserWidgetContext.singlePage)
                    ).build(),
                create("div")
                    .classes("album-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", data.canEdit ? "pointer" : "_")
                            .attributes("album_id", album.id, "canEdit", data.canEdit)
                            .onclick(e => AlbumActions.replaceCover(e, album.id, data.canEdit, coverLoading))
                            .children(
                                ifjs(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(coverState)
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
                                            Util.arrayPropertyMatchesUser(album.likes, "user_id")),
                                        StatisticsTemplates.likeListOpener(album.likes),
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
        const isPlaying = playingFrom && playingFrom.type === "album" && playingFrom.id === album.id;
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
                FJSC.button({
                    text: isPlaying ? "Pause" : "Play",
                    icon: {
                        icon: isPlaying ? Icons.PAUSE : Icons.PLAY,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true
                    },
                    classes: [album.tracks.length === 0 ? "nonclickable" : "_", "secondary"],
                    attributes: ["duration", duration.toString()],
                    id: album.id,
                    onclick: async () => {
                        const firstTrack = (album.tracks!)[0];
                        await AlbumActions.startTrackInAlbum(album, firstTrack.track_id, true);
                    },
                }),
                FJSC.button({
                    text: allTracksInQueue ? "Unqueue" : "Queue",
                    icon: {
                        icon: isPlaying ? Icons.UNQUEUE : Icons.QUEUE,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true
                    },
                    classes: [allTracksInQueue ? "audio-queueremove" : "audio-queueadd", "secondary"],
                    onclick: async () => {
                        for (let track of album.tracks!) {
                            if (!manualQueue.includes(track.track_id)) {
                                QueueManager.addToManualQueue(track.track_id);
                            }
                        }
                    },
                }),
                FJSC.button({
                    text: "Add to playlist",
                    icon: {
                        icon: Icons.PLAYLIST_ADD,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true
                    },
                    classes: ["secondary"],
                    onclick: async () => {
                        await PlaylistActions.openAddToPlaylistModal(album, "album");
                    },
                }),
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