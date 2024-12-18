import {Icons} from "../Enums/Icons.js";
import {GenericTemplates} from "./GenericTemplates.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {User} from "../Models/DbModels/User.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {create, ifjs, AnyNode, HtmlPropertyValue} from "../../fjsc/src/f2.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {navigate} from "../Routing/Router.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";

export class PlaylistTemplates {
    static async addTrackToPlaylistModal(track: Track, playlists: Playlist[]) {
        if (playlists.some(p => !p.tracks)) {
            return create("div").text("No playlists found").build();
        }

        const checkedPlaylists = signal(playlists.filter(p => p.tracks!.some(t => t.track_id === track.id)).map(p => p.id));
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async (playlist) => {
                if (!playlist.tracks) {
                    console.warn("Playlist has no tracks: ", playlist);
                    return;
                }

                return await PlaylistTemplates.playlistInAddList(playlist, checkedPlaylists);
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
                            .attributes("src", Icons.PLAYLIST_ADD)
                            .build(),
                        create("h5")
                            .text(`Add ${track.title} to playlist`)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("check-list")
                    .children(...playlistList)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Ok",
                            onclick: async () => PlaylistActions.addTrackToPlaylists(track.id, checkedPlaylists.value),
                            icon: {icon: "playlist_add"},
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static async addAlbumToPlaylistModal(album: Album, playlists: Playlist[]) {
        const checkedPlaylists = signal(playlists.filter(p => p.tracks?.some(t => album.tracks?.some(ata => ata.track_id === t.track_id))).map(p => p.id));
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async (playlist: Playlist) => {
                return await PlaylistTemplates.playlistInAddList(playlist, checkedPlaylists);
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
                            .text(`Add ${album.title} to playlist`)
                            .build()
                    ).build(),
                create("div")
                    .classes("check-list")
                    .children(...playlistList)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Ok",
                            onclick: async () => PlaylistActions.addAlbumToPlaylists(album.id, checkedPlaylists.value),
                            icon: {icon: "playlist_add"},
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static async playlistInAddList(item: Playlist, checkedItems: Signal<number[]>) {
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
                await PlaylistTemplates.smallPlaylistCover(item),
                create("span")
                    .text(item.title)
                    .build(),
            ).build();
    }

    static newPlaylistModal() {
        const playlist = signal(<Partial<Playlist>>{
            title: "",
            description: "",
            visibility: "public",
        });
        const name = compute(s => s.title ?? "", playlist);
        const description = compute(s => s.description ?? "", playlist);
        const visibility = compute(s => s.visibility === "private", playlist);
        const disabled = compute(s => {
            return !s.title || s.title === "";
        }, playlist);

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .children(
                        FJSC.icon({
                            icon: "playlist_add",
                            adaptive: true,
                        }),
                        create("span")
                            .text("New playlist")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .id("newPlaylistForm")
                    .children(
                        FJSC.input<string>({
                            type: InputType.text,
                            required: true,
                            name: "name",
                            label: "Name",
                            placeholder: "Playlist name",
                            value: name,
                            onchange: (v) => {
                                playlist.value = {...playlist.value, title: v};
                            }
                        }),
                        FJSC.textarea({
                            name: "description",
                            label: "Description",
                            placeholder: "My cool playlist",
                            value: description,
                            onchange: (v) => {
                                playlist.value = {...playlist.value, description: v};
                            }
                        }),
                        FJSC.toggle({
                            name: "visibility",
                            label: "Private",
                            text: "Private",
                            checked: visibility,
                            onchange: (v) => {
                                playlist.value = {...playlist.value, visibility: v ? "private" : "public"};
                            }
                        }),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Create playlist",
                            disabled,
                            onclick: async () => {
                                await PlaylistActions.createNewPlaylist(playlist.value);
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

    static noPlaylistsYet(isOwnProfile: boolean) {
        let children;
        if (isOwnProfile) {
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

    static playlistCard(playlist: Playlist, user: User, isSecondary: boolean = false) {
        const icons = [];
        if (playlist.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }
        const coverState = signal(Images.DEFAULT_AVATAR);
        if (playlist.has_cover) {
            Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
                coverState.value = cover;
            });
        }
        if (!playlist.user) {
            throw new Error(`Playlist ${playlist.id} has no user`);
        }
        if (!playlist.likes) {
            throw new Error(`Playlist ${playlist.id} has no likes`);
        }

        return create("div")
            .classes("playlist-card", "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        PlaylistTemplates.playlistCover(playlist, "card-cover"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                PlaylistTemplates.title(playlist.title, playlist.id, icons),
                                UserTemplates.userWidget(playlist.user, Util.arrayPropertyMatchesUser(playlist.user.follows ?? [], "following_user_id", user)),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(playlist.created_at))
                                    .build(),
                            ).build(),
                    ).build(),
                create("div")
                    .classes("stats-container", "flex", "rounded")
                    .children(
                        StatisticsTemplates.likesIndicator("playlist", playlist.id, playlist.likes.length,
                            Util.arrayPropertyMatchesUser(playlist.likes, "userId", user)),
                        StatisticsTemplates.likeListOpener(playlist.likes, user),
                    ).build()
            ).build();
    }

    static title(title: HtmlPropertyValue, id: HtmlPropertyValue, icons: AnyNode[] = []) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .onclick(() => {
                        navigate("playlist/" + id);
                    }).build(),
                ...icons,
            ).build();
    }

    static playlistCover(playlist: Playlist, coverType: string) {
        const coverState = signal(Images.DEFAULT_AVATAR);
        if (playlist.has_cover) {
            Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
                coverState.value = cover;
            });
        }
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
            .attributes("playlist_id", playlist.id)
            .id(playlist.id)
            .onclick(async () => {
                notify("Starting playlist " + playlist.id, "info");
                PlayManager.playFrom("playlist", playlist.title, playlist.id);
                QueueManager.setContextQueue(playlist.tracks!.map(t => t.track_id));
                const firstTrack = playlist.tracks![0];
                if (!firstTrack) {
                    notify("This playlist has no tracks", "error");
                    return;
                }
                PlayManager.addStreamClientIfNotExists(firstTrack.track_id, firstTrack.track?.length ?? 0);
                await PlayManager.startAsync(firstTrack.track_id);
            })
            .children(
                create("img")
                    .classes("cover", "nopointer", "blurOnParentHover")
                    .src(coverState)
                    .alt(playlist.title)
                    .build(),
                create("img")
                    .classes("play-button-icon", "centeredInParent", "showOnParentHover", "inline-icon", "svgInverted", "nopointer")
                    .src(Icons.PLAY)
                    .build(),
            ).build();
    }

    static async smallPlaylistCover(playlist: Playlist) {
        const coverState = signal(Images.DEFAULT_AVATAR);
        if (playlist.has_cover) {
            Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
                coverState.value = cover;
            });
        }

        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(coverState)
            .alt(playlist.title)
            .build();
    }

    static playlistCardsContainer(children: AnyNode[]) {
        return create("div")
            .classes("profileContent", "playlists", "flex")
            .children(...children)
            .build();
    }

    static async playlistPage(data: { playlist: Playlist, canEdit: boolean }, user: User) {
        const playlist = data.playlist;
        const tracks = playlist.tracks;
        if (!tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }
        const a_user = playlist.user;
        if (!a_user) {
            throw new Error(`Playlist ${playlist.id} has no user`);
        }
        if (!playlist.likes) {
            throw new Error(`Playlist ${playlist.id} has no likes array`);
        }
        const trackChildren = [];
        const positionMap = tracks.map(t => t.track_id);
        const positionsState = signal(positionMap);

        async function startCallback(trackId: number) {
            await PlaylistActions.startTrackInPlaylist(playlist, trackId);
        }

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            trackChildren.push(GenericTemplates.dragTargetInList((data: { id: number }) => {
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
            editActions.push(FJSC.button({
                text: "Delete",
                icon: {icon: "delete"},
                classes: ["negative"],
                onclick: async () => {
                    await Ui.getConfirmationModal("Delete playlist", "Are you sure you want to delete this playlist?", "Yes", "No", () => PlaylistActions.deletePlaylist(playlist.id), () => {
                    }, Icons.WARNING);
                }
            }));
        }
        const coverLoading = signal(false);
        const coverState = signal(Images.DEFAULT_AVATAR);
        if (playlist.has_cover) {
            Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
                coverState.value = cover;
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
                            .text(playlist.title)
                            .build(),
                        UserTemplates.userWidget(a_user, Util.arrayPropertyMatchesUser(a_user.follows ?? [], "following_user_id", user))
                    ).build(),
                create("div")
                    .classes("playlist-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", data.canEdit ? "pointer" : "_")
                            .attributes("playlist_id", playlist.id, "canEdit", data.canEdit)
                            .onclick(e => PlaylistActions.replaceCover(e, coverLoading))
                            .children(
                                ifjs(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(coverState)
                                    .alt(playlist.title)
                                    .build()
                            ).build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                PlaylistTemplates.audioActions(playlist, user, editActions),
                                create("div")
                                    .classes("playlist-title-container", "flex-v", "small-gap")
                                    .children(
                                        create("span")
                                            .classes("date", "text-small")
                                            .text("Created " + Util.formatDate(playlist.created_at))
                                            .build()
                                    ).build(),
                                create("div")
                                    .classes("stats-container", "flex", "rounded")
                                    .children(
                                        StatisticsTemplates.likesIndicator("playlist", playlist.id, playlist.likes.length,
                                            Util.arrayPropertyMatchesUser(playlist.likes, "userId", user)),
                                        StatisticsTemplates.likeListOpener(playlist.likes, user),
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

    static audioActions(playlist: Playlist, user: User, editActions: AnyNode[] = []) {
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom && playingFrom.type === "playlist" && playingFrom.id === playlist.id;
        const manualQueue = QueueManager.getManualQueue();
        const allTracksInQueue = playlist.tracks.every((t) => manualQueue.includes(t.track_id));
        const duration = playlist.tracks.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);

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
                    attributes: ["duration", duration.toString()],
                    id: playlist.id,
                    classes: [playlist.tracks.length === 0 ? "nonclickable" : "_", "secondary"],
                    onclick: async () => {
                        const firstTrack = playlist.tracks![0];
                        await PlaylistActions.startTrackInPlaylist(playlist, firstTrack.track_id, true);
                    }
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
                        for (let track of playlist.tracks!) {
                            if (!manualQueue.includes(track.track_id)) {
                                QueueManager.addToManualQueue(track.track_id);
                            }
                        }
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