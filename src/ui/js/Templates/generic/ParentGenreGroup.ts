import {compute, create, signal, signalMap, Signal, when, InputType, StringOrSignal} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {DISCOGS_PARENT_GENRES, DiscogsParentGenre, Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {GenreByParent, getSubgenreDisplay} from "@targoninc/lyda-shared/src/Enums/GenreLabels";
import {horizontal, vertical} from "./GenericTemplates.ts";
import {t} from "../../../locales";

export interface ParentGenreGroupOptions {
    selectedGenres: Signal<Genre[]>;
    maxGenres?: number;
    placeholder?: StringOrSignal;
    label?: StringOrSignal;
    suggestedGenres?: Signal<Genre[]>;
}

export function ParentGenreGroup(options: ParentGenreGroupOptions) {
    const {
        selectedGenres,
        maxGenres = 5,
        placeholder = "Add genre...",
        label = "Genre",
        suggestedGenres = signal<Genre[]>([]),
    } = options;

    const expandedParents = signal<Set<DiscogsParentGenre>>(new Set());
    const searchQuery = signal("");
    const showSuggestions = signal(true);

    const toggleParent = (parent: DiscogsParentGenre) => {
        const current = new Set(expandedParents.value);
        if (current.has(parent)) {
            current.delete(parent);
        } else {
            current.add(parent);
        }
        expandedParents.value = current;
    };

    const addGenre = (genre: Genre) => {
        const current = selectedGenres.value;
        if (maxGenres > 0 && current.length >= maxGenres) return;
        if (current.includes(genre)) return;
        selectedGenres.value = [...current, genre];
    };

    const removeGenre = (genre: Genre) => {
        selectedGenres.value = selectedGenres.value.filter(g => g !== genre);
    };

    const getFilteredGenres = (parent: DiscogsParentGenre): Genre[] => {
        const allGenres = GenreByParent[parent] ?? [];
        const query = searchQuery.value.toLowerCase();
        if (!query) return allGenres;
        return allGenres.filter(g => 
            g.toLowerCase().includes(query) || 
            getSubgenreDisplay(g).toLowerCase().includes(query)
        );
    };

    const hasMatchingGenres = (parent: DiscogsParentGenre): boolean => {
        return getFilteredGenres(parent).length > 0;
    };

    const selectedRow = create("div").classes("flex", "flex-wrap", "small-gap", "align-children").children(
        signalMap(
            selectedGenres,
            create("div").classes("flex", "flex-wrap", "small-gap", "align-children"),
            (genre) =>
                button({
                    icon: {icon: "close"},
                    text: getSubgenreDisplay(genre),
                    classes: ["tag-remove"],
                    onclick: () => removeGenre(genre),
                }),
        ),
        when(
            compute(t => t.length < maxGenres || maxGenres === 0, selectedGenres),
            create("input")
                .type(InputType.text)
                .classes("jess", "tag-input")
                .placeholder(placeholder)
                .value(searchQuery)
                .oninput(e => searchQuery.value = (e.target as HTMLInputElement).value)
                .build(),
        ),
    ).build();

    return create("div")
        .classes("parent-genre-group", "flex-v", "small-gap")
        .children(
            when(label, create("label").text(label).build()),
            selectedRow,
            when(
                compute(s => s.length > 0, suggestedGenres),
                create("div").classes("flex-v", "small-gap").children(
                    create("span")
                        .classes("color-dim", "small")
                        .text(t("SUGGESTIONS")),
                    signalMap(
                        suggestedGenres,
                        horizontal(),
                        (genre) => button({
                            text: getSubgenreDisplay(genre),
                            classes: ["tag", "suggestion"],
                            onclick: () => addGenre(genre),
                        }),
                    ),
                ).build(),
            ),
            create("div")
                .classes("genre-groups", "flex-v", "small-gap")
                .children(
                    signalMap(
                        compute((sq) => {
                            if (sq) {
                                return [...DISCOGS_PARENT_GENRES.filter(p => hasMatchingGenres(p))];
                            }
                            return [...DISCOGS_PARENT_GENRES];
                        }, searchQuery),
                        vertical(),
                        (parent) => {
                            const isExpanded = compute(
                                (expanded, query) => expanded.has(parent) || (query && query.length > 0),
                                expandedParents, searchQuery,
                            );

                            const genreButtons = signalMap(
                                compute(() => getFilteredGenres(parent)),
                                create("div").classes("flex", "flex-wrap", "small-gap"),
                                (genre) => {
                                    const isSelected = compute((s) => s.includes(genre), selectedGenres);
                                    return button({
                                        text: getSubgenreDisplay(genre),
                                        classes: [
                                            "tag",
                                            compute((s): string => s ? "selected" : "_", isSelected),
                                        ],
                                        onclick: () => addGenre(genre),
                                    });
                                },
                            );

                            const header = create("div")
                                .classes("parent-genre-header", "flex", "align-children", "clickable")
                                .children(
                                    create("span").classes("parent-genre-title").text(parent).build(),
                                    create("span").classes("parent-genre-count").text(`(${GenreByParent[parent]?.length ?? 0})`).build(),
                                ).onclick(() => toggleParent(parent))
                                .build();

                            return create("div")
                                .classes("parent-genre-section", "flex-v", "small-gap")
                                .children(
                                    header,
                                    when(
                                        isExpanded,
                                        create("div").classes("parent-genre-content", "flex", "flex-wrap", "small-gap").children(genreButtons).build(),
                                    ),
                                ).build();
                        },
                    )
                ).build()
        ).build();
}
