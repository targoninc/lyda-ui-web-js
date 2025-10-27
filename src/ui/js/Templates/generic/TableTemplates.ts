import { AnyElement, AnyNode, compute, create, signal, Signal, StringOrSignal } from "@targoninc/jess";

export class TableTemplates {
    static table(hasFixedBar: boolean = false, ...children: AnyNode[]) {
        return create("table")
            .classes(hasFixedBar ? "fixed-bar-content" : "_")
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

    static tr(opts: TableRowOptions) {


        return create("tr")
            .classes(...(opts.classes ?? []))
            .children(...opts.data.map((c, i) => {
                let cellClasses = opts.cellClasses?.at(i) ?? [];
                if (cellClasses.constructor !== Array) {
                    cellClasses = [cellClasses as StringOrSignal];
                }

                return create(opts.type ?? "td")
                    .classes(...cellClasses)
                    .children(c)
                    .build();
            })).build();
    }
}

export interface TableRowOptions {
    type?: "th" | "td",
    classes?: StringOrSignal[],
    cellClasses: (StringOrSignal | StringOrSignal[])[],
    data: (AnyNode | Signal<AnyElement>)[],
}