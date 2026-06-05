import {compute, create, InputType, signal, signalMap, Signal, when, StringOrSignal} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {t} from "../../../locales";

export interface TagEditorOptions {
    allTags: string[];
    selectedTags: Signal<string[]>;
    maxTags?: number;
    placeholder?: StringOrSignal;
    label?: StringOrSignal;
    suggestionHeading?: StringOrSignal;
    showSuggestions?: boolean;
    classes?: string[];
}

export function TagEditor(options: TagEditorOptions) {
    const {
        allTags,
        selectedTags,
        maxTags = 0,
        placeholder = t("FILTER_GENRES"),
        label,
        suggestionHeading,
        showSuggestions = true,
        classes = ["flex-v", "small-gap"],
    } = options;

    const inputValue = signal("");

    const addTag = (name: string) => {
        const tags = selectedTags.value;
        if (maxTags > 0 && tags.length >= maxTags) return;
        if (tags.includes(name)) return;
        selectedTags.value = [...tags, name];
    };

    const removeTag = (name: string) => {
        selectedTags.value = selectedTags.value.filter(t => t !== name);
    };

    const suggestionBtn = (sug: string) => button({
        text: sug,
        classes: ["rounded-max"],
        onclick: () => {
            addTag(sug);
            inputValue.value = "";
        },
    });

    const selectedRow = create("div").classes("flex", "flex-wrap", "small-gap", "align-children").children(
        signalMap(
            selectedTags,
            create("div").classes("flex", "flex-wrap", "small-gap", "align-children"),
            (tag) =>
                button({
                    icon: {icon: "close"},
                    text: tag,
                    classes: ["tag-remove"],
                    onclick: () => removeTag(tag),
                }),
        ),
        when(
            compute(t => t.length < maxTags || maxTags === 0, selectedTags),
            create("input")
                .type(InputType.text)
                .classes("jess", "tag-input")
                .placeholder(placeholder)
                .value(inputValue)
                .oninput(e => inputValue.value = (e.target as HTMLInputElement).value)
                .onkeydown((e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        const val = inputValue.value.trim().toLowerCase();
                        const match = allTags.find(g => g === val || g.includes(val));
                        if (match && !selectedTags.value.includes(match)) {
                            addTag(match);
                        }
                        inputValue.value = "";
                    }
                })
                .build(),
        ),
    ).build();

    const hasMoreSuggestions = compute(
        (selected, search) => {
            let available = allTags.filter(g => !selected.includes(g));
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                available = available.filter(g => g.includes(q));
            }
            return available.length > 0;
        },
        selectedTags, inputValue,
    );

    const suggestions = showSuggestions ? when(
        hasMoreSuggestions,
        create("div").classes("flex-v", "small-gap").children(
            suggestionHeading
                ? create("span").classes("color-dim", "small").text(suggestionHeading).build()
                : null,
            signalMap(
                compute(
                    (selected, search) => {
                        let available = allTags.filter(g => !selected.includes(g));
                        if (search.trim()) {
                            const q = search.trim().toLowerCase();
                            available = available.filter(g => g.includes(q));
                        }
                        return available;
                    },
                    selectedTags, inputValue,
                ),
                create("div").classes("flex", "flex-wrap", "small-gap"),
                suggestionBtn,
            ),
        ).build(),
    ) : null;

    const children: any[] = [];
    if (label) {
        children.push(create("label").text(label).build());
    }
    children.push(selectedRow);
    if (suggestions) {
        children.push(suggestions);
    }

    return create("div").classes(...classes).children(...children).build();
}
