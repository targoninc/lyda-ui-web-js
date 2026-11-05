import { compute, create, InputType, signal, signalMap, Signal, when } from "@targoninc/jess";
import { heading, input } from "@targoninc/jess-components";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";
import { Api } from "../Api/Api.ts";
import { Util } from "../Classes/Util.ts";
import { InteractionStateManager } from "../Classes/InteractionStateManager.ts";
import { trackCleanup } from "../Classes/Helpers/PageLifecycle.ts";
import { Icons } from "../Enums/Icons.ts";
import { Images } from "../Enums/Images.ts";
import { TextSize } from "../Enums/TextSize.ts";
import { InteractionUser } from "../Models/InteractionUser.ts";
import { currentTrackId } from "../state.ts";
import { RoutePath } from "../Routing/routes.ts";
import { navigate } from "../Routing/Router.ts";
import { UserTemplates } from "./account/UserTemplates.ts";
import { GenericTemplates, horizontal, vertical } from "./generic/GenericTemplates.ts";
import { PopoverTemplates } from "./generic/PopoverTemplates.ts";

const sampleUsers: InteractionUser[] = [
    {id: 101, username: "aurora_lane", displayname: "Aurora Lane", has_avatar: false},
    {id: 102, username: "nightjars", displayname: "The Nightjars", has_avatar: false},
    {id: 103, username: "miravale", displayname: "Mira Vale", has_avatar: false},
    {id: 104, username: "lowtide", displayname: "Low Tide", has_avatar: false},
    {id: 105, username: "paperboats", displayname: "Paper Boats", has_avatar: false},
];

type InteractionEntry = ReturnType<typeof InteractionStateManager.getOrCreate>;
type OpenPeople = (type: InteractionType, anchor: HTMLElement, point?: {x: number; y: number}) => void;

function toggle(entry: InteractionEntry) {
    entry.interacted$.value = !entry.interacted$.value;
    entry.count$.value += entry.interacted$.value ? 1 : -1;
}

function countText(entry: InteractionEntry) {
    return compute((count): string => String(count), entry.count$);
}

function activeClass(entry: InteractionEntry) {
    return compute((active): string => active ? "active" : "_", entry.interacted$);
}

function actionIcon(type: InteractionType, entry: InteractionEntry) {
    const icon = compute((active): string => {
        if (type === InteractionType.like) {
            return active ? Icons.LIKE : Icons.LIKE_OUTLINE;
        }
        return Icons.REPOST;
    }, entry.interacted$);
    const mask = compute((url): string => `url("${url}")`, icon);
    return create("span")
        .classes("interaction-design-icon-mask")
        .styles("mask-image", mask, "-webkit-mask-image", mask)
        .build();
}

function countButton(type: InteractionType, entry: InteractionEntry, openPeople: OpenPeople) {
    return create("button")
        .attributes("type", "button")
        .classes("interaction-design-split-count")
        .title("Show people")
        .onclick((event: MouseEvent) => {
            event.stopPropagation();
            openPeople(type, event.currentTarget as HTMLElement);
        })
        .text(countText(entry))
        .build();
}

function splitActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const split = (type: InteractionType, entry: InteractionEntry) => {
        const action = create("button")
            .attributes("type", "button")
            .classes("interaction-design-split-button")
            .title(type === InteractionType.like ? "Like" : "Repost")
            .onclick(() => toggle(entry))
            .children(actionIcon(type, entry))
            .build() as HTMLElement;
        action.addEventListener("contextmenu", event => {
            event.preventDefault();
            openPeople(type, action, {x: event.clientX, y: event.clientY});
        });
        return create("div")
            .classes("interaction-design-split", activeClass(entry))
            .children(action, countButton(type, entry, openPeople))
            .build();
    };

    return horizontal(split(InteractionType.like, like), split(InteractionType.repost, repost)).classes("align-children", "small-gap").build();
}

function personRow(user: InteractionUser) {
    const avatar = signal(Images.DEFAULT_AVATAR);
    Util.getCachedUserAvatar(user.id).then(url => avatar.value = url);
    return horizontal(
        UserTemplates.userIcon(user.id, avatar),
        vertical(
            create("span").classes("bold").text(user.displayname).build(),
            create("span").classes("color-dim", TextSize.small).text(`@${user.username}`).build(),
        ).classes("flex-v", "no-gap").build(),
    ).classes("interaction-person", "align-children", "small-gap")
        .onclick(() => navigate(`${RoutePath.profile}/${user.username}`))
        .build();
}

