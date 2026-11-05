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
type OpenPeople = (type: InteractionType, anchor: HTMLElement) => void;

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

function attachPeopleMenu(element: HTMLElement, type: InteractionType, openPeople: OpenPeople) {
    element.addEventListener("contextmenu", event => {
        event.preventDefault();
        openPeople(type, element);
    });
    return element;
}

function toggleButton(type: InteractionType, entry: InteractionEntry, classes: string[], children: any[], openPeople: OpenPeople) {
    const button = create("button")
        .attributes("type", "button")
        .classes(...classes, activeClass(entry))
        .title(type === InteractionType.like ? "Like" : "Repost")
        .onclick(() => toggle(entry))
        .children(...children)
        .build() as HTMLElement;
    return attachPeopleMenu(button, type, openPeople);
}

function countButton(type: InteractionType, entry: InteractionEntry, openPeople: OpenPeople, classes: string[] = []) {
    return create("button")
        .attributes("type", "button")
        .classes("interaction-design-count-button", ...classes, activeClass(entry))
        .title("Show people")
        .onclick((event: MouseEvent) => {
            event.stopPropagation();
            openPeople(type, event.currentTarget as HTMLElement);
        })
        .text(countText(entry))
        .build() as HTMLElement;
}

function minimalActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    return horizontal(
        toggleButton(InteractionType.like, like, ["interaction-design-icon"], [actionIcon(InteractionType.like, like)], openPeople),
        toggleButton(InteractionType.repost, repost, ["interaction-design-icon"], [actionIcon(InteractionType.repost, repost)], openPeople),
    ).classes("align-children", "small-gap").build();
}

function chipActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const chip = (type: InteractionType, entry: InteractionEntry) => create("div")
        .classes("interaction-design-chip", activeClass(entry))
        .children(
            toggleButton(type, entry, ["interaction-design-chip-toggle"], [actionIcon(type, entry)], openPeople),
            countButton(type, entry, openPeople, ["interaction-design-chip-count"]),
        ).build();

    return horizontal(
        chip(InteractionType.like, like),
        chip(InteractionType.repost, repost),
    ).classes("align-children", "small-gap").build();
}

function splitActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const split = (type: InteractionType, entry: InteractionEntry) => create("div")
        .classes("interaction-design-split", activeClass(entry))
        .children(
            toggleButton(type, entry, ["interaction-design-split-button"], [actionIcon(type, entry)], openPeople),
            countButton(type, entry, openPeople, ["interaction-design-split-count"]),
        ).build();

    return horizontal(split(InteractionType.like, like), split(InteractionType.repost, repost)).classes("align-children", "small-gap").build();
}

function segmentedActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const segment = (type: InteractionType, entry: InteractionEntry) => create("div")
        .classes("interaction-design-segment", activeClass(entry))
        .children(
            toggleButton(type, entry, ["interaction-design-segment-button"], [actionIcon(type, entry)], openPeople),
            countButton(type, entry, openPeople, ["interaction-design-segment-count"]),
        ).build();

    return create("div").classes("interaction-design-segmented").children(
        segment(InteractionType.like, like),
        segment(InteractionType.repost, repost),
    ).build();
}

function fullActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const action = (type: InteractionType, entry: InteractionEntry) => create("div")
        .classes("interaction-design-full-action", activeClass(entry))
        .children(
            toggleButton(type, entry, ["interaction-design-full-toggle"], [
                actionIcon(type, entry),
                create("span").classes("interaction-design-full-label").text(type === InteractionType.like ? "Like" : "Repost").build(),
            ], openPeople),
            countButton(type, entry, openPeople, ["interaction-design-full-count"]),
        ).build();

    return horizontal(
        action(InteractionType.like, like),
        action(InteractionType.repost, repost),
    ).classes("align-children", "small-gap").build();
}

function railActions(like: InteractionEntry, repost: InteractionEntry, openPeople: OpenPeople) {
    const action = (type: InteractionType, entry: InteractionEntry) => create("div")
        .classes("interaction-design-rail-item", activeClass(entry))
        .children(
            toggleButton(type, entry, ["interaction-design-rail-button"], [actionIcon(type, entry)], openPeople),
            countButton(type, entry, openPeople, ["interaction-design-rail-count"]),
        ).build();

    return vertical(
        action(InteractionType.like, like),
        action(InteractionType.repost, repost),
    ).classes("interaction-design-rail", "small-gap").build();
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
    like: InteractionEntry,
    repost: InteractionEntry,
    people: Signal<InteractionUser[]>,
    total: Signal<number>,
    loading: Signal<boolean>,
    query: Signal<string>,
    onSearch: () => void,
    name: string,
) {
    const tab = (type: InteractionType, entry: InteractionEntry) => create("button")
        .attributes("type", "button")
        .classes("interaction-people-tab", compute((active): string => active === type ? "active" : "_", activeType))
        .onclick(() => {
            activeType.value = type;
            onSearch();
        })
        .children(
            create("span").text(type === InteractionType.like ? "Liked by" : "Reposted by").build(),
            create("span").classes("interaction-design-count").text(countText(entry)).build(),
        ).build();

    return create("div").classes("interaction-people-panel").children(
        horizontal(
            tab(InteractionType.like, like),
            tab(InteractionType.repost, repost),
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
        create("span").classes("color-dim", TextSize.small).text(
            compute((count, isLoading): string => isLoading ? "Searching…" : `${count} people`, total, loading),
        ).build(),
    ).build();
}

function designCard(title: string, context: string, description: string, preview: any) {
    return create("div").classes("card", "flex-v", "interaction-design-card").children(
        create("span").classes("bold", TextSize.large).text(title).build(),
        create("span").classes("color-dim", TextSize.small).text(`${context} — ${description}`).build(),
        create("div").classes("interaction-design-preview").children(preview).build(),
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

        const panel = peoplePanel(activeType, like, repost, people, total, loading, query, () => void loadPeople(), "popover");
        const popover = PopoverTemplates.manualPopover("interaction-people-popover", panel);
        document.body.appendChild(popover);
        trackCleanup(() => popover.remove());

        const openPeople: OpenPeople = (type, anchor) => {
            activeType.value = type;
            void loadPeople();
            if (popover.matches(":popover-open")) {
                popover.hidePopover();
            }
            requestAnimationFrame(() => PopoverTemplates.show(popover, anchor, false, true));
        };

        if (trackId.value) {
            void loadPeople();
        }

        return vertical(
            heading({level: 1, text: "Interaction designs"}),
            GenericTemplates.text("Design studies for like and repost controls. Click a count or right-click an action to open the searchable people list."),
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
                designCard("Icon only", "Player", "The smallest footprint: actions without counts. Right-click opens people.", minimalActions(like, repost, openPeople)),
                designCard("Count chips", "Lists and cards", "Click the icon to toggle, the count to open people.", chipActions(like, repost, openPeople)),
                designCard("Split actions", "Track page header", "Click the icon to toggle, the count to open people.", splitActions(like, repost, openPeople)),
                designCard("Segmented actions", "Track page", "Click the icon to toggle, the count to open people.", segmentedActions(like, repost, openPeople)),
                designCard("Full action bar", "Full track page", "Labels, icons and counts with a popout people list.", fullActions(like, repost, openPeople)),
                designCard("Vertical rail", "Full player / side rail", "A narrow stack with a popout people list.", railActions(like, repost, openPeople)),
            ).build(),
        ).classes("interaction-design-page", "padded-page", "flex-v", "gap").build();
    }
}
