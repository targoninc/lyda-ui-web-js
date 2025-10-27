import { AnyElement, AnyNode, compute, create, signal, Signal, StringOrSignal } from "@targoninc/jess";

export class TableTemplates {
    static table(...children: AnyNode[]) {
        return create("table")
            .classes("fixed-bar-content")
            .attributes("cellspacing", "0", "cellpadding", "0")
            .children(...children)
            .build();
    }

    static tableHeaders<T>(headerDefinitions: {
        title: StringOrSignal;
        property?: string
    }[], currentSortProperty: Signal<keyof T | null> = signal<keyof T | null>(null)) {
        return create("thead").children(
            create("tr")
                .classes("log")
                .children(
                    ...headerDefinitions.map(h => TableTemplates.tableHeader<T>(h.title, h.property as keyof T, currentSortProperty)),
                ).build(),
        ).build();
    }

    static tableHeader<T = any>(title: StringOrSignal, property: keyof T, currentSortProperty: Signal<keyof T | null>) {
        return create("th")
            .classes(`log-property-${property as string}`, "sortable")
            .onclick(() => {
                if (property) {
                    currentSortProperty.value = property;
                }
            })
            .children(
                create("span")
                    .classes("table-header", compute((s): string => s === property ? "sorted" : "normal", currentSortProperty))
                    .text(title)
                    .build(),
            ).build();
    }

    static tr(type: "th" | "td", children: (AnyNode | Signal<AnyElement>)[]) {
        return create("tr")
            .children(...children.map(c =>
                create(type)
                    .children(c)
                    .build(),
            )).build();
    }
}
