import {compute, create, Signal} from "@targoninc/jess";

export interface BatchEditField {
    key: string;
    label: string;
}

export class BatchEditTemplates {
    static selectionCard(kind: string, id: number, selectedIds: Signal<Set<number>>) {
        const selected = compute(ids => ids.has(id), selectedIds);
        const selectedClass = compute(isSelected => isSelected ? "selected" : "_", selected);

        return create("button")
            .classes("card", "batch-selection-card", selectedClass)
            .attributes("type", "button")
            .title(`Select ${kind}`)
            .children(
                create("span")
                    .classes("batch-selection-checkmark")
                    .text("✓")
                    .build(),
            )
            .onclick(() => {
                const next = new Set(selectedIds.value);
                if (selected.value) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
                selectedIds.value = next;
            })
            .build();
    }

    static changedFields<T extends object>(state: Signal<T>, fields: BatchEditField[]) {
        return compute(
            value => fields.filter(field => Object.prototype.hasOwnProperty.call(value, field.key)).map(field => field.label),
            state,
        );
    }

    static saveSummary(
        changedFields: Signal<string[]>,
        selectedIds: Signal<Set<number>>,
        entityName: string,
    ) {
        return create("span")
            .text(compute(
                (fields, ids) => `Set ${fields.join(", ")} on ${ids.size} ${entityName}`,
                changedFields,
                selectedIds,
            ))
            .build();
    }
}
