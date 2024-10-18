import {create, nullElement, signal} from "https://fjs.targoninc.com/f.js";
import {Util} from "../Classes/Util.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {TrackTemplates} from "./TrackTemplates.mjs";
import {UserActions} from "../Actions/UserActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {AlbumTemplates} from "./AlbumTemplates.mjs";
import {Icons as Icons} from "../Enums/Icons.js";
import {Badges} from "../Enums/Badges.mjs";
import {Links} from "../Enums/Links.ts";
import {PlaylistTemplates} from "./PlaylistTemplates.mjs";
import {CustomText} from "../Classes/Helpers/CustomText.ts";
import {Permissions} from "../Enums/Permissions.mjs";
import {Images} from "../Enums/Images.ts";

export class UserTemplates {
    static userWidget(user_id, username, displayname, avatar, following, extraAttributes = undefined, extraClasses = undefined) {
        const base = create("a");
        if (extraAttributes) {
            base.attributes(...extraAttributes);
        }
        if (extraClasses) {
            base.classes(...extraClasses);
        }
        const cacheUser = LydaCache.get("user");
        return base
            .classes("user-widget", "clickable", "rounded-max", "flex", "padded-inline")
            .attributes("user_id", user_id, "username", username)
            .onclick(UserActions.openProfileFromElement)
            .href(Links.PROFILE(username))
            .title(displayname + " (@" + username + ")")
            .children(
                UserTemplates.userIcon(user_id, avatar),
                create("span")
                    .classes("text", "align-center", "nopointer", "user-displayname")
                    .text(CustomText.shorten(displayname, 10))
                    .attributes("data-user-id", user_id)
                    .build(),
                create("span")
                    .classes("text", "align-center", "text-small", "nopointer", "user-name", "hideOnSmallBreakpoint")
                    .text("@" + username)
                    .attributes("data-user-id", user_id)
                    .build(),
                cacheUser.content && user_id !== cacheUser.content.id ? UserTemplates.followButton(following, user_id, true) : null
            ).build();
    }

    static linkedUser(user_id, username, displayname, avatar, collab_type, actionButton = null, extraAttributes = undefined, extraClasses = []) {
        const noredirect = extraClasses.includes("no-redirect");
        const base = noredirect ? create("div") : create("a");
        if (extraAttributes) {
            base.attributes(...extraAttributes);
        }
        if (extraClasses && extraClasses.length > 0) {
            base.classes(...extraClasses);
        }
        return base
            .classes("user-widget", "widget-secondary", "collaborator", noredirect ? "_" : "clickable", "rounded", "flex-v", "padded-inline")
            .attributes("user_id", user_id, "username", username)
            .onclick(async () => {
                if (noredirect) {
                    return;
                }
                await window.router.navigate(`profile/${username}`);
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
            )
            .build();
    }

    static userIcon(user_id, avatar) {
        return create("img")
            .classes("user-icon", "user-avatar", "align-center", "nopointer")
            .attributes("data-user-id", user_id)
            .attributes("src", avatar)
            .build();
    }

    static followButton(initialFollowing, user_id, noText = false) {
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
                    .text(initialFollowing === true ? "Unfollow" : "Follow")
                    .build()
            ).onclick(async (e) => {
                await TrackActions.runFollowFunctionFromElement(e, userId, following);
            })
            .build();
    }

    static followsBackIndicator() {
        return create("span")
            .classes("padded-inline", "rounded-max", "text-small", "invertedTextWithBackground")
            .text("Follows you")
            .build();
    }

    static trackCards(tracks, profileId, user, isOwnProfile) {
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
        unapprovedTracks.onUpdate = (tracks) => {
            link.value = tracks.length === 0 ? nullElement() : GenericTemplates.action(Icons.APPROVAL, "Unapproved tracks", "unapproved-tracks", async e => {
                e.preventDefault();
                window.router.navigate("unapproved-tracks");
            }, [], [], Links.LINK("unapproved-tracks"));
        };

        return link;
    }

