import { AuthActions } from "../Actions/AuthActions.ts";
import { LandingPageTemplates } from "./LandingPageTemplates.ts";
import { UserTemplates } from "./account/UserTemplates.ts";
import { AnyElement, compute, create, InputType, nullElement, signal, signalMap, Signal, when } from "@targoninc/jess";
import { SearchTemplates } from "./SearchTemplates.ts";
import { SettingsTemplates } from "./account/SettingsTemplates.ts";
import { RoadmapTemplates } from "./RoadmapTemplates.ts";
import { EventsTemplates } from "./admin/EventsTemplates.ts";
import { AlbumTemplates } from "./music/AlbumTemplates.ts";
import { RoutePath } from "../Routing/routes.ts";
import { DashboardTemplates } from "./admin/DashboardTemplates.ts";
import { ModerationUsersTemplates } from "./admin/ModerationUsersTemplates.ts";
import { ModerationCommentsTemplates } from "./admin/ModerationCommentsTemplates.ts";
import { LogTemplates } from "./admin/LogTemplates.ts";
import { RoyaltyTemplates } from "./admin/RoyaltyTemplates.ts";
import { ContentIDTemplates } from "./admin/ContentIDTemplates.ts";
import { SubscriptionPaymentsTemplates } from "./admin/SubscriptionPaymentsTemplates.ts";
import { IpLogTemplates } from "./admin/IpLogTemplates.ts";
import { PayoutTemplates } from "./money/PayoutTemplates.ts";
import { FeedTemplates } from "./generic/FeedTemplates.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { TrackEditTemplates } from "./music/TrackEditTemplates.ts";
import { navigate, Route } from "../Routing/Router.ts";
import { copy } from "../Classes/Util.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { currentSecretCode, currentTrackId, currentUser, playingHere } from "../state.ts";
import { TrackTemplates } from "./music/TrackTemplates.ts";
import { PlaylistTemplates } from "./music/PlaylistTemplates.ts";
import { StatisticTemplates } from "./StatisticTemplates.ts";
import { ParentGenreGroup } from "./generic/ParentGenreGroup.ts";
import { notify } from "../Classes/Ui.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Api } from "../Api/Api.ts";
import { GenericTemplates, horizontal, tabSelected, vertical } from "./generic/GenericTemplates.ts";
import { InteractionTemplates } from "./InteractionTemplates.ts";
import { FeedMenuAction } from "../Models/FeedConfig.ts";
import { TrackList } from "../Models/TrackList.ts";
import { Images } from "../Enums/Images.ts";
import { DefaultImages } from "../Enums/DefaultImages.ts";
import { Util } from "../Classes/Util.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { UserWidgetContext } from "../Enums/UserWidgetContext.ts";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { AlbumActions } from "../Actions/AlbumActions.ts";
import { PlaylistActions } from "../Actions/PlaylistActions.ts";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { heading, button } from "@targoninc/jess-components";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { Genre } from "@targoninc/lyda-shared/src/Enums/Genre";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";
import { SubscriptionTemplates } from "./money/SubscriptionTemplates.ts";
import { t } from "../../locales";
import { TransactionTemplates } from "./money/TransactionTemplates.ts";
import { TagEditor } from "./generic/TagEditor.ts";

