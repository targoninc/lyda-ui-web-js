import { compute, create, Signal, signal, signalMap, when, AnyNode, nullElement, InputType } from "@targoninc/jess";
import { GenericTemplates, horizontal } from "./GenericTemplates.ts";
import { getPlayIcon, copy, Util } from "../../Classes/Util.ts";
import { t } from "../../../locales";
import { FeedColumn, FeedMenuAction, FeedConfig } from "../../Models/FeedConfig.ts";
import { ContextMenuTemplates } from "./ContextMenuTemplates.ts";
import { PopoverTemplates } from "./PopoverTemplates.ts";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { currentTrackId, playingHere, manualQueue } from "../../state.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { startItem } from "../../Actions/MusicActions.ts";
import { Api } from "../../Api/Api.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { navigate } from "../../Routing/Router.ts";
import { getFeedDisplayName } from "../../Classes/Helpers/FeedNames.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { UserTemplates } from "../account/UserTemplates.ts";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { input } from "@targoninc/jess-components";

export { FeedColumn, FeedMenuAction, FeedConfig };

let uidCounter = 0;
function uid(): string {
    return `fg-${++uidCounter}`;
}

export class FeedTemplates {
    static create<T extends { id: number }>(config: FeedConfig<T>): any {
        const items$ = signal<T[]>([]);
        const loading$ = signal(false);
        const hasMore$ = signal(true);
        const search$ = signal("");
        const sortBy$ = signal<string | null>(null);
        const sortDir$ = signal<'asc' | 'desc' | null>(null);
        const ps = config.pageSize;
        let page = 0;

        const reload = () => {
            page = 0;
            items$.value = [];
            hasMore$.value = true;
            load();
        };

        const cycleSort = (key: string) => {
            if (sortBy$.value !== key) {
                sortBy$.value = key;
                sortDir$.value = 'asc';
            } else if (sortDir$.value === 'asc') {
                sortDir$.value = 'desc';
            } else {
                sortBy$.value = null;
                sortDir$.value = null;
            }
        };

        const load = async () => {
            if (loading$.value || !hasMore$.value) return;
            loading$.value = true;
            const offset = page * ps;
            const next = await config.fetchPage(offset, ps, search$.value, sortBy$.value ?? undefined, sortDir$.value ?? undefined);
            if (!next || next.length < ps) hasMore$.value = false;
            if (next) items$.value = [...items$.value, ...next];
            page += 1;
            loading$.value = false;
        };

        if (config.showSearch) search$.subscribe(reload);
        sortBy$.subscribe(reload);
        sortDir$.subscribe(reload);

        const empty = compute((ii, ll) => ii.length === 0 && !ll, items$, loading$);
        const feedId = config.id || uid();
        const hasDate = !!config.dateRender;
        const hasActionDate = !!config.actionDateRender;

        const mobilePopover = create("div")
            .classes("generic-popover", "feed-mobile-popover", "flex-v")
            .id(`${feedId}-mobile`)
            .attributes("popover", "manual")
            .build() as HTMLElement;

        const rebuildAndShowMobile = (item: T) => {
            mobilePopover.innerHTML = "";
            const children: AnyNode[] = [];
            if (config.buildInteractions) {
                children.push(create("div").classes("flex", "align-children", "small-gap", "feed-mobile-interact").children(...config.buildInteractions(item)).build() as HTMLElement);
                children.push(create("hr").classes("feed-mobile-divider").build() as HTMLElement);
            }
            const actions = config.buildMenuActions(item).filter(a => !a.show || a.show(item));
            for (const a of actions) {
                const btn = create("button")
                    .classes("context-menu-item", "flex", "align-children", "small-gap")
                    .onclick(async (e: Event) => {
                        e.stopPropagation();
                        mobilePopover.hidePopover();
                        await a.onclick(item);
                    })
                    .children(
                        a.icon ? GenericTemplates.icon(a.icon, true, ["context-menu-icon"]) : nullElement(),
                        create("span").text(a.label).build(),
                    ).build() as HTMLElement;
                children.push(btn);
            }
            for (const c of children) {
                if (c instanceof Node) mobilePopover.appendChild(c);
            }
            mobilePopover.showPopover();
        };

        const sortKey = compute((sb, sd) => sb && sd ? `${sb}-${sd}` : null, sortBy$, sortDir$);

        const el = create("div")
            .classes("feed-wrapper", "flex-v", "fullWidth", config.compact ? "feed-compact" : "_")
            .id(feedId)
            .children(
                when(config.showSearch,
                    horizontal(
                        input({
                            type: InputType.text,
                            validators: [],
                            name: "feed-search",
                            placeholder: t("SEARCH"),
                            debounce: 200,
                            classes: ["round-input"],
                            onchange: (value: string) => { search$.value = value; },
                            value: search$,
                        }),
                    ).classes("space-between", "align-children").build(),
                ),
                create("table")
                    .classes("feed-table", "fullWidth")
                    .children(
                        compute(
                            (ii, sk) => {
                                if (ii.length === 0) return nullElement();
                                const sb = sortBy$.value;
                                const sd = sortDir$.value;
                                const ths: any[] = [
                                    create("th").classes("feed-idx-h").text("#").build(),
                                ];
                                for (const c of config.columns) {
                                    const th = FeedTemplates.#sortableTh(c.key, c.header, sb, sd, cycleSort, c.key === "artist" ? ["hideOnSmallBreakpoint"] : []);
                                    ths.push(th);
                                }
                                ths.push(
                                    ...(hasDate ? [FeedTemplates.#sortableTh("release_date", t("RELEASE_DATE"), sb, sd, cycleSort, ["feed-date-h", "hideOnMidBreakpoint"])] : []),
                                    ...(hasActionDate ? [FeedTemplates.#sortableTh("created_at", config.actionDateHeader ?? "", sb, sd, cycleSort, ["feed-date-h", "hideOnMidBreakpoint"])] : []),
                                    create("th").classes("feed-interact-h", "hideOnSmallBreakpoint").build(),
                                    create("th").classes("feed-menu-h", "hideOnSmallBreakpoint").build(),
                                );
                                return create("thead")
                                    .classes("feed-header")
                                    .children(
                                        create("tr").classes("feed-header-row").children(...ths).build(),
                                    ).build();
                            },
                            items$, sortKey,
                        ),
                        signalMap(
                            items$,
                            create("tbody").classes("feed-rows"),
                            (item, i) => FeedTemplates.#row(item, i, config, feedId, rebuildAndShowMobile),
                        ),
                    ).build(),
                compute(
                    (loading, e) => {
                        if (loading) return GenericTemplates.loadingSpinner();
                        if (e) return GenericTemplates.noTracks();
                        return nullElement();
                    },
                    loading$, empty,
                ),
                mobilePopover,
            ).build();

        setTimeout(() => {
            load();
            const rowsEl = el.querySelector("tbody");
            if (rowsEl) {
                const obs = new IntersectionObserver(
                    e => {
                        if (e[0].isIntersecting && e[0].target === rowsEl.lastElementChild) {
                            load();
                        }
                    },
                    { rootMargin: "300px" },
                );
                const watchLast = () => {
                    const last = rowsEl.lastElementChild;
                    if (last) { obs.disconnect(); obs.observe(last); }
                };
                const mo = new MutationObserver(watchLast);
                mo.observe(rowsEl, { childList: true });
                watchLast();
            }
        });

        return el;
    }

    static feed(type: FeedType, user?: { id?: number; username?: string; displayname?: string }): any {
        const pf: PlayingFrom = {
            type,
            name: getFeedDisplayName(type, user?.displayname) ?? type,
            id: user?.id,
        };

        return FeedTemplates.create<Track>({
            id: `feed-${type}`,
            compact: [FeedType.explore, FeedType.following, FeedType.history].includes(type),
            showSearch: ![FeedType.following, FeedType.explore].includes(type),
            columns: [
                {
                    key: "title",
                    header: t("TRACK_TITLE"),
                    render: (track) => {
                        const icons: any[] = [];
                        if (track.visibility === "private") icons.push(GenericTemplates.lock());
                        const coverSrc = track.has_cover
                            ? Util.getImage(track.id, MediaFileType.trackCover)
                            : DefaultImages[EntityType.track];
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
                                                    .onclick((e: Event) => { e.stopPropagation(); navigate(`/track/${track.id}`); })
                                                    .build(),
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
            pageSize: type === FeedType.explore ? 100 : 10,
            fetchPage: async (offset, limit, filter, sortBy, sortDir) => {
                const params: any = { offset, limit, filter };
                if (user?.id) params.id = user.id;
                if (type === FeedType.following) params.filter = filter || "all";
                params.sortBy = sortBy || "";
                params.sortDir = sortDir || "";
                const res = await Api.getFeed(`${ApiRoutes.trackFeed}/${type}`, params);
                return res ?? [];
            },
            buildMenuActions: (track): FeedMenuAction<Track>[] => {
                const inQueue = compute(q => q.includes(track.id), manualQueue);
                const queueLabel = compute((q): string => (q ? `${t("UNQUEUE")}` : `${t("QUEUE")}`), inQueue);
                const queueIcon = compute((q): string => (q ? "remove" : "queue"), inQueue);
                const items: FeedMenuAction<Track>[] = [
                    { label: queueLabel, icon: queueIcon, onclick: () => QueueManager.toggleInManualQueue(track.id) },
                ];
                if (track.visibility !== "private" && track.secretcode) {
                    items.push({
                        label: t("COPY_PRIVATE_LINK"),
                        icon: "link",
                        onclick: () => copy(window.location.origin + "/track/" + track.id + "/" + track.secretcode),
                    });
                }
                return items;
            },
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
                    await startItem(track, pf);
                }
            },
            isPlaying: (id) => compute((c, p) => c === id && p, currentTrackId, playingHere),
            dateRender: (track) => {
                const date = (track as any).release_date || track.created_at;
                return GenericTemplates.timestamp(date, ["hideOnSmallBreakpoint"]);
            },
        });
    }

    static #sortableTh(key: string, label: any, sortBy: string | null, sortDir: string | null,
                       cycleSort: (k: string) => void, extraClasses: string[]): HTMLElement {
        const isSorted = sortBy === key;
        const arrow = isSorted ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
        const th = create("th")
            .classes("feed-col-h", ...extraClasses)
            .text(`${label}${arrow}`)
            .build() as HTMLElement;
        th.style.cursor = "pointer";
        th.onclick = () => cycleSort(key);
        return th;
    }

    static #row<T extends { id: number }>(
        item: T, index: number, config: FeedConfig<T>, feedId: string,
        showMobileMenu: (item: T) => void,
    ): any {
        const playing = config.isPlaying(item.id);
        const loading = config.isLoading ? config.isLoading(item.id) : signal(false);
        const icon = getPlayIcon(playing, loading) as Signal<string>;
        const cls = compute((p): string => (p ? "playing" : "_"), playing);
        const popId = `${feedId}-pop-${item.id}`;

        const ctx = ContextMenuTemplates.create(item, config.buildMenuActions(item), popId);

        const interactEl = config.buildInteractions
            ? create("div").classes("feed-hover-btns", "flex", "align-children").children(...config.buildInteractions(item)).build()
            : nullElement();

        let longPressTimer: any = null;

        const rowEl = create("tr")
            .classes("feed-row", cls)
            .oncontextmenu(ctx.onContextMenu)
            .children(
                create("td").classes("feed-idx-cell")
                    .children(FeedTemplates.#idxCell(item, index, icon, loading, config))
                    .build(),
                ...config.columns.map(c => {
                    return create("td").classes("feed-cell", `feed-cell-${c.key}`, ...(c.key === "artist" ? ["hideOnSmallBreakpoint"] : []))
                        .children(c.render(item, index))
                        .build();
                }),
                ...(!!config.dateRender ? [create("td").classes("feed-cell", "feed-cell-date", "hideOnMidBreakpoint")
                    .children(config.dateRender(item))
                    .build()] : []),
                ...(!!config.actionDateRender ? [create("td").classes("feed-cell", "feed-cell-actiondate", "hideOnMidBreakpoint")
                    .children(config.actionDateRender(item))
                    .build()] : []),
                create("td").classes("feed-interact-cell", "hideOnSmallBreakpoint")
                    .children(interactEl)
                    .build(),
                create("td").classes("feed-menu-cell", "hideOnSmallBreakpoint")
                    .children(ctx.button, ctx.popover)
                    .build(),
            ).build() as HTMLElement;

        rowEl.addEventListener("touchstart", () => {
            longPressTimer = setTimeout(() => showMobileMenu(item), 500);
        });
        rowEl.addEventListener("touchend", () => { if (longPressTimer) clearTimeout(longPressTimer); });
        rowEl.addEventListener("touchmove", () => { if (longPressTimer) clearTimeout(longPressTimer); });

        return rowEl;
    }

    static #idxCell<T extends { id: number }>(
        item: T, index: number, icon: Signal<string>, loading: Signal<boolean>, config: FeedConfig<T>,
    ): any {
        const handle = () => config.onPlayToggle(item);
        const handleButton = (e: Event) => { e.stopPropagation(); handle(); };

        return create("div")
            .classes("feed-idx-cell-inner")
            .onclick(handle)
            .children(
                create("span").classes("feed-idx-num").text(String(index + 1)).build(),
                create("div").classes("feed-idx-play").children(
                    GenericTemplates.roundIconButton(
                        {
                            icon,
                            isUrl: true,
                            classes: [compute((l): string => (l ? "spinner-animation" : "_"), loading)],
                        },
                        handleButton,
                        t("PLAY_PAUSE"),
                    ),
                ).build(),
            ).build();
    }
}
