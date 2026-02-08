import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { AnyNode, compute, create, InputType, Signal, signal, signalMap, TypeOrSignal, when } from "@targoninc/jess";
import { currentTrackId, currentUser, loadingAudio, manualQueue, playingFrom, playingHere } from "../../state.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { TrackTemplates } from "./TrackTemplates.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { Ui } from "../../Classes/Ui.ts";
import { MediaActions } from "../../Actions/MediaActions.ts";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { startItem } from "../../Actions/MusicActions.ts";
import { Icons } from "../../Enums/Icons.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { button, input } from "@targoninc/jess-components";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { Api } from "../../Api/Api.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { t } from "../../../locales";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { TrackList } from "../../Models/TrackList.ts";
import { CardFeedType, entityTypeByCardFeedType } from "../../Enums/CardFeedType.ts";
import { FeedItem } from "../../Models/FeedItem.ts";
import { Visibility } from "@targoninc/lyda-shared/src/Enums/Visibility";
import { truncateText } from "../../Classes/Helpers/CustomText.ts";
import { getFeedDisplayName } from "../../Classes/Helpers/FeedNames.ts";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { AlbumActions } from "../../Actions/AlbumActions.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";

export class MusicTemplates {
    static feedEntry(item: Track, newPlayingFrom: PlayingFrom) {
        const icons = [];
        const isPrivate = item.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }
        const playingClass = compute(
            (id): string => (id === item.id ? "playing" : "_"),
            currentTrackId,
        );

