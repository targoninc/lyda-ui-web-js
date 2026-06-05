import {copy, getAvatar, target, Util} from "../../Classes/Util.ts";
import {TrackActions} from "../../Actions/TrackActions.ts";
import {UserActions} from "../../Actions/UserActions.ts";
import {GenericTemplates, horizontal, tabSelected, vertical} from "../generic/GenericTemplates.ts";
import {Icons as Icons} from "../../Enums/Icons.ts";
import {Links} from "../../Enums/Links.ts";
import {CustomText, truncateText} from "../../Classes/Helpers/CustomText.ts";
import {Images} from "../../Enums/Images.ts";
import {navigate, reload, Route} from "../../Routing/Router.ts";
import {router} from "../../../main.ts";
import {
    AnyElement,
    compute,
    create,
    DomNode,
    HtmlPropertyValue,
    nullElement,
    Signal,
    signal,
    StringOrSignal,
    when,
} from "@targoninc/jess";
import {currentUser, permissions, playingFrom, playingHere} from "../../state.ts";
import {createModal, notify, Ui} from "../../Classes/Ui.ts";
import {MediaActions} from "../../Actions/MediaActions.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {FeedTemplates} from "../generic/FeedTemplates.ts";
import {SearchTemplates} from "../SearchTemplates.ts";
import {TrackTemplates} from "../music/TrackTemplates.ts";
import {PopoverTemplates} from "../generic/PopoverTemplates.ts";
import {FeedMenuAction, MenuItem} from "../../Models/FeedConfig.ts";
import {button, icon} from "@targoninc/jess-components";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {AlbumActions} from "../../Actions/AlbumActions.ts";
import {PlaylistActions} from "../../Actions/PlaylistActions.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {TrackList} from "../../Models/TrackList.ts";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {pinState} from "../../Classes/PinState.ts";
import {Badge} from "@targoninc/lyda-shared/src/Models/db/lyda/Badge";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {Api} from "../../Api/Api.ts";
import {TrackCollaborator} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import {TrackEditTemplates} from "../music/TrackEditTemplates.ts";
import {CollaboratorType} from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType.ts";
import {t} from "../../../locales";
import {FeedType} from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import {CardFeedType} from "../../Enums/CardFeedType.ts";
import {TextSize} from "../../Enums/TextSize.ts";

export class UserTemplates {
    static #popoverUid = 0;
    static #profileBackgroundEl: HTMLElement | null = null;