    static userActionsContainer(isOwnProfile) {
        if (!isOwnProfile) {
            return create("div").build();
        }

        return create("div")
            .classes("actions-container", "flex")
            .children(
                GenericTemplates.newTrackButton(),
                GenericTemplates.newAlbumButton(),
                GenericTemplates.newPlaylistButton(),
                GenericTemplates.action(Icons.SETTINGS, "Settings", "settings", async e => {
                    e.preventDefault();
                    window.router.navigate("settings");
                }, [], [], Links.LINK("settings")),
                GenericTemplates.action(Icons.STATISTICS, "Statistics", "statistics", async e => {
                    e.preventDefault();
                    window.router.navigate("statistics");
                }, [], [], Links.LINK("statistics")),
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

    /**
     *
     * @param {User} user
     * @param {boolean} isOwnProfile
     * @returns {*}
     */
    static profileHeader(user, isOwnProfile) {
        let bannerActions = [];
        let avatarActions = [];
        if (isOwnProfile) {
            bannerActions.push(GenericTemplates.centeredDeleteButton("banner-delete-button", UserActions.deleteBanner, ["hidden", "showOnParentHover"]));
            avatarActions.push(GenericTemplates.centeredDeleteButton("avatar-delete-button", UserActions.deleteAvatar, ["showOnParentHover"]));
        }
        const userBanner = signal(Images.DEFAULT_BANNER);
        Util.getBannerFromUserIdAsync(user.id).then(banner => {
            userBanner.value = banner;
        });
        const userAvatar = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(user.id).then(avatar => {
            userAvatar.value = avatar;
        });

        return create("div")
            .classes("profile-header")
            .children(
                create("div")
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
                    )
                    .build(),
                ...bannerActions,
                create("div")
                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                    .attributes("id", "banner-loader")
                    .build(),
                create("div")
                    .classes("header-info-container", "flex")
                    .attributes("isOwnProfile", isOwnProfile.toString())
                    .onclick(UserActions.replaceBanner)
                    .children(
                        create("div")
                            .classes("avatar-container", "relative", isOwnProfile ? "pointer" : "_")
                            .attributes("isOwnProfile", isOwnProfile.toString())
                            .onclick(UserActions.replaceAvatar)
                            .onmouseover(e => {
                                if (e.currentTarget.getAttribute("isOwnProfile") === "false") {
                                    return;
                                }
                                const bannerContainer = document.querySelector(".banner-container");
                                bannerContainer.classList.remove("blurOnParentHover");
                                const button = document.querySelector("#banner-delete-button");
                                button.classList.remove("showOnParentHover");
                            })
                            .onmouseleave(e => {
                                if (e.currentTarget.getAttribute("isOwnProfile") === "false") {
                                    return;
                                }
                                const bannerContainer = document.querySelector(".banner-container");
                                bannerContainer.classList.add("blurOnParentHover");
                                const button = document.querySelector("#banner-delete-button");
                                button.classList.add("showOnParentHover");
                            })
                            .children(
                                create("img")
                                    .classes("nopointer", "user-avatar", "avatar-image", isOwnProfile ? "blurOnParentHover" : "_")
                                    .attributes("data-user-id", user.id)
                                    .attributes("src", userAvatar)
                                    .attributes("alt", user.username)
                                    .build(),
                                ...avatarActions,
                                create("div")
                                    .classes("loader", "loader-small", "centeredInParent", "hidden")
                                    .attributes("id", "avatar-loader")
                                    .build()
                            ).build(),
                    ).build()
            ).build();
    }

    static profileInfo(user, selfUser, isOwnProfile, permissions, following, followsBack) {
        let specialInfo = [];
        if (user.badges.length > 0) {
            specialInfo = [UserTemplates.badges(user.badges)];
        }
        let verification = [];
        if (user.verified) {
            verification.push(UserTemplates.verificationbadge());
            if (permissions.some(p => p.name === Permissions.canVerifyUsers)) {
                verification.push(
                    GenericTemplates.action(Icons.X, "Unverify", "unverify", async e => {
                        e.preventDefault();
                        await UserActions.unverifyUser(user.id);
                        window.router.reload();
                    }, [], ["negative"])
                );
            }
        } else {
            if (permissions.some(p => p.name === Permissions.canVerifyUsers)) {
                verification.push(
                    GenericTemplates.action(Icons.VERIFIED, "Verify", "verify", async e => {
                        e.preventDefault();
                        await UserActions.verifyUser(user.id);
                        window.router.reload();
                    }, [], ["positive"])
                );
            }
        }

        return create("div")
            .classes("name-container", "flex-v")
            .children(
                UserTemplates.displayname(user, selfUser, isOwnProfile),
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.username(user, selfUser, isOwnProfile),
                        ...verification,
                        isOwnProfile === false && selfUser ? UserTemplates.followButton(following, user.id) : null,
                        isOwnProfile === false && followsBack === true ? UserTemplates.followsBackIndicator() : null,
                    ).build(),
                UserTemplates.userDescription(user, selfUser, isOwnProfile, specialInfo)
            ).build();
    }