        return create("div")
            .classes(`feed-track`, "flex", "padded", "rounded", "fullWidth", "card", "align-children", playingClass)
            .id(item.id)
            .styles("max-width", "100%")
            .ondblclick(async () => {
                await startItem(item as Track, newPlayingFrom);
            })
            .children(
                MusicTemplates.playButton(EntityType.track, item.id, () => startItem(item, newPlayingFrom)),
                MusicTemplates.cover(EntityType.track, item, CoverContext.inline),
                create("div")
                    .classes("flex", "flex-grow", "no-gap", "space-between")
                    .children(
                        create("div")
                            .classes("flex-v", "flex-grow", "no-gap")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        MusicTemplates.title(EntityType.track, item.title, item.id, icons),
                                        item.collab ? TrackTemplates.collabIndicator(item.collab) : null,
                                        item.repost ? TrackTemplates.repostIndicator(item.repost) : null,
                                    ).build(),
                                create("div")
                                    .classes("flex")
                                    .children(
                                        UserTemplates.userLink(UserWidgetContext.card, item.user!, item.artistname),
                                        GenericTemplates.timestamp(item.created_at),
                                    ).build(),
                            ).build(),
                        create("div")
                            .classes("flex", "space-between", "align-children")
                            .children(
                                horizontal(
                                    TrackTemplates.addToQueueButton(item as Track),
                                    InteractionTemplates.interactions(EntityType.track, item),
                                ).classes("align-children"),
                            ).build(),
                    ).build(),
            ).build();
    }

    static cover(
        type: EntityType,
        item: FeedItem,
        coverContext: CoverContext,
        onclickOverride: Function | null = null,
    ) {
        const imageState = signal(DefaultImages[type]);
        const fileType = `${type}Cover` as MediaFileType;
        if (item.has_cover) {
            imageState.value = Util.getImage(item.id, fileType);
        }
        const coverLoading = signal(false);
        const start = async () => {
            if (onclickOverride) {
                await onclickOverride();
            } else {
                // TODO: Handle based on type
                await startItem(item as Track);
            }
        };
        const isOwnItem = compute(u => u?.id === item.user_id, currentUser);
        const playButtonContexts = [CoverContext.card, CoverContext.queue];
        const onlyShowOnHover = compute(
            id => coverContext !== CoverContext.standalone && id !== item.id,
            currentTrackId,
        );
        const buttonClass = compute(
            (s): string => (s ? "showOnParentHover" : "_"),
            onlyShowOnHover,
        );
        const hiddenClass = compute((s): string => (s ? "hidden" : "_"), onlyShowOnHover);

        return create("div")
            .classes("cover-container", "relative", "pointer", coverContext)
            .attributes(`${type}_id`, item.id)
            .id(item.id)
            .children(
                create("img")
                    .classes("cover", "blurOnParentHover")
                    .src(imageState)
                    .alt(item.title)
                    .onclick(() => {
                        Ui.showImageModal(imageState);
                    }).build(),
                when(
                    isOwnItem,
                    create("div")
                        .classes(
                            "hidden",
                            coverContext === CoverContext.standalone ? "showOnParentHover" : "_",
                            "centeredInParent",
                            "flex",
                        ).children(
                        MusicTemplates.entityCoverButtons(fileType, item, imageState, coverLoading),
                        when(coverLoading, GenericTemplates.loadingSpinner()),
                    ).build(),
                ),
                when(
                    playButtonContexts.includes(coverContext),
                    create("div")
                        .classes("centeredInParent", hiddenClass, buttonClass)
                        .children(MusicTemplates.playButton(type, item.id, start))
                        .build(),
                ),
            ).build();
    }

    static entityCoverButtons(fileType: MediaFileType, item: FeedItem, imageState: Signal<string>, coverLoading: Signal<boolean>) {
        return horizontal(
            GenericTemplates.deleteIconButton("delete-image-button", () =>
                MediaActions.deleteMedia(
                    fileType,
                    item.id,
                    imageState,
                    coverLoading,
                ),
            ),
            GenericTemplates.uploadIconButton("replace-image-button", () =>
                MediaActions.replaceImage(fileType, item.id, true, imageState, coverLoading)),
        );
    }

    static playButton(type: EntityType, itemId: number, start: Function) {
        const isPlaying = compute(
            (c, pf, p) => {
                if (type !== EntityType.track) {
                    return pf?.id === itemId && p;
                }

                return c === itemId && p;
            },
            currentTrackId,
            playingFrom,
            playingHere,
        );
        const onclick = async () => {
            if (playingHere.value && currentTrackId.value === itemId) {
                await PlayManager.pauseAsync(currentTrackId.value);
            } else {
                start();
            }
        };
        const isLoading = compute((id, loading) => id === itemId && loading, currentTrackId, loadingAudio);
        const icon = getPlayIcon(isPlaying, isLoading);
        const disabledClass = compute((l): string => l ? "disabled" : "_", loadingAudio);

        return GenericTemplates.roundIconButton(
            {
                icon,
                isUrl: true,
                classes: [compute((l): string => l ? "spinner-animation" : "_", isLoading)],
            },
            onclick,
            t("PLAY_PAUSE"),
            [disabledClass],
        );
    }

    static trackFeed(type: FeedType, user?: User) {
        const pageState = signal(1);
        const tracks$ = signal<Track[]>([]);
        const search = signal(type === FeedType.following ? "all" : "");
        const loading$ = signal(false);
        const pageSize = 10;
        const update = async () => {
            const pageNumber = pageState.value;
            const filter = search.value;
            const offset = (pageNumber - 1) * pageSize;
            const params = { offset, filter };
            loading$.value = true;
            const res = await Api.getFeed(`${ApiRoutes.trackFeed}/${type}`, Object.assign(params, {
                id: user?.id,
            }));
            const newTracks = res ?? [];

            if (newTracks && newTracks.length === 0 && pageNumber > 1) {
                pageState.value -= 1;
                loading$.value = false;
                return;
            }

            tracks$.value = newTracks;
            loading$.value = false;
        };
        pageState.subscribe(update);
        search.subscribe(update);
        const publicFeedTypes = [FeedType.explore, FeedType.profileTracks, FeedType.profileReposts];
        const searchableFeedTypes = [
            FeedType.profileTracks,
            FeedType.profileReposts,
            FeedType.history,
            FeedType.likedTracks,
            FeedType.boughtTracks,
        ];
        const feedVisible = compute(u => u || publicFeedTypes.includes(type), currentUser);
        setTimeout(() => update());
        const nextDisabled = compute(t => t.length < pageSize, tracks$);

        return create("div")
            .classes("fullHeight")
            .children(
                when(feedVisible, create("span")
                    .text(t("LOGIN_TO_SEE_FEED"))
                    .build(), true),
                // TODO: Make separate FeedDisplayImplementations - e.g. separate one for albums + playlists (view all tracks at once) and one for paginated feeds
                when(
                    feedVisible,
                    TrackTemplates.trackListWithPagination(tracks$, pageState, {
                        type,
                        name: getFeedDisplayName(type, user?.displayname),
                        id: user?.username,
                    }, loading$, search, nextDisabled, searchableFeedTypes.includes(type)),
                ),
            ).build();
    }

    static tracksInList(
        tracks: Signal<ListTrack[]>,
        canEdit: boolean,
        list: Album | Playlist,
        type: "album" | "playlist",
    ) {
        const noTracks = compute(t => t.length === 0, tracks);

        return create("div")
            .classes("flex-v")
            .children(
                when(
                    noTracks,
                    create("div")
                        .classes("card")
                        .children(
                            create("span")
                                .text(t("NOTHING_FOUND"))
                                .build(),
                        ).build(),
                ),
                signalMap(tracks, create("div").classes("flex-v"), (track, i) => {
                    let parent = horizontal().classes("fullWidth");
                    if (canEdit) {
                        parent = GenericTemplates.dragTargetInList(async (data: any) => {
                            await TrackActions.reorderTrack(type, list.id, data.id, tracks, i);
                        }, i.toString()).classes("fullWidth");
                    }

                    return create("div")
                        .classes("flex-v", "relative")
                        .children(
                            parent
                                .children(TrackTemplates.trackInList(track, canEdit, list, tracks, type))
                                .build(),
                        ).build();
                }),
            ).build();
    }

    static cardFeed(type: CardFeedType, user: User) {
        const fetchFunction: Record<CardFeedType, Function> = {
            [CardFeedType.profileAlbums]: Api.getAlbumsByUserId,
            [CardFeedType.profilePlaylists]: Api.getPlaylistsByUserId,
            [CardFeedType.likedAlbums]: Api.getLikedAlbums,
            [CardFeedType.likedPlaylists]: Api.getLikedPlaylists,
        };
        const page$ = signal(1);
        const entities$ = signal<TrackList[]>([]);
        const search$ = signal("");
        const loading$ = signal(false);
        const pageSize = 10;
        const update = async () => {
            const pageNumber = page$.value;
            const filter = search$.value;
            const offset = (pageNumber - 1) * pageSize;
            loading$.value = true;
            const res = await fetchFunction[type](user.id, user.username, offset, filter);
            const newTracks = res ?? [];

            if (newTracks && newTracks.length === 0 && pageNumber > 1) {
                page$.value -= 1;
                loading$.value = false;
                return;
            }

            entities$.value = newTracks;
            loading$.value = false;
        };
        page$.subscribe(update);
        search$.subscribe(update);
        setTimeout(() => update());
        const nextDisabled = compute(t => t.length < pageSize, entities$);

        return create("div")
            .classes("fullHeight", "fullWidth")
            .children(
                MusicTemplates.cardListWithPagination(entities$, page$, type, loading$, search$, nextDisabled, true),
            ).build();
    }

    static cardListWithPagination(entities$: Signal<TrackList[]>, page$: Signal<number>, type: CardFeedType, loading$: Signal<boolean>, search$: Signal<string>, nextDisabled: Signal<boolean>, hasSearch: TypeOrSignal<boolean>) {
        const empty = compute((t, l) => t.length === 0 && !l, entities$, loading$);

        return create("div")
            .classes("flex-v", "fullWidth")
            .children(
                horizontal(
                    horizontal(
                        GenericTemplates.paginationControls(page$, nextDisabled),
                        when(hasSearch, input({
                            type: InputType.text,
                            validators: [],
                            name: "list-filter",
                            placeholder: t("SEARCH"),
                            debounce: 200,
                            classes: ["round-input"],
                            onchange: value => search$.value = value,
                            value: search$,
                        })),
                    ).classes("align-children"),
                ).classes("space-between")
                 .build(),
                when(loading$, GenericTemplates.loadingSpinner()),
                compute(
                    list =>
                        horizontal(
                            ...list.reverse().map(list => MusicTemplates.cardItem(entityTypeByCardFeedType[type], list)),
                        ).build(),
                    entities$,
                ),
                when(empty, GenericTemplates.noTracks()),
                GenericTemplates.paginationControls(page$, nextDisabled),
            ).build();
    }

    static cardItem(type: EntityType, list: TrackList, isSecondary = false) {
        if (!list.user) {
            throw new Error(`Album has no user: ${list.id}`);
        }

        const icons = [];
        if (list.visibility === Visibility.private) {
            icons.push(GenericTemplates.lock());
        }

        return create("div")
            .classes(`${type}-card`, "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                vertical(
                    MusicTemplates.cover(type, list, CoverContext.card, async () => {
                        const firstTrack = list.tracks![0];
                        if (type === "album") {
                            await AlbumActions.startTrackInAlbum(list as Album, firstTrack.track!, true);
                        } else if (type === "playlist") {
                            await PlaylistActions.startTrackInPlaylist(list as Playlist, firstTrack.track!, true);
                        }
                    }),
                    horizontal(
                        InteractionTemplates.interactions(type, list, {
                            showCount: false,
                        }),
                        MusicTemplates.title(type, list.title, list.id, icons),
                    ).classes("align-children"),
                ),
            ).build();
    }

    static addListToQueueButton(list: Playlist | Album) {
        const allTracksInQueue = compute(
            q => list.tracks && list.tracks.length > 0 && list.tracks.every(t => q.includes(t.track_id)),
            manualQueue,
        );
        const text = compute((q): string => (q ? `${t("UNQUEUE")}` : `${t("QUEUE")}`), allTracksInQueue);
        const icon = compute((q): string => (q ? Icons.UNQUEUE : Icons.QUEUE), allTracksInQueue);
        const buttonClass = compute(
            (q): string => (q ? "audio-queueremove" : "audio-queueadd"),
            allTracksInQueue,
        );

        return button({
            text,
            icon: {
                icon,
                classes: ["inline-icon", "svg", "nopointer"],
                adaptive: true,
                isUrl: true,
            },
            classes: [buttonClass, "secondary"],
            onclick: async () => {
                for (const track of list.tracks!) {
                    if (!manualQueue.value.includes(track.track_id)) {
                        QueueManager.addToManualQueue(track.track_id);
                    }
                }
            },
        });
    }

    static title(type: EntityType, title: string, id: number, icons: AnyNode[] = [], textSize: TextSize = TextSize.large, goToEntity = true) {
        let baseRoute = RoutePath.track;
        switch (type) {
            case EntityType.album:
                baseRoute = RoutePath.album;
                break;
            case EntityType.playlist:
                baseRoute = RoutePath.playlist;
                break;
        }

        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes(...(goToEntity ? ["clickable", "pointer"] : ["_"]), textSize)
                    .title(title)
                    .text(truncateText(title, 75))
                    .onclick(() => goToEntity ? navigate(`${baseRoute}/${id}`) : null)
                    .build(),
                ...icons,
            ).build();
    }
}
