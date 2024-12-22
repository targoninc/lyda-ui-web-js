import {create, ifjs} from "../../fjsc/src/f2.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {LandingPageTemplates} from "./LandingPageTemplates.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Api} from "../Api/Api.ts";
import {Util} from "../Classes/Util.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {Follow} from "../Models/DbModels/lyda/Follow.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {SearchTemplates} from "./SearchTemplates.ts";

export class PageTemplates {
    static mapping: {[key: string]: Function} = {
        explore: this.explorePage,
        following: this.followingPage,
        album: this.albumPage,
        playlist: this.playlistPage,
        profile: this.profilePage,
        settings: this.settingsPage,
        statistics: this.statisticsPage,
        track: this.trackPage,
        upload: this.uploadPage,
        library: this.libraryPage,
        logout: this.logoutPage,
        login: LandingPageTemplates.newLandingPage,
        faq: this.faqPage,
        logs: this.logsPage,
        "action-logs": this.actionLogsPage,
        "404": this.notFoundPage,
        "unapproved-tracks": this.unapprovedTracksPage,
        moderation: this.moderationPage,
        test: LandingPageTemplates.newLandingPage,
        subscribe: this.subscribePage,
        "password-reset": LandingPageTemplates.newLandingPage,
        "activate-account": LandingPageTemplates.newLandingPage,
        search: SearchTemplates.searchPage,
    };
    static nonUserFallback: {[key: string]: Function} = {
        library: this.loginPage,
        upload: this.loginPage,
        settings: this.loginPage,
        statistics: this.loginPage,
        following: this.loginPage,
        "unapproved-tracks": this.loginPage,
        moderation: this.loginPage,
        subscribe: this.loginPage
    };

    static albumPage() {
        return create("div")
            .attributes("lyda", "")
            .attributes("endpoint", ApiRoutes.getAlbumById)
            .attributes("params", "id")
            .attributes("datatype", "album")
            .build();
    }

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

    static settingsPage() {
        return create("div")
            .classes("settings", "flex-v")
            .attributes("lyda", "")
            .attributes("datatype", "settings")
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

    static loginPage() {
        return create("div")
            .id("landingPage")
            .children(LandingPageTemplates.newLandingPage())
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