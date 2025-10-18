import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { AnyNode, compute, create, InputType, Signal, signal, TypeOrSignal, when } from "@targoninc/jess";
import { currentTrackId, currentUser, loadingAudio, manualQueue, playingFrom, playingHere } from "../../state.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
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

export class MusicTemplates {
    static feedEntry(type: EntityType, item: Track | Playlist | Album) {
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
            .classes("flex")
            .children(
                create("div")
                    .classes(`feed-${type}`, "flex", "padded", "rounded", "fullWidth", "card", "align-children", playingClass)
                    .id(item.id)
                    .styles("max-width", "100%")
                    .children(
                        MusicTemplates.playButton(type, item.id, () => startItem(type, item)),
                        MusicTemplates.cover(type, item, "inline-cover"),
                        create("div")
                            .classes("flex", "flex-grow", "no-gap", "space-between")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        create("div")
                                            .classes("flex-v", "flex-grow", "no-gap")
                                            .children(
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        MusicTemplates.title(type, item.title, item.id, icons),
                                                        item.collab ? TrackTemplates.collabIndicator(item.collab) : null,
                                                        item.repost ? TrackTemplates.repostIndicator(item.repost) : null,
                                                    ).build(),
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        UserTemplates.userLink(UserWidgetContext.card, item.user!),
                                                        create("span")
                                                            .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                            .text(Time.ago(item.created_at))
                                                            .build(),
                                                    ).build(),
                                            ).build(),
                                    ).build(),
                                create("div")
                                    .classes("flex", "space-between", "align-children")
                                    .children(
                                        horizontal(
                                            when(
                                                type === EntityType.track,
                                                TrackTemplates.addToQueueButton(item as Track),
                                            ),
                                            InteractionTemplates.interactions(type, item),
                                        ).classes("align-children"),
                                    ).build(),
                            ).build(),
                    ).build(),
            ).build();
    }

    static cover(
        type: EntityType,
        item: Track | TrackList | Playlist | Album,
        coverContext: string,
        startCallback: Function | null = null,
    ) {
        const imageState = signal(DefaultImages[type]);
        const fileType = `${type}Cover` as MediaFileType;
        if (item.has_cover) {
            imageState.value = Util.getImage(item.id, fileType);
        }
        const coverLoading = signal(false);
        const start = async () => startItem(type, item, { startCallback });
        const isOwnItem = compute(u => u?.id === item.user_id, currentUser);
        const playButtonContexts = ["card-cover", "queue-cover"];
        const onlyShowOnHover = compute(
            id => coverContext !== "cover" && id !== item.id,
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
                            coverContext === "cover" ? "showOnParentHover" : "_",
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

    static entityCoverButtons(fileType: MediaFileType, item: Track | TrackList | Playlist | Album, imageState: Signal<string>, coverLoading: Signal<boolean>) {
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
                TrackActions.replaceCover(item.id, true, imageState, coverLoading),
            ),
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

        return GenericTemplates.roundIconButton(
            {
                icon,
                isUrl: true,
                classes: [compute((l): string => l ? "spinner-animation" : "_", isLoading)],
            },
            onclick,
        );
    }

    static feed(type: FeedType, options: Record<string, any> = {}) {
        const endpointMap: Record<FeedType, string> = {
            [FeedType.following]: ApiRoutes.followingFeed,
            [FeedType.explore]: ApiRoutes.exploreFeed,
            [FeedType.history]: ApiRoutes.historyFeed,
            [FeedType.autoQueue]: ApiRoutes.autoQueueFeed,
            [FeedType.profileTracks]: ApiRoutes.profileTracksFeed,
            [FeedType.profileReposts]: ApiRoutes.profileRepostsFeed,
            [FeedType.likedTracks]: ApiRoutes.likedTracksFeed,
            [FeedType.boughtTracks]: ApiRoutes.boughtTracksFeed,
        };
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
            const res = await Api.getFeed(endpointMap[type], Object.assign(params, options));
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
        const searchableFeedTypes = [FeedType.profileTracks, FeedType.profileReposts, FeedType.history, FeedType.likedTracks, FeedType.boughtTracks];
        const feedVisible = compute(u => u || publicFeedTypes.includes(type), currentUser);
        setTimeout(() => update());
        const nextDisabled = compute(t => t.length < pageSize, tracks$);

        return create("div")
            .classes("fullHeight")
            .children(
                when(feedVisible, create("span")
                    .text(t("LOGIN_TO_SEE_FEED"))
                    .build(), true),
                when(
                    feedVisible,
                    TrackTemplates.trackListWithPagination(tracks$, pageState, type, loading$, search, nextDisabled, searchableFeedTypes.includes(type)),
                ),
            ).build();
    }

    static cardFeed(type: CardFeedType, options: Record<string, any> = {}) {
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
            const res = await fetchFunction[type](options.id, options.name, offset, filter);
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
                        TrackTemplates.paginationControls(page$, nextDisabled),
                        when(hasSearch, input({
                            type: InputType.text,
                            validators: [],
                            name: "list-filter",
                            placeholder: t("SEARCH"),
                            debounce: 200,
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
                TrackTemplates.paginationControls(page$, nextDisabled),
            ).build();
    }

    static cardItem(type: EntityType, list: TrackList, isSecondary = false) {
        if (!list.user) {
            throw new Error(`Album has no user: ${list.id}`);
        }

        const icons = [];
        if (list.visibility === "private") {
            icons.push(GenericTemplates.lock());
        }

        return create("div")
            .classes(`${type}-card`, "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                vertical(
                    MusicTemplates.cover(type, list, "card-cover"),
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
            q => list.tracks && list.tracks.every(t => q.includes(t.track_id)),
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

    static title(type: EntityType, title: string, id: number, icons: AnyNode[] = [], textSize: string = "text-large", goToEntity = true) {
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
                    .text(title)
                    .onclick(() => goToEntity ? navigate(`${baseRoute}/${id}`) : null)
                    .build(),
                ...icons,
            ).build();
    }
}
