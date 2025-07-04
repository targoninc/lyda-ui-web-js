import {AuthActions} from "../Actions/AuthActions.ts";
import {LandingPageTemplates} from "./LandingPageTemplates.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {HttpClient} from "../Api/HttpClient.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {create, when, signal} from "@targoninc/jess";
import {SearchTemplates} from "./SearchTemplates.ts";
import {SettingsTemplates} from "./account/SettingsTemplates.ts";
import {RoadmapTemplates} from "./RoadmapTemplates.ts";
import {EventsTemplates} from "./admin/EventsTemplates.ts";
import {AlbumTemplates} from "./music/AlbumTemplates.ts";
import {RoutePath} from "../Routing/routes.ts";
import {DashboardTemplates} from "./admin/DashboardTemplates.ts";
import {ModerationUsersTemplates} from "./admin/ModerationUsersTemplates.ts";
import {ModerationCommentsTemplates} from "./admin/ModerationCommentsTemplates.ts";
import {LogTemplates} from "./admin/LogTemplates.ts";
import {RoyaltyTemplates} from "./admin/RoyaltyTemplates.ts";
import {PayoutTemplates} from "./money/PayoutTemplates.ts";
import {MusicTemplates} from "./music/MusicTemplates.ts";
import {PaymentTemplates} from "./money/PaymentTemplates.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {TrackEditTemplates} from "./music/TrackEditTemplates.ts";
import {Route} from "../Routing/Router.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {currentSecretCode, currentUser} from "../state.ts";
import {TrackTemplates} from "./music/TrackTemplates.ts";
import {PlaylistTemplates} from "./music/PlaylistTemplates.ts";
import {StatisticTemplates} from "./StatisticTemplates.ts";
import {SubscriptionTemplates} from "./SubscriptionTemplates.ts";
import {notify} from "../Classes/Ui.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Api} from "../Api/Api.ts";

export class PageTemplates {
    static mapping: Record<RoutePath, Function> = {
        [RoutePath.explore]: () => MusicTemplates.feed("explore"),
        [RoutePath.following]: () => MusicTemplates.feed("following"),
        [RoutePath.history]: () => MusicTemplates.feed("history"),
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
    ];

    static async libraryPage(route: Route, params: Record<string, string>) {
        const user = currentUser.value;
        const name = params["name"] ?? "";

        if (!user) {
            notify("You need to be logged in to view your library", NotificationType.error);
            return create("div")
                .text("You need to be logged in to view your library")
                .build();
        }

        document.title = "Library - " + name;
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
            notify("You need to be logged in to view playlists", NotificationType.error);
            return create("div")
                .text("You need to be logged in to view playlists")
                .build();
        }

        const playlist = await Api.getPlaylistById(playlistId);
        if (!playlist) {
            return create("div")
                .text("Playlist not found")
                .build();
        }

        document.title = playlist.playlist.title;
        return await PlaylistTemplates.playlistPage(playlist, user);
    }

    static async statisticsPage() {
        return create("div")
            .classes("statistics", "flex-v")
            .children(
                StatisticTemplates.artistRoyaltyActions(),
                await StatisticTemplates.allStats(),
                StatisticTemplates.dataExport()
            )
            .build();
    }

    static async trackPage(route: Route, params: Record<string, string>) {
        const trackId = parseInt(params["id"]);
        const code = params["code"] || "";

        const track = await Api.getTrackById(trackId, code);
        if (!track) {
            return create("div")
                .text("Track not found")
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
                .text("Failed to load track")
                .build();
        }

        return trackPage;
    }

    static logoutPage() {
        AuthActions.logOutWithRedirect().then();
        return create("div")
            .text("Logging out...")
            .build();
    }

    static faqPage() {
        return create("div")
            .classes("faq")
            .children(
                create("h3")
                    .classes("question")
                    .text("Can I use Lyda without a subscription?")
                    .build(),
                create("p")
                    .classes("answer")
                    .text("Yes, you can. However, the features are very limited and streaming quality will not be great. You can still buy songs and download them.")
                    .build(),
                create("h3")
                    .classes("question")
                    .text("How can I cancel my subscription?")
                    .build(),
                create("p")
                    .classes("answer")
                    .text("You can manage your subscriptions <a href=\"https://finance.targoninc.com\">here</a>. Your subscription will be cancelled and if you are on a yearly plan, the remaining time refunded.")
                    .build(),
                create("h3")
                    .classes("question")
                    .text("How do you make money?")
                    .build(),
                create("p")
                    .classes("answer")
                    .text("We take a percentage of all subscriptions and sales. This varies based on how high our income and expenses are.")
                    .build()
            )
            .build();
    }

    static notFoundPage() {
        const randomUserWidget = signal(create("span").text("loading...").build());
        const user = signal<User|null>(null);

        HttpClient.getAsync(ApiRoutes.randomUser).then(async data => {
            if (data.code !== 200) {
                randomUserWidget.value = create("span").text("Failed to load random user").build();
                return;
            }
            user.value = data.data as User;
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .styles("font-size", "10vw", "line-height", "1", "font-weight", "bold")
                    .text("404")
                    .build(),
                create("h2")
                    .text("Nothing here 👀")
                    .build(),
                create("span")
                    .text("If you were trying to find a user, here's a random one:")
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
            notify("You need to be logged in to see unapproved tracks", NotificationType.error);
            return create("div")
                .text("You need to be logged in to see unapproved tracks")
                .build();
        }

        const tracks = await Api.getUnapprovedTracks();
        return create("div")
            .classes("unapprovedTracks")
            .children(
                TrackTemplates.unapprovedTracks(tracks, user)
            )
            .build();
    }

    static subscribePage() {
        const user = currentUser.value;

        if (!user) {
            notify("You can only subscribe if you have an account already", NotificationType.warning);
            return create("div")
                .text("You need to be logged in to subscribe")
                .build();
        }

        return SubscriptionTemplates.page();
    }
}
