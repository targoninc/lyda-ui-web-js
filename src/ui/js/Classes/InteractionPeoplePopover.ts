import { compute, create, InputType, signal, signalMap, when } from "@targoninc/jess";
import { input } from "@targoninc/jess-components";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";
import { Api } from "../Api/Api.ts";
import { Images } from "../Enums/Images.ts";
import { TextSize } from "../Enums/TextSize.ts";
import { InteractionUser } from "../Models/InteractionUser.ts";
import { RoutePath } from "../Routing/routes.ts";
import { navigate } from "../Routing/Router.ts";
import { UserTemplates } from "../Templates/account/UserTemplates.ts";
import { GenericTemplates, horizontal, vertical } from "../Templates/generic/GenericTemplates.ts";
import { PopoverTemplates } from "../Templates/generic/PopoverTemplates.ts";
import { Util } from "./Util.ts";

export class InteractionPeoplePopover {
    private static popover: HTMLElement | null = null;
    private static activeType = signal(InteractionType.like);
    private static people = signal<InteractionUser[]>([]);
    private static total = signal(0);
    private static loading = signal(false);
    private static query = signal("");
    private static entityType: EntityType = EntityType.track;
    private static id = 0;
    private static code = "";
    private static anchor: HTMLElement | null = null;
    private static request = 0;

    static show(
        entityType: EntityType,
        interactionType: InteractionType,
        id: number,
        code: string,
        anchor: HTMLElement,
        point?: { x: number; y: number },
    ) {
        const popover = this.ensurePopover();
        if (popover.matches(":popover-open") &&
            this.anchor === anchor &&
            this.entityType === entityType &&
            this.id === id &&
            this.activeType.value === interactionType) {
            popover.hidePopover();
            return;
        }

        this.entityType = entityType;
        this.id = id;
        this.code = code;
        this.anchor = anchor;
        this.activeType.value = interactionType;
        this.query.value = "";
        void this.load();
        if (popover.matches(":popover-open")) {
            popover.hidePopover();
        }

        const above = !!anchor.closest("footer");
        const rect = anchor.getBoundingClientRect();
        const x = point?.x ?? Math.max(8, rect.right - 340);
        const y = point?.y ?? rect.bottom + 2;
        requestAnimationFrame(() => {
            if (above) {
                PopoverTemplates.showContextMenuAtAnchor(popover, anchor, true, true);
            } else {
                PopoverTemplates.showContextMenu(popover, x, y);
            }
        });
    }

    private static ensurePopover() {
        if (this.popover?.isConnected) {
            return this.popover;
        }

        const panel = create("div").classes("flex-v").children(
            horizontal(
                create("span").classes("bold").text(
                    compute((type): string => type === InteractionType.like ? "Liked by" : "Reposted by", this.activeType),
                ).build(),
                create("span").classes("color-dim", TextSize.small).text(
                    compute((count, isLoading): string => isLoading ? "Searching…" : `${count} people`, this.total, this.loading),
                ).build(),
            ).classes("align-children", "small-gap").build(),
            input<string>({
                type: InputType.text,
                name: "interaction-people-search",
                label: "Search people",
                placeholder: "Username or display name",
                debounce: 250,
                value: this.query,
                onchange: () => void this.load(),
            }),
            when(this.loading, GenericTemplates.loadingSpinner()),
            create("div").classes("interaction-people-list").children(
                signalMap(this.people, vertical().classes("flex-v", "small-gap"), user => this.personRow(user)),
            ).build(),
        ).build();

        this.popover = PopoverTemplates.manualPopover(
            "interaction-people-popover",
            vertical(panel).classes("padded-large").build(),
        );
        document.body.appendChild(this.popover);
        return this.popover;
    }

    private static async load() {
        if (!this.id) {
            this.people.value = [];
            this.total.value = 0;
            return;
        }

        const token = ++this.request;
        this.loading.value = true;
        const response = await Api.getInteractionUsers(
            this.entityType,
            this.activeType.value,
            this.id,
            this.query.value,
            0,
            20,
            this.code,
        );
        if (token !== this.request) {
            return;
        }
        this.people.value = response?.users ?? [];
        this.total.value = response?.total ?? 0;
        this.loading.value = false;
    }

    private static personRow(user: InteractionUser) {
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
}
