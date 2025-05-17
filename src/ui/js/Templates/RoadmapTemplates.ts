import {create} from "@targoninc/jess";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {roadMapItemIcons, RoadmapItemStatus} from "@targoninc/lyda-shared/src/Enums/RoadmapItemStatus";

let index = 0;

export class RoadmapTemplates {
    static roadmapPage() {
        index = 0;

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Feature Roadmap")
                    .build(),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.todo, "2025-2026", "Stripe payments + payouts"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.todo, "2025", "Buying music"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.todo, "2025", "MFA"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.inProgress, "2025", "UX improvements and bugfixes"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.done, "2025", "Royalty payouts"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.done, "2024", "Subscriptions"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.done, "2024", "Complete UI + API rewrite"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.done, "2023", "Basic feeds"),
                RoadmapTemplates.roadmapItem(RoadmapItemStatus.done, "2023", "Streaming music"),
            ).build();
    }

    static roadmapItem(status: RoadmapItemStatus, plannedTime: string, title: string) {
        const item = create("div")
            .classes("flex-v", "card", "roadmap-item", status)
            .styles("animation-delay", `calc(.1s * ${index})`)
            .children(
                create("div")
                    .classes("flex", "align-children", status != RoadmapItemStatus.done ? "text-large" : "_")
                    .children(
                        RoadmapTemplates.itemStatus(status),
                        create("span")
                            .text(plannedTime)
                            .build(),
                        create("span")
                            .text(title)
                            .build()
                    ).build(),
            ).build();

        index++;

        return item;
    }

    static itemStatus(status: RoadmapItemStatus) {
        return create("div")
            .classes("flex-v", "align-children", "roadmap-item-status")
            .children(
                GenericTemplates.icon(roadMapItemIcons[status], true, ["roadmap-item-status-icon", status])
            ).build();
    }
}