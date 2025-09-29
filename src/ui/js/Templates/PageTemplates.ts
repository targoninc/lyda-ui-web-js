import { AuthActions } from "../Actions/AuthActions.ts";
import { LandingPageTemplates } from "./LandingPageTemplates.ts";
import { UserTemplates } from "./account/UserTemplates.ts";
import { AnyElement, create, signal, when } from "@targoninc/jess";
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
import { PayoutTemplates } from "./money/PayoutTemplates.ts";
import { MusicTemplates } from "./music/MusicTemplates.ts";
import { PaymentTemplates } from "./money/PaymentTemplates.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { TrackEditTemplates } from "./music/TrackEditTemplates.ts";
import { navigate, Route } from "../Routing/Router.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { currentSecretCode, currentUser } from "../state.ts";
import { TrackTemplates } from "./music/TrackTemplates.ts";
import { PlaylistTemplates } from "./music/PlaylistTemplates.ts";
import { StatisticTemplates } from "./StatisticTemplates.ts";
import { notify } from "../Classes/Ui.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Api } from "../Api/Api.ts";
import { GenericTemplates, horizontal, tabSelected, vertical } from "./generic/GenericTemplates.ts";
import { heading } from "@targoninc/jess-components";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { SubscriptionTemplates } from "./money/SubscriptionTemplates.ts";
import { t } from "../../locales";
import { FeedType } from "@targoninc/lyda-shared/dist/Enums/FeedType";

export class PageTemplates {
    static mapping: Record<RoutePath, (route: Route, params: Record<string, string>) => Promise<AnyElement> | AnyElement> = {
        [RoutePath.explore]: () => MusicTemplates.feed(FeedType.explore),
        [RoutePath.following]: () => MusicTemplates.feed(FeedType.following),
        [RoutePath.history]: () => MusicTemplates.feed(FeedType.history),
        [RoutePath.album]: AlbumTemplates.albumPage,
        [RoutePath.playlist]: this.playlistPage,
        [RoutePath.profile]: UserTemplates.profile,
        [RoutePath.settings]: SettingsTemplates.settingsPage,
        [RoutePath.statistics]: this.statisticsPage,
        [RoutePath.track]: this.trackPage,
        [RoutePath.upload]: TrackEditTemplates.uploadPage,
        [RoutePath.library]: this.libraryPage,
        [RoutePath.logout]: this.logoutPage,
        [RoutePath.login]: LandingPageTemplates.newLandingPage,
        [RoutePath.faq]: this.faqPage,
        [RoutePath.notFound]: this.notFoundPage,
        [RoutePath.unapprovedTracks]: this.unapprovedTracksPage,
        [RoutePath.test]: LandingPageTemplates.newLandingPage,
        [RoutePath.subscribe]: this.subscribePage,
        [RoutePath.passwordReset]: LandingPageTemplates.newLandingPage,
        [RoutePath.verifyEmail]: LandingPageTemplates.newLandingPage,
        [RoutePath.search]: SearchTemplates.searchPage,
        [RoutePath.roadmap]: RoadmapTemplates.roadmapPage,
        [RoutePath.payouts]: PayoutTemplates.payoutsPage,
        [RoutePath.payments]: PaymentTemplates.paymentsPage,
        [RoutePath.editTracks]: TrackEditTemplates.batchEditTracksPage,
        [RoutePath.protocolHandler]: PageTemplates.protocolHandlerPage,

        // admin pages
        [RoutePath.admin]: DashboardTemplates.dashboardPage,
        [RoutePath.royaltyManagement]: RoyaltyTemplates.royaltyManagementPage,
        [RoutePath.moderation]: ModerationCommentsTemplates.commentModerationPage,
        [RoutePath.logs]: LogTemplates.logsPage,
        [RoutePath.actionLogs]: LogTemplates.actionLogsPage,
        [RoutePath.users]: ModerationUsersTemplates.usersPage,
        [RoutePath.events]: EventsTemplates.eventsPage,
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
        RoutePath.editTracks,
    ];

    static async libraryPage(route: Route, params: Record<string, string>) {
        const user = currentUser.value;
        const name = params["name"] ?? user?.username;

        if (!user) {
            notify(`${t("LOGIN_TO_VIEW_LIBRARY")}`, NotificationType.error);
            return create("div")
                .text(t("LOGIN_TO_VIEW_LIBRARY"))
                .build();
        }

        document.title = `${t("LIBRARY")} - ${name}`;
        const library = await Api.getLibrary(name);

        if (!library) {
            return UserTemplates.notPublicLibrary(name);
        }

        return UserTemplates.libraryPage(library.albums, library.playlists, library.tracks);
    }

    static async playlistPage(route: Route, params: Record<string, string>) {
        const playlistId = parseInt(params["id"]);
        const user = currentUser.value;

        if (!user) {
            notify(`${t("LOGIN_TO_VIEW_PLAYLISTS")}`, NotificationType.error);
            return create("div")
                .text(t("LOGIN_TO_VIEW_PLAYLISTS"))
                .build();
        }

        const playlist = await Api.getPlaylistById(playlistId);
        if (!playlist) {
            return create("div")
                .text(t("PLAYLIST_NOT_FOUND"))
                .build();
        }

        document.title = playlist.playlist.title;
        return await PlaylistTemplates.playlistPage(playlist, user);
    }

    static async statisticsPage() {
        const tabs = [`${t("YOUR_STATISTICS")}`, `${t("GLOBAL")}`];
        const selectedTab = signal(0);

        return create("div")
            .classes("statistics", "flex-v")
            .children(
                GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i),
                when(
                    tabSelected(selectedTab, 0),
                    vertical(
                        PayoutTemplates.artistRoyaltyActions(),
                        await StatisticTemplates.allStats(),
                    ).build(),
                ),
                when(
                    tabSelected(selectedTab, 1),
                    vertical(
                        await StatisticTemplates.globalStats(),
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
        const user = signal<User|null>(null);

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
                        UserTemplates.userWidget(user)
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
                TrackTemplates.unapprovedTracks(tracks ?? [])
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
