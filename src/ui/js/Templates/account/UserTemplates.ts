import {getAvatar, target, Util} from "../../Classes/Util.ts";
import {TrackActions} from "../../Actions/TrackActions.ts";
import {TrackTemplates} from "../music/TrackTemplates.ts";
import {UserActions} from "../../Actions/UserActions.ts";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {AlbumTemplates} from "../music/AlbumTemplates.ts";
import {Icons as Icons} from "../../Enums/Icons.ts";
import {Links} from "../../Enums/Links.ts";
import {PlaylistTemplates} from "../music/PlaylistTemplates.ts";
import {CustomText, truncateText} from "../../Classes/Helpers/CustomText.ts";
import {Images} from "../../Enums/Images.ts";
import {navigate} from "../../Routing/Router.ts";
import {
    AnyElement,
    AnyNode,
    compute,
    create,
    DomNode,
    HtmlPropertyValue,
    nullElement,
    Signal,
    signal,
    StringOrSignal,
    when
} from "@targoninc/jess";
import {UiActions} from "../../Actions/UiActions.ts";
import {currentUser, permissions} from "../../state.ts";
import {Ui} from "../../Classes/Ui.ts";
import {MediaActions} from "../../Actions/MediaActions.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {MusicTemplates} from "../music/MusicTemplates.ts";
import {button} from "@targoninc/jess-components";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {Badge} from "@targoninc/lyda-shared/src/Models/db/lyda/Badge";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";

export class UserTemplates {
    static userWidget(user: User | Signal<User | null>, extraAttributes: HtmlPropertyValue[] = [], extraClasses: StringOrSignal[] = [], context: UserWidgetContext = UserWidgetContext.unknown) {
        const out = signal<AnyElement>(nullElement());

        const getWidget = (newUser: User | null) => {
            if (!newUser) {
                return nullElement();
            }

            const base = create("button");
            if (extraAttributes) {
                base.attributes(...extraAttributes);
            }
            if (extraClasses) {
                base.classes(...extraClasses);
            }
            out.value = this.userWidgetInternal(context, newUser, base, Util.userIsFollowing(user));
        }

        if (user.constructor === Signal) {
            (user as Signal<User | null>).subscribe(getWidget);
            getWidget((user as Signal<User | null>).value);
        } else {
            getWidget(user as User);
        }
        return out;
    }

    private static userWidgetInternal(context: UserWidgetContext, user: User, base: DomNode, following: boolean | Signal<boolean>) {
        const maxDisplaynameLength = [UserWidgetContext.singlePage, UserWidgetContext.list].includes(context) ? 100 : 15;
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (user.has_avatar) {
            avatarState.value = Util.getUserAvatar(user.id);
        }
        if (following.constructor !== Signal) {
            following = signal(following as boolean);
        }
        const showFollowButton = compute(u => u && u.id && u.id !== user.id && !following.value, currentUser);

        return base
            .classes("user-widget", "jess", "round-on-tiny-breakpoint")
            .attributes("user_id", user.id, "username", user.username)
            .onclick((e: MouseEvent) => {
                if (e.button === 0 && target(e).tagName.toLowerCase() === "button") {
                    e.preventDefault();
                    navigate(`${RoutePath.profile}/` + user.username);
                }
            })
            .href(Links.PROFILE(user.username))
            .title(user.displayname + " (@" + user.username + ")")
            .children(
                UserTemplates.userIcon(user.id, avatarState),
                create("span")
                    .classes("text", "align-center", "nopointer", "user-displayname", "hideOnTinyBreakpoint")
                    .text(truncateText(user.displayname, maxDisplaynameLength))
                    .attributes("data-user-id", user.id)
                    .build(),
                create("span")
                    .classes("text", "align-center", "text-xsmall", "nopointer", "user-name", "hideOnSmallBreakpoint")
                    .text("@" + user.username)
                    .attributes("data-user-id", user.id)
                    .build(),
                when(showFollowButton, UserTemplates.followButton(following, user.id, true))
            ).build();
    }