export class PageTemplates {
    static mapping: Record<RoutePath, (route: Route, params: Record<string, string>) => Promise<AnyElement> | AnyElement> = {
        [RoutePath.explore]: () => PageTemplates.explorePage(),
        [RoutePath.following]: () => FeedTemplates.feed(FeedType.following),
        [RoutePath.history]: () => FeedTemplates.feed(FeedType.history, undefined, {sortable: false}),
        [RoutePath.album]: AlbumTemplates.albumPage,
        [RoutePath.playlist]: PlaylistTemplates.playlistPage,
        [RoutePath.profile]: UserTemplates.profile,
        [RoutePath.settings]: SettingsTemplates.settingsPage,
        [RoutePath.statistics]: PageTemplates.statisticsPage,
        [RoutePath.track]: PageTemplates.trackPage,
        [RoutePath.editTrack]: TrackEditTemplates.editTrackPage,
        [RoutePath.upload]: TrackEditTemplates.uploadPage,
        [RoutePath.library]: PageTemplates.libraryPage,
        [RoutePath.logout]: PageTemplates.logoutPage,
        [RoutePath.login]: LandingPageTemplates.newLandingPage,
        [RoutePath.faq]: PageTemplates.faqPage,
        [RoutePath.notFound]: PageTemplates.notFoundPage,
        [RoutePath.unapprovedTracks]: PageTemplates.unapprovedTracksPage,
        [RoutePath.test]: LandingPageTemplates.newLandingPage,
        [RoutePath.subscribe]: PageTemplates.subscribePage,
        [RoutePath.passwordReset]: LandingPageTemplates.newLandingPage,
        [RoutePath.verifyEmail]: LandingPageTemplates.newLandingPage,
        [RoutePath.search]: SearchTemplates.searchPage,
        [RoutePath.roadmap]: RoadmapTemplates.roadmapPage,
        [RoutePath.editTracks]: TrackEditTemplates.batchEditTracksPage,
        [RoutePath.protocolHandler]: PageTemplates.protocolHandlerPage,
        [RoutePath.transactions]: TransactionTemplates.page,
        [RoutePath.createAlbum]: AlbumTemplates.createAlbumPage,
        [RoutePath.createPlaylist]: PlaylistTemplates.createPlaylistPage,

        // admin pages
        [RoutePath.admin]: DashboardTemplates.dashboardPage,
        [RoutePath.royaltyManagement]: RoyaltyTemplates.royaltyManagementPage,
        [RoutePath.moderation]: ModerationCommentsTemplates.commentModerationPage,
        [RoutePath.logs]: LogTemplates.logsPage,
        [RoutePath.actionLogs]: LogTemplates.actionLogsPage,
        [RoutePath.users]: ModerationUsersTemplates.usersPage,
        [RoutePath.events]: EventsTemplates.eventsPage,
        [RoutePath.contentID]: ContentIDTemplates.contentIDPage,
        [RoutePath.subscriptionPayments]: SubscriptionPaymentsTemplates.page,
        [RoutePath.ipLogs]: IpLogTemplates.ipLogsPage,
    };
    static needLoginPages: RoutePath[] = [
        RoutePath.library,
        RoutePath.upload,
        RoutePath.settings,
        RoutePath.statistics,
        RoutePath.following,
        RoutePath.unapprovedTracks,
        RoutePath.moderation,
        RoutePath.subscribe,
        RoutePath.admin,
        RoutePath.royaltyManagement,
        RoutePath.moderation,
        RoutePath.logs,
        RoutePath.actionLogs,
        RoutePath.users,
        RoutePath.events,
        RoutePath.contentID,
        RoutePath.editTracks,
        RoutePath.transactions,
        RoutePath.createAlbum,
        RoutePath.createAlbum,
        RoutePath.subscriptionPayments,
    ];

    static async libraryPage(route: Route, params: Record<string, string>) {
        const selfUser = currentUser.value;
        const name = params["name"] ?? selfUser?.username;

        if (!selfUser) {
            notify(`${t("LOGIN_TO_VIEW_LIBRARY")}`, NotificationType.error);
            return create("div")
                .text(t("LOGIN_TO_VIEW_LIBRARY"))
                .build();
        }

        const user = signal<User>({
            username: name,
        } as User);
        if (selfUser.username === name) {
            user.value = selfUser;
        } else {
            user.value = await Api.getUserByName(name) as User;
        }

        document.title = `${t("LIBRARY")} - @${name}`;
        return UserTemplates.libraryPage(user, selfUser.username === name);
    }

