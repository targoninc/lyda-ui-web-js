import { Icons } from "../../Enums/Icons.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { Images } from "../../Enums/Images.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { Ui } from "../../Classes/Ui.ts";
import { AnyElement, AnyNode, compute, create, InputType, nullElement, Signal, signal, when } from "@targoninc/jess";
import { button, icon, input, textarea, toggle } from "@targoninc/jess-components";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { loadingAudio, playingFrom, playingHere } from "../../state.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { Visibility } from "@targoninc/lyda-shared/src/Enums/Visibility.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { TextSize } from "../../Enums/TextSize.ts";

export class PlaylistTemplates {
    static addTrackToPlaylistModal(track: Track, playlists: Playlist[]) {
        if (playlists.some(p => !p.tracks) || playlists.length === 0) {
            return create("div").text(t("NO_PLAYLISTS_FOUND")).build();
        }

        const checkedPlaylists = signal(playlists.filter(p => p.tracks!.some(t => t.track_id === track.id)).map(p => p.id));
        const playlistList: AnyElement[] = playlists.map((playlist) => {
            if (!playlist.tracks) {
                console.warn("Playlist has no tracks: ", playlist);
                return nullElement();
            }

            return PlaylistTemplates.playlistInAddList(playlist, checkedPlaylists);
        }) as AnyElement[];

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
                            .text(t("ADD_TITLE_TO_PLAYLIST", track.title))
                            .build(),
                    ).build(),
                create("div")
                    .classes("check-list")
                    .children(...playlistList)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: compute(p => `${t("ADD_TO_N_PLAYLISTS", p.length)}`, checkedPlaylists),
                            disabled: compute(p => p.length === 0, checkedPlaylists),
                            onclick: async () => PlaylistActions.addTrackToPlaylists(track.id, checkedPlaylists.value),
                            icon: { icon: "playlist_add" },
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton(),
                    ).build(),
            ).build();
    }

    static addAlbumToPlaylistModal(album: Album, playlists: Playlist[]) {
        const checkedPlaylists = signal(playlists.filter(p => p.tracks?.some(t => album.tracks?.some(ata => ata.track_id === t.track_id))).map(p => p.id));
        let playlistList = [];
        if (playlists.length === 0) {
            playlistList.push(create("span")
                .classes("nopointer")
                .text(t("NO_PLAYLISTS_FOUND"))
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
                            .text(t("ADD_TITLE_TO_PLAYLIST", album.title))
                            .build(),
                    ).build(),
                create("div")
                    .classes("check-list")
                    .children(...playlistList)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: compute(p => `${t("ADD_TO_N_PLAYLISTS", p.length)}`, checkedPlaylists),
                            disabled: compute(p => p.length === 0, checkedPlaylists),
                            onclick: async () => PlaylistActions.addAlbumToPlaylists(album.id, checkedPlaylists.value),
                            icon: { icon: "playlist_add" },
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton(),
                    ).build(),
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
        const visibility = compute(s => s.visibility === Visibility.private, playlist);
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
                            .text(t("NEW_PLAYLIST"))
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
                            label: t("NAME"),
                            placeholder: t("PLAYLIST_NAME"),
                            value: name,
                            onchange: (v) => {
                                playlist.value = { ...playlist.value, title: v };
                            },
                        }),
                        textarea({
                            name: "description",
                            label: t("DESCRIPTION"),
                            placeholder: t("EXAMPLE_PLAYLIST_NAME"),
                            value: description,
                            onchange: (v) => {
                                playlist.value = { ...playlist.value, description: v };
                            },
                        }),
                        toggle({
                            name: "visibility",
                            label: t("PRIVATE"),
                            text: t("PRIVATE"),
                            checked: visibility,
                            onchange: (v) => {
                                playlist.value = {
                                    ...playlist.value,
                                    visibility: v ? Visibility.private : Visibility.public,
                                };
                            },
                        }),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("CREATE"),
                            disabled,
                            onclick: async () => {
                                await Api.createNewPlaylist(playlist.value);
                                Util.removeModal();
                            },
                            icon: {
                                icon: "playlist_add",
                            },
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton(),
                    ).build(),
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

    static playlistPage(data: { playlist: Playlist, canEdit: boolean }, user: User) {
        const playlist = data.playlist;
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }
        const tracks = signal<ListTrack[]>(playlist.tracks);
        const a_user = playlist.user;
        if (!a_user) {
            throw new Error(`Playlist ${playlist.id} has no user`);
        }

        const duration = playlist.tracks.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);
        const icons = playlist.visibility === Visibility.private ? [GenericTemplates.lock()] : [];

        return create("div")
            .classes("single-page", "noflexwrap", "padded-large", "rounded-large", "flex-v")
            .children(
                vertical(
                    vertical(
                        MusicTemplates.title(EntityType.playlist, playlist.title, playlist.id, icons, TextSize.xxLarge, false),
                        UserTemplates.userWidget(a_user, [], [], UserWidgetContext.singlePage),
                    ).classes("nogap").build(),
                    horizontal(
                        GenericTemplates.timestamp(playlist.created_at),
                        create("span")
                            .classes("date", TextSize.small)
                            .text(t("DURATION", Time.format(duration)))
                            .build(),
                    ).build(),
                ).build(),
                horizontal(
                    MusicTemplates.cover(EntityType.playlist, playlist, CoverContext.standalone),
                    vertical(
                        PlaylistTemplates.audioActions(playlist, user, data.canEdit),
                        InteractionTemplates.interactions(EntityType.playlist, playlist),
                    ).build(),
                ).build(),
                MusicTemplates.tracksInList(tracks, data.canEdit, playlist, "playlist"),
            ).build();
    }

    static audioActions(playlist: Playlist, user: User, canEdit: boolean) {
        if (!playlist.tracks) {
            throw new Error(`Playlist ${playlist.id} has no tracks`);
        }

        const isPlaying = compute((p, pHere) => (p && p.type === "playlist" && p.id === playlist.id && pHere) ?? false, playingFrom, playingHere);
        const playIcon = getPlayIcon(isPlaying, loadingAudio);
        const playText = compute((p): string => p ? `${t("PAUSE")}` : `${t("PLAY")}`, isPlaying);

        let actions: AnyNode[] = [];
        if (user) {
            actions = [
                button({
                    text: playText,
                    icon: {
                        icon: playIcon,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true,
                    },
                    id: playlist.id,
                    classes: ["special", "bigger-input", "rounded-max"],
                    disabled: playlist.tracks?.length === 0,
                    onclick: async () => {
                        const firstTrack = playlist.tracks![0];
                        await PlaylistActions.startTrackInPlaylist(playlist, firstTrack.track!, true);
                    },
                }),
                MusicTemplates.addListToQueueButton(playlist),
            ];
        }

        return horizontal(
            ...actions,
            when(canEdit, button({
                text: t("DELETE"),
                icon: { icon: "delete" },
                classes: ["negative"],
                onclick: async () => {
                    await Ui.getConfirmationModal(t("DELETE_PLAYLIST"), t("SURE_DELETE_PLAYLIST"), t("YES"), t("NO"), async () => {
                        const success = await Api.deletePlaylist(playlist.id);
                        if (success) {
                            navigate(RoutePath.profile);
                        }
                    }, () => {
                    }, Icons.WARNING);
                },
            })),
        ).build();
    }
}