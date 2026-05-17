import { compute, create, Signal, signal, signalMap, when, nullElement, AnyElement } from "@targoninc/jess";
import { GenericTemplates } from "./GenericTemplates.ts";
import { getPlayIcon, copy, Util } from "../../Classes/Util.ts";
import { t } from "../../../locales";
import { FeedColumn, FeedMenuAction, FeedConfig } from "../../Models/FeedConfig.ts";
import { currentTrackId, playingHere } from "../../state.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { startItem } from "../../Actions/MusicActions.ts";
import { Api } from "../../Api/Api.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { getFeedDisplayName } from "../../Classes/Helpers/FeedNames.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";

export { FeedColumn, FeedMenuAction, FeedConfig };

let uidCounter = 0;
function uid(): string {
    return `fg-${++uidCounter}`;
}

export class FeedTemplates {
    static create<T extends { id: number }>(config: FeedConfig<T>): AnyElement {
        const items$ = signal<T[]>([]);
        const loading$ = signal(false);
        const hasMore$ = signal(true);
        const ps = config.pageSize;
        let page = 0;

        const load = async () => {
            if (loading$.value || !hasMore$.value) return;
            loading$.value = true;
            const offset = page * ps;
            const next = await config.fetchPage(offset, ps);
            if (!next || next.length < ps) hasMore$.value = false;
            if (next) items$.value = [...items$.value, ...next];
            page += 1;
            loading$.value = false;
        };

        const empty = compute((ii, ll) => ii.length === 0 && !ll, items$, loading$);
        const feedId = config.id || uid();
        const colCount = config.columns.length;

        const el = create("div")
            .classes("feed-container", "flex-v", "fullWidth")
            .id(feedId)
            .children(
                create("div")
                    .classes("feed-header", "feed-row", `feed-cols-${colCount}`)
                    .children(
                        create("div").classes("feed-idx-h").text("#").build(),
                        ...config.columns.map(c =>
                            create("div").classes("feed-col-h").text(c.header).build(),
                        ),
                        create("div").classes("feed-menu-h").build(),
                    ).build(),
                signalMap(
                    items$,
                    create("div").classes("feed-rows", "flex-v", "fullWidth"),
                    (item, i) => FeedTemplates.#row(item, i, config, feedId, colCount),
                ),
                create("div").classes("feed-sentinel").id(`${feedId}-sentinel`).build(),
                when(loading$, GenericTemplates.loadingSpinner()),
                when(empty, GenericTemplates.noTracks()),
            ).build();

        setTimeout(() => {
            load();
            const sen = document.getElementById(`${feedId}-sentinel`);
            if (sen) {
                const obs = new IntersectionObserver(
                    e => { if (e[0].isIntersecting) load(); },
                    { rootMargin: "300px" },
                );
                obs.observe(sen);
            }
        });

        return el;
    }