    static explorePage() {
        const tabs = [`${t("TRACKS")}`, `${t("ALBUMS")}`, `${t("PLAYLISTS")}`, `${t("GENRES")}`];
        const urlTabs = ["tracks", "albums", "playlists", "genres"];
        const urlParams = new URLSearchParams(window.location.search);
        const initialTab = urlTabs.indexOf(urlParams.get("tab") ?? "");
        const selectedTab = signal(initialTab === -1 ? 0 : initialTab);

        selectedTab.subscribe(i => {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", urlTabs[i]);
            window.history.replaceState(null, "", url.toString());
        });

        const baseAlbumColumns = [
            {
                key: "title",
                header: t("TITLE"),
                render: (list: TrackList) => {
                    const coverSrc = signal(DefaultImages[EntityType.album]);
                    if (list.has_cover) {
                        Util.getCachedImage(list.id, MediaFileType.albumCover).then(url => {
                            coverSrc.value = url;
                        });
                    }
                    return create("div")
                        .classes("flex", "align-children", "small-gap")
                        .children(
                            create("img").classes("feed-inline-cover").src(coverSrc).alt(list.title).build(),
                            create("span").classes("feed-title", "clickable", "pointer")
                                .text(list.title)
                                .onclick((e: Event) => {
                                    e.stopPropagation();
                                    navigate(`/album/${list.id}`);
                                })
                                .build(),
                        ).build();
                },
            },
            {
                key: "tracks",
                header: t("TRACKS"),
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String((list as any).tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => (list as any).user ? UserTemplates.userLink(UserWidgetContext.card, (list as any).user) : nullElement(),
            },
        ];

        const basePlaylistColumns = [
            {
                key: "title",
                header: t("TITLE"),
                render: (list: TrackList) => {
                    const coverSrc = signal(Images.DEFAULT_COVER_PLAYLIST);
                    if (list.has_cover) {
                        Util.getCachedImage(list.id, MediaFileType.playlistCover).then(url => {
                            coverSrc.value = url;
                        });
                    }
                    return create("div")
                        .classes("flex", "align-children", "small-gap")
                        .children(
                            create("img").classes("feed-inline-cover").src(coverSrc).alt(list.title).build(),
                            create("span").classes("feed-title", "clickable", "pointer")
                                .text(list.title)
                                .onclick((e: Event) => {
                                    e.stopPropagation();
                                    navigate(`/playlist/${list.id}`);
                                })
                                .build(),
                        ).build();
                },
            },
            {
                key: "tracks",
                header: t("TRACKS"),
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String((list as any).tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => (list as any).user ? UserTemplates.userLink(UserWidgetContext.card, (list as any).user) : nullElement(),
            },
        ];

        const tabRow = create("div")
            .classes("flex", "space-between", "align-children")
            .children(
                GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i, selectedTab.value),
            ).build();

        const genreExploreState = PageTemplates.genreExploreSection();

        return create("div")
            .classes("feed-wrapper", "flex-v", "fullWidth")
            .children(
                GenericTemplates.fixedBar([tabRow]),
                create("div").classes("fixed-bar-content").children(
                    when(
                        tabSelected(selectedTab, 0),
                        FeedTemplates.feed(FeedType.explore, undefined, {noToolbar: true}),
                    ),
                    when(
                        tabSelected(selectedTab, 1),
                        FeedTemplates.create<TrackList>({
                            id: "feed-explore-albums",
                            columns: baseAlbumColumns,
                            compact: true,
                            pageSize: 100,
                            noToolbar: true,
                            fetchPage: async (offset, limit, filter) => {
                                const res = await Api.getFeed(ApiRoutes.exploreAlbumsFeed, { offset, limit, filter: filter || "" });
                                if (!res) return { items: [], total: 0 };
                                if (Array.isArray(res)) return { items: res, total: res.length };
                                return res;
                            },
                            buildMenuActions: (list): FeedMenuAction<TrackList>[] => [
                                {
                                    label: t("QUEUE"),
                                    icon: "queue",
                                    onclick: (l) => (l as any).tracks?.forEach((t: any) => QueueManager.addToManualQueue(t.track_id)),
                                    show: (l) => !!(l as any).tracks?.length,
                                },
                                {
                                    label: t("COPY_LINK"),
                                    icon: "link",
                                    onclick: (l) => copy(window.location.origin + `/album/${l.id}`),
                                },
                                {
                                    label: t("OPEN_IN_NEW_TAB"),
                                    icon: "open_in_new",
                                    onclick: (l) => window.open(`/album/${l.id}`, "_blank"),
                                },
                            ],
                            onPlayToggle: async (list) => {
                                const ft = (list as any).tracks?.[0]?.track;
                                if (ft) await AlbumActions.startTrackInAlbum(list as Album, ft, true);
                            },
                            isPlaying: (id) => compute((c, p) => c === id && p, currentTrackId, playingHere),
                            dateRender: (list) => GenericTemplates.timestamp((list as any).created_at, ["hideOnSmallBreakpoint"]),
                            onNavigate: (list) => window.open(`/album/${list.id}`, "_blank"),
                        }),
                    ),
                    when(
                        tabSelected(selectedTab, 2),
                        FeedTemplates.create<TrackList>({
                            id: "feed-explore-playlists",
                            columns: basePlaylistColumns,
                            compact: true,
                            pageSize: 100,
                            noToolbar: true,
                            fetchPage: async (offset, limit, filter) => {
                                const res = await Api.getFeed(ApiRoutes.explorePlaylistsFeed, { offset, limit, filter: filter || "" });
                                if (!res) return { items: [], total: 0 };
                                if (Array.isArray(res)) return { items: res, total: res.length };
                                return res;
                            },
                            buildMenuActions: (list): FeedMenuAction<TrackList>[] => [
                                {
                                    label: t("QUEUE"),
                                    icon: "queue",
                                    onclick: (l) => (l as any).tracks?.forEach((t: any) => QueueManager.addToManualQueue(t.track_id)),
                                    show: (l) => !!(l as any).tracks?.length,
                                },
                                {
                                    label: t("COPY_LINK"),
                                    icon: "link",
                                    onclick: (l) => copy(window.location.origin + `/playlist/${l.id}`),
                                },
                                {
                                    label: t("OPEN_IN_NEW_TAB"),
                                    icon: "open_in_new",
                                    onclick: (l) => window.open(`/playlist/${l.id}`, "_blank"),
                                },
                            ],
                            onPlayToggle: async (list) => {
                                const ft = (list as any).tracks?.[0]?.track;
                                if (ft) await PlaylistActions.startTrackInPlaylist(list as Playlist, ft, true);
                            },
                            isPlaying: (id) => compute((c, p) => c === id && p, currentTrackId, playingHere),
                            dateRender: (list) => GenericTemplates.timestamp((list as any).created_at, ["hideOnSmallBreakpoint"]),
                            onNavigate: (list) => window.open(`/playlist/${list.id}`, "_blank"),
                        }),
                    ),
                    when(
                        tabSelected(selectedTab, 3),
                        genreExploreState,
                    ),
                ).build(),
            ).build();
    }

    private static genreExploreSection() {
        const urlParams = new URLSearchParams(window.location.search);
        const initialGenres = urlParams.get("genres")?.split(",").filter(g => g.trim()) ?? [];
        const selectedGenres$ = signal<Genre[]>(initialGenres as Genre[]);
        const reloadTrigger$ = signal(0);
        const expanded = signal(false);

        selectedGenres$.subscribe(() => {
            const url = new URL(window.location.href);
            if (selectedGenres$.value.length > 0) {
                url.searchParams.set("genres", selectedGenres$.value.join(","));
            } else {
                url.searchParams.delete("genres");
            }
            window.history.replaceState(null, "", url.toString());
            reloadTrigger$.value++;
        });

        const hasGenres = compute(s => s.length > 0, selectedGenres$);

        const genreGroup = ParentGenreGroup({
            selectedGenres: selectedGenres$,
            maxGenres: 10,
            placeholder: t("FILTER_GENRES"),
            label: t("GENRE"),
            listVisible: expanded,
        });

        const noGenres = compute(g => g.length === 0, selectedGenres$);

        return vertical(
            genreGroup,
            when(hasGenres, FeedTemplates.create<Track>({
                id: "feed-genre-explore",
                compact: true,
                pageSize: 100,
                noToolbar: true,
                searchOverride$: compute(_ => `reload-${reloadTrigger$.value}`, reloadTrigger$),
                columns: [
                    {
                        key: "title",
                        header: t("TRACK_TITLE"),
                        render: (track) => {
                            const icons: any[] = [];
                            if (track.visibility === "private") icons.push(GenericTemplates.lock());
                            const coverSrc = signal(DefaultImages[EntityType.track]);
                            if (track.has_cover) {
                                Util.getCachedImage(track.id, MediaFileType.trackCover).then(url => {
                                    coverSrc.value = url;
                                });
                            }
                            return create("div")
                                .classes("flex", "align-children", "small-gap", "noflexwrap")
                                .children(
                                    create("img")
                                        .classes("feed-inline-cover")
                                        .src(coverSrc)
                                        .alt(track.title)
                                        .build(),
                                    create("div").classes("flex-v", "no-gap")
                                        .children(
                                            create("div").classes("flex", "align-children", "small-gap")
                                                .children(
                                                    create("span").classes("feed-title", "clickable", "pointer").text(track.title)
                                                        .onclick((e: Event) => {
                                                            e.stopPropagation();
                                                            navigate(`/track/${track.id}`);
                                                        })
                                                        .build(),
                                                    ...(track.wip ? [GenericTemplates.tag(t("WIP"), "wip")] : []),
                                                    ...(track.collab?.collab_type ? [TrackTemplates.collabIndicator(track.collab)] : []),
                                                    ...icons,
                                                ).build(),
                                        ).build(),
                                ).build();
                        },
                    },
                    {
                        key: "artist",
                        header: t("ARTIST"),
                        render: (track) => {
                            if (!track.user) return nullElement();
                            return UserTemplates.userLink(UserWidgetContext.card, track.user as User, track.artistname);
                        },
                    },
                ],
                fetchPage: async (offset, limit) => {
                    const genres = selectedGenres$.value;
                    if (genres.length === 0) return [];
                    const params: any = { offset, limit, genres: genres.join(",") };
                    const res = await Api.getFeed(ApiRoutes.genreExploreFeed, params);
                    if (!res) return [];
                    if (Array.isArray(res)) return res;
                    return res;
                },
                buildMenuActions: (track): FeedMenuAction<Track>[] => [
                    { label: t("QUEUE"), icon: "queue", onclick: () => QueueManager.addToManualQueue(track.id) },
                    {
                        label: t("COPY_LINK"),
                        icon: "link",
                        onclick: () => copy(window.location.origin + "/track/" + track.id),
                    },
                    {
                        label: t("OPEN_IN_NEW_TAB"),
                        icon: "open_in_new",
                        onclick: () => window.open(`/track/${track.id}`, "_blank"),
                    },
                ],
                buildInteractions: (track): any[] => [
                    InteractionTemplates.interactions(EntityType.track, track, {
                        showCount: false,
                        overrideActions: [InteractionType.like, InteractionType.repost],
                    }),
                ],
                onPlayToggle: async (track) => {
                    if (currentTrackId.value === track.id && playingHere.value) {
                        await PlayManager.pauseAsync(track.id);
                    } else {
                        await PlayManager.startAsync(track.id);
                    }
                },
                isPlaying: (id) => compute((c, p) => c === id && p, currentTrackId, playingHere),
                dateRender: (track) => GenericTemplates.timestamp(track.created_at, ["hideOnSmallBreakpoint"]),
                onNavigate: (track) => window.open(`/track/${track.id}`, "_blank"),
            })),
            when(noGenres, create("div").classes("flex-v", "padded", "align-center").children(
                create("span").classes("color-dim").text(t("SELECT_GENRES_TO_EXPLORE")).build(),
            ).build()),
        ).build();
    }

    static statisticsPage() {
        const tabs = [`${t("YOUR_STATISTICS")}`, `${t("GLOBAL")}`];
        const urlTabs = ["your", "global"];
        const urlParams = new URLSearchParams(window.location.search);
        const initialTab = urlTabs.indexOf(urlParams.get("tab") ?? "");
        const selectedTab = signal(initialTab === -1 ? 0 : initialTab);

        selectedTab.subscribe(i => {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", urlTabs[i]);
            window.history.replaceState(null, "", url.toString());
        });

        return create("div")
            .classes("statistics", "flex-v")
            .children(
                GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i, selectedTab.value),
                when(
                    tabSelected(selectedTab, 0),
                    vertical(
                        PayoutTemplates.artistRoyaltyActions(),
                        StatisticTemplates.allStats(),
                    ).build(),
                ),
                when(
                    tabSelected(selectedTab, 1),
                    vertical(
                        StatisticTemplates.globalStats(),
                    ).build(),
                ),
            ).build();
    }