    public static userLink(context: UserWidgetContext, user: User) {
        const maxDisplaynameLength = [UserWidgetContext.singlePage, UserWidgetContext.list].includes(context) ? 100 : 15;
        const previewShown = signal(false);
        let timeout: any | null = null;
        const avatarState = getAvatar(user);

        return horizontal(
            create("a")
                .classes("page-link", "color-dim", "flex", "align-children", "small-gap")
                .attributes("user_id", user.id, "username", user.username)
                .onclick((e: MouseEvent) => {
                    if (e.button === 0) {
                        e.preventDefault();
                        navigate(`${RoutePath.profile}/${user.username}`);
                    }
                })
                .href(`${RoutePath.profile}/${user.username}`)
                .title(user.displayname + " (@" + user.username + ")")
                .children(
                    UserTemplates.userIcon(user.id, avatarState),
                    create("span")
                        .classes("text", "align-center", "nopointer", "user-displayname")
                        .text(truncateText(user.displayname, maxDisplaynameLength))
                        .attributes("data-user-id", user.id)
                        .build(),
                ).build(),
            when(previewShown, UserTemplates.userPreview(user, context))
        ).onmouseover(() => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                previewShown.value = true;
            }, 500);
        }).onmouseleave(() => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                previewShown.value = false;
            }, 100);
        }).classes("relative");
    }

    static linkedUser(user_id: number, username: string, displayname: string, avatar: StringOrSignal, collab_type: HtmlPropertyValue, actionButton: AnyNode | null = null, extraAttributes: HtmlPropertyValue[] | undefined = undefined, extraClasses: StringOrSignal[] = []) {
        const noredirect = extraClasses.includes("no-redirect");
        const base = noredirect ? create("div") : create("a");
        if (extraAttributes) {
            base.attributes(...extraAttributes);
        }
        if (extraClasses && extraClasses.length > 0) {
            base.classes(...extraClasses);
        }
        return base
            .classes("user-widget", "collaborator", noredirect ? "_" : "clickable", "rounded", "flex-v", "padded-inline")
            .attributes("user_id", user_id, "username", username)
            .onclick(async () => {
                if (noredirect) {
                    return;
                }
                navigate(`${RoutePath.profile}/${username}`);
            })
            .href(Links.PROFILE(username))
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userIcon(user_id, avatar),
                        create("span")
                            .classes("text", "align-center", "nopointer", "user-displayname")
                            .text(displayname)
                            .attributes("data-user-id", user_id)
                            .build(),
                        create("span")
                            .classes("text", "align-center", "text-small", "nopointer", "user-name", "hideOnSmallBreakpoint")
                            .text("@" + username)
                            .attributes("data-user-id", user_id)
                            .build(),
                        create("span")
                            .text(collab_type)
                            .classes("align-center")
                            .build(),
                        actionButton
                    ).build(),
            ).build();
    }

    static userIcon(user_id: HtmlPropertyValue, avatar: StringOrSignal) {
        return create("img")
            .classes("user-icon", "align-center", "nopointer")
            .attributes("data-user-id", user_id)
            .attributes("src", avatar)
            .build();
    }

    static followButton(following: boolean | Signal<boolean>, user_id: number, noText = false) {
        if (following.constructor !== Signal) {
            following = signal(following as boolean);
        }

        return button({
            icon: {
                icon: compute((f) => f ? Icons.UNFOLLOW : Icons.FOLLOW, following),
                isUrl: true,
                adaptive: true,
                classes: ["svg"]
            },
            text: noText ? "" : compute((f): string => f ? "Unfollow" : "Follow", following),
            onclick: async () => {
                await TrackActions.toggleFollow(user_id, following)
            }
        });
    }

    static followsBackIndicator() {
        return create("span")
            .classes("padded-inline", "rounded-max", "text-small", "invertedTextWithBackground")
            .text("Follows you")
            .build();
    }

    static profileTrackList(tracks: Track[], isOwnProfile: boolean) {
        let children = [];
        if (tracks.length === 0) {
            return TrackTemplates.noTracksUploadedYet(isOwnProfile);
        } else {
            children = tracks.map(track => MusicTemplates.feedEntry(EntityType.track, track));
        }

        return TrackTemplates.trackList(children);
    }

    static profileRepostList(tracks: Track[], isOwnProfile: boolean) {
        let children = [];
        if (tracks.length === 0) {
            return TrackTemplates.noRepostsYet(isOwnProfile);
        } else {
            children = tracks.map(track => MusicTemplates.feedEntry(EntityType.track, track));
        }

        return TrackTemplates.trackList(children);
    }

    static unapprovedTracksLink() {
        const unapprovedTracks = signal<any[]>([]);
        TrackActions.getUnapprovedTracks().then(tracks => {
            unapprovedTracks.value = tracks;
        });
        const link = signal(create("div").build());
        unapprovedTracks.onUpdate = (tracks: Track[]) => {
            link.value = tracks.length === 0 ? nullElement() : GenericTemplates.action(Icons.APPROVAL, "Unapproved tracks", "unapproved-tracks", async (e: Event) => {
                e.preventDefault();
                navigate(RoutePath.unapprovedTracks);
            }, [], [], Links.LINK(RoutePath.unapprovedTracks));
        };

        return link;
    }

    static profile(isOwnProfile: boolean, user: User) {
        return [
            UserTemplates.userActionsContainer(isOwnProfile),
            UserTemplates.profileHeader(user, isOwnProfile),
            UserTemplates.profileInfo(user, isOwnProfile)
        ];
    }

    static userActionsContainer(isOwnProfile: boolean) {
        if (!isOwnProfile) {
            return create("div").build();
        }

        return create("div")
            .classes("flex", "fullWidth", "space-outwards")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.newTrackButton(["hideOnSmallBreakpoint"]),
                        GenericTemplates.newAlbumButton(["hideOnSmallBreakpoint"]),
                        GenericTemplates.newPlaylistButton(["hideOnSmallBreakpoint"]),
                        button({
                            classes: ["showOnSmallBreakpoint", "positive"],
                            text: "New",
                            icon: {icon: "add"},
                            onclick: UiActions.openCreateMenu
                        }),
                        button({
                            text: "Statistics",
                            icon: {icon: "finance"},
                            onclick: () => navigate(RoutePath.statistics)
                        }),
                        UserTemplates.unapprovedTracksLink(),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Settings",
                            icon: {icon: "settings"},
                            onclick: () => navigate(RoutePath.settings)
                        }),
                        GenericTemplates.logoutButton(),
                    ).build(),
            ).build();
    }

    static verificationBadge() {
        return create("div")
            .classes("verification-badge")
            .children(
                create("img")
                    .attributes("src", Icons.VERIFIED)
                    .attributes("alt", "Verified")
                    .attributes("title", "Verified")
                    .build()
            ).build();
    }

    static profileHeader(user: User, isOwnProfile: boolean) {
        const avatarLoading = signal(false);
        const bannerLoading = signal(false);
        const userBanner = signal(Images.DEFAULT_BANNER);
        if (user.has_banner) {
            userBanner.value = Util.getUserBanner(user.id);
        }
        const userAvatar = signal(Images.DEFAULT_AVATAR);
        if (user.has_avatar) {
            userAvatar.value = Util.getUserAvatar(user.id);
        }
        const bannerContainer = create("div")
            .classes("banner-container", "relative", isOwnProfile ? "clickable" : "_", isOwnProfile ? "blurOnParentHover" : "_")
            .onclick(() => Ui.showImageModal(userBanner))
            .children(
                create("img")
                    .classes("nopointer", "user-banner", "banner-image")
                    .attributes("data-user-id", user.id)
                    .src(userBanner)
                    .alt(user.username)
                    .build()
            ).build();

        return create("div")
            .classes("profile-header")
            .children(
                bannerContainer,
                when(isOwnProfile, create("div")
                    .classes("hidden", "showOnParentHover", "centeredInParent", "flex")
                    .children(
                        UserTemplates.bannerDeleteButton(user, userBanner, bannerLoading),
                        UserTemplates.bannerReplaceButton(user, userBanner, bannerLoading)
                    ).build()),
                when(bannerLoading, create("div")
                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                    .attributes("id", "banner-loader")
                    .build()),
                create("div")
                    .classes("header-info-container", "flex")
                    .children(
                        create("div")
                            .classes("avatar-container", "relative", isOwnProfile ? "pointer" : "_")
                            .onclick(() => Ui.showImageModal(userAvatar))
                            .onmouseover(() => {
                                if (!isOwnProfile) {
                                    return;
                                }
                            })
                            .onmouseleave(() => {
                                if (!isOwnProfile) {
                                    return;
                                }
                            })
                            .children(
                                create("img")
                                    .classes("nopointer", "avatar-image", isOwnProfile ? "blurOnParentHover" : "_")
                                    .attributes("data-user-id", user.id)
                                    .attributes("src", userAvatar)
                                    .attributes("alt", user.username)
                                    .build(),
                                when(isOwnProfile, create("div")
                                    .classes("hidden", "showOnParentHover", "centeredInParent", "flex")
                                    .children(
                                        UserTemplates.avatarDeleteButton(user, userAvatar, avatarLoading),
                                        UserTemplates.avatarReplaceButton(user, userAvatar, avatarLoading)
                                    ).build()),
                                when(avatarLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                                    .attributes("id", "avatar-loader")
                                    .build())
                            ).build(),
                    ).build()
            ).build();
    }

    static bannerReplaceButton(user: User, userBanner: Signal<string> = signal(""), bannerLoading: Signal<boolean> = signal(false)) {
        return GenericTemplates.uploadIconButton("banner-upload-button", (e: Event) => UserActions.replaceBanner(e, user, userBanner, bannerLoading), ["positive"]);
    }

    static avatarDeleteButton(user: User, userAvatar: Signal<string> = signal(""), avatarLoading: Signal<boolean> = signal(false)) {
        return GenericTemplates.deleteIconButton("avatar-delete-button", () => MediaActions.deleteMedia(MediaFileType.userAvatar, user.id, userAvatar, avatarLoading));
    }

    static avatarReplaceButton(user: User, userAvatar: Signal<string> = signal(""), avatarLoading: Signal<boolean> = signal(false)) {
        return GenericTemplates.uploadIconButton("avatar-upload-button", () => UserActions.replaceAvatar(user, userAvatar, avatarLoading), ["positive"]);
    }

    static bannerDeleteButton(user: User, userBanner: Signal<string> = signal(""), bannerLoading: Signal<boolean> = signal(false)) {
        return GenericTemplates.deleteIconButton("banner-delete-button", () => MediaActions.deleteMedia(MediaFileType.userBanner, user.id, userBanner, bannerLoading));
    }

    static profileInfo(user: User, isOwnProfile: boolean) {
        const hasUnverifiedPrimaryEmail = isOwnProfile && user.emails && user.emails.some(e => e.primary && !e.verified);

        return create("div")
            .classes("name-container", "flex-v")
            .children(
                vertical(
                    UserTemplates.displayname(user),
                    UserTemplates.usernameAndIcons(user),
                ).classes("no-gap"),
                UserTemplates.userDescription(user, isOwnProfile),
                when(hasUnverifiedPrimaryEmail, create("div")
                    .classes("card", "padded", "flex", "warning", "align-children")
                    .children(
                        GenericTemplates.icon("warning", true, ["warning"]),
                        create("span")
                            .text("Your primary email is not verified. Please verify it to ensure you can recover your account.")
                            .build(),
                        button({
                            text: "Go to settings",
                            icon: {icon: "settings"},
                            classes: ["positive"],
                            onclick: () => navigate(RoutePath.settings)
                        })
                    ).build())
            ).build();
    }

    private static usernameAndIcons(user: User) {
        const verified = signal(user.verified);
        const canVerify = compute((v, p) => !v && p.some(p => p.name === Permissions.canVerifyUsers), verified, permissions);
        const canUnverify = compute((v, p) => v && p.some(p => p.name === Permissions.canVerifyUsers), verified, permissions);
        const hasBadges = user.badges && user.badges.length > 0;
        const isOwnProfile = currentUser.value?.id === user.id;

        return create("div")
            .classes("flex", "align-children")
            .children(
                UserTemplates.username(user, isOwnProfile),
                when(hasBadges, UserTemplates.badges(user.badges ?? [])),
                when(verified, UserTemplates.verificationBadge()),
                when(canVerify, button({
                    text: "Verify",
                    icon: {icon: "verified"},
                    classes: ["positive"],
                    onclick: async () => {
                        await UserActions.verifyUser(user.id);
                        verified.value = true;
                    }
                })),
                when(canUnverify, button({
                    text: "Unverify",
                    icon: {icon: "close"},
                    classes: ["negative"],
                    onclick: async () => {
                        await UserActions.unverifyUser(user.id);
                        verified.value = false;
                    }
                })),
                !isOwnProfile && currentUser.value ? UserTemplates.followButton(Util.userIsFollowing(user), user.id) : null,
                !isOwnProfile && Util.userIsFollowedBy(user) ? UserTemplates.followsBackIndicator() : null,
            ).build();
    }

    static badges(badges: Badge[]) {
        return create("div")
            .classes("flex", "small-gap", "limitToContentWidth", "rounded", "hideOnSmallBreakpoint")
            .children(
                ...badges.map(badge => UserTemplates.badge(badge))
            ).build();
    }

    static badge(badge: Badge) {
        let addClasses = [];
        const colorBadges = ["staff", "cute", "vip"];
        if (colorBadges.includes(badge.name)) {
            addClasses.push("no-filter");
        }

        return create("img")
            .attributes("src", Icons.ICON("badges/badge_" + badge.name))
            .attributes("alt", badge.name)
            .attributes("title", badge.description)
            .classes("icon", "badge", "svg", ...addClasses)
            .build();
    }

    static albumCards(albums: Album[], isOwnProfile: boolean) {
        let children = [];
        if (albums.length === 0) {
            return AlbumTemplates.noAlbumsYet(isOwnProfile);
        } else {
            children = albums.map((album: Album) => AlbumTemplates.albumCard(album));
        }

        return AlbumTemplates.albumCardsContainer(children);
    }

    static playlistCards(playlists: Playlist[], isOwnProfile: boolean) {
        let children = [];
        if (playlists.length === 0) {
            return PlaylistTemplates.noPlaylistsYet(isOwnProfile);
        } else {
            children = playlists.map((playlist: Playlist) => PlaylistTemplates.playlistCard(playlist));
        }

        return PlaylistTemplates.playlistCardsContainer(children);
    }

    static libraryPage(albums: Album[], playlists: Playlist[], tracks: Track[]) {
        const tracksContainer = UserTemplates.libraryTracks(tracks);
        const albumsContainer = UserTemplates.libraryAlbums(albums);
        const playlistsContainer = UserTemplates.libraryPlaylists(playlists);

        const tabs = ["Tracks", "Albums", "Playlists"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer];
        const tabSelector = GenericTemplates.combinedSelector(tabs, (i: number) => {
            tabContents.forEach((c, j) => {
                c.value.style.display = i === j ? "flex" : "none";
            });
        }, 0);

        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.title("Your liked music"),
                tabSelector,
                tracksContainer,
                albumsContainer,
                playlistsContainer
            ).build();
    }

    static libraryAlbums(albums: Album[]) {
        const template = signal(create("div").build());
        const update = (albums: Album[]) => {
            let children;
            if (albums.length === 0) {
                children = [
                    create("span")
                        .text("Like some albums to see them here")
                        .build()
                ];
            } else {
                children = albums.map((album: Album) => AlbumTemplates.albumCard(album));
            }

            template.value = AlbumTemplates.albumCardsContainer(children);
        };
        update(albums);

        return template;
    }

    static libraryTracks(tracks: Track[]) {
        const template = signal(create("div").build());
        const update = (tracks: Track[]) => {
            let children;
            if (tracks.length === 0) {
                children = [
                    create("span")
                        .text("Like some tracks to see them here")
                        .build()
                ];
            } else {
                children = tracks.map((track: Track) => MusicTemplates.feedEntry(EntityType.track, track));
            }

            template.value = TrackTemplates.trackList(children);
        };
        update(tracks);

        return template;
    }

    static libraryPlaylists(playlists: Playlist[]) {
        const template = signal(create("div").build());

        const update = (playlists: Playlist[]) => {
            let children;
            if (playlists.length === 0) {
                children = [
                    create("span")
                        .text("Like some playlists to see them here")
                        .build()
                ];
            } else {
                children = playlists.map((playlist: Playlist) => PlaylistTemplates.playlistCard(playlist));
            }

            template.value = PlaylistTemplates.playlistCardsContainer(children);
        };
        update(playlists);

        return template;
    }

    static username(user: User, isOwnProfile: boolean) {
        const nameState = signal(user.username);
        const displayedName = compute(name => `@${name}`, nameState);

        const base = create("span")
            .classes("username", "user-name")
            .attributes("data-user-id", user.id)
            .text(displayedName);

        if (isOwnProfile) {
            base.onclick(async () => {
                UserActions.editUsername(user.username, (newUsername: string) => {
                    nameState.value = newUsername;
                });
            });
            base.classes("clickable");
        }

        return base.build();
    }

    static displayname(user: User) {
        const nameState = signal(user.displayname);

        const base = create("h1")
            .classes("display_name", "user-displayname")
            .attributes("data-user-id", user.id)
            .text(nameState);

        if (currentUser.value?.id === user.id) {
            base.onclick(async () => {
                UserActions.editDisplayname(user.displayname, (newDisplayname: string) => {
                    nameState.value = newDisplayname;
                });
            });
            base.classes("clickable");
        }

        return base.build();
    }

    static userDescription(user: User, isOwnProfile: boolean) {
        if (user.description === null || user.description === "") {
            return create("div").build();
        }
        const description = create("span")
            .classes("break-lines")
            .id("user-description")
            .html(CustomText.renderToHtml(user.description))
            .build();

        setTimeout(() => {
            if (description.clientHeight < description.scrollHeight) {
                description.classList.add("overflowing");
            }
        }, 100);

        return create("div")
            .classes("card", "rounded", "padded", "flex-v", "limitToContentWidth")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        description,
                        isOwnProfile ? UserTemplates.editDescriptionButton(user.description) : null
                    ).build()
            ).build();
    }

    static editDescriptionButton(currentDescription: string) {
        const descState = signal(currentDescription);

        return button({
            icon: {icon: "edit_note"},
            text: "Edit description",
            onclick: async (e: Event) => {
                e.preventDefault();
                UserActions.editDescription(descState.value, (newDescription: string) => {
                    const description = document.querySelector("#user-description");
                    if (!description) {
                        return;
                    }
                    description.innerHTML = CustomText.renderToHtml(newDescription);
                    descState.value = newDescription;
                });
            }
        });
    }

    static notPublicLibrary(name: string) {
        return create("div")
            .classes("card", "rounded", "padded", "flex-v")
            .children(
                create("span")
                    .classes("text")
                    .text(`Liked content from user "${name}" is not public`)
                    .build()
            ).build();
    }

    private static userPreview(user: User, context: UserWidgetContext) {
        return create("div")
            .classes(context === UserWidgetContext.player ? "popout-above" : "popout-below", "user-preview", "flex-v", "small-gap")
            .children(
                UserTemplates.profileHeader(user, user.id === currentUser.value?.id),
                vertical(
                    UserTemplates.displayname(user),
                    UserTemplates.usernameAndIcons(user),
                ).classes("no-gap")
            ).build();
    }
}