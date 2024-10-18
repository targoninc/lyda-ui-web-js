export class DragActions {
    static showDragTargets(filter = null) {
        const dragTargets = document.querySelectorAll(".dragTarget");
        dragTargets.forEach((dragTarget) => {
            if (filter && dragTarget.classList.contains(filter)) {
                dragTarget.classList.remove("hidden");
            } else if (!filter) {
                dragTarget.classList.remove("hidden");
            }
        });
    }

    static hideDragTargets(filter = null) {
        const dragTargets = document.querySelectorAll(".dragTarget");
        dragTargets.forEach((dragTarget) => {
            if (filter && dragTarget.classList.contains(filter)) {
                dragTarget.classList.add("hidden");
            } else if (!filter) {
                dragTarget.classList.add("hidden");
            }
        });
    }
}