    static async trackPage(route: Route, params: Record<string, string>) {
        const trackId = parseInt(params["id"]);
        const code = params["code"] || "";

        const track = await Api.getTrackById(trackId, code);
        if (!track) {
            return create("div")
                .text(t("TRACK_NOT_FOUND"))
                .build();
        }

        document.title = track.track.title;
        if (code) {
            currentSecretCode.value = code;
        }

        await PlayManager.cacheTrackData(track);
        const trackPage = await TrackTemplates.trackPage(track);

        if (!trackPage) {
            return create("div")
                .text(t("FAILED_LOADING_TRACK"))
                .build();
        }

        return trackPage;
    }

    static logoutPage() {
        AuthActions.logOutWithRedirect().then();

        return create("div")
            .text(t("LOGGING_OUT"))
            .build();
    }

    static faqPage() {
        return create("div")
            .classes("faq")
            .children(
                create("h3")
                    .classes("question")
                    .text(t("QUESTION_CAN_USE_WITHOUT_SUB"))
                    .build(),
                create("p")
                    .classes("answer")
                    .text(t("ANSWER_CAN_USE_WITHOUT_SUB"))
                    .build(),
                create("h3")
                    .classes("question")
                    .text(t("QUESTION_CANCEL_SUB"))
                    .build(),
                create("p")
                    .classes("answer", "flex")
                    .children(
                        create("span")
                            .text(t("ANSWER_CANCEL_SUB")),
                        GenericTemplates.inlineLink(() => navigate(RoutePath.subscribe), t("ANSWER_CANCEL_SUB_HERE")),
                    ).build(),
                create("h3")
                    .classes("question")
                    .text(t("QUESTION_ROYALTY_CALCULATION"))
                    .build(),
                create("p")
                    .classes("answer", "flex")
                    .children(
                        create("span")
                            .text(t("ANSWER_ROYALTY_CALCULATION_PART_1")),
                        create("span")
                            .text(t("ANSWER_ROYALTY_CALCULATION_PART_2")),
                    ).build(),
            ).build();
    }

