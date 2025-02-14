export enum RoadmapItemStatus {
    todo = "todo",
    inProgress = "inProgress",
    done = "done",
}

export const roadMapItemIcons: Record<RoadmapItemStatus, string> = {
    [RoadmapItemStatus.todo]: "hourglass_empty",
    [RoadmapItemStatus.inProgress]: "timelapse",
    [RoadmapItemStatus.done]: "check",
};
