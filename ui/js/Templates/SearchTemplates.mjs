import {create, signal} from "https://fjs.targoninc.com/f.js";
import {Api} from "../Classes/Api.mjs";
import {Ui} from "../Classes/Ui.mjs";

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
            .classes("search-input-container")
            .children(
                create("input")
                    .classes("search-input")
                    .placeholder("Search")
                    .onkeydown((e) => {
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
                    .onkeyup(async (e) => {
                        const pressedKey = e.key;
                        if (pressedKey === "Enter") {
                            if (selectedResult.value === null) {
                                return;
                            }
                            window.router.navigate(selectedResult.value.type + "/" + selectedResult.value.id);
                            return;
                        }

                        let search = e.target.value;
                        if (pressedKey !== "Backspace" && pressedKey !== "Delete" && pressedKey.length > 1) {
                            return;
                        }
                        search = search.trim();

                        if (search.length === 0) {
                            results.value = [];
                            return;
                        }
                        const tempCount = resultCount + 1;
                        const res = await Api.getAsync(Api.endpoints.search, { search, filters });
                        if (res.code !== 200) {
                            Ui.notify("Failed to search, status code " + res.code, "error");
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
                window.router.navigate(type + "/" + id);
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