    static notFoundPage() {
        const randomUserWidget = signal(create("span").text(t("LOADING")).build());
        const user = signal<User | null>(null);

        Api.getRandomUser()
           .then(async data => user.value = data)
           .catch(() => randomUserWidget.value = create("span")
               .text(t("FAILED_LOADING_RANDOM_USER"))
               .build());

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .styles("font-size", "10vw", "line-height", "1", "font-weight", "bold")
                    .text("404")
                    .build(),
                create("h2")
                    .text(t("NOTHING_HERE"))
                    .build(),
                create("span")
                    .text(t("RANDOM_USER"))
                    .build(),
                when(user, create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(user),
                    ).build()),
            ).build();
    }

    static async unapprovedTracksPage() {
        const user = currentUser.value;

        if (!user) {
            notify(`${t("LOGIN_TO_VIEW_UNAPPROVED_TRACKS")}`, NotificationType.error);
            return create("div")
                .text(t("LOGIN_TO_VIEW_UNAPPROVED_TRACKS"))
                .build();
        }

        const tracks = await Api.getUnapprovedTracks();
        return create("div")
            .classes("unapprovedTracks")
            .children(
                TrackTemplates.unapprovedTracks(tracks ?? []),
            ).build();
    }

    static subscribePage() {
        const user = currentUser.value;

        if (!user) {
            notify(`${t("CAN_ONLY_SUBSCRIBE_WITH_ACCOUNT")}`, NotificationType.warning);
            return create("div")
                .text(t("LOGIN_TO_SUBSCRIBE"))
                .build();
        }

        return SubscriptionTemplates.page();
    }

    static protocolHandlerPage() {
        const url = new URL(window.location.href);
        const data = url.searchParams.get("data");
        if (!data) {
            return vertical(
                heading({
                    level: 1,
                    text: t("LINK_NOT_FOUND"),
                    classes: ["error"],
                }),
            ).build();
        }
        const dataUrl = new URL(data);
        // the url should have the following structure: "protocol://{entityTypeRoute}/{id}"
        const entityType = dataUrl.host as EntityType;
        const id = dataUrl.pathname.split("/")[1];
        navigate(`${entityType}/${id}`);

        return vertical(
            horizontal(
                heading({
                    level: 1,
                    text: `${t("OPENING_LINK")}...`,
                }),
                GenericTemplates.loadingSpinner(),
            ).classes("align-children"),
        ).build();
    }
}
