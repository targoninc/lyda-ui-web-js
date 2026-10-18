import {compute, create, signal, signalMap, Signal, when, InputType, StringOrSignal, AnyElement} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {DISCOGS_PARENT_GENRES, DiscogsParentGenre, Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {GenreByParent, getSubgenreDisplay} from "@targoninc/lyda-shared/src/Enums/GenreLabels";
import {GenericTemplates, horizontal, vertical} from "./GenericTemplates.ts";
import {t} from "../../../locales";

export interface ParentGenreGroupOptions {
    selectedGenres: Signal<Genre[]>;
    maxGenres?: number;
    placeholder?: StringOrSignal;
    label?: StringOrSignal;
    suggestedGenres?: Signal<Genre[]>;
    analyzing?: Signal<boolean>;
    listVisible?: Signal<boolean>;
    availableGenres?: Signal<Genre[] | null>;
}

export function ParentGenreGroup(options: ParentGenreGroupOptions) {
    const {
        selectedGenres,
        maxGenres = 5,
        placeholder = "Add genre...",
        label = "Genre",
        suggestedGenres = signal<Genre[]>([]),
        analyzing = signal(false),
        listVisible,
        availableGenres = signal<Genre[] | null>(null),
    } = options;

    const expandedParents = signal<Set<DiscogsParentGenre>>(new Set());
    const searchQuery = signal("");

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

    const isGenreAvailable = (genre: Genre): boolean => {
        const available = availableGenres.value;
        return !available || available.includes(genre);
    };

    const getFilteredGenres = (parent: DiscogsParentGenre): Genre[] => {
        const allGenres = GenreByParent[parent] ?? [];
        const query = searchQuery.value.toLowerCase();
        const matching = query
            ? allGenres.filter(g =>
                g.toLowerCase().includes(query) ||
                getSubgenreDisplay(g).toLowerCase().includes(query)
            )
            : allGenres;
        return matching.filter(isGenreAvailable);
    };

    const hasMatchingGenres = (parent: DiscogsParentGenre): boolean => {
        return getFilteredGenres(parent).length > 0;
    };

    const toggleBtn = listVisible ? button({
        icon: {icon: compute((e): string => e ? "expand_more" : "chevron_right", listVisible)},
        classes: ["rounded-max"],
        onclick: () => listVisible.value = !listVisible.value,
    }) : null;

    return create("div")
        .classes("parent-genre-group", "flex-v", "small-gap")
        .children(
            when(label, create("label").text(label).build()),
            selectedGenresRow(selectedGenres, maxGenres, placeholder, searchQuery, removeGenre, addGenre, analyzing, toggleBtn, isGenreAvailable),
            suggestionsRow(suggestedGenres, addGenre),
            when(listVisible ?? signal(true), () => genreGroupList(expandedParents, searchQuery, availableGenres, selectedGenres, addGenre, removeGenre, toggleParent, getFilteredGenres, hasMatchingGenres)),
        ).build();
}

function selectedGenresRow(
    selectedGenres: Signal<Genre[]>,
    maxGenres: number,
    placeholder: StringOrSignal,
    searchQuery: Signal<string>,
    removeGenre: (g: Genre) => void,
    addGenre: (g: Genre) => void,
    analyzing: Signal<boolean>,
    toggleBtn: AnyElement | null,
    isGenreAvailable: (g: Genre) => boolean,
) {
    return create("div").classes("flex", "flex-wrap", "small-gap", "align-children").children(
        signalMap(
            selectedGenres,
            create("div").classes("flex", "flex-wrap", "small-gap", "align-children"),
            (genre) => button({
                icon: {icon: "close"},
                text: getSubgenreDisplay(genre),
                classes: ["tag-remove"],
                onclick: () => removeGenre(genre),
            }),
        ),
        when(
            compute(s => s.length < maxGenres || maxGenres === 0, selectedGenres),
            create("input")
                .type(InputType.text)
                .classes("jess", "tag-input")
                .placeholder(placeholder)
                .value(searchQuery)
                .oninput(e => searchQuery.value = (e.target as HTMLInputElement).value)
                .onkeydown((e: KeyboardEvent) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const val = searchQuery.value.trim().toLowerCase();
                    if (!val) return;
                    const allGenres = Object.values(Genre).filter(isGenreAvailable);
                    const match =
                        allGenres.find(g => g.toLowerCase() === val) ??
                        allGenres.find(g => getSubgenreDisplay(g).toLowerCase() === val) ??
                        allGenres.find(g => g.toLowerCase().includes(val) || getSubgenreDisplay(g).toLowerCase().includes(val));
                    if (match) {
                        addGenre(match);
                    }
                    searchQuery.value = "";
                })
                .build(),
        ),
        when(
            compute(s => s.length >= maxGenres, selectedGenres),
            create("span").classes("color-dim", "small").text(t("MAX_GENRES_REACHED")).build(),
        ),
        toggleBtn,
        when(analyzing, () =>
            create("div").classes("flex", "align-children", "color-dim")
                .children(
                    GenericTemplates.loadingBlobs(24),
                    create("span").classes("small").text(t("ANALYZING")).build(),
                ).build()
        ),
    ).build();
}

