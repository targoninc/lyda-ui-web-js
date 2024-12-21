import {create} from "../../fjsc/src/f2.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "../Classes/Ui.ts";
import {navigate} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class SearchTemplates {
    static search() {
        const results = signal([]);
        const selectedResult = signal({ id: null });

        return create("div")
            .classes("search", "relative", "align-center")
            .children(
                SearchTemplates.searchInput(results, selectedResult),
                SearchTemplates.searchResults(results, selectedResult)
            ).build();
    }

    static searchInput(results, selectedResult, filters = []) {
        let resultCount = 0;

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
                            if (selectedResult.value === null) {
                                selectedResult.value = list[0];
                                return;
                            }
                            const index = list.findIndex(l => l.id === selectedResult.value.id);
                            if (index === list.length - 1) {
                                selectedResult.value = list[0];
                                return;
                            }
                            selectedResult.value = list[index + 1];
                        } else if (pressedKey === "ArrowUp") {
                            e.preventDefault();
                            if (selectedResult.value === null) {
                                selectedResult.value = list[list.length - 1];
                                return;
                            }
                            const index = list.findIndex(l => l.id === selectedResult.value.id);
                            if (index === 0) {
                                selectedResult.value = list[list.length - 1];
                                return;
                            }
                            selectedResult.value = list[index - 1];
                        }
                    })
                    .onkeyup(async (e: KeyboardEvent) => {
                        const pressedKey = e.key;
                        if (pressedKey === "Enter") {
                            if (selectedResult.value === null) {
                                return;
                            }
                            navigate(selectedResult.value.type + "/" + selectedResult.value.id);
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
                        const tempCount = resultCount + 1;
                        // TODO: Change search so it searches all 4 endpoints
                        const res = await Api.getAsync(ApiRoutes.searchTracks, { search, filters });
                        if (res.code !== 200) {
                            notify("Failed to search, status code " + res.code, NotificationType.error);
                            return;
                        }
                        if (tempCount === resultCount + 1) {
                            selectedResult.unsubscribeAll();
                            selectedResult.value = null;
                            results.value = res.data;
                        }
                    })
                    .build()
            ).build();
    }

    static searchResults(results, selectedResult) {
        let searchResults = results.value;
        const sResults = signal(SearchTemplates.searchResultsList(searchResults, selectedResult));
        results.onUpdate = () => {
            searchResults = results.value;
            sResults.value = SearchTemplates.searchResultsList(searchResults, selectedResult);
        };
        return sResults;
    }

    static searchResultsList(searchResults, selectedResult) {
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
        return create("div")
            .classes("search-results", "flex-v", "rounded", searchResults.length === 0 ? "hidden" : "_")
            .children(
                ...preExact,
                ...exactMatches.map(result => {
                    return this.searchResult(result.display, result.id, result.type, result.image, selectedResult);
                }),
                ...prePartial,
                ...partialMatches.map(result => {
                    return this.searchResult(result.display, result.id, result.type, result.image, selectedResult);
                })
            ).build();
    }

    static searchResult(display, id, type, image = "", selectedResult = null) {
        const addClass = signal(selectedResult.id === id ? "selected" : "_");
        let elementReference;
        selectedResult.onUpdate = (newValue) => {
            addClass.value = newValue.id === id ? "selected" : "_";
            if (newValue.id === id) {
                elementReference.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        };
        if (display.length > 50) {
            display = display.substring(0, 50) + "...";
        }
        elementReference = create("div")
            .classes("search-result", "padded", "flex", addClass)
            .onclick(async () => {
                navigate(type + "/" + id);
                const resultList = document.querySelector(".search-results");
                resultList.classList.add("hidden");
            })
            .children(
                create("span")
                    .classes("search-result-image")
                    .children(
                        create("img")
                            .src(image)
                            .build()
                    ).build(),
                create("span")
                    .classes("search-result-text", "flex-grow")
                    .text(display)
                    .build(),
                create("span")
                    .classes("search-result-type", "padded-inline", type)
                    .text(type)
                    .build()
            )
            .build();
        return elementReference;
    }
}