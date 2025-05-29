import {Icons} from "../../Enums/Icons.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {PlaylistActions} from "../../Actions/PlaylistActions.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {Images} from "../../Enums/Images.ts";
import {Util} from "../../Classes/Util.ts";
import {notify, Ui} from "../../Classes/Ui.ts";
import {
    AnyElement,
    AnyNode,
    compute,
    create,
    HtmlPropertyValue,
    InputType,
    nullElement,
    Signal,
    signal,
    when
} from "@targoninc/jess";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {button, icon, input, textarea, toggle} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {InteractionTemplates} from "../InteractionTemplates.ts";
import {playingFrom, playingHere} from "../../state.ts";
import {MusicTemplates} from "./MusicTemplates.ts";

export class PlaylistTemplates {
    static addTrackToPlaylistModal(track: Track, playlists: Playlist[]) {
        if (playlists.some(p => !p.tracks)) {
            return create("div").text("No playlists found").build();
        }

        const checkedPlaylists = signal(playlists.filter(p => p.tracks!.some(t => t.track_id === track.id)).map(p => p.id));
        let playlistList: AnyElement[] = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = playlists.map((playlist) => {
                if (!playlist.tracks) {
                    console.warn("Playlist has no tracks: ", playlist);
                    return nullElement();
                }

                return PlaylistTemplates.playlistInAddList(playlist, checkedPlaylists);
            }) as AnyElement[];
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
                        button({
                            text: compute(p => `Add to ${p.length} playlists`, checkedPlaylists),
                            disabled: compute(p => p.length === 0, checkedPlaylists),
                            onclick: async () => PlaylistActions.addTrackToPlaylists(track.id, checkedPlaylists.value),
                            icon: {icon: "playlist_add"},
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static addAlbumToPlaylistModal(album: Album, playlists: Playlist[]) {
        const checkedPlaylists = signal(playlists.filter(p => p.tracks?.some(t => album.tracks?.some(ata => ata.track_id === t.track_id))).map(p => p.id));
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text("No playlists found")
                .build());
        } else {
            playlistList = playlists.map((playlist: Playlist) => PlaylistTemplates.playlistInAddList(playlist, checkedPlaylists));
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
                        button({
                            text: compute(p => `Add to ${p.length} playlists`, checkedPlaylists),
                            disabled: compute(p => p.length === 0, checkedPlaylists),
                            onclick: async () => PlaylistActions.addAlbumToPlaylists(album.id, checkedPlaylists.value),
                            icon: {icon: "playlist_add"},
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static playlistInAddList(item: Playlist, checkedItems: Signal<number[]>) {
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
                PlaylistTemplates.smallPlaylistCover(item),
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
                        icon({
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
                        input<string>({
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
                        textarea({
                            name: "description",
                            label: "Description",
                            placeholder: "My cool playlist",
                            value: description,
                            onchange: (v) => {
                                playlist.value = {...playlist.value, description: v};
                            }
                        }),
                        toggle({
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
                        button({
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
                    .text("Put your favorite tunes into a playlist:")
                    .build(),
                GenericTemplates.newPlaylistButton(["secondary"])
            ];
        } else {
            children = [
                create("p")
                    .text("No playlists on this profile.")
                    .build()
            ];
        }

        return create("div")
            .classes("card", "flex-v")
            .children(...children)
            .build();
    }

    static playlistCard(playlist: Playlist, isSecondary: boolean = false) {
        const icons = [];
        if (playlist.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }
        const coverState = signal(Images.DEFAULT_COVER_PLAYLIST);
        if (playlist.has_cover) {
            coverState.value = Util.getPlaylistCover(playlist.id);
        }
        if (!playlist.user) {
            throw new Error(`Playlist ${playlist.id} has no user`);
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
                                UserTemplates.userWidget(playlist.user, [], [], UserWidgetContext.card),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(playlist.created_at))
                                    .build(),
                            ).build(),
                    ).build(),
                InteractionTemplates.interactions(EntityType.playlist, playlist),
            ).build();
    }

    static title(title: HtmlPropertyValue, id: HtmlPropertyValue, icons: AnyNode[] = []) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .onclick(() => navigate(`${RoutePath.playlist}/` + id))
                    .build(),
                ...icons,
            ).build();
    }

    static playlistCover(playlist: Playlist, coverType: string) {
        const coverState = signal(Images.DEFAULT_COVER_PLAYLIST);
        if (playlist.has_cover) {
            coverState.value = Util.getPlaylistCover(playlist.id);
        }
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
            .attributes("playlist_id", playlist.id)
            .id(playlist.id)
            .onclick(async () => {
                notify("Starting playlist " + playlist.id, NotificationType.info);
                PlayManager.playFrom("playlist", playlist.title, playlist.id);
                QueueManager.setContextQueue(playlist.tracks!.map(t => t.track_id));
                const firstTrack = playlist.tracks![0];
                if (!firstTrack) {
                    notify("This playlist has no tracks", NotificationType.error);
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

    static smallPlaylistCover(playlist: Playlist) {
        const coverState = signal(Images.DEFAULT_COVER_PLAYLIST);
        if (playlist.has_cover) {
            coverState.value = Util.getPlaylistCover(playlist.id);
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
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }
        const tracks = signal<ListTrack[]>(playlist.tracks);
        const noTracks = compute(t => t.length === 0, tracks);
        const a_user = playlist.user;
        if (!a_user) {
            throw new Error(`Playlist ${playlist.id} has no user`);
        }

        async function startCallback(trackId: number) {
            await PlaylistActions.startTrackInPlaylist(playlist, trackId);
        }

        const coverLoading = signal(false);
        const coverState = signal(Images.DEFAULT_COVER_PLAYLIST);
        if (playlist.has_cover) {
            coverState.value = Util.getPlaylistCover(playlist.id);
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
                        UserTemplates.userWidget(a_user, [], [], UserWidgetContext.singlePage)
                    ).build(),
                create("div")
                    .classes("playlist-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", data.canEdit ? "pointer" : "_")
                            .onclick(e => PlaylistActions.replaceCover(e, playlist.id, data.canEdit, coverLoading))
                            .children(
                                when(coverLoading, create("div")
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
                                PlaylistTemplates.audioActions(playlist, user, data.canEdit),
                                create("div")
                                    .classes("playlist-title-container", "flex-v", "small-gap")
                                    .children(
                                        create("span")
                                            .classes("date", "text-small")
                                            .text("Created " + Util.formatDate(playlist.created_at))
                                            .build()
                                    ).build(),
                                InteractionTemplates.interactions(EntityType.playlist, playlist),
                            ).build()
                    ).build(),
                TrackTemplates.tracksInList(noTracks, tracks, data.canEdit, playlist, "playlist", startCallback)
            ).build();
    }

    static audioActions(playlist: Playlist, user: User, canEdit: boolean) {
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        const isPlaying = compute((p, pHere) => p && p.type === "playlist" && p.id === playlist.id && pHere, playingFrom, playingHere);
        const duration = playlist.tracks.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);
        const playIcon = compute(p => p ? Icons.PAUSE : Icons.PLAY, isPlaying);
        const playText = compute((p): string => p ? "Pause" : "Play", isPlaying);

        let actions: AnyNode[] = [];
        if (user) {
            actions = [
                button({
                    text: playText,
                    icon: {
                        icon: playIcon,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true
                    },
                    attributes: ["duration", duration.toString()],
                    id: playlist.id,
                    classes: ["secondary"],
                    disabled: playlist.tracks?.length === 0,
                    onclick: async () => {
                        const firstTrack = playlist.tracks![0];
                        await PlaylistActions.startTrackInPlaylist(playlist, firstTrack.track_id, true);
                    }
                }),
                MusicTemplates.addListToQueueButton(playlist),
            ];
        }

        return create("div")
            .classes("audio-actions", "flex")
            .children(
                ...actions,
                when(canEdit, button({
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    onclick: async () => {
                        await Ui.getConfirmationModal("Delete playlist", "Are you sure you want to delete this playlist?", "Yes", "No", () => PlaylistActions.deletePlaylist(playlist.id), () => {
                        }, Icons.WARNING);
                    }
                }))
            ).build();
    }
}