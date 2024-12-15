import {Util} from "../Classes/Util.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {AlbumTemplates} from "./AlbumTemplates.ts";
import {Icons as Icons} from "../Enums/Icons.js";
import {Badges} from "../Enums/Badges.ts";
import {Links} from "../Enums/Links.ts";
import {PlaylistTemplates} from "./PlaylistTemplates.ts";
import {CustomText} from "../Classes/Helpers/CustomText.ts";
import {Permissions} from "../Enums/Permissions.ts";
import {Images} from "../Enums/Images.ts";
import {navigate} from "../Routing/Router.ts";
import {
    AnyNode,
    create,
    HtmlPropertyValue,
    ifjs,
    nullElement,
    StringOrSignal
} from "../../fjsc/src/f2.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {User} from "../Models/DbModels/User.ts";
import {Permission} from "../Models/DbModels/Permission.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {Badge} from "../Models/DbModels/Badge.ts";
import {FJSC} from "../../fjsc";
import {compute, signal} from "../../fjsc/src/signals.ts";

export class UserTemplates {
    static userWidget(user: User, following: boolean, extraAttributes: HtmlPropertyValue[] = [], extraClasses: HtmlPropertyValue[] = []) {
        const base = create("button");
        if (extraAttributes) {
            base.attributes(...extraAttributes);
        }
        if (extraClasses) {
            base.classes(...extraClasses);
        }

        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(user.id).then((src) => {
            avatarState.value = src;
        });
        const cacheUser = LydaCache.get("user");
        return base
            .classes("user-widget", "fjsc", "clickable", "rounded-max", "flex", "padded-inline")
            .attributes("user_id", user.id, "username", user.username)
            .onclick((e: MouseEvent) => {
                if (e.button === 0) {
                    e.preventDefault();
                    navigate("profile/" + user.username);
                }
            })
            .href(Links.PROFILE(user.username))
            .title(user.displayname + " (@" + user.username + ")")
            .children(
                UserTemplates.userIcon(user.id, avatarState),
                create("span")
                    .classes("text", "align-center", "nopointer", "user-displayname")
                    .text(CustomText.shorten(user.displayname, 10))
                    .attributes("data-user-id", user.id)
                    .build(),
                create("span")
                    .classes("text", "align-center", "text-small", "nopointer", "user-name", "hideOnSmallBreakpoint")
                    .text("@" + user.username)
                    .attributes("data-user-id", user.id)
                    .build(),
                cacheUser.content && user.id !== cacheUser.content.id ? UserTemplates.followButton(following, user.id, true) : null
            ).build();
    }

    static linkedUser(user_id: number, username: string, displayname: string, avatar: StringOrSignal, collab_type: HtmlPropertyValue, actionButton: AnyNode|null = null, extraAttributes: HtmlPropertyValue[] | undefined = undefined, extraClasses: HtmlPropertyValue[] = []) {
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
                navigate(`profile/${username}`);
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
            .classes("user-icon", "user-avatar", "align-center", "nopointer")
            .attributes("data-user-id", user_id)
            .attributes("src", avatar)
            .build();
    }

    static followButton(initialFollowing: boolean, user_id: HtmlPropertyValue, noText = false) {
        const following = signal(initialFollowing);

        return create("div")
            .classes("follow-button", "fakeButton", "clickable", "rounded-max", "flex", "padded-inline")
            .attributes("user_id", user_id)
            .children(
                create("img")
                    .src(initialFollowing ? Icons.UNFOLLOW : Icons.FOLLOW)
                    .classes("inline-icon", "svg", "nopointer")
                    .build(),
                noText ? null : create("span")
                    .classes("text-small", "nopointer")
                    .text(initialFollowing ? "Unfollow" : "Follow")
                    .build()
            ).onclick(async (e) => {
                await TrackActions.runFollowFunctionFromElement(e, user_id, following);
            }).build();
    }

    static followsBackIndicator() {
        return create("span")
            .classes("padded-inline", "rounded-max", "text-small", "invertedTextWithBackground")
            .text("Follows you")
            .build();
    }

    static trackCards(tracks: Track[], profileId: number, user: User, isOwnProfile: boolean) {
        let children = [];
        if (tracks.length === 0) {
            return TrackTemplates.noTracksUploadedYet(isOwnProfile);
        } else {
            children = tracks.map(track => TrackTemplates.trackCard(track, user, profileId));
        }

        return TrackTemplates.trackCardsContainer(children);
    }

    static unapprovedTracksLink() {
        const unapprovedTracks = signal([]);
        TrackActions.getUnapprovedTracks().then(tracks => {
            unapprovedTracks.value = tracks;
        });
        const link = signal(create("div").build());
        unapprovedTracks.onUpdate = (tracks: Track[]) => {
            link.value = tracks.length === 0 ? nullElement() : GenericTemplates.action(Icons.APPROVAL, "Unapproved tracks", "unapproved-tracks", async e => {
                e.preventDefault();
                navigate("unapproved-tracks");
            }, [], [], Links.LINK("unapproved-tracks"));
        };

        return link;
    }

