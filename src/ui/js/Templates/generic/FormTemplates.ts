import { input, searchableSelect, SelectOption, textarea, toggle } from "@targoninc/jess-components";
import { GenericTemplates } from "./GenericTemplates.ts";
import { compute, create, HtmlPropertyValue, InputType, signal, Signal, StringOrSignal, TypeOrSignal } from "@targoninc/jess";
import { t } from "../../../locales";
import { Visibility } from "@targoninc/lyda-shared/src/Enums/Visibility";

export class FormTemplates {
    static fileField(title: StringOrSignal, text: string, name: string, accept: string, required = false, onchange = (v: string, files: FileList | null) => {}) {
        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .for(name)
                    .build(),
                GenericTemplates.fileInput(name, name, accept, text, required, onchange)
            ).build();
    }

    static dropDownField(title: StringOrSignal, options: TypeOrSignal<SelectOption<string>[]>, selectedValue: Signal<string>) {
        const optionsState = options.constructor === Signal ? (options as Signal<SelectOption<string>[]>) : signal(options as SelectOption<string>[]);

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .build(),
                searchableSelect({
                    options: optionsState as Signal<SelectOption<string>[]>,
                    value: selectedValue,
                    onchange: (v) => selectedValue.value = v
                })
            ).build();
    }

    static checkBoxField(name: HtmlPropertyValue, text: HtmlPropertyValue, checked: TypeOrSignal<boolean> = false, required = false, onchange = (v: boolean) => {}) {
        return create("div")
            .classes("flex", "space-between")
            .children(GenericTemplates.checkbox(name, checked, text, required, onchange)).build();
    }

    static textField(title: StringOrSignal, name: StringOrSignal, placeholder: StringOrSignal, type = "text", value: StringOrSignal = "", required = false, onchange: Function = (val: string) => {
    }, autofocus = false, onkeydown: Function = () => {
    }, classes: StringOrSignal[] = []) {
        return input<string>({
            type: type as InputType,
            name,
            label: title,
            placeholder,
            value,
            required,
            onchange: onchange as (v: string) => void,
            attributes: ["autocomplete", name],
            autofocus,
            onkeydown,
            classes
        });
    }

    static moneyField(title: StringOrSignal, name: StringOrSignal, placeholder: StringOrSignal, value: TypeOrSignal<number> = 0, required = false, onchange: (value: number) => void = (val: number) => {
    }, min: number = -Infinity, max: number = Infinity, step: number = 0.01, classes: StringOrSignal[] = []) {
        return input<number>({
            type: InputType.number,
            label: title,
            name,
            placeholder,
            value,
            required,
            onchange,
            attributes: ["autocomplete", name, "min", min.toString(), "max", max.toString(), "step", step.toString()],
            classes,
        });
    }

    static titleInput(state: Signal<any>) {
        return input<string>({
            type: InputType.text,
            required: true,
            name: "title",
            label: t("TITLE_STAR"),
            placeholder: t("TITLE"),
            value: compute(s => s.title ?? "", state),
            onchange: v => {
                state.value = {...state.value, title: v};
            },
        });
    }

    static upcInput(state: Signal<any>) {
        return input<string>({
            type: InputType.text,
            name: "upc",
            placeholder: t("UPC"),
            infoText: t("UPC"),
            infoLink: "https://docs.lyda.app/terms/upc",
            value: compute(s => s.upc ?? "", state),
            onchange: v => {
                state.value = {...state.value, upc: v};
            },
        });
    }

    static descriptionInput(state: Signal<any>, fieldName: string = "description") {
        return textarea({
            name: fieldName,
            label: t("DESCRIPTION"),
            placeholder: t("DESCRIPTION"),
            value: compute(s => s[fieldName] ?? "", state),
            onchange: v => state.value = {...state.value, [fieldName]: v},
        });
    }

    static visibilityToggle(isPrivate: Signal<boolean>, state: Signal<any>) {
        return toggle({
            name: "visibility",
            label: t("PRIVATE"),
            text: t("PRIVATE"),
            checked: isPrivate,
            onchange: v => {
                state.value = {
                    ...state.value,
                    visibility: v ? Visibility.private : Visibility.public,
                };
            },
        });
    }
}