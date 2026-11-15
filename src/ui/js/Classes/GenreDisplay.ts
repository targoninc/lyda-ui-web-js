import {DISCOGS_PARENT_GENRES, DiscogsParentGenre, Genre} from "@targoninc/lyda-shared/src/Enums/Genre";
import {GenreByParent, getSubgenreDisplay} from "@targoninc/lyda-shared/src/Enums/GenreLabels";

export function getParentGenreValue(parent: DiscogsParentGenre): Genre {
    const group = GenreByParent[parent] ?? [];
    if (group.length === 0) {
        return parent as unknown as Genre;
    }

    return group[0].split("---")[0] as Genre;
}

const parentDisplays = new Map<Genre, string>(
    DISCOGS_PARENT_GENRES.map(parent => [getParentGenreValue(parent), parent]),
);

export function getParentGenreValues(): Genre[] {
    return [...parentDisplays.keys()];
}

export function getGenreDisplay(genre: Genre): string {
    return parentDisplays.get(genre) ?? getSubgenreDisplay(genre);
}