function peoplePanel(
    activeType: Signal<InteractionType>,
    people: Signal<InteractionUser[]>,
    total: Signal<number>,
    loading: Signal<boolean>,
    query: Signal<string>,
    onSearch: () => void,
    name: string,
) {
    return create("div").classes("interaction-people-panel").children(
        horizontal(
            create("span").classes("bold").text(compute((type): string => type === InteractionType.like ? "Liked by" : "Reposted by", activeType)).build(),
            create("span").classes("color-dim", TextSize.small).text(compute((count, isLoading): string => isLoading ? "Searching…" : `${count} people`, total, loading)).build(),
        ).classes("align-children", "small-gap").build(),
        input<string>({
            type: InputType.text,
            name: `${name}-people-search`,
            label: "Search people",
            placeholder: "Username or display name",
            debounce: 250,
            value: query,
            onchange: () => onSearch(),
        }),
        when(loading, GenericTemplates.loadingSpinner()),
        create("div").classes("interaction-people-list").children(
            signalMap(people, vertical().classes("flex-v", "small-gap"), user => personRow(user)),
        ).build(),
    ).build();
}

export class InteractionDesignsTemplates {
    static page() {
        document.querySelector("footer")?.classList.add("hidden");

        const trackId = signal(currentTrackId.value ? String(currentTrackId.value) : "");
        const query = signal("");
        const activeType = signal(InteractionType.like);
        const people = signal<InteractionUser[]>(sampleUsers);
        const total = signal(sampleUsers.length);
        const loading = signal(false);
        const like = InteractionStateManager.getOrCreate(EntityType.track, 9001, InteractionType.like, true, 128);
        const repost = InteractionStateManager.getOrCreate(EntityType.track, 9001, InteractionType.repost, false, 24);
        let request = 0;

        const filterSamples = () => {
            const needle = query.value.trim().toLowerCase();
            const filtered = sampleUsers.filter(user =>
                !needle ||
                user.username.toLowerCase().includes(needle) ||
                user.displayname.toLowerCase().includes(needle),
            );
            people.value = filtered;
            total.value = filtered.length;
        };

        const loadPeople = async () => {
            const id = Number.parseInt(trackId.value, 10);
            if (!Number.isInteger(id) || id <= 0) {
                filterSamples();
                return;
            }

            const token = ++request;
            loading.value = true;
            const response = await Api.getInteractionUsers(EntityType.track, activeType.value, id, query.value, 0, 20);
            if (token !== request) {
                return;
            }
            people.value = response?.users ?? [];
            total.value = response?.total ?? 0;
            loading.value = false;
        };

        const panel = peoplePanel(activeType, people, total, loading, query, () => void loadPeople(), "popover");
        const popover = PopoverTemplates.manualPopover(
            "interaction-people-popover",
            vertical(panel).classes("padded-large").build(),
        );
        document.body.appendChild(popover);
        trackCleanup(() => popover.remove());

        let popoverAnchor: HTMLElement | null = null;
        let popoverType: InteractionType | null = null;
        popover.addEventListener("hidePopover", () => {
            popoverAnchor = null;
            popoverType = null;
        });

        const openPeople: OpenPeople = (type, anchor, point) => {
            if (popover.matches(":popover-open") && popoverAnchor === anchor && popoverType === type) {
                popover.hidePopover();
                return;
            }

            activeType.value = type;
            void loadPeople();
            if (popover.matches(":popover-open")) {
                popover.hidePopover();
            }
            popoverAnchor = anchor;
            popoverType = type;
            const rect = anchor.getBoundingClientRect();
            const x = point?.x ?? Math.max(8, rect.right - 340);
            const y = point?.y ?? rect.bottom + 2;
            requestAnimationFrame(() => PopoverTemplates.showContextMenu(popover, x, y));
        };

        if (trackId.value) {
            void loadPeople();
        }

        return vertical(
            heading({level: 1, text: "Interaction designs"}),
            GenericTemplates.text("Split action study. Click the icon to toggle, the count or right-click to open the searchable people list."),
            create("div").classes("card", "flex-v", "small-gap").children(
                create("span").classes("bold").text("Preview data").build(),
                horizontal(
                    input<string>({
                        type: InputType.text,
                        name: "interaction-design-track-id",
                        label: "Track ID",
                        placeholder: "Enter a track ID",
                        value: trackId,
                        onchange: value => {
                            trackId.value = value;
                            void loadPeople();
                        },
                    }),
                    create("span").classes("color-dim", TextSize.small).text("Leave empty to use sample people.").build(),
                ).classes("align-end", "small-gap").build(),
            ).build(),
            create("div").classes("interaction-design-grid").children(
                create("div").classes("card", "flex-v", "interaction-design-card").children(
                    create("span").classes("bold", TextSize.large).text("Split actions").build(),
                    create("span").classes("color-dim", TextSize.small).text("Track page header — Click the icon to toggle, the count to open people.").build(),
                    create("div").classes("interaction-design-preview").children(splitActions(like, repost, openPeople)).build(),
                ).build(),
            ).build(),
        ).classes("interaction-design-page", "padded-page", "flex-v", "gap").build();
    }
}
