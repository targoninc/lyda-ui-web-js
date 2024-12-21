import {AnyElement, create, ifjs} from "../../fjsc/src/f2.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "../Classes/Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {SearchResult} from "../Models/SearchResult.ts";
import {Util} from "../Classes/Util.ts";
import {Images} from "../Enums/Images.ts";
import {SearchContext} from "../Enums/SearchContext.ts";

export class SearchTemplates {
    static search(context: SearchContext) {
        const results = signal<SearchResult[]>([]);
        const selectedResult = signal<number|null>(null);
        const resultsShown = compute(r => r.length > 0, results);

        return create("div")
            .classes("search", "relative", "align-center")
            .children(
                SearchTemplates.searchInput(results, selectedResult),
                SearchTemplates.searchResults(results, selectedResult, resultsShown, context)
            ).build();
    }

    static searchInput(results: Signal<SearchResult[]>, selectedResult: Signal<number|null>) {
        const debounce = 200;
        let timeout: Timer | undefined;

        return create("div")
            .classes("search-input-container", "relative")
            .children(
                GenericTemplates.icon("search", true, ["inline-icon", "svg", "search-icon"]),
                create("input")
                    .classes("fjsc", "search-input")
                    .placeholder("Search")
                    .onkeydown((e: KeyboardEvent) => {
                        const list = results.value;
                        const pressedKey = e.key;
                        if (pressedKey === "ArrowDown") {
                            e.preventDefault();
                            SearchTemplates.selectNextResult(selectedResult, list);
                        } else if (pressedKey === "ArrowUp") {
                            e.preventDefault();
                            SearchTemplates.selectPreviousResult(selectedResult, list);
                        }
                    })
                    .onkeyup(async (e: KeyboardEvent) => {
                        const pressedKey = e.key;
                        if (pressedKey === "Enter") {
                            if (selectedResult.value === null) {
                                return;
                            }
                            const result = results.value.find(r => r.id === selectedResult.value);
                            if (!result) {
                                return;
                            }
                            navigate(result.type + "/" + result.id);
                            return;
                        }

                        const target = e.target as HTMLInputElement;
                        let search = target.value;
                        if (pressedKey !== "Backspace" && pressedKey !== "Delete" && pressedKey.length > 1) {
                            return;
                        }
                        search = search.trim();

                        if (search.length === 0) {
                            results.value = [];
                            return;
                        }

                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = undefined;
                        }

                        timeout = setTimeout(async () => {
                            results.value = [];
                            const endpoints = [ApiRoutes.searchTracks, ApiRoutes.searchAlbums, ApiRoutes.searchPlaylists, ApiRoutes.searchUsers];
                            const promises = endpoints.map(async (endpoint) => {
                                const res = await Api.getAsync<SearchResult[]>(endpoint, { search });
                                if (res.code !== 200) {
                                    notify("Failed to search, status code " + res.code, NotificationType.error);
                                    return [];
                                }
                                results.value = results.value.concat(res.data);
                            });
                            await Promise.all(promises);
                        }, debounce);
                    }).build()
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

    private static selectPreviousResult(selectedResult: Signal<number | null>, list: SearchResult[]) {
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

    static searchResults(results: Signal<SearchResult[]>, selectedResult: Signal<number|null>, resultsShown: Signal<boolean>, context: SearchContext) {
        let searchResults = results.value;
        const sResults = signal(SearchTemplates.searchResultsList(searchResults, selectedResult, resultsShown, context));
        results.onUpdate = () => {
            searchResults = results.value;
            sResults.value = SearchTemplates.searchResultsList(searchResults, selectedResult, resultsShown, context);
        };
        return sResults;
    }

    static searchResultsList(searchResults: SearchResult[], selectedResult: Signal<number|null>, resultsShown: Signal<boolean>, context: SearchContext) {
        const exactMatches = searchResults.filter(r => r.exactMatch);
        const partialMatches = searchResults.filter(r => !r.exactMatch);
        const preExact = exactMatches.length === 0 ? [] : [
            create("span")
                .classes("search-result-header")
                .text("Exact Matches")
                .build()
        ];
        const prePartial = partialMatches.length === 0 ? [] : [
            create("span")
                .classes("search-result-header")
                .text("Partial Matches")
                .build()
        ];
        const showClass = compute((s: boolean): string => s ? "_" : "hidden", resultsShown);
        const contextClass = context === SearchContext.navBar ? "search-results-popout" : "search-results-page";

        return create("div")
            .classes(contextClass, showClass)
            .children(
                create("div")
                    .classes("flex-v", "nogap")
                    .children(
                        ...preExact,
                        ...exactMatches.map(result => {
                            return this.searchResult(result, selectedResult, resultsShown);
                        }),
                        ...prePartial,
                        ...partialMatches.map(result => {
                            return this.searchResult(result, selectedResult, resultsShown);
                        })
                    ).build()
            ).build();
    }

    static searchResult(searchResult: SearchResult, selectedResult: Signal<number|null>, resultsShown: Signal<boolean>) {
        const addClass = compute((sr): string => sr === searchResult.id ? "selected" : "_", selectedResult);
        let elementReference: AnyElement;
        selectedResult.subscribe((newId) => {
            if (newId === searchResult.id) {
                elementReference.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

        const imageMap: Record<string, Function> = {
            "user": Util.getUserAvatar,
            "track": Util.getTrackCover,
            "album": Util.getAlbumCover,
            "playlist": Util.getPlaylistCover,
        };
        const image = signal(Images.DEFAULT_COVER_TRACK);
        if (searchResult.hasImage) {
            imageMap[searchResult.type](searchResult.id).then((url: string) => {
                image.value = url;
            });
        }

        elementReference = create("div")
            .classes("search-result", "padded", "flex", addClass)
            .onclick(async () => {
                navigate(searchResult.url);
                resultsShown.value = false;
            })
            .children(
                create("span")
                    .classes("search-result-image")
                    .children(
                        create("img")
                            .src(image)
                            .build()
                    ).build(),
                create("div")
                    .classes("flex-v", "nogap", "search-result-text", "flex-grow")
                    .children(
                        create("span")
                            .classes("search-result-display")
                            .text(display)
                            .build(),
                        create("span")
                            .classes("search-result-subtitle", "text-xsmall")
                            .text(subtitle)
                            .build(),
                    ).build(),
                create("span")
                    .classes("search-result-type", "padded-inline", searchResult.type)
                    .text(searchResult.type)
                    .build()
            ).build();
        return elementReference;
    }

    static searchPage() {

    }
}