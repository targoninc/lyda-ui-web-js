import {create, signal} from "https://fjs.targoninc.com/f.js";
import {AuthActions} from "../Actions/AuthActions.ts";
import {LandingPageTemplates} from "./LandingPageTemplates.mjs";
import {UserTemplates} from "./UserTemplates.ts";
import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";

export class PageTemplates {
    static mapping = {
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
    };
    static nonUserFallback = {
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
            .attributes("endpoint", "albums/byId")
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
            .attributes("endpoint", "playlists/byId")
            .attributes("params", "id")
            .attributes("datatype", "playlist")
            .build();
    }

    static profilePage() {
        return create("div")
            .classes("profile", "flex-v")
            .attributes("lyda", "")
            .attributes("endpoint", "user/get")
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
            .attributes("endpoint", "tracks/byId")
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
        Api.getAsync(Api.endpoints.user.random).then(async data => {
            if (data.code !== 200) {
                randomUserWidget.value = create("span").text("Failed to load random user").build();
                return;
            }
            const user = data.data;
            const selfUser = await Util.getUserAsync();
            const following = user.follows.some(f => selfUser ? f.followingUserId === selfUser.id : false);
            randomUserWidget.value = UserTemplates.userWidget(user.id, user.username, user.displayname, await Util.getAvatarFromUserIdAsync(user.id), following);
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
                randomUserWidget,
            )
            .build();
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