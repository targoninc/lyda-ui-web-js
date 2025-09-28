import { AnyElement, compute, create, Signal, signal, when } from "@targoninc/jess";
import { navigate } from "../Routing/Router.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { Util } from "../Classes/Util.ts";
import { router } from "../../main.ts";
import { RoutePath } from "../Routing/routes.ts";
import { button } from "@targoninc/jess-components";
import { SearchContext } from "@targoninc/lyda-shared/src/Enums/SearchContext";
import { SearchResult } from "@targoninc/lyda-shared/src/Models/SearchResult";
import { get } from "../Api/ApiClient.ts";
import { t } from "../../locales";

export class SearchTemplates {
    static search(context: SearchContext) {
        const results = signal<SearchResult[]>([]);
        const selectedResult = signal<number | null>(null);
        const resultsShown = compute(r => r.length > 0, results);

        let q = "";
        const urlParams = new URLSearchParams(window.location.search);
        if (!(router.currentRoute.value?.path === "search" && context === SearchContext.navBar)) {
            q = urlParams.get("q") ?? "";
        }
        const currentSearch = signal(q ?? "");
        currentSearch.subscribe((newValue, changed) => {
            if (!changed) {
                return;
            }
            urlParams.set("q", newValue);
            window.history.pushState({}, "", "?" + urlParams.toString());
        });

        return create("div")
            .classes("search", "relative", "flex-v", "align-center")
            .children(
                SearchTemplates.searchInput(
                    results,
                    selectedResult,
                    currentSearch,
                    resultsShown,
                    context
                ),
                SearchTemplates.searchResults(
                    results,
                    selectedResult,
                    resultsShown,
                    currentSearch,
                    context
                )
            ).build();
    }

