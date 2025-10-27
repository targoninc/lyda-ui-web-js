import { AnyElement, AnyNode, create, Signal, StringOrSignal } from "@targoninc/jess";

export function tr(type: "th" | "td", children: (AnyNode | Signal<AnyElement>)[]) {
    return create("tr")
        .children(...children.map(c =>
            create(type)
                .children(c)
                .build(),
        )).build();
}

export function table(headers: StringOrSignal[], data: (AnyElement | Signal<AnyElement>)[][]) {
    return create("table")
        .children(
            create("thead")
                .children(
                    tr("th", headers.map(h =>
                        create("span")
                            .text(h)
                            .build(),
                    )),
                ).build(),
            create("tbody")
                .children(
                    ...data.map(d => tr("td", d)),
                ).build(),
        ).build();
}