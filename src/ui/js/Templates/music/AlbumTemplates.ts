import { Icons } from "../../Enums/Icons.ts";
import { AlbumActions } from "../../Actions/AlbumActions.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { createModal, Ui } from "../../Classes/Ui.ts";
import { AnyNode, compute, create, InputType, signal, Signal, when } from "@targoninc/jess";
import { navigate, Route } from "../../Routing/Router.ts";
import { currentTrackId, currentUser, loadingAudio, playingFrom, playingHere } from "../../state.ts";
import { PageTemplates } from "../PageTemplates.ts";
import { button, icon, input, textarea, toggle } from "@targoninc/jess-components";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { Visibility } from "@targoninc/lyda-shared/src/Enums/Visibility";
import { Time } from "../../Classes/Helpers/Time.ts";
import { CustomText } from "../../Classes/Helpers/CustomText.ts";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { SearchTemplates } from "../SearchTemplates.ts";
import { SearchContext } from "@targoninc/lyda-shared/src/Enums/SearchContext.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { BuyTemplates } from "../money/BuyTemplates.ts";
import { FormTemplates } from "../generic/FormTemplates.ts";

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
                .text(t("NO_ALBUMS_FOUND"))
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
        const buttonText = compute((ch: number[]) => `${t("ADD_TO_N_ALBUMS", ch.length)}`, checkedAlbums);

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
                            .text(t("ADD_TITLE_TO_ALBUM", track.title))
                            .build(),
                    ).build(),
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
                            icon: { icon: "forms_add_on" },
                            disabled: compute((ch: number[]) => ch.length === 0, checkedAlbums),
                            onclick: async () => {
                                await AlbumActions.addTrackToAlbums(track.id, checkedAlbums.value);
                            },
                        }),
                        button({
                            text: t("CANCEL"),
                            classes: ["negative"],
                            icon: { icon: "close" },
                            onclick: Util.removeModal,
                        }),
                    ).build(),
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
                MusicTemplates.cover(EntityType.album, item, CoverContext.inline),
                create("span")
                    .text(item.title)
                    .build(),
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
                            .text(t("EDIT_ALBUM"))
                            .build(),
                    ).build(),
                AlbumTemplates.albumInputs(state),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("UPDATE"),
                            disabled: loading,
                            classes: ["positive"],
                            icon: { icon: "save" },
                            onclick: async () => {
                                loading.value = true;
                                Api.updateAlbum(state.value)
                                   .then(() => Util.removeModal())
                                   .finally(() => loading.value = false);
                            },
                        }),
                        GenericTemplates.modalCancelButton(),
                    ).build(),
            ).build();
    }

    static albumInputs(album: Signal<Partial<Album>>) {
        const name = compute((s) => s.title ?? "", album);
        const upc = compute((s) => s.upc ?? "", album);
        const description = compute((s) => s.description ?? "", album);
        const visibility = compute((s) => s.visibility === "private", album);
        const price = compute((s) => s.price ?? 0, album);

        return create("div")
            .classes("flex-v")
            .id("newAlbumForm")
            .children(
                input<string>({
                    type: InputType.text,
                    required: true,
                    name: "name",
                    label: t("NAME"),
                    placeholder: t("ALBUM_NAME"),
                    value: name,
                    onchange: (v) => {
                        album.value = { ...album.value, title: v };
                    },
                }),
                input<string>({
                    type: InputType.text,
                    name: "upc",
                    label: t("UPC"),
                    placeholder: t("TWELVE_DIGIT_NUMBER"),
                    value: upc,
                    onchange: (v) => {
                        album.value = { ...album.value, upc: v };
                    },
                }),
                textarea({
                    name: "description",
                    label: t("DESCRIPTION"),
                    placeholder: t("EXAMPLE_ALBUM_NAME"),
                    value: description,
                    onchange: (v) => {
                        album.value = { ...album.value, description: v };
                    },
                }),
                GenericTemplates.releaseDateInput(album),
                FormTemplates.moneyField(t("MINIMUM_ALBUM_PRICE_USD"), "price", "0", price, false, (v) => {
                    album.value = { ...album.value, price: v };
                }, 0),
                toggle({
                    name: "visibility",
                    label: t("PRIVATE"),
                    text: t("PRIVATE"),
                    checked: visibility,
                    onchange: (v) => {
                        album.value = { ...album.value, visibility: v ? Visibility.private : Visibility.public };
                    },
                }),
            ).build();
    }

    private static albumPageDisplay(album: Album, canEdit: boolean, canBuy: boolean, canDownload: boolean, reload: () => void) {
        const albumUser = album.user!;
        const tracks = signal<ListTrack[]>(album.tracks ?? []);
        const duration = album.tracks!.reduce((acc, t) => acc + (t.track?.length ?? 0), 0);

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
                        horizontal(
                            when(canDownload && !canEdit, GenericTemplates.pill({
                                icon: "order_approve",
                                onclick: () => {},
                                text: t("BOUGHT"),
                            })),
                            UserTemplates.userWidget(albumUser, [], [], UserWidgetContext.singlePage),
                        ).classes("align-children"),
                    ).build(),
                horizontal(
                    GenericTemplates.timestamp(album.release_date),
                    create("span")
                        .classes("date", TextSize.small)
                        .text(t("DURATION", Time.format(duration)))
                        .build(),
                ).build(),
                create("div")
                    .classes("album-info-container", "flex")
                    .children(
                        MusicTemplates.cover(EntityType.album, album, CoverContext.standalone),
                        vertical(
                            AlbumTemplates.audioActions(album, canEdit, canBuy),
                            InteractionTemplates.interactions(EntityType.album, album),
                        ),
                    ).build(),
                create("span")
                    .id("track-description")
                    .classes("card", "description", "break-lines", "padded")
                    .html(CustomText.renderToHtml(album.description))
                    .build(),
                MusicTemplates.tracksInList(tracks, canEdit, album, "album"),
                when(canEdit, vertical(
                    create("span")
                        .text(t("ADD_TRACK_TO_TITLE", album.title))
                        .build(),
                    create("div")
                        .children(
                            SearchTemplates.search(
                                SearchContext.searchPage,
                                async (result) => {
                                    if (result.type !== "track") {
                                        return;
                                    }
                                    await Api.addTrackToAlbums(result.id, [album.id]);
                                    reload();
                                },
                                [ApiRoutes.searchTracks], [],
                                ["fullWidth"],
                            ),
                        )
                ).classes("card").build()),
            ).build();
    }

    static albumPage(route: Route, params: Record<string, string>) {
        const data = signal<{ album: Album | null, canEdit: boolean, canBuy: boolean, canDownload: boolean }>({
            album: null,
            canEdit: false,
            canBuy: false,
            canDownload: false,
        });
        const loading = signal(true);
        const reload = () => {
            Api.getAlbumById(parseInt(params.id)).then(async res => {
                if (res) {
                    data.value = res;
                    document.title = res.album.title;
                    return;
                }
                data.value = {
                    album: null,
                    canEdit: false,
                    canBuy: false,
                    canDownload: false,
                };
            }).finally(() => loading.value = false);
        }
        reload();

        const template = compute((d, l) => {
            if (!d || l) {
                return GenericTemplates.loadingSpinner();
            }

            if (!d.album || !d.album.tracks) {
                return PageTemplates.notFoundPage();
            }

            return AlbumTemplates.albumPageDisplay(d.album, d.canEdit, d.canBuy, d.canDownload, reload);
        }, data, loading);

        return create("div")
            .children(
                template,
            ).build();
    }

    static audioActions(album: Album, canEdit: boolean, canBuy: boolean = false) {
        const isPlaying = compute((p, pHere) => (p && p.type === "album" && p.id === album.id && pHere) ?? false, playingFrom, playingHere);
        const hasTracks = album.tracks!.length > 0;
        const playIcon = getPlayIcon(isPlaying, loadingAudio);
        const playText = compute((p): string => p ? "Pause" : "Play", isPlaying);

        return horizontal(
            when(currentUser, horizontal(
                when(hasTracks, button({
                    text: playText,
                    icon: {
                        icon: playIcon,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true,
                    },
                    classes: ["special", "bigger-input", "rounded-max"],
                    id: album.id,
                    disabled: !hasTracks,
                    onclick: async () => {
                        const current = currentTrackId.value;
                        const trackInAlbum = album.tracks!.find((track) => track.track_id === current);
                        if (trackInAlbum) {
                            await AlbumActions.startTrackInAlbum(album, trackInAlbum.track!, true);
                        } else {
                            const firstTrack = album.tracks![0];
                            await AlbumActions.startTrackInAlbum(album, firstTrack.track!, true);
                        }
                    },
                })),
                MusicTemplates.addListToQueueButton(album),
                button({
                    text: t("ADD_TO_PLAYLIST"),
                    icon: {
                        icon: Icons.PLAYLIST_ADD,
                        classes: ["inline-icon", "svg", "nopointer"],
                        adaptive: true,
                        isUrl: true,
                    },
                    classes: ["secondary"],
                    onclick: async () => {
                        await PlaylistActions.openAddToPlaylistModal(album, "album");
                    },
                }),
                when(canBuy, button({
                    icon: { icon: "attach_money" },
                    text: t("BUY"),
                    onclick: () => {
                        BuyTemplates.openBuyModal({ type: "album", entity: album }, () => {
                            window.location.reload();
                        });
                    },
                })),
                when(canEdit, button({
                    text: t("EDIT"),
                    icon: { icon: "edit" },
                    onclick: async () => {
                        createModal([AlbumTemplates.editAlbumModal(album)], "edit-album");
                    },
                })),
                when(canEdit, button({
                    text: t("DELETE"),
                    icon: { icon: "delete" },
                    classes: ["negative"],
                    onclick: async () => {
                        await Ui.getConfirmationModal(t("DELETE_ALBUM"), t("SURE_DELETE_ALBUM"), t("YES"), t("NO"), () => AlbumActions.deleteAlbum(album.id), () => {
                        }, Icons.WARNING);
                    },
                })),
            ).classes("align-children").build()),
        ).build();
    }

    static createAlbumPage() {
        const album = signal(<Partial<Album>>{
            title: "",
            upc: "",
            description: "",
            release_date: new Date(),
            visibility: Visibility.private,
            price: 0,
        });
        const disabled = compute((s) => {
            return !s.title || s.title === "";
        }, album);

        return vertical(
            create("h2")
                .children(
                    icon({
                        icon: Icons.ALBUM_ADD,
                        adaptive: true,
                        isUrl: true,
                        classes: ["inline-icon", "svg", "nopointer"],
                    }),
                    create("span")
                        .text(t("NEW_ALBUM"))
                        .build(),
                ).build(),
            AlbumTemplates.albumInputs(album),
            horizontal(
                button({
                    text: t("CREATE"),
                    disabled,
                    onclick: async () => {
                        const id = await Api.createNewAlbum(album.value);
                        if (id) {
                            navigate(`${RoutePath.album}/${id}`);
                        }
                    },
                    icon: { icon: "playlist_add" },
                    classes: ["positive"],
                }),
            ).build(),
        ).classes("card").build();
    }
}