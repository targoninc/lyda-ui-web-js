import {Icons} from "../Enums/Icons.js";
import {GenericTemplates} from "./GenericTemplates.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {FormTemplates} from "./FormTemplates.ts";
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
import {User} from "../DbModels/User.ts";
import {Playlist} from "../DbModels/Playlist.ts";
import {create, ifjs, signal, computedSignal, AnyNode, HtmlPropertyValue} from "../../fjsc/f2.ts";
import {Track} from "../DbModels/Track.ts";
import {Album} from "../DbModels/Album.ts";
import {navigate} from "../Routing/Router.ts";
import {InputType} from "../../fjsc/Types.ts";

export class PlaylistTemplates {
    static async addTrackToPlaylistModal(track: Track, playlists: Playlist[]) {
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async (playlist: Playlist) => {
                return await PlaylistTemplates.playlistInAddList(playlist, playlist.tracks?.find((t: Track) => t.id === track.id) !== undefined);
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
                        FJSC.button({
                            text: "Ok",
                            onclick: async () => PlaylistActions.addTrackToPlaylists(track.id),
                            icon: { icon: "playlist_add" },
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static async addAlbumToPlaylistModal(album: Album, playlists: Playlist[]) {
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = await Promise.all(playlists.map(async (playlist: Playlist) => {
                return await PlaylistTemplates.playlistInAddList(playlist, playlist.tracks?.find((t: Track) => t.id === album.id) !== undefined);
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
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(...playlistList)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Ok",
                            onclick: async () => PlaylistActions.addAlbumToPlaylists(album.id),
                            icon: { icon: "playlist_add" },
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static async playlistInAddList(playlist: Playlist, isChecked: boolean) {
        const checked = signal(isChecked);

        return create("div")
            .classes("flex", "rounded", "padded", "card")
            .onclick(() => { checked.value = !checked.value })
            .children(
                GenericTemplates.checkbox("playlist_" + playlist.id, checked, "", false),
                await PlaylistTemplates.smallPlaylistCover(playlist),
                create("span")
                    .classes("nopointer")
                    .text(playlist.name)
                    .build(),
            )
            .build();
    }

    static newPlaylistModal() {
        const playlist = signal(<Playlist>{
            name: "",
            description: "",
            visibility: "public",
        });
        const name = computedSignal<string>(playlist, (s: Playlist) => s.name);
        const description = computedSignal<string>(playlist, (s: Playlist) => s.description);
        const visibility = computedSignal<boolean>(playlist, (s: Playlist) => s.visibility === "private");
        const disabled = computedSignal<boolean>(playlist, (s: Playlist) => {
            return !s.name || (s.name === "");
        });

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
                                playlist.value = { ...playlist.value, name: v };
                            }
                        }),
                        FJSC.textarea({
                            name: "description",
                            label: "Description",
                            placeholder: "My cool playlist",
                            value: description,
                            onchange: (v) => {
                                playlist.value = { ...playlist.value, description: v };
                            }
                        }),
                        FJSC.toggle({
                            name: "visibility",
                            label: "Private",
                            text: "Private",
                            checked: visibility,
                            onchange: (v) => {
                                playlist.value = { ...playlist.value, visibility: v ? "private" : "public" };
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
        Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
            coverState.value = cover;
        });
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
                        PlaylistTemplates.playlistCover(playlist, "120px"),
                        create("div")
                            .classes("flex-v", "small-gap")
                            .children(
                                PlaylistTemplates.title(playlist.name, playlist.id, icons),
                                UserTemplates.userWidget(playlist.user_id, playlist.user.username, playlist.user.displayname, coverState,
                                    Util.arrayPropertyMatchesUser(playlist.user.follows, "followingUserId", user)),
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
                        StatisticsTemplates.likeListOpener(playlist.id, playlist.likes, user),
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

    static playlistCover(playlist: Playlist, overwriteWidth: string|null = null) {
        const coverState = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id).then(cover => {
            coverState.value = cover;
        });
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        return create("div")
            .classes("cover-container", "relative", "pointer")
            .attributes("playlist_id", playlist.id)
            .styles("width", overwriteWidth ?? "min(200px, 100%)")
            .id(playlist.id)
            .onclick(async () => {
                Ui.notify("Starting playlist " + playlist.id, "info");
                PlayManager.playFrom("playlist", playlist.name, playlist.id);
                QueueManager.setContextQueue(playlist.tracks!.map(t => t.id));
                const firstTrack = playlist.tracks![0];
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
            ).build();
    }

    static async smallPlaylistCover(playlist: Playlist) {
        return create("img")
            .classes("cover", "rounded", "nopointer", "blurOnParentHover")
            .styles("height", "var(--font-size-large)")
            .src(await Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id))
            .alt(playlist.name)
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
        const positionMap = tracks.map(t => t.id);
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
            editActions.push(
                GenericTemplates.action(Icons.DELETE, "Delete", playlist.id, async (e) => {
                    await Ui.getConfirmationModal("Delete playlist", "Are you sure you want to delete this playlist?", "Yes", "No", () => PlaylistActions.deletePlaylist(playlist.id), () => {
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
                            .text(playlist.name)
                            .build(),
                        UserTemplates.userWidget(a_user.id, a_user.username, a_user.displayname, await Util.getAvatarFromUserIdAsync(a_user.id),
                            Util.arrayPropertyMatchesUser(a_user.follows, "followingUserId", user), [], ["widget-secondary"])
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
                                    .src(await Util.getCoverFileFromPlaylistIdAsync(playlist.id, playlist.user_id))
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
                                            .text("Created " + Util.formatDate(playlist.created_at))
                                            .build()
                                    )
                                    .build(),
                                create("div")
                                    .classes("stats-container", "flex", "rounded")
                                    .children(
                                        StatisticsTemplates.likesIndicator("playlist", playlist.id, playlist.likes.length,
                                            Util.arrayPropertyMatchesUser(playlist.likes, "userId", user)),
                                        StatisticsTemplates.likeListOpener(playlist.id, playlist.likes, user),
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

    static audioActions(playlist: Playlist, user: User, editActions: AnyNode[] = []) {
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        const inQueue = QueueManager.isInManualQueue(playlist.id);
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom.type === "album" && playingFrom.id === playlist.id;
        const manualQueue = QueueManager.getManualQueue();
        const allTracksInQueue = playlist.tracks.every((t) => manualQueue.includes(t.id));
        const duration = playlist.tracks.reduce((acc, t) => acc + t.length, 0);

        let actions: AnyNode[] = [];
        if (user) {
            actions = [
                GenericTemplates.action(isPlaying ? Icons.PAUSE : Icons.PLAY, isPlaying ? "Pause" : "Play", playlist.id, async () => {
                    const firstTrack = playlist.tracks![0];
                    await PlaylistActions.startTrackInPlaylist(playlist, firstTrack.id, true);
                }, ["duration", duration.toString()], [playlist.tracks.length === 0 ? "nonclickable" : "_", "secondary"]),
                GenericTemplates.action(allTracksInQueue ? Icons.UNQUEUE : Icons.QUEUE, allTracksInQueue ? "Unqueue" : "Queue", playlist.id, () => {
                    for (let track of playlist.tracks!) {
                        if (!manualQueue.includes(track.id)) {
                            QueueManager.addToManualQueue(track.id);
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
            ).build();
    }
}