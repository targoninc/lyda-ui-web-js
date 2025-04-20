import {create, ifjs} from "../../fjsc/src/f2.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {LandingPageTemplates} from "./LandingPageTemplates.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {Api} from "../Api/Api.ts";
import {Util} from "../Classes/Util.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {SearchTemplates} from "./SearchTemplates.ts";
import {SettingsTemplates} from "./account/SettingsTemplates.ts";
import {RoadmapTemplates} from "./RoadmapTemplates.ts";
import {EventsTemplates} from "./admin/EventsTemplates.ts";
import {AlbumTemplates} from "./music/AlbumTemplates.ts";
import {RoutePath} from "../Routing/routes.ts";
import {DashboardTemplates} from "./admin/DashboardTemplates.ts";
import {ModerationUsersTemplates} from "./admin/ModerationUsersTemplates.ts";

export class PageTemplates {
    static mapping: Record<RoutePath, Function> = {
        [RoutePath.explore]: this.explorePage,
        [RoutePath.following]: this.followingPage,
        [RoutePath.album]: AlbumTemplates.albumPage,
        [RoutePath.playlist]: this.playlistPage,
        [RoutePath.profile]: this.profilePage,
        [RoutePath.settings]: SettingsTemplates.settingsPage,
        [RoutePath.statistics]: this.statisticsPage,
        [RoutePath.track]: this.trackPage,
        [RoutePath.upload]: this.uploadPage,
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
        [RoutePath.events]: EventsTemplates.eventsPage,

        // admin pages
        [RoutePath.admin]: DashboardTemplates.dashboardPage,
        [RoutePath.royaltyManagement]: DashboardTemplates.royaltyManagementPage,
        [RoutePath.moderation]: this.moderationPage,
        [RoutePath.logs]: this.logsPage,
        [RoutePath.actionLogs]: this.actionLogsPage,
        [RoutePath.users]: ModerationUsersTemplates.usersPage,
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
    ];

    static explorePage() {
        return create("div")
            .classes("tracks", "flex-v")
            .attributes("lyda", "")
            .attributes("feedType", "explore")
            .attributes("datatype", "tracks")
            .build();
    }

    static followingPage() {
        return create("div")
            .classes("tracks", "flex-v")
            .attributes("lyda", "")
            .attributes("feedType", "following")
            .attributes("datatype", "tracks")
            .build();
    }

    static libraryPage() {
        return create("div")
            .classes("flex-v")
            .attributes("lyda", "")
            .attributes("datatype", "library")
            .build();
    }

    static playlistPage() {
        return create("div")
            .classes("playlistPage")
            .attributes("lyda", "")
            .attributes("endpoint", ApiRoutes.getPlaylistById)
            .attributes("params", "id")
            .attributes("datatype", "playlist")
            .build();
    }

    static profilePage() {
        return create("div")
            .classes("profile", "flex-v")
            .attributes("lyda", "")
            .attributes("endpoint", ApiRoutes.getUser)
            .attributes("params", "name")
            .attributes("datatype", "profile")
            .build();
    }

    static statisticsPage() {
        return create("div")
            .classes("statistics", "flex-v")
            .attributes("lyda", "")
            .attributes("datatype", "statistics")
            .build();
    }

    static trackPage() {
        return create("div")
            .classes("trackPage")
            .attributes("lyda", "")
            .attributes("endpoint", ApiRoutes.getTrackById)
            .attributes("params", "id,code")
            .attributes("datatype", "track")
            .build();
    }

    static uploadPage() {
        return create("div")
            .classes("form")
            .attributes("lyda", "")
            .attributes("datatype", "uploadForm")
            .build();
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

    static logsPage() {
        return create("div")
            .classes("logs")
            .attributes("lyda", "")
            .attributes("datatype", "logs")
            .build();
    }

    static actionLogsPage() {
        return create("div")
            .classes("logs")
            .attributes("lyda", "")
            .attributes("datatype", "actionLogs")
            .build();
    }

    static notFoundPage() {
        const randomUserWidget = signal(create("span").text("loading...").build());
        const user = signal<User|null>(null);
        const following = compute(u => !!(u && Util.arrayPropertyMatchesUser(u.follows ?? [], "following_user_id")), user);

        Api.getAsync(ApiRoutes.randomUser).then(async data => {
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
                ifjs(user, create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(user, following)
                    ).build()),
            ).build();
    }

    static unapprovedTracksPage() {
        return create("div")
            .classes("unapprovedTracks")
            .attributes("lyda", "")
            .attributes("datatype", "unapprovedTracks")
            .build();
    }

    static moderationPage() {
        return create("div")
            .classes("moderation")
            .attributes("lyda", "")
            .attributes("datatype", "moderation")
            .build();
    }

    static subscribePage() {
        return create("div")
            .classes("subscribe")
            .attributes("lyda", "")
            .attributes("datatype", "subscribe")
            .build();
    }
}