    static searchInput(
        results: Signal<SearchResult[]>,
        selectedResult: Signal<number | null>,
        currentSearch: Signal<string>,
        resultsShown: Signal<boolean>,
        context: SearchContext
    ) {
        const debounce = 200;
        let timeout: Timer | undefined;
        let searchCount = 0;

        async function getResults() {
            if (currentSearch.value.length === 0) {
                return;
            }
            searchCount++;
            results.value = [];
            const currentSearchCount = searchCount;
            const endpoints = [
                ApiRoutes.searchTracks,
                ApiRoutes.searchAlbums,
                ApiRoutes.searchPlaylists,
                ApiRoutes.searchUsers,
            ];
            const promises = endpoints.map(async endpoint => {
                const data = await get<SearchResult[]>(endpoint, {
                    search: currentSearch.value,
                });

                if (currentSearchCount !== searchCount || !data) {
                    return;
                }

                results.value = results.value.concat(data);
            });
            await Promise.all(promises);
        }
        const contextClasses = context === SearchContext.searchPage ? ["fullWidth"] : [];
        getResults().then();

        return create("div")
            .classes("search-input-container", "relative", ...contextClasses)
            .children(
                GenericTemplates.icon("search", true, ["inline-icon", "svg", "search-icon"]),
                GenericTemplates.icon(
                    "close",
                    true,
                    ["inline-icon", "svg", "clear-icon", "clickable"],
                    t("CLEAR_SEARCH"),
                    () => {
                        currentSearch.value = "";
                        resultsShown.value = false;
                    }
                ),
                create("input")
                    .classes("jess", "search-input")
                    .placeholder(t("SEARCH"))
                    .value(currentSearch)
                    .onclick(() => {
                        resultsShown.value = true;
                    })
                    .onkeydown((e: KeyboardEvent) => {
                        const list = results.value;
                        const pressedKey = e.key;
                        if (pressedKey === "ArrowDown") {
                            e.preventDefault();
                            SearchTemplates.selectNextResult(selectedResult, list);
                        } else if (pressedKey === "ArrowUp") {
                            e.preventDefault();
                            SearchTemplates.selectPreviousResult(selectedResult, list);
                        } else if (pressedKey === "Escape") {
                            resultsShown.value = false;
                        }
                    })
                    .onkeyup(async (e: KeyboardEvent) => {
                        const pressedKey = e.key;
                        if (pressedKey === "Enter") {
                            if (selectedResult.value === null) {
                                resultsShown.value = false;
                                navigate(`${RoutePath.search}?q=` + currentSearch.value);
                                return;
                            }
                            const result = results.value.find(r => r.id === selectedResult.value);
                            if (!result) {
                                return;
                            }
                            resultsShown.value = false;
                            navigate(result.url);
                            return;
                        }

                        const target = e.target as HTMLInputElement;
                        const search = target.value;
                        if (
                            pressedKey !== "Backspace" &&
                            pressedKey !== "Delete" &&
                            pressedKey.length > 1
                        ) {
                            return;
                        }

                        if (search.trim().length === 0) {
                            results.value = [];
                            currentSearch.value = "";
                            return;
                        }
                        currentSearch.value = search;

                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = undefined;
                        }

                        timeout = setTimeout(() => getResults(), debounce);
                    })
                    .build()
            ).build();
    }

    private static selectNextResult(selectedResult: Signal<number | null>, list: SearchResult[]) {
        if (selectedResult.value === null) {
            selectedResult.value = list[0].id;
            return;
        }
        const index = list.findIndex(l => l.id === selectedResult.value);
        if (index === list.length - 1) {
            selectedResult.value = list[0].id;
            return;
        }
        selectedResult.value = list[index + 1].id;
    }

    private static selectPreviousResult(
        selectedResult: Signal<number | null>,
        list: SearchResult[]
    ) {
        if (selectedResult.value === null) {
            selectedResult.value = list[list.length - 1].id;
            return;
        }
        const index = list.findIndex(l => l.id === selectedResult.value);
        if (index === 0) {
            selectedResult.value = list[list.length - 1].id;
            return;
        }
        selectedResult.value = list[index - 1].id;
    }

    static searchResults(
        results: Signal<SearchResult[]>,
        selectedResult: Signal<number | null>,
        resultsShown: Signal<boolean>,
        currentSearch: Signal<string>,
        context: SearchContext
    ): Signal<AnyElement> {
        if (context === SearchContext.navBar) {
            return compute(
                r =>
                    SearchTemplates.searchResultsList(
                        r,
                        selectedResult,
                        resultsShown,
                        currentSearch
                    ),
                results
            );
        } else {
            return compute(
                r => SearchTemplates.searchResultsCards(r, selectedResult, resultsShown),
                results
            );
        }
    }

    static searchResultsList(
        searchResults: SearchResult[],
        selectedResult: Signal<number | null>,
        resultsShown: Signal<boolean>,
        currentSearch: Signal<string>
    ) {
        const exactMatches = searchResults.filter(r => r.exactMatch);
        const partialMatches = searchResults.filter(r => !r.exactMatch);
        const showClass = compute((s: boolean): string => (s ? "_" : "hidden"), resultsShown);

        return create("div")
            .classes("search-results-popout", showClass)
            .children(
                create("div")
                    .classes("flex-v", "nogap")
                    .children(
                        create("div")
                            .classes("padded")
                            .children(
                                button({
                                    icon: { icon: "manage_search" },
                                    text: t("OPEN_SEARCH"),
                                    classes: ["positive"],
                                    onclick: () => {
                                        resultsShown.value = false;
                                        navigate(`${RoutePath.search}?q=` + currentSearch.value);
                                    },
                                })
                            )
                            .build(),
                        when(
                            exactMatches.length > 0,
                            create("span")
                                .classes("search-result-header")
                                .text(t("EXACT_MATCHES"))
                                .build()
                        ),
                        ...exactMatches.map(result => {
                            return this.searchResult(
                                result,
                                selectedResult,
                                resultsShown,
                                SearchContext.navBar
                            );
                        }),
                        when(
                            partialMatches.length > 0,
                            create("span")
                                .classes("search-result-header")
                                .text(t("PARTIAL_MATCHES"))
                                .build()
                        ),
                        ...partialMatches.map(result => {
                            return this.searchResult(
                                result,
                                selectedResult,
                                resultsShown,
                                SearchContext.navBar
                            );
                        })
                    )
                    .build()
            ).build();
    }

    static searchResultsCards(
        searchResults: SearchResult[],
        selectedResult: Signal<number | null>,
        resultsShown: Signal<boolean>
    ) {
        const groups: Record<string, SearchResult[]> = {
            Albums: searchResults.filter(r => r.type === "album"),
            Tracks: searchResults.filter(r => r.type === "track"),
            Users: searchResults.filter(r => r.type === "user"),
            Playlists: searchResults.filter(r => r.type === "playlist"),
        };
        Object.keys(groups).forEach(group => {
            if (groups[group].length === 0) {
                delete groups[group];
            }
        });

        return create("div")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        when(
                            searchResults.length === 0,
                            create("div")
                                .classes("flex-v")
                                .children(
                                    create("span")
                                        .classes("color-dim")
                                        .text(t("NO_SEARCH_RESULTS"))
                                        .build()
                                )
                                .build()
                        ),
                        ...Object.keys(groups).map(group => {
                            return create("div")
                                .classes("flex-v", "small-gap", "card", "search-results-card")
                                .children(
                                    create("h2").text(group).build(),
                                    ...groups[group]
                                        .sort((a, b) =>
                                            a.exactMatch && !b.exactMatch
                                                ? 1
                                                : b.exactMatch && !a.exactMatch
                                                  ? -1
                                                  : 0
                                        )
                                        .map(result => {
                                            return this.searchResult(
                                                result,
                                                selectedResult,
                                                resultsShown,
                                                SearchContext.searchPage
                                            );
                                        })
                                )
                                .build();
                        })
                    )
                    .build()
            ).build();
    }

    static searchResult(
        searchResult: SearchResult,
        selectedResult: Signal<number | null>,
        resultsShown: Signal<boolean>,
        context: SearchContext
    ) {
        const addClass = compute(
            (sr): string => (sr === searchResult.id ? "selected" : "_"),
            selectedResult
        );
        let elementReference: AnyElement | null = null;
        selectedResult.subscribe(newId => {
            if (newId === searchResult.id) {
                elementReference?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
        let display = searchResult.display;
        if (searchResult.display.length > 50) {
            display = searchResult.display.substring(0, 50) + "...";
        }
        let subtitle = searchResult.subtitle;
        if (subtitle && subtitle.length > 50) {
            subtitle = subtitle.substring(0, 50) + "...";
        }

        const imageGetterMap: Record<string, (id: number) => string> = {
            user: Util.getUserAvatar,
            track: Util.getTrackCover,
            album: Util.getAlbumCover,
            playlist: Util.getPlaylistCover,
        };
        const image = signal(Util.defaultImage(searchResult.type));
        if (searchResult.hasImage) {
            image.value = imageGetterMap[searchResult.type](searchResult.id);
        }
        const contextClasses = context === SearchContext.searchPage ? ["jess", "fullWidth"] : ["_"];

        elementReference = create(context === SearchContext.navBar ? "div" : "button")
            .classes(
                "search-result",
                "space-outwards",
                "padded",
                "flex",
                searchResult.type,
                searchResult.exactMatch ? "exact-match" : "_",
                addClass,
                ...contextClasses
            )
            .onclick(async () => {
                navigate(searchResult.url);
                resultsShown.value = false;
            })
            .children(
                create("div")
                    .classes("flex", "noflexwrap")
                    .children(
                        create("span")
                            .classes("search-result-image")
                            .children(create("img").src(image).build())
                            .build(),
                        create("div")
                            .classes("flex-v", "nogap", "search-result-text")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        create("span")
                                            .classes("search-result-display")
                                            .text(display)
                                            .build()
                                    ).build(),
                                create("span")
                                    .classes("search-result-subtitle", "text-xsmall")
                                    .text(subtitle)
                                    .build()
                            ).build()
                    ).build(),
                create("span")
                    .classes(
                        "search-result-type",
                        "hideOnSmallBreakpoint",
                        "padded-inline",
                        searchResult.type
                    ).text(searchResult.type)
                    .build()
            ).build();
        return elementReference;
    }

    static searchPage() {
        return SearchTemplates.search(SearchContext.searchPage);
    }
}