    static #clearProfileBackground() {
        if (UserTemplates.#profileBackgroundEl) {
            UserTemplates.#profileBackgroundEl.remove();
            UserTemplates.#profileBackgroundEl = null;
        }
        const pageBg = document.querySelector(".page-background") as HTMLElement | null;
        if (pageBg) {
            pageBg.style.position = "";
        }
    }

    static #setProfileBackground(u: User | null) {
        const pageBg = document.querySelector(".page-background") as HTMLElement | null;
        if (!pageBg) return;

        if (!UserTemplates.#profileBackgroundEl) {
            pageBg.style.position = "relative";
            UserTemplates.#profileBackgroundEl = document.createElement("div");
            UserTemplates.#profileBackgroundEl.className = "page-background-image";
            pageBg.insertBefore(UserTemplates.#profileBackgroundEl, pageBg.firstChild);
        }

        UserTemplates.#profileBackgroundEl.style.backgroundImage = u?.has_banner
            ? `url(${Util.getUserBanner(u.id)})`
            : "";
    }

    static userWidget(
        user: User | Signal<User | null>,
        extraAttributes: HtmlPropertyValue[] = [],
        extraClasses: StringOrSignal[] = [],
        context: UserWidgetContext = UserWidgetContext.unknown,
        overrideArtistName?: string | null
    ) {
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
            out.value = this.userWidgetInternal(context, newUser, base, Util.isFollowing(user), overrideArtistName);
        };

        if (user.constructor === Signal) {
            (user as Signal<User | null>).subscribe(getWidget);
            getWidget((user as Signal<User | null>).value);
        } else {
            getWidget(user as User);
        }
        return out;
    }

    private static userWidgetInternal(
        context: UserWidgetContext,
        user: User,
        base: DomNode,
        following: boolean | Signal<boolean>,
        overrideArtistName?: string | null
    ) {
        const maxDisplaynameLength = [UserWidgetContext.singlePage, UserWidgetContext.list].includes(context)
            ? 100
            : 15;
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (user.has_avatar) {
            Util.getCachedUserAvatar(user.id).then(url => {
                avatarState.value = url;
            });
        }
        if (following.constructor !== Signal) {
            following = signal(following as boolean);
        }
        const showFollowButton = compute(u => u && u.id && u.id !== user.id && !following.value, currentUser);
        if (overrideArtistName?.trim().length === 0) {
            overrideArtistName = null;
        }

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
                    .classes("text", "align-center", "nopointer", "hideOnTinyBreakpoint")
                    .text(truncateText(overrideArtistName ?? user.displayname, maxDisplaynameLength))
                    .attributes("data-user-id", user.id)
                    .build(),
                create("span")
                    .classes("text", "align-center", TextSize.xSmall, "nopointer", "user-name", "hideOnSmallBreakpoint")
                    .text("@" + user.username)
                    .attributes("data-user-id", user.id)
                    .build(),
                when(showFollowButton, UserTemplates.followButton(following, user.id, true)),
            ).build();
    }

    public static userLink(context: UserWidgetContext, user: User, overrideArtistName?: string | null) {
        const maxDisplaynameLength = [UserWidgetContext.singlePage, UserWidgetContext.list].includes(context)
            ? 100
            : 15;
        let timeout: any = null;
        let hideTimeout: any = null;
        const avatarState = getAvatar(user);
        if (overrideArtistName?.trim().length === 0) {
            overrideArtistName = null;
        }

        UserTemplates.#popoverUid += 1;
        const popId = `user-preview-${user.id}-${UserTemplates.#popoverUid}`;
        const preview = PopoverTemplates.manualPopover(popId,
            UserTemplates.userPreview(user, context),
        );

        const link = create("a")
            .classes("page-link", "color-dim", "flex", "align-children", "small-gap", "noflexwrap")
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
                    .classes("text", "align-center", "nopointer")
                    .text(truncateText(overrideArtistName ?? user.displayname, maxDisplaynameLength))
                    .attributes("data-user-id", user.id)
                    .build(),
            ).build();

        const container = horizontal(link, preview)
            .onmouseover(() => {
                if (hideTimeout) clearTimeout(hideTimeout);
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    PopoverTemplates.show(preview, container, context === UserWidgetContext.player);
                }, 500);
            })
            .onmouseleave(() => {
                if (timeout) clearTimeout(timeout);
                hideTimeout = setTimeout(() => {
                    PopoverTemplates.hide(preview);
                }, 100);
            })
            .classes("relative")
            .build() as HTMLElement;

        preview.addEventListener("mouseover", () => {
            if (hideTimeout) clearTimeout(hideTimeout);
        });
        preview.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                PopoverTemplates.hide(preview);
            }, 100);
        });

        return container;
    }

    static editableLinkedUser(
        user_id: number,
        username: string,
        displayname: string,
        avatar: StringOrSignal,
        collab_type: Signal<string>,
        linkedUsersState: Signal<Partial<TrackCollaborator>[]>,
        collabTypes: Signal<CollaboratorType[]>,
        approved: boolean,
        denied: boolean,
    ) {
        collab_type.subscribe((t, changed) => {
            if (!changed) {
                return;
            }
            linkedUsersState.value = structuredClone(linkedUsersState.value).map(tc => {
                if (tc.user_id === user_id) {
                    const collabType = collabTypes.value.find(ct => ct.id.toString() === t);
                    if (collabType) {
                        tc.collab_type = collabType;
                        tc.type = collabType.id;
                    }
                }
                return tc;
            });
        }, `linked-user-${user_id}`);

        return create("div")
            .classes("user-widget", "collaborator", "rounded", "flex-v", "padded-inline")
            .attributes("user_id", user_id, "username", username)
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        UserTemplates.userIcon(user_id, avatar),
                        create("span")
                            .classes("text", "nopointer")
                            .text(displayname)
                            .attributes("data-user-id", user_id)
                            .build(),
                        create("span")
                            .classes(
                                "text",
                                "align-center",
                                TextSize.small,
                                "nopointer",
                                "user-name",
                                "hideOnSmallBreakpoint",
                            ).text("@" + username)
                            .attributes("data-user-id", user_id)
                            .build(),
                        TrackEditTemplates.collaboratorTypeSelect(collab_type, collabTypes),
                        GenericTemplates.deleteIconButton(`remove_linked_user_${user_id}`, () => {
                            linkedUsersState.value = linkedUsersState.value.filter(tc => tc.user_id !== user_id);
                        }),
                        UserTemplates.collabApprovalStatus(approved, denied),
                    ).build(),
            ).build();
    }

    static linkedUser(
        user_id: number,
        username: string,
        displayname: string,
        avatar: StringOrSignal,
        collab_type: Signal<string>,
        collabTypes: Signal<CollaboratorType[]>,
        approved: boolean,
        denied: boolean,
    ) {
        const typeName = compute((ct, types) => types.find(t => t.id.toString() === ct)?.name ?? "", collab_type, collabTypes);

        return create("a")
            .classes("user-widget", "collaborator", "rounded", "flex-v", "padded-inline")
            .attributes("user_id", user_id, "username", username)
            .href(Links.PROFILE(username))
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        UserTemplates.userIcon(user_id, avatar),
                        create("span")
                            .classes("text", "nopointer", "user-displayname")
                            .text(displayname)
                            .attributes("data-user-id", user_id)
                            .build(),
                        create("span")
                            .classes(
                                "text",
                                "align-center",
                                TextSize.small,
                                "nopointer",
                                "user-name",
                                "hideOnSmallBreakpoint",
                            ).text("@" + username)
                            .attributes("data-user-id", user_id)
                            .build(),
                        GenericTemplates.tag(typeName),
                        UserTemplates.collabApprovalStatus(approved, denied),
                    ).build(),
            ).build();
    }

    private static collabApprovalStatus(approved: boolean, denied: boolean) {
        return horizontal(
            when(approved, horizontal(icon({
                icon: "new_releases",
                adaptive: true,
                classes: ["text-positive"],
                title: "User has verified this association",
            })).build()),
            when(denied, horizontal(icon({
                icon: "block",
                adaptive: true,
                classes: ["negative"],
                title: "User has denied this association",
            })).build()),
            when((!approved && !denied), horizontal(icon({
                icon: "hourglass_empty",
                adaptive: true,
                title: "Pending request",
            })).build()),
        );
    }

    static userIcon(user_id: HtmlPropertyValue, avatar: StringOrSignal, big = false) {
        return create("img")
            .classes(`user-icon${big ? "-big" : ""}`, "align-center", "nopointer")
            .attributes("data-user-id", user_id)
            .attributes("src", avatar).build();
    }

    static followButton(following: boolean | Signal<boolean>, user_id: number, noText = false) {
        if (following.constructor !== Signal) {
            following = signal(following as boolean);
        }
        const text = noText ? "" : compute((f): string => (f ? `${t("UNFOLLOW")}` : `${t("FOLLOW")}`), following);

        return GenericTemplates.textButton(text, async () => TrackActions.toggleFollow(user_id, following),
            compute((f): string => (f ? "person_cancel" : "person_add"), following));
    }

    static followsBackIndicator() {
        return GenericTemplates.tag(t("FOLLOWS_YOU"), "follow");
    }

    static unapprovedTracksLink() {
        const unapprovedTracks = signal<any[]>([]);
        Api.getUnapprovedTracks().then(tracks => (unapprovedTracks.value = tracks ?? []));
        const hasTracks = compute(t => t.length > 0, unapprovedTracks);

        return when(hasTracks, button({
            text: compute(tracks => `${t("UNAPPROVED_TRACKS", tracks.length)}`, unapprovedTracks),
            icon: {icon: "order_approve"},
            onclick: () => navigate(RoutePath.unapprovedTracks),
        }));
    }

    static profile(route: Route, params: Record<string, string>) {
        const user = signal<User | null>(null);
        const isOwnProfile = compute((u1, u2) => u1?.id === u2?.id, currentUser, user);
        const loading = signal(false);
        const notFound = compute((l, u) => l && !u, loading, user);

        user.subscribe(u => {
            UserTemplates.#setProfileBackground(u);
        });

        router.currentRoute.subscribe(r => {
            if (r?.path !== RoutePath.profile && !r?.aliases?.includes("user")) {
                UserTemplates.#clearProfileBackground();
                router.currentRoute.unsubscribeKey("profile-bg-cleanup");
            }
        }, "profile-bg-cleanup");

        Api.getUserByName(params["name"])
            .then(u => {
                user.value = u;
                document.title = u?.displayname ?? "";
                if (!user && isOwnProfile) {
                    notify(`${t("LOGIN_TO_VIEW_PROFILE")}`, NotificationType.error);
                    return;
                }
            })
            .finally(() => (loading.value = false));

        return vertical()
            .children(
                when(loading, GenericTemplates.loadingSpinner()),
                when(
                    notFound,
                    vertical(
                        UserTemplates.userActionsContainer(isOwnProfile),
                        compute(u => (u ? UserTemplates.profileHeader(u, isOwnProfile) : nullElement()), user),
                        compute((u, i) => (u ? UserTemplates.profileInfo(u, i) : nullElement()), user, isOwnProfile),
                        compute((u) => (u ? UserTemplates.profileTabs(u) : nullElement()), user),
                    ).classes("noflexwrap", "fullWidth")
                        .build(),
                    true,
                ),
                when(notFound, vertical(
                    create("span")
                        .text(t("USER_NOT_FOUND")),
                ).build()),
            ).classes("fullWidth").build();
    }

    static profileTab<T>(
        entityType: EntityType,
        apiFunc: (name: string, id?: number | null) => Promise<T[] | null>,
        user: User,
        isOwnProfile: boolean,
        dataTemplate: (entityType: EntityType, data: T[], ownProfile: boolean) => AnyElement,
    ) {
        const data = signal<T[] | null>(null);
        const loading = signal(false);
        apiFunc(user.username, user.id)
            .then(d => (data.value = d))
            .finally(() => (loading.value = false));

        return vertical(
            when(loading, GenericTemplates.loadingSpinner()),
            when(data, () => (data.value ? dataTemplate(entityType, data.value, isOwnProfile) : nullElement()), false),
        ).build();
    }

    static profileTabs(user: User) {
        const tabs = [`${t("TRACKS")}`, `${t("ALBUMS")}`, `${t("PLAYLISTS")}`, `${t("REPOSTS")}`, `${t("LISTENING_HISTORY")}`];
        const urlTabs = tabs.map(t => t.toLowerCase().replace(/\s/g, "-"));

        const urlParams = new URLSearchParams(window.location.search);
        const index = urlTabs.indexOf(urlParams.get("tab") ?? "");
        const currentIndex = signal(index === -1 ? 0 : index);

        currentIndex.subscribe(i => {
            const tabName = urlTabs[i];
            const url = new URL(window.location.href);
            url.searchParams.set("tab", tabName);
            window.history.replaceState(null, "", url.toString());
        });

        const cardActions = (listType: "album" | "playlist") => (list: TrackList): FeedMenuAction<TrackList>[] => {
            const actions: FeedMenuAction<TrackList>[] = [
                {
                    label: t("QUEUE"),
                    icon: "queue",
                    onclick: (l) => l.tracks?.forEach(t => QueueManager.addToManualQueue(t.track_id)),
                    show: (l) => !!l.tracks?.length
                },
                {
                    label: t("COPY_LINK"),
                    icon: "link",
                    onclick: (l) => copy(window.location.origin + `/${listType}/${l.id}`),
                },
                {
                    label: t("OPEN_IN_NEW_TAB"),
                    icon: "open_in_new",
                    onclick: (l) => window.open(`/${listType}/${l.id}`, "_blank"),
                },
                {
                    label: t("DELETE"),
                    icon: "delete",
                    onclick: async (l, e) => {
                        const deleteFn = listType === "album"
                            ? () => Api.deleteAlbum(l.id).then(() => reload())
                            : () => Api.deletePlaylist(l.id).then(() => reload());
                        await Ui.deleteWithConfirmation(
                            e,
                            listType === "album" ? t("DELETE_ALBUM") : t("DELETE_PLAYLIST"),
                            listType === "album" ? t("SURE_DELETE_ALBUM") : t("SURE_DELETE_PLAYLIST"),
                            deleteFn,
                        );
                    },
                    show: (l) => l.user_id === currentUser.value?.id,
                },
            ];
            const pinAction = UserTemplates.pinActionForEntity(
                listType === "album" ? EntityType.album : EntityType.playlist,
                list.id,
                list.user_id,
                (list as any).visibility,
            );
            if (pinAction) actions.push(pinAction);
            return actions;
        };

        const albumColumns = [
            {
                key: "title",
                header: t("TITLE"),
                render: (list: TrackList) => {
                    const coverSrc = signal(Images.DEFAULT_COVER_ALBUM);
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
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String(list.tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => list.user ? UserTemplates.userLink(UserWidgetContext.card, list.user) : nullElement(),
            },
        ];

        const playlistColumns = [
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
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String(list.tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => list.user ? UserTemplates.userLink(UserWidgetContext.card, list.user) : nullElement(),
            },
        ];

        const pageSearch$ = signal("");
        const pageWipFilter$ = signal("");

        const showFilter = compute(i => i === 0, currentIndex);
        const filterPopover = create("div")
            .classes("generic-popover", "feed-filter-popover", "flex-v")
            .attributes("popover", "manual")
            .children(
                create("div").classes("padded").children(
                    TrackTemplates.wipFilter(pageWipFilter$),
                ).build(),
            ).build() as HTMLElement;
        const filterBtn = create("button")
            .classes("round-button", "jess", "feed-filter-btn")
            .title(t("FILTER"))
            .onclick(() => PopoverTemplates.toggle(filterPopover, filterBtn, true))
            .children(
                GenericTemplates.icon("filter_alt", true, ["round-button-icon", "align-center", "inline-icon", "svg", "nopointer"]),
            ).build();
        const filterArea = create("div")
            .classes(compute((sf): string => sf ? "_" : "hidden", showFilter))
            .children(
                filterBtn,
                filterPopover,
            ).build();

        const tabRow = create("div")
            .classes("flex", "space-between", "align-children", "fullWidth")
            .children(
                GenericTemplates.combinedSelector(tabs, (i: number) => (currentIndex.value = i), currentIndex.value),
                create("div").classes("flex", "align-children", "small-gap")
                    .children(
                        SearchTemplates.searchInputWidget(pageSearch$),
                        filterArea,
                    ).build(),
            ).build();

        return vertical(
            GenericTemplates.fixedBar([tabRow]),
            create("div").classes("fixed-bar-content").children(
                when(
                    tabSelected(currentIndex, 0),
                    FeedTemplates.feed(FeedType.profileTracks, user, {
                        search$: pageSearch$,
                        wipFilterState: pageWipFilter$,
                        noToolbar: true
                    }),
                ),
                when(
                    tabSelected(currentIndex, 1),
                    FeedTemplates.create<TrackList>({
                        id: `feed-${CardFeedType.profileAlbums}`,
                        columns: albumColumns,
                        compact: true,
                        pageSize: 10,
                        showSearch: true,
                        searchOverride$: pageSearch$,
                        noToolbar: true,
                        fetchPage: (offset, limit, filter) => Api.getAlbumsByUserId(user.id, user.username, offset, filter || "").then(r => r ?? {
                            items: [],
                            total: 0
                        }),
                        buildMenuActions: cardActions("album"),
                        onPlayToggle: async (list) => {
                            const ft = list.tracks?.[0]?.track;
                            if (ft) await AlbumActions.startTrackInAlbum(list as Album, ft, true);
                        },
                        isPlaying: (id) => compute((pf, ph) => pf?.id === id && ph, playingFrom, playingHere),
                        dateRender: (list) => GenericTemplates.timestamp(list.created_at, ["hideOnSmallBreakpoint"]),
                        onNavigate: (list) => window.open(`/album/${list.id}`, "_blank"),
                    }),
                ),
                when(
                    tabSelected(currentIndex, 2),
                    FeedTemplates.create<TrackList>({
                        id: `feed-${CardFeedType.profilePlaylists}`,
                        columns: playlistColumns,
                        compact: true,
                        pageSize: 10,
                        showSearch: true,
                        searchOverride$: pageSearch$,
                        noToolbar: true,
                        fetchPage: (offset, limit, filter) => Api.getPlaylistsByUserId(user.id, user.username, offset, filter || "").then(r => r ?? {
                            items: [],
                            total: 0
                        }),
                        buildMenuActions: cardActions("playlist"),
                        onPlayToggle: async (list) => {
                            const ft = list.tracks?.[0]?.track;
                            if (ft) await PlaylistActions.startTrackInPlaylist(list as Playlist, ft, true);
                        },
                        isPlaying: (id) => compute((pf, ph) => pf?.id === id && ph, playingFrom, playingHere),
                        dateRender: (list) => GenericTemplates.timestamp(list.created_at, ["hideOnSmallBreakpoint"]),
                        onNavigate: (list) => window.open(`/playlist/${list.id}`, "_blank"),
                    }),
                ),
                when(
                    tabSelected(currentIndex, 3),
                    FeedTemplates.feed(FeedType.profileReposts, user, {search$: pageSearch$, noToolbar: true}),
                ),
                when(
                    tabSelected(currentIndex, 4),
                    FeedTemplates.feed(FeedType.history, user, {search$: pageSearch$, noToolbar: true, sortable: false}),
                ),
            ).build(),
        ).build();
    }

    static userActionsContainer(isOwnProfile: Signal<boolean>) {
        return vertical(
            when(
                isOwnProfile,
                create("div")
                    .classes("flex", "fullWidth", "space-between", "align-children")
                    .children(
                        horizontal(
                            button({
                                classes: ["positive"],
                                text: t("NEW_ALBUM"),
                                icon: {icon: "add"},
                                onclick: () => navigate(RoutePath.createAlbum),
                            }),
                            button({
                                classes: ["positive"],
                                text: t("NEW_PLAYLIST"),
                                icon: {icon: "add"},
                                onclick: () => navigate(RoutePath.createPlaylist),
                            }),
                            button({
                                text: t("EDIT_TRACKS"),
                                icon: {icon: "edit_note"},
                                onclick: () => navigate(RoutePath.editTracks),
                                classes: ["hideOnMidBreakpoint"],
                            }),
                            button({
                                text: t("STATISTICS"),
                                icon: {icon: "finance"},
                                classes: ["roundIconOnSmallBreakpoint"],
                                onclick: () => navigate(RoutePath.statistics),
                            }),
                            UserTemplates.unapprovedTracksLink(),
                        ).classes("align-children").build(),
                        horizontal(
                            button({
                                text: t("SETTINGS"),
                                icon: {icon: "settings"},
                                classes: ["roundIconOnSmallBreakpoint"],
                                onclick: () => navigate(RoutePath.settings),
                            }),
                            GenericTemplates.logoutButton(["hideOnSmallBreakpoint"]),
                        ).build(),
                    ).build(),
            ),
        );
    }

    static verificationBadge() {
        return create("div")
            .classes("verification-badge")
            .children(
                create("img")
                    .attributes("src", Icons.VERIFIED)
                    .attributes("alt", "Verified")
                    .attributes("title", t("VERIFIED"))
                    .build(),
            ).build();
    }

    static profileHeader(user: User, isOwnProfile: Signal<boolean>) {
        const avatarLoading = signal(false);
        const bannerLoading = signal(false);
        const userBanner = signal(Images.DEFAULT_BANNER);
        if (user.has_banner) {
            userBanner.value = Util.getUserBanner(user.id);
        }
        const userAvatar = signal(Images.DEFAULT_AVATAR);
        if (user.has_avatar) {
            Util.getCachedUserAvatar(user.id).then(url => {
                userAvatar.value = url;
            });
        }

        const bannerContainer = create("div")
            .classes(
                "banner-container",
                "relative",
                compute((i): string => (i ? "clickable" : "_"), isOwnProfile),
                compute((i): string => (i ? "blurOnParentHover" : "_"), isOwnProfile),
            )
            .onclick(() => Ui.showImageModal(userBanner))
            .children(
                create("img")
                    .classes("nopointer", "user-banner", "banner-image")
                    .attributes("data-user-id", user.id)
                    .src(userBanner)
                    .alt(user.username)
                    .build(),
            ).build();

        return create("div")
            .classes("profile-header")
            .children(
                bannerContainer,
                when(
                    isOwnProfile,
                    create("div")
                        .classes("hidden", "showOnParentHover", "centeredInParent", "flex")
                        .children(
                            UserTemplates.bannerDeleteButton(user, userBanner, bannerLoading),
                            UserTemplates.bannerReplaceButton(user, userBanner, bannerLoading),
                        ).build(),
                ),
                when(
                    bannerLoading,
                    create("div")
                        .classes("loader", "loader-small", "centeredInParent", "hidden")
                        .attributes("id", "banner-loader")
                        .build(),
                ),
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
                                when(
                                    isOwnProfile,
                                    create("div")
                                        .classes("hidden", "showOnParentHover", "centeredInParent", "flex")
                                        .children(
                                            UserTemplates.avatarDeleteButton(user, userAvatar, avatarLoading),
                                            UserTemplates.avatarReplaceButton(user, userAvatar, avatarLoading),
                                        )
                                        .build(),
                                ),
                                when(
                                    avatarLoading,
                                    create("div")
                                        .classes("loader", "loader-small", "centeredInParent", "hidden")
                                        .attributes("id", "avatar-loader")
                                        .build(),
                                ),
                            )
                            .build(),
                    )
                    .build(),
            ).build();
    }

    static bannerReplaceButton(
        user: User,
        userBanner: Signal<string> = signal(""),
        bannerLoading: Signal<boolean> = signal(false),
    ) {
        return GenericTemplates.uploadIconButton(
            "banner-upload-button",
            (e: Event) => UserActions.replaceBanner(e, user, userBanner, bannerLoading),
            ["positive"],
        );
    }

    static avatarDeleteButton(
        user: User,
        userAvatar: Signal<string> = signal(""),
        avatarLoading: Signal<boolean> = signal(false),
    ) {
        return GenericTemplates.deleteIconButton("avatar-delete-button", () =>
            MediaActions.deleteMedia(MediaFileType.userAvatar, user.id, userAvatar, avatarLoading),
        );
    }

    static avatarReplaceButton(
        user: User,
        userAvatar: Signal<string> = signal(""),
        avatarLoading: Signal<boolean> = signal(false),
    ) {
        return GenericTemplates.uploadIconButton(
            "avatar-upload-button",
            () => UserActions.replaceAvatar(user, userAvatar, avatarLoading),
            ["positive"],
        );
    }

    static bannerDeleteButton(
        user: User,
        userBanner: Signal<string> = signal(""),
        bannerLoading: Signal<boolean> = signal(false),
    ) {
        return GenericTemplates.deleteIconButton("banner-delete-button", () =>
            MediaActions.deleteMedia(MediaFileType.userBanner, user.id, userBanner, bannerLoading),
        );
    }

    static profileInfo(user: User, isOwnProfile: boolean) {
        const hasUnverifiedPrimaryEmail =
            isOwnProfile && user.emails && user.emails.some(e => e.primary && !e.verified);
        const isFollowed = compute(f => f && !isOwnProfile, Util.isFollowedBy(user));

        return vertical(
            horizontal(
                vertical(
                    UserTemplates.displayname(user),
                    UserTemplates.usernameAndIcons(user)
                ).classes("no-gap"),
                vertical(
                    UserTemplates.mutualFollowersIndicator(user),
                    horizontal(
                        when(isFollowed, UserTemplates.followsBackIndicator()),
                        when(!isOwnProfile && currentUser.value, UserTemplates.followButton(Util.isFollowing(user), user.id)),
                    ).classes("align-children", "align-end", "big-gap")
                ),
            ).classes("space-between"),
            UserTemplates.userDescription(user, isOwnProfile),
            UserTemplates.pinsCarousel(user),
            when(
                hasUnverifiedPrimaryEmail,
                create("div")
                    .classes("card", "padded", "flex", "warning", "align-children")
                    .children(
                        GenericTemplates.icon("warning", true, ["warning"]),
                        create("span")
                            .text(t("PRIMARY_EMAIL_NOT_VERIFIED"))
                            .build(),
                        button({
                            text: t("GO_TO_SETTINGS"),
                            icon: {icon: "settings"},
                            classes: ["positive"],
                            onclick: () => navigate(RoutePath.settings),
                        }),
                    )
                    .build(),
            ),
        ).build();
    }

    static pinActionForEntity(entityType: string, entityId: number, userId: number, visibility: string): FeedMenuAction<any> | null {
        const cu = currentUser.value;
        if (!cu || visibility === "private") return null;
        if (userId === cu.id) {
            const pinned = pinState.isPinned(entityType, entityId);
            return {
                label: pinned ? t("UNPIN") : t("PIN_TO_PROFILE"),
                icon: "push_pin",
                onclick: async () => {
                    if (pinned) {
                        await pinState.unpin(entityType, entityId);
                    } else {
                        try {
                            await pinState.pin(entityType, entityId);
                        } catch {
                        }
                    }
                },
            };
        }
        return null;
    }

    static pinsCarousel(profileUser: User) {
        const pins = signal<any[]>([]);
        const subKey = `pins-carousel-${profileUser.id}`;

        const fetchPins = () => {
            Api.getPins(profileUser.id).then(data => {
                pins.value = data?.items ?? [];
            });
        };
        fetchPins();
        pinState.changeCount.subscribe(() => fetchPins(), subKey);

        const defaultCover = (type: string) => {
            if (type === EntityType.track) return Images.DEFAULT_COVER_TRACK;
            if (type === EntityType.album) return Images.DEFAULT_COVER_ALBUM;
            return Images.DEFAULT_COVER_PLAYLIST;
        };

        const mediaFileType = (type: string) => {
            if (type === EntityType.track) return MediaFileType.trackCover;
            if (type === EntityType.album) return MediaFileType.albumCover;
            return MediaFileType.playlistCover;
        };

        const entityUrl = (type: string, id: number) => {
            return `/${type}/${id}`;
        };

        const typeLabel = (type: string) => {
            if (type === EntityType.track) return t("TRACK");
            if (type === EntityType.album) return t("ALBUM");
            return t("PLAYLIST");
        };

        return compute((items: any[]) => {
            if (items.length === 0) return nullElement();

            const scrollDiv = create("div")
                .classes("flex", "small-gap", "pin-scroll")
                .build() as HTMLElement;

            for (let pi = 0; pi < items.length; pi++) {
                const pin = items[pi];
                const entity = pin.track || pin.album || pin.playlist;
                if (!entity) continue;

                const coverSrc = signal(defaultCover(pin.entity_type));
                if (entity.has_cover) {
                    Util.getCachedImage(entity.id, mediaFileType(pin.entity_type)).then(url => {
                        coverSrc.value = url;
                    });
                }

                const isFirst = pi === 0;
                const isLast = pi === items.length - 1;

                const menuItems: MenuItem[] = [];
                if (pin.entity_type === EntityType.track && entity) {
                    menuItems.push({
                        label: t("QUEUE"), icon: "queue", show: true,
                        onclick: async () => { QueueManager.addToManualQueue(entity.id); },
                    });
                    if (entity.visibility === "private" && entity.secretcode) {
                        menuItems.push({
                            label: t("COPY_PRIVATE_LINK"), icon: "link", show: true,
                            onclick: async () => { copy(window.location.origin + "/track/" + entity.id + "/" + entity.secretcode); },
                        });
                    } else {
                        menuItems.push({
                            label: t("COPY_LINK"), icon: "link", show: true,
                            onclick: async () => { copy(window.location.origin + entityUrl(pin.entity_type, pin.entity_id)); },
                        });
                    }
                    menuItems.push({
                        label: t("OPEN_IN_NEW_TAB"), icon: "open_in_new", show: true,
                        onclick: async () => { window.open(entityUrl(pin.entity_type, pin.entity_id), "_blank"); },
                    });
                } else if (entity && (entity.tracks?.length ?? 0) > 0) {
                    menuItems.push({
                        label: t("QUEUE"), icon: "queue", show: true,
                        onclick: async () => { entity.tracks?.forEach((t: any) => QueueManager.addToManualQueue(t.track_id)); },
                    });
                    menuItems.push({
                        label: t("COPY_LINK"), icon: "link", show: true,
                        onclick: async () => { copy(window.location.origin + entityUrl(pin.entity_type, pin.entity_id)); },
                    });
                    menuItems.push({
                        label: t("OPEN_IN_NEW_TAB"), icon: "open_in_new", show: true,
                        onclick: async () => { window.open(entityUrl(pin.entity_type, pin.entity_id), "_blank"); },
                    });
                }
                menuItems.push({
                    label: t("UNPIN"), icon: "push_pin", show: true,
                    onclick: async () => {
                        await pinState.unpin(pin.entity_type, pin.entity_id);
                        items.splice(items.indexOf(pin), 1);
                        pins.value = [...items];
                    },
                });
                menuItems.push({
                    label: t("MOVE_LEFT"), icon: "chevron_left", show: !isFirst,
                    onclick: async () => {
                        await Api.movePin(pin.id, "left");
                        [items[pi - 1], items[pi]] = [items[pi], items[pi - 1]];
                        pins.value = [...items];
                        pinState.changeCount.value = pinState.changeCount.value + 1;
                    },
                });
                menuItems.push({
                    label: t("MOVE_RIGHT"), icon: "chevron_right", show: !isLast,
                    onclick: async () => {
                        await Api.movePin(pin.id, "right");
                        [items[pi], items[pi + 1]] = [items[pi + 1], items[pi]];
                        pins.value = [...items];
                        pinState.changeCount.value = pinState.changeCount.value + 1;
                    },
                });

                const popId = `pin-menu-${pin.id}`;
                const buildMenuButton = (m: MenuItem) =>
                    create("button").classes("context-menu-item", "flex", "align-children", "small-gap")
                        .onclick(async (ev: Event) => {
                            const pop = (ev.currentTarget as HTMLElement).closest("[popover]") as HTMLElement | null;
                            if (pop) pop.hidePopover();
                            await m.onclick();
                        })
                        .children(
                            GenericTemplates.icon(m.icon, true, ["context-menu-icon"]),
                            create("span").text(m.label).build(),
                        ).build();

                const visibleMenuItems = () => menuItems.filter(m => m.show !== false);
                const popover = PopoverTemplates.manualPopover(popId, ...visibleMenuItems().map(buildMenuButton));
                document.body.appendChild(popover);

                const rebuildContextMenu = () => {
                    popover.innerHTML = "";
                    for (const el of visibleMenuItems().map(buildMenuButton)) {
                        popover.appendChild(el);
                    }
                };

                let dragStarted = false;

                const pinEl = create("div")
                    .classes("flex-v", "clickable", "no-gap", "pin-card")
                    .attributes("draggable", "true")
                    .onclick(() => { if (!dragStarted) navigate(entityUrl(pin.entity_type, pin.entity_id)); dragStarted = false; })
                    .onauxclick((e: MouseEvent) => {
                        if (e.button === 1) {
                            e.preventDefault();
                            window.open(entityUrl(pin.entity_type, pin.entity_id), "_blank");
                        }
                    })
                    .ondragstart((e: DragEvent) => {
                        dragStarted = true;
                        if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(pi));
                        }
                        pinEl.classList.add("drag-over");
                    })
                    .ondragover((e: Event) => {
                        e.preventDefault();
                        (e as DragEvent).dataTransfer!.dropEffect = "move";
                    })
                    .ondragenter((e: Event) => {
                        e.preventDefault();
                        pinEl.classList.add("drag-over");
                    })
                    .ondragleave((e: Event) => {
                        if (!pinEl.contains((e as DragEvent).relatedTarget as Node)) {
                            pinEl.classList.remove("drag-over");
                        }
                    })
                    .ondragend(() => {
                        pinEl.classList.remove("drag-over");
                        dragStarted = false;
                    })
                    .ondrop(async (e: Event) => {
                        e.preventDefault();
                        pinEl.classList.remove("drag-over");
                        const dt = (e as DragEvent).dataTransfer;
                        if (!dt) return;
                        const fromIdx = parseInt(dt.getData("text/plain"), 10);
                        if (fromIdx === pi) return;
                        const moved = items.splice(fromIdx, 1)[0];
                        items.splice(pi, 0, moved);
                        pins.value = [...items];
                        await Api.reorderPins(items.map((p: any) => p.id));
                        pinState.changeCount.value = pinState.changeCount.value + 1;
                    })
                    .onmousemove((e: MouseEvent) => {
                        const rect = pinEl.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        const tiltX = (y - 0.5) * -16;
                        const tiltY = (x - 0.5) * 16;
                        pinEl.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
                    })
                    .onmouseleave(() => {
                        pinEl.style.transform = "";
                    })
                    .oncontextmenu((e: MouseEvent) => {
                        e.preventDefault();
                        rebuildContextMenu();
                        PopoverTemplates.showContextMenu(popover, e.clientX, e.clientY);
                    })
                    .children(
                        create("img")
                            .classes("rounded")
                            .src(coverSrc)
                            .alt(entity.title)
                            .build(),
                        create("span")
                            .classes("nopointer", "break-lines", "pin-title")
                            .text(entity.title)
                            .build(),
                        horizontal(
                            GenericTemplates.icon("keep", true),
                            create("span")
                                .classes("nopointer", "pin-type")
                                .text(typeLabel(pin.entity_type))
                                .build(),
                        ).classes("small-gap")
                    ).build();
                scrollDiv.appendChild(pinEl);
            }

            return create("div")
                .classes("flex", "align-children", "small-gap")
                .styles("width", "100%")
                .children(
                    scrollDiv,
                ).build();
        }, pins);
    }

    private static usernameAndIcons(user: User) {
        const verified = signal(user.verified);
        const hasPermissionToVerify = compute(p => p.some(p => p.name === Permissions.canVerifyUsers), permissions);
        const hasBadges = user.badges && user.badges.length > 0;
        const isOwnProfile = currentUser.value?.id === user.id;
        const verifyPopover = PopoverTemplates.manualPopover(`verify-${user.id}`,
            vertical(UserTemplates.verifyUserButton(user, verified)).build(),
        );
        const verifyBtn = GenericTemplates.roundIconButton(
            {icon: "settings_account_box"},
            () => PopoverTemplates.toggle(verifyPopover, verifyBtn),
            "User options",
        );

        return create("div")
            .classes("flex", "align-children")
            .children(
                UserTemplates.username(user, isOwnProfile),
                when(hasBadges, UserTemplates.badges(user.badges ?? [])),
                when(verified, UserTemplates.verificationBadge()),
                when(hasPermissionToVerify, horizontal(
                    verifyBtn,
                    verifyPopover,
                ).classes("relative").build()),
            ).build();
    }

    static mutualFollowersIndicator(profileUser: User) {
        const currentUserVal = currentUser.value;
        if (!currentUserVal || currentUserVal.id === profileUser.id) {
            return nullElement();
        }

        const users = signal<User[]>([]);

        Api.getMutualFollowers(profileUser.id).then(data => {
            if (data?.items?.length) {
                users.value = data.items;
            }
        });

        return compute((allUsers: User[]) => {
            if (allUsers.length === 0) return nullElement();

            const modalId = `mutual-followers-${profileUser.id}`;

            const maxAvatars = Math.min(3, allUsers.length);
            const avatarImgs: HTMLImageElement[] = [];
            for (let i = 0; i < maxAvatars; i++) {
                const u = allUsers[i];
                const img = create("img")
                    .classes("user-icon")
                    .styles("margin-right", i < maxAvatars - 1 ? "-10px" : "0")
                    .build() as HTMLImageElement;
                if (u.has_avatar) {
                    Util.getCachedUserAvatar(u.id).then(url => {
                        img.src = url;
                    });
                } else {
                    img.src = Images.DEFAULT_AVATAR;
                }
                avatarImgs.push(img);
            }

            return create("div")
                .classes("flex", "align-children", "clickable", "small-gap")
                .styles("cursor", "pointer")
                .onclick(() => {
                    const userLinks = allUsers.map(u => {
                        const link = UserTemplates.userLink(UserWidgetContext.card, u);
                        link.addEventListener("click", () => {
                            const container = document.querySelector(".modal-container");
                            if (container) container.remove();
                        });
                        return link;
                    });

                    const scrollable = create("div")
                        .classes("flex-v")
                        .styles("max-height", "400px", "overflow-y", "auto")
                        .children(...userLinks).build();

                    createModal(
                        [
                            create("h3").text(t("FOLLOWS_YOU_KNOW")).build(),
                            scrollable,
                            GenericTemplates.modalCancelButton(),
                        ],
                        modalId,
                    );
                })
                .children(
                    create("div").classes("flex", "align-children").children(...avatarImgs).build(),
                    create("span").text(`${allUsers.length} ${allUsers.length === 1 ? t("PERSON_YOU_FOLLOW_FOLLOWS") : t("PEOPLE_YOU_FOLLOW_FOLLOW")}`).build(),
                ).build();
        }, users);
    }

    static verifyUserButton(user: User, verified: Signal<boolean>) {
        return horizontal(
            when(verified, button({
                text: t("VERIFY"),
                icon: {icon: "verified"},
                classes: ["positive"],
                onclick: async () => {
                    await Api.verifyUser(user.id);
                    verified.value = true;
                },
            }), true),
            when(verified, button({
                text: t("UNVERIFY"),
                icon: {icon: "close"},
                classes: ["negative"],
                onclick: async () => {
                    await Api.unverifyUser(user.id);
                    verified.value = false;
                },
            })),
        );
    }

    static badges(badges: Badge[]) {
        return create("div")
            .classes("flex", "small-gap", "limitToContentWidth", "rounded", "hideOnSmallBreakpoint")
            .children(...badges.map(badge => UserTemplates.badge(badge))).build();
    }

    static badge(badge: Badge) {
        const addClasses = [];
        const colorBadges = ["staff", "cute", "vip"];
        if (colorBadges.includes(badge.name)) {
            addClasses.push("no-filter");
        }

        return create("img")
            .attributes("src", Icons.ICON(`badges/badge_${badge.name}`))
            .attributes("alt", badge.name)
            .attributes("title", badge.description)
            .classes("icon", "badge", "svg", ...addClasses).build();
    }

    static libraryPage(user: Signal<User>, isSelf: boolean) {
        const tabs = [`${t("TRACKS")}`, `${t("ALBUMS")}`, `${t("PLAYLISTS")}`];
        if (isSelf) tabs.push(`${t("BOUGHT")}`);
        const urlTabs = tabs.map(t => t.toLowerCase().replace(/\s/g, "-"));

        const libCardActions = (listType: "album" | "playlist") => (list: TrackList): FeedMenuAction<TrackList>[] => {
            const actions: FeedMenuAction<TrackList>[] = [
                {
                    label: t("QUEUE"),
                    icon: "queue",
                    onclick: (l) => l.tracks?.forEach(t => QueueManager.addToManualQueue(t.track_id)),
                    show: (l) => !!l.tracks?.length
                },
                {
                    label: t("COPY_LINK"),
                    icon: "link",
                    onclick: (l) => copy(window.location.origin + `/${listType}/${l.id}`),
                },
                {
                    label: t("OPEN_IN_NEW_TAB"),
                    icon: "open_in_new",
                    onclick: (l) => window.open(`/${listType}/${l.id}`, "_blank"),
                },
                {
                    label: t("DELETE"),
                    icon: "delete",
                    onclick: async (l, e) => {
                        const deleteFn = listType === "album"
                            ? () => Api.deleteAlbum(l.id).then(() => {
                            })
                            : () => Api.deletePlaylist(l.id).then(() => {
                            });
                        await Ui.deleteWithConfirmation(
                            e,
                            listType === "album" ? t("DELETE_ALBUM") : t("DELETE_PLAYLIST"),
                            listType === "album" ? t("SURE_DELETE_ALBUM") : t("SURE_DELETE_PLAYLIST"),
                            deleteFn,
                        );
                    },
                    show: (l) => l.user_id === currentUser.value?.id,
                },
            ];
            const pinAction = UserTemplates.pinActionForEntity(
                listType === "album" ? EntityType.album : EntityType.playlist,
                list.id,
                list.user_id,
                (list as any).visibility,
            );
            if (pinAction) actions.push(pinAction);
            return actions;
        };

        const urlParams = new URLSearchParams(window.location.search);
        const tabIndex = urlTabs.indexOf(urlParams.get("tab") ?? "");
        const currentIndex = signal(tabIndex === -1 ? 0 : tabIndex);

        currentIndex.subscribe(i => {
            const tabName = urlTabs[i];
            const url = new URL(window.location.href);
            url.searchParams.set("tab", tabName);
            window.history.replaceState(null, "", url.toString());
        });

        const libAlbumCols = [
            {
                key: "title",
                header: t("TITLE"),
                render: (list: TrackList) => {
                    const coverSrc = signal(Images.DEFAULT_COVER_ALBUM);
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
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String(list.tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => list.user ? UserTemplates.userLink(UserWidgetContext.card, list.user) : nullElement(),
            },
        ];

        const libPlaylistCols = [
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
                render: (list: TrackList) => create("span").classes("hideOnMidBreakpoint").text(String(list.tracks?.length ?? 0)).build(),
            },
            {
                key: "artist",
                header: t("ARTIST"),
                render: (list: TrackList) => list.user ? UserTemplates.userLink(UserWidgetContext.card, list.user) : nullElement(),
            },
        ];

        const pageSearch$ = signal("");
        const pageWipFilter$ = signal("");

        const showFilter = compute(i => i === 0 || (isSelf && i === (tabs.length - 1)), currentIndex);
        const filterPopover = create("div")
            .classes("generic-popover", "feed-filter-popover", "flex-v")
            .attributes("popover", "manual")
            .children(
                create("div").classes("padded").children(
                    TrackTemplates.wipFilter(pageWipFilter$),
                ).build(),
            ).build() as HTMLElement;
        const filterBtn = create("button")
            .classes("round-button", "jess", "feed-filter-btn")
            .title(t("FILTER"))
            .onclick(() => PopoverTemplates.toggle(filterPopover, filterBtn, true))
            .children(
                GenericTemplates.icon("filter_alt", true, ["round-button-icon", "align-center", "inline-icon", "svg", "nopointer"]),
            ).build();
        const filterArea = create("div")
            .classes(compute((sf): string => sf ? "_" : "hidden", showFilter))
            .children(
                filterBtn,
                filterPopover,
            ).build();

        const tabRow = create("div")
            .classes("flex", "space-between", "align-children")
            .children(
                GenericTemplates.combinedSelector(
                    tabs,
                    (i: number) => {
                        currentIndex.value = i;
                    },
                    currentIndex.value,
                ),
                create("div").classes("flex", "align-children", "small-gap")
                    .children(
                        SearchTemplates.searchInputWidget(pageSearch$),
                        filterArea,
                    ).build(),
            ).build();

        const sharedFeed = (type: FeedType, extraOverrides?: any) =>
            FeedTemplates.feed(type, user.value, {
                search$: pageSearch$,
                wipFilterState: pageWipFilter$,
                noToolbar: true, ...extraOverrides
            });

        return vertical(
            GenericTemplates.fixedBar([tabRow]),
            create("div").classes("fixed-bar-content").children(
                when(
                    tabSelected(currentIndex, 0),
                    sharedFeed(FeedType.likedTracks),
                ),
                when(
                    tabSelected(currentIndex, 1),
                    FeedTemplates.create<TrackList>({
                        id: `feed-${CardFeedType.likedAlbums}`,
                        columns: libAlbumCols,
                        compact: true,
                        pageSize: 10,
                        showSearch: true,
                        searchOverride$: pageSearch$,
                        noToolbar: true,
                        fetchPage: async (offset, limit, filter) => {
                            const result = await Api.getLikedAlbums(user.value.id, user.value.username, offset, filter || "");
                            if (!result) return [];
                            return {items: result.items as TrackList[], total: result.total};
                        },
                        buildMenuActions: libCardActions("album"),
                        onPlayToggle: async (list) => {
                            const ft = list.tracks?.[0]?.track;
                            if (ft) await AlbumActions.startTrackInAlbum(list as Album, ft, true);
                        },
                        isPlaying: (id) => compute((pf, ph) => pf?.id === id && ph, playingFrom, playingHere),
                        dateRender: (list) => GenericTemplates.timestamp(list.created_at, ["hideOnSmallBreakpoint"]),
                        onNavigate: (list) => window.open(`/album/${list.id}`, "_blank"),
                    }),
                ),
                when(
                    tabSelected(currentIndex, 2),
                    FeedTemplates.create<TrackList>({
                        id: `feed-${CardFeedType.likedPlaylists}`,
                        columns: libPlaylistCols,
                        compact: true,
                        pageSize: 10,
                        showSearch: true,
                        searchOverride$: pageSearch$,
                        noToolbar: true,
                        fetchPage: async (offset, limit, filter) => {
                            const result = await Api.getLikedPlaylists(user.value.id, user.value.username, offset, filter || "");
                            if (!result) return [];
                            return {items: result.items as TrackList[], total: result.total};
                        },
                        buildMenuActions: libCardActions("playlist"),
                        onPlayToggle: async (list) => {
                            const ft = list.tracks?.[0]?.track;
                            if (ft) await PlaylistActions.startTrackInPlaylist(list as Playlist, ft, true);
                        },
                        isPlaying: (id) => compute((pf, ph) => pf?.id === id && ph, playingFrom, playingHere),
                        dateRender: (list) => GenericTemplates.timestamp(list.created_at, ["hideOnSmallBreakpoint"]),
                        onNavigate: (list) => window.open(`/playlist/${list.id}`, "_blank"),
                    }),
                ),
                when(
                    isSelf && tabSelected(currentIndex, 3),
                    sharedFeed(FeedType.boughtTracks),
                ),
            ).build()).build();
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
            .html(CustomText.renderToHtml(user.description)).build();

        setTimeout(() => {
            if (description.clientHeight < description.scrollHeight) {
                description.classList.add("overflowing");
            }
        }, 100);

        return create("div")
            .classes("card", "rounded-large", "padded", "flex-v", "flex-grow")
            .children(
                vertical(
                    description,
                    when(isOwnProfile, UserTemplates.editDescriptionButton(user.description))
                ).build(),
            ).build();
    }

    static editDescriptionButton(currentDescription: string) {
        const descState = signal(currentDescription);

        return button({
            icon: {icon: "edit_note"},
            text: t("EDIT_DESCRIPTION"),
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
            },
        });
    }

    private static userPreview(user: User, context: UserWidgetContext) {
        return create("div")
            .classes("user-preview", "flex-v", "small-gap")
            .children(
                UserTemplates.profileHeader(
                    user,
                    compute(u => u?.id === user.id, currentUser),
                ),
                vertical(UserTemplates.displayname(user), UserTemplates.usernameAndIcons(user)).classes("no-gap"),
            ).build();
    }
}