    static badges(badges) {
        let children = [];
        for (let badge of badges) {
            children.push(UserTemplates.badge(badge));
        }
        return create("div")
            .classes("flex", "small-gap", "limitToContentWidth", "rounded", "hideOnSmallBreakpoint")
            .children(...children)
            .build();
    }

    static badge(badge) {
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

    static albumCards(albums, user, isOwnProfile) {
        let children = [];
        if (albums.length === 0) {
            return AlbumTemplates.noAlbumsYet(isOwnProfile);
        } else {
            children = albums.map(album => AlbumTemplates.albumCard(album, user));
        }

        return AlbumTemplates.albumCardsContainer(children);
    }

    static playlistCards(playlists, user, isOwnProfile) {
        let children = [];
        if (playlists.length === 0) {
            return PlaylistTemplates.noPlaylistsYet(isOwnProfile);
        } else {
            children = playlists.map(playlist => PlaylistTemplates.playlistCard(playlist, user));
        }

        return PlaylistTemplates.playlistCardsContainer(children);
    }

    static libraryPage(albums, playlists, tracks, user) {
        const container = create("div").build();

        const tracksContainer = UserTemplates.libraryTracks(tracks, user);
        const albumsContainer = UserTemplates.libraryAlbums(albums, user);
        const playlistsContainer = UserTemplates.libraryPlaylists(playlists, user);

        const tabs = ["Tracks", "Albums", "Playlists"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer];
        const tabSelector = GenericTemplates.tabSelector(tabs, (i) => {
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

    static libraryAlbums(albums, user) {
        const template = signal(create("div").build());
        const update = (albums) => {
            let children = [];
            if (albums.length === 0) {
                children = [
                    create("span")
                        .text("Like some albums to see them here")
                        .build()
                ];
            } else {
                children = albums.map(album => AlbumTemplates.albumCard(album, user));
            }

            template.value = AlbumTemplates.albumCardsContainer(children);
        };
        update(albums);

        return template;
    }

    static libraryTracks(tracks, user) {
        const template = signal(create("div").build());
        const update = (tracks) => {
            let children;
            if (tracks.length === 0) {
                children = [
                    create("span")
                        .text("Like some tracks to see them here")
                        .build()
                ];
            } else {
                children = tracks.map(track => TrackTemplates.trackCard(track, user, user.id));
            }

            template.value = TrackTemplates.trackCardsContainer(children);
        };
        update(tracks);

        return template;
    }

    static libraryPlaylists(playlists, user) {
        const template = signal(create("div").build());

        const update = (playlists) => {
            let children = [];
            if (playlists.length === 0) {
                children = [
                    create("span")
                        .text("Like some playlists to see them here")
                        .build()
                ];
            } else {
                children = playlists.map(playlist => PlaylistTemplates.playlistCard(playlist, user));
            }

            template.value = PlaylistTemplates.playlistCardsContainer(children);
        };
        update(playlists);

        return template;
    }

    static username(user, selfUser, isOwnProfile) {
        const nameState = signal(user.username);

        const base = create("span")
            .classes("username", "user-name")
            .attributes("data-user-id", user.id)
            .text(`@${user.username}`);

        if (isOwnProfile) {
            base.onclick(async () => {
                UserActions.editUsername(nameState, (newUsername) => {
                    nameState.value = newUsername;
                });
            });
            base.classes("clickable");
        }

        return base.build();
    }

    static displayname(user, selfUser, isOwnProfile) {
        const nameState = signal(user.displayname);

        const base = create("h1")
            .classes("display_name", "user-displayname")
            .attributes("data-user-id", user.id)
            .text(nameState);

        if (isOwnProfile) {
            base.onclick(async () => {
                UserActions.editDisplayname(nameState, (newDisplayname) => {
                    nameState.value = newDisplayname;
                });
            });
            base.classes("clickable");
        }

        return base.build();
    }

    static userDescription(user, selfUser, isOwnProfile, specialInfo) {
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

    static editDescriptionButton(currentDescription) {
        const descState = signal(currentDescription);
        return GenericTemplates.action(Icons.PEN, "Edit description", "edit-description", async e => {
            e.preventDefault();
            UserActions.editDescription(descState.value, (newDescription) => {
                const description = document.querySelector("#user-description");
                description.innerHTML = CustomText.renderToHtml(newDescription);
                descState.value = newDescription;
            });
        }, [], ["secondary"]);
    }

    static notPublicLibrary(name) {
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