    static userActionsContainer(isOwnProfile: boolean) {
        if (!isOwnProfile) {
            return create("div").build();
        }

        return create("div")
            .classes("actions-container", "flex")
            .children(
                GenericTemplates.newTrackButton(),
                GenericTemplates.newAlbumButton(),
                GenericTemplates.newPlaylistButton(),
                FJSC.button({
                    text: "Settings",
                    icon: { icon: "settings" },
                    onclick: async () => {
                        navigate("settings");
                    }
                }),
                FJSC.button({
                    text: "Statistics",
                    icon: { icon: "finance" },
                    onclick: async () => {
                        navigate("statistics");
                    }
                }),
                UserTemplates.unapprovedTracksLink(),
            )
            .build();
    }

    static verificationbadge() {
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
        let bannerDeleteButton = GenericTemplates.centeredDeleteButton("banner-delete-button", () => UserActions.deleteBanner(user, bannerLoading), ["hidden", "showOnParentHover"]);
        let avatarDeleteButton = GenericTemplates.centeredDeleteButton("avatar-delete-button", () => UserActions.deleteAvatar(user, avatarLoading), ["showOnParentHover"]);
        const userBanner = signal(Images.DEFAULT_BANNER);
        Util.getBannerFromUserIdAsync(user.id).then(banner => {
            userBanner.value = banner;
        });
        const userAvatar = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(user.id).then(avatar => {
            userAvatar.value = avatar;
        });
        const bannerContainer = create("div")
                .classes("banner-container", "relative", isOwnProfile ? "clickable" : "_", isOwnProfile ? "blurOnParentHover" : "_")
                .attributes("isOwnProfile", isOwnProfile.toString())
                .onclick(UserActions.replaceBanner)
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
                ifjs(isOwnProfile, bannerDeleteButton),
                ifjs(bannerLoading, create("div")
                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                    .attributes("id", "banner-loader")
                    .build()),
                create("div")
                    .classes("header-info-container", "flex")
                    .attributes("isOwnProfile", isOwnProfile.toString())
                    .onclick((e) => {
                        if (isOwnProfile) {
                            UserActions.replaceBanner(e, isOwnProfile, user, bannerLoading).then();
                        }
                    })
                    .children(
                        create("div")
                            .classes("avatar-container", "relative", isOwnProfile ? "pointer" : "_")
                            .attributes("isOwnProfile", isOwnProfile.toString())
                            .onclick((e) => {
                                if (isOwnProfile) {
                                    UserActions.replaceAvatar(e, isOwnProfile, user, avatarLoading).then();
                                }
                            })
                            .onmouseover(() => {
                                if (!isOwnProfile) {
                                    return;
                                }
                                bannerContainer.classList.remove("blurOnParentHover");
                                bannerDeleteButton.classList.remove("showOnParentHover");
                            })
                            .onmouseleave(() => {
                                if (!isOwnProfile) {
                                    return;
                                }
                                bannerContainer.classList.add("blurOnParentHover");
                                bannerDeleteButton.classList.add("showOnParentHover");
                            })
                            .children(
                                create("img")
                                    .classes("nopointer", "user-avatar", "avatar-image", isOwnProfile ? "blurOnParentHover" : "_")
                                    .attributes("data-user-id", user.id)
                                    .attributes("src", userAvatar)
                                    .attributes("alt", user.username)
                                    .build(),
                                ifjs(isOwnProfile, avatarDeleteButton),
                                ifjs(avatarLoading, create("div")
                                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                                    .attributes("id", "avatar-loader")
                                    .build())
                            ).build(),
                    ).build()
            ).build();
    }

    static profileInfo(user: User, selfUser: User, isOwnProfile: boolean, permissions: Permission[], following: boolean, followsBack: boolean) {
        let specialInfo: AnyNode[] = [];
        const verified = signal(user.verified);
        const canVerify = compute(v => !v && permissions.some(p => p.name === Permissions.canVerifyUsers), verified);
        const canUnverify = compute(v => v && permissions.some(p => p.name === Permissions.canVerifyUsers), verified);

        if (user.badges && user.badges.length > 0) {
            specialInfo = [UserTemplates.badges(user.badges)];
        }

        return create("div")
            .classes("name-container", "flex-v")
            .children(
                UserTemplates.displayname(user, selfUser, isOwnProfile),
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.username(user, selfUser, isOwnProfile),
                        ifjs(verified, UserTemplates.verificationbadge()),
                        ifjs(canVerify, FJSC.button({
                            text: "Verify",
                            icon: { icon: "verified" },
                            classes: ["positive"],
                            onclick: async () => {
                                await UserActions.verifyUser(user.id);
                                verified.value = true;
                            }
                        })),
                        ifjs(canUnverify, FJSC.button({
                            text: "Unverify",
                            icon: { icon: "close" },
                            classes: ["negative"],
                            onclick: async () => {
                                await UserActions.unverifyUser(user.id);
                                verified.value = false;
                            }
                        })),
                        !isOwnProfile && selfUser ? UserTemplates.followButton(following, user.id) : null,
                        !isOwnProfile && followsBack ? UserTemplates.followsBackIndicator() : null,
                    ).build(),
                UserTemplates.userDescription(user, selfUser, isOwnProfile, specialInfo)
            ).build();
    }

    static badges(badges: Badge[]) {
        let children = [];
        for (let badge of badges) {
            children.push(UserTemplates.badge(badge));
        }
        return create("div")
            .classes("flex", "small-gap", "limitToContentWidth", "rounded", "hideOnSmallBreakpoint")
            .children(...children)
            .build();
    }

    static badge(badge: Badge) {
        let addClasses = [];
        const colorBadges = ["staff", "cute", "vip"];
        if (colorBadges.includes(badge.name)) {
            addClasses.push("no-filter");
        }

        return create("img")
            .attributes("src", Badges.BADGE(badge.name))
            .attributes("alt", badge.name)
            .attributes("title", badge.description)
            .classes("icon", "badge", "svg", ...addClasses)
            .build();
    }

    static albumCards(albums: Album[], user: User, isOwnProfile: boolean) {
        let children = [];
        if (albums.length === 0) {
            return AlbumTemplates.noAlbumsYet(isOwnProfile);
        } else {
            children = albums.map((album: Album) => AlbumTemplates.albumCard(album, user));
        }

        return AlbumTemplates.albumCardsContainer(children);
    }

    static playlistCards(playlists: Playlist[], user: User, isOwnProfile: boolean) {
        let children = [];
        if (playlists.length === 0) {
            return PlaylistTemplates.noPlaylistsYet(isOwnProfile);
        } else {
            children = playlists.map((playlist: Playlist) => PlaylistTemplates.playlistCard(playlist, user));
        }

        return PlaylistTemplates.playlistCardsContainer(children);
    }

    static libraryPage(albums: Album[], playlists: Playlist[], tracks: Track[], user: User) {
        const container = create("div").build();

        const tracksContainer = UserTemplates.libraryTracks(tracks, user);
        const albumsContainer = UserTemplates.libraryAlbums(albums, user);
        const playlistsContainer = UserTemplates.libraryPlaylists(playlists, user);

        const tabs = ["Tracks", "Albums", "Playlists"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer];
        const tabSelector = GenericTemplates.tabSelector(tabs, (i: number) => {
            tabContents.forEach((c, j) => {
                c.value.style.display = i === j ? "flex" : "none";
            });
        }, 0);

        return create("div")
            .classes("flex-v")
            .children(
                container,
                tabSelector,
                tracksContainer,
                albumsContainer,
                playlistsContainer
            ).build();
    }

    static libraryAlbums(albums: Album[], user: User) {
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
                children = albums.map((album: Album) => AlbumTemplates.albumCard(album, user));
            }

            template.value = AlbumTemplates.albumCardsContainer(children);
        };
        update(albums);

        return template;
    }

    static libraryTracks(tracks: Track[], user: User) {
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
                children = tracks.map((track: Track) => TrackTemplates.trackCard(track, user, user.id));
            }

            template.value = TrackTemplates.trackCardsContainer(children);
        };
        update(tracks);

        return template;
    }

    static libraryPlaylists(playlists: Playlist[], user: User) {
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
                children = playlists.map((playlist: Playlist) => PlaylistTemplates.playlistCard(playlist, user));
            }

            template.value = PlaylistTemplates.playlistCardsContainer(children);
        };
        update(playlists);

        return template;
    }

    static username(user: User, selfUser: User, isOwnProfile: boolean) {
        const nameState = signal(user.username);

        const base = create("span")
            .classes("username", "user-name")
            .attributes("data-user-id", user.id)
            .text(`@${user.username}`);

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

    static displayname(user: User, selfUser: User, isOwnProfile: boolean) {
        const nameState = signal(user.displayname);

        const base = create("h1")
            .classes("display_name", "user-displayname")
            .attributes("data-user-id", user.id)
            .text(nameState);

        if (isOwnProfile) {
            base.onclick(async () => {
                UserActions.editDisplayname(user.displayname, (newDisplayname: string) => {
                    nameState.value = newDisplayname;
                });
            });
            base.classes("clickable");
        }

        return base.build();
    }

    static userDescription(user: User, selfUser: User, isOwnProfile: boolean, specialInfo: AnyNode[]) {
        if (specialInfo.length === 0 && (user.description === null || user.description === "")) {
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
                ...specialInfo,
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

        return FJSC.button({
            icon: { icon: "edit_note" },
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
}