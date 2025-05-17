export enum RoadmapItemStatus {
    todo = "todo",
    inProgress = "inProgress",
    done = "done",
}

export const roadMapItemIcons: Record<RoadmapItemStatus, string> = {
    [RoadmapItemStatus.todo]: "hourglass_empty",
    [RoadmapItemStatus.inProgress]: "progress_activity",
    [RoadmapItemStatus.done]: "check",
};