    static feed(type: FeedType, user?: { id?: number; username?: string; displayname?: string }): AnyElement {
        const pf: PlayingFrom = {
            type,
            name: getFeedDisplayName(type, user?.displayname) ?? type,
            id: user?.id,
        };
        const fetchFilter = type === FeedType.following ? "all" : "";

        return FeedTemplates.create<Track>({
            id: `feed-${type}`,
            columns: [
                {
                    key: "entry",
                    header: "",
                    render: (track) => {
                        const icons: any[] = [];
                        if (track.visibility === "private") icons.push(GenericTemplates.lock());
                        const coverSrc = track.has_cover
                            ? Util.getImage(track.id, MediaFileType.trackCover)
                            : DefaultImages[EntityType.track];
                        return create("div")
                            .classes("flex", "align-children", "small-gap")
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
                                                create("span").classes("feed-title").text(track.title).build(),
                                                ...icons,
                                            ).build(),
                                        create("span").classes("feed-artist", "color-dim").text(track.user?.displayname ?? "").build(),
                                    ).build(),
                            ).build() as HTMLElement;
                    },
                },
            ],
            pageSize: 10,
            fetchPage: async (offset) => {
                const res = await Api.getFeed(`${ApiRoutes.trackFeed}/${type}`, { offset, filter: fetchFilter, id: user?.id });
                return res ?? [];
            },
            buildMenuActions: (track): FeedMenuAction<Track>[] => {
                const items: FeedMenuAction<Track>[] = [
                    { label: t("QUEUE"), icon: "queue", onclick: () => QueueManager.addToManualQueue(track.id) },
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
            onPlayToggle: async (track) => {
                if (currentTrackId.value === track.id && playingHere.value) {
                    await PlayManager.pauseAsync(track.id);
                } else {
                    await startItem(track, pf);
                }
            },
            isPlaying: (id) => compute((c, p) => c === id && p, currentTrackId, playingHere),
        });
    }

    static #row<T extends { id: number }>(
        item: T, index: number, config: FeedConfig<T>, feedId: string, colCount: number,
    ): AnyElement {
        const playing = config.isPlaying(item.id);
        const loading = config.isLoading ? config.isLoading(item.id) : signal(false);
        const icon = getPlayIcon(playing, loading) as Signal<string>;
        const cls = compute((p): string => (p ? "playing" : "_"), playing);
        const popId = `${feedId}-pop-${item.id}`;

        const placePopover = (anchor: HTMLElement) => {
            const pop = document.getElementById(popId) as HTMLElement | null;
            if (!pop) return;
            const r = anchor.getBoundingClientRect();
            pop.style.position = "fixed";
            pop.style.top = `${r.bottom + 2}px`;
            pop.style.left = `${Math.max(4, r.left)}px`;
        };

        const toggleMenu = (anchor: HTMLElement) => {
            const pop = document.getElementById(popId) as HTMLElement | null;
            if (!pop) return;
            placePopover(anchor);
            pop.togglePopover();
        };

        const showMenu = (anchor: HTMLElement) => {
            const pop = document.getElementById(popId) as HTMLElement | null;
            if (!pop || pop.matches(":popover-open")) return;
            placePopover(anchor);
            pop.showPopover();
        };

        const menuBtn = create("button")
            .classes("round-button", "jess", "feed-menu-btn")
            .onclick((e: Event) => toggleMenu(e.currentTarget as HTMLElement))
            .children(GenericTemplates.icon("more_horiz", false))
            .build() as HTMLElement;

        return create("div")
            .classes("feed-row", `feed-cols-${colCount}`, cls)
            .oncontextmenu(e => { e.preventDefault(); showMenu(menuBtn); })
            .children(
                FeedTemplates.#idxCell(item, index, icon, loading, config),
                ...config.columns.map(c =>
                    create("div").classes("feed-cell", `feed-cell-${c.key}`).children(c.render(item, index)).build(),
                ),
                create("div").classes("feed-menu-cell").children(menuBtn).build(),
                create("div")
                    .classes("feed-menu-popover")
                    .id(popId)
                    .attributes("popover", "auto")
                    .children(...FeedTemplates.#menuItems(item, config))
                    .build(),
            ).build();
    }

    static #idxCell<T extends { id: number }>(
        item: T, index: number, icon: Signal<string>, loading: Signal<boolean>, config: FeedConfig<T>,
    ): AnyElement {
        const handle = () => config.onPlayToggle(item);

        return create("div")
            .classes("feed-idx-cell")
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
                        handle,
                        t("PLAY_PAUSE"),
                    ),
                ).build(),
            ).build();
    }

    static #menuItems<T extends { id: number }>(item: T, config: FeedConfig<T>): AnyElement[] {
        return config.buildMenuActions(item)
            .filter(a => !a.show || a.show(item))
            .map(a =>
                create("button")
                    .classes("feed-menu-item", "flex", "align-children", "small-gap")
                    .onclick(async (e: Event) => {
                        e.stopPropagation();
                        const pop = (e.currentTarget as HTMLElement).closest("[popover]") as HTMLElement | null;
                        if (pop) pop.hidePopover();
                        await a.onclick(item);
                    })
                    .children(
                        a.icon ? GenericTemplates.icon(a.icon, true, ["feed-menu-icon"]) : nullElement(),
                        create("span").text(a.label).build(),
                    ).build() as HTMLElement,
            );
    }
}