function suggestionsRow(suggestedGenres: Signal<Genre[]>, addGenre: (g: Genre) => void) {
    return when(
        compute(s => s.length > 0, suggestedGenres),
        () => create("div").classes("flex-v", "small-gap").children(
            create("span").classes("color-dim", "small").text(t("SUGGESTIONS")),
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
    );
}

function genreGroupList(
    expandedParents: Signal<Set<DiscogsParentGenre>>,
    searchQuery: Signal<string>,
    availableGenres: Signal<Genre[] | null>,
    selectedGenres: Signal<Genre[]>,
    addGenre: (g: Genre) => void,
    removeGenre: (g: Genre) => void,
    toggleParent: (p: DiscogsParentGenre) => void,
    getFilteredGenres: (p: DiscogsParentGenre) => Genre[],
    hasMatchingGenres: (p: DiscogsParentGenre) => boolean,
) {
    return signalMap(
        compute((_query, _available) => DISCOGS_PARENT_GENRES.filter(p => hasMatchingGenres(p)), searchQuery, availableGenres),
        vertical().classes("card", "genre-groups", "noflexwrap"),
        (parent) => parentGenreSection(parent, expandedParents, searchQuery, availableGenres, selectedGenres, addGenre, removeGenre, toggleParent, getFilteredGenres),
    );
}

function parentGenreSection(
    parent: DiscogsParentGenre,
    expandedParents: Signal<Set<DiscogsParentGenre>>,
    searchQuery: Signal<string>,
    availableGenres: Signal<Genre[] | null>,
    selectedGenres: Signal<Genre[]>,
    addGenre: (g: Genre) => void,
    removeGenre: (g: Genre) => void,
    toggleParent: (p: DiscogsParentGenre) => void,
    getFilteredGenres: (p: DiscogsParentGenre) => Genre[],
) {
    const isExpanded = compute(
        (expanded, query) => expanded.has(parent) || (!!query && query.length > 0),
        expandedParents, searchQuery,
    );

    return vertical(
        parentGenreHeader(parent, isExpanded, toggleParent, availableGenres),
        when(
            isExpanded,
            () => horizontal(
                signalMap(
                    compute((_query, _available) => getFilteredGenres(parent), searchQuery, availableGenres),
                    create("div").classes("flex", "flex-wrap", "small-gap"),
                    (genre) => genreTag(genre, selectedGenres, addGenre, removeGenre),
                ),
            ).classes("subgenres").build(),
        ),
    ).build();
}

function parentGenreHeader(parent: DiscogsParentGenre, isExpanded: Signal<boolean>, toggleParent: (p: DiscogsParentGenre) => void, availableGenres: Signal<Genre[] | null>) {
    return button({
        onclick: () => toggleParent(parent),
        icon: {icon: "folder"},
        text: compute((avail) => {
            const genres = GenreByParent[parent] ?? [];
            const count = avail ? genres.filter(genre => avail.includes(genre)).length : genres.length;
            return `${parent} (${count})`;
        }, availableGenres),
        classes: [compute((i): string => i ? "active" : "_", isExpanded)]
    });
}

function genreTag(genre: Genre, selectedGenres: Signal<Genre[]>, addGenre: (g: Genre) => void, removeGenre: (g: Genre) => void) {
    const isSelected = compute(s => s.includes(genre), selectedGenres);

    return button({
        text: getSubgenreDisplay(genre),
        classes: ["rounded-max", compute((s): string => s ? "active" : "_", isSelected)],
        onclick: () => {
            if (isSelected.value) {
                removeGenre(genre);
            } else {
                addGenre(genre);
            }
        },
    });
}
