import {Icons} from "../../Enums/Icons.ts";
import {AlbumActions} from "../../Actions/AlbumActions.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {PlaylistActions} from "../../Actions/PlaylistActions.ts";
import {Images} from "../../Enums/Images.ts";
import {getErrorMessage, Util} from "../../Classes/Util.ts";
import {notify, Ui} from "../../Classes/Ui.ts";
import {
    AnyNode,
    compute,
    create,
    HtmlPropertyValue,
    InputType,
    nullElement,
    signal,
    Signal,
    when
} from "@targoninc/jess";
import {navigate, Route} from "../../Routing/Router.ts";
import {currentTrackId, currentUser, manualQueue, playingFrom, playingHere} from "../../state.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {PageTemplates} from "../PageTemplates.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {button, input, textarea, toggle} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {InteractionTemplates} from "../InteractionTemplates.ts";
import {MusicTemplates} from "./MusicTemplates.ts";

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
                        button({
                            text: buttonText,
                            classes: ["positive"],
                            icon: {icon: "forms_add_on"},
                            disabled: compute((ch: number[]) => ch.length === 0, checkedAlbums),
                            onclick: async () => {
                                await AlbumActions.addTrackToAlbums(track.id, checkedAlbums.value);
                            }
                        }),
                        button({
                            text: "Cancel",
                            classes: ["negative"],
                            icon: {icon: "close"},
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
                AlbumTemplates.albumInputs(album),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Create album",
                            disabled,
                            onclick: async () => {
                                await AlbumActions.createNewAlbum(album.value);
                                Util.removeModal();
                            },
                            icon: {icon: "playlist_add"},
                            classes: ["positive"],
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static editAlbumModal(album: Partial<Album>) {
        const state = signal(album);
        const loading = signal(false);

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
                            .text("Edit album")
                            .build()
                    )
                    .build(),
                AlbumTemplates.albumInputs(state),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Update",
                            disabled: loading,
                            classes: ["positive"],
                            icon: {icon: "save"},
                            onclick: async () => {
                                loading.value = true;
                                Api.postAsync(ApiRoutes.updateAlbum, state.value).then(() => {
                                    Util.removeModal();
                                }).catch(e => {
                                    notify("Failed to update album: " + getErrorMessage(e), NotificationType.error);
                                }).finally(() => loading.value = false);
                            },
                        }),
                        GenericTemplates.modalCancelButton()
                    ).build()
            ).build();
    }

    static albumInputs(album: Signal<Partial<Album>>) {
        const name = compute((s) => s.title ?? "", album);
        const upc = compute((s) => s.upc ?? "", album);
        const description = compute((s) => s.description ?? "", album);
        const visibility = compute((s) => s.visibility === "private", album);

        return create("div")
            .classes("flex-v")
            .id("newAlbumForm")
            .children(
                input<string>({
                    type: InputType.text,
                    required: true,
                    name: "name",
                    label: "Name",
                    placeholder: "Album name",
                    value: name,
                    onchange: (v) => {
                        album.value = {...album.value, title: v};
                    }
                }),
                input<string>({
                    type: InputType.text,
                    name: "upc",
                    label: "UPC",
                    placeholder: "12-digit number",
                    value: upc,
                    onchange: (v) => {
                        album.value = {...album.value, upc: v};
                    }
                }),
                textarea({
                    name: "description",
                    label: "Description",
                    placeholder: "My cool album",
                    value: description,
                    onchange: (v) => {
                        album.value = {...album.value, description: v};
                    }
                }),
                GenericTemplates.releaseDateInput(album),
                toggle({
                    name: "visibility",
                    label: "Private",
                    text: "Private",
                    checked: visibility,
                    onchange: (v) => {
                        album.value = {...album.value, visibility: v ? "private" : "public"};
                    }
                }),
            ).build();
    }

    static noAlbumsYet(isOwnProfile: boolean) {
        let children;
        if (isOwnProfile) {
            children = [
                create("p")
                    .text("Share an album you made:")
                    .build(),
                GenericTemplates.newAlbumButton(["secondary"])
            ];
        } else {
            children = [
                create("p")
                    .text("No albums on this profile.")
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
                                UserTemplates.userWidget(album.user, [], [], UserWidgetContext.card),
                                create("span")
                                    .classes("date", "text-small", "nopointer", "color-dim")
                                    .text(Time.ago(album.release_date))
                                    .build(),
                            ).build(),
                    ).build(),
                InteractionTemplates.interactions(EntityType.album, album),
            ).build();
    }

    static title(title: HtmlPropertyValue, id: number, icons: any[]) {
        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", "text-large", "pointer")
                    .text(title)
                    .onclick(() => navigate(`${RoutePath.album}/` + id))
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
            srcState.value = Util.getAlbumCover(album.id);
        }

        return create("div")
            .classes("cover-container", "relative", "pointer", coverType)
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
            coverState.value = Util.getAlbumCover(album.id);
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

    private static albumPageDisplay(album: Album, canEdit: boolean) {
        const coverLoading = signal(false);
        const coverState = signal(Images.DEFAULT_COVER_ALBUM);
        if (album.has_cover) {
            coverState.value = Util.getAlbumCover(album.id);
        }
        const albumUser = album.user!;
        const noTracks = signal(album.tracks?.length === 0);
        const tracks = signal<ListTrack[]>(album.tracks ?? []);

        async function startCallback(trackId: number) {
            await AlbumActions.startTrackInAlbum(album, trackId);
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
                        UserTemplates.userWidget(albumUser, [], [], UserWidgetContext.singlePage)
                    ).build(),
                create("div")
                    .classes("album-info-container", "flex")
                    .children(
                        create("div")
                            .classes("cover-container", "relative", canEdit ? "pointer" : "_")
                            .onclick(e => AlbumActions.replaceCover(e, album.id, canEdit, coverLoading))
                            .children(
                                when(coverLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent")
                                    .id("cover-loader")
                                    .build()),
                                create("img")
                                    .classes("cover", "blurOnParentHover", "nopointer")
                                    .src(coverState)
                                    .alt(album.title)
                                    .build()
                            ).build(),
                        create("div")
                            .classes("flex-v")
                            .children(
                                AlbumTemplates.audioActions(album, canEdit),
                                create("div")
                                    .classes("album-title-container", "flex-v", "small-gap")
                                    .children(
                                        create("span")
                                            .classes("date", "text-small")
                                            .text("Released " + Util.formatDate(album.release_date))
                                            .build()
                                    ).build(),
                                InteractionTemplates.interactions(EntityType.album, album),
                            ).build()
                    ).build(),
                TrackTemplates.tracksInList(noTracks, tracks, canEdit, album, "album", startCallback)
            ).build();
    }

    static albumPage(route: Route, params: Record<string, string>) {
        if (!currentUser.value) {
            navigate(RoutePath.explore);
            return nullElement();
        }

        const data = signal<{ album: Album|null, canEdit: boolean }>({
            album: null,
            canEdit: false
        });
        const loading = signal(true);
        Api.getAsync<{ album: Album, canEdit: boolean }>(ApiRoutes.getAlbumById, {id: params.id}).then(async res => {
            if (res.code === 200) {
                data.value = res.data;
                return;
            }
            data.value = {
                album: null,
                canEdit: false
            };
        }).finally(() => loading.value = false);

        const template = compute((d, l) => {
            if (!d || l) {
                return GenericTemplates.loadingSpinner();
            }

            if (!d.album || !d.album.tracks) {
                return PageTemplates.notFoundPage();
            }

            return AlbumTemplates.albumPageDisplay(d.album, d.canEdit);
        }, data, loading);

        return create("div")
            .children(
                template
            ).build();
    }

    static audioActions(album: Album, canEdit: boolean) {
        const isPlaying = compute((p, pHere) => p && p.type === "album" && p.id === album.id && pHere, playingFrom, playingHere);
        const duration = album.tracks!.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);
        const hasTracks = album.tracks!.length > 0;
        const playIcon = compute(p => p ? Icons.PAUSE : Icons.PLAY, isPlaying);
        const playText = compute((p): string => p ? "Pause" : "Play", isPlaying);

        return create("div")
            .classes("audio-actions", "flex")
            .children(
                when(currentUser, create("div")
                    .classes("flex")
                    .children(
                        when(hasTracks, button({
                            text: playText,
                            icon: {
                                icon: playIcon,
                                classes: ["inline-icon", "svg", "nopointer"],
                                adaptive: true,
                                isUrl: true
                            },
                            classes: ["secondary"],
                            attributes: ["duration", duration.toString()],
                            id: album.id,
                            disabled: !hasTracks,
                            onclick: async () => {
                                const current = currentTrackId.value;
                                const trackInAlbum = album.tracks!.find((track) => track.track_id === current);
                                if (trackInAlbum) {
                                    await AlbumActions.startTrackInAlbum(album, trackInAlbum.track_id, true);
                                } else {
                                    const firstTrack = album.tracks![0];
                                    await AlbumActions.startTrackInAlbum(album, firstTrack.track_id, true);
                                }
                            },
                        })),
                        MusicTemplates.addListToQueueButton(album),
                        button({
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
                    ).build()),
                when(canEdit, button({
                    text: "Edit",
                    icon: {icon: "edit"},
                    classes: ["positive"],
                    onclick: async () => {
                        let modal = GenericTemplates.modal([AlbumTemplates.editAlbumModal(album)], "edit-album");
                        Ui.addModal(modal);
                    }
                })),
                when(canEdit, button({
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    onclick: async () => {
                        await Ui.getConfirmationModal("Delete album", "Are you sure you want to delete this album?", "Yes", "No", () => AlbumActions.deleteAlbum(album.id), () => {
                        }, Icons.WARNING);
                    }
                }))
            ).build();
    }
}