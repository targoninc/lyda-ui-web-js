import {input, searchableSelect, SelectOption } from "@targoninc/jess-components";
import {GenericTemplates} from "./GenericTemplates.ts";
import {InputType, create, HtmlPropertyValue, StringOrSignal, TypeOrSignal, signal, Signal} from "@targoninc/jess";

export class FormTemplates {
    static fileField(title: string, text: string, name: string, accept: string, required = false, onchange = (v: string, files: FileList | null) => {}) {
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

    static dropDownField(title: string, options: TypeOrSignal<SelectOption[]>, selectedValue: Signal<string>) {
        const optionsState = options.constructor === Signal ? (options as Signal<SelectOption[]>) : signal(options as SelectOption[]);

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .build(),
                searchableSelect({
                    options: optionsState as Signal<SelectOption[]>,
                    value: selectedValue,
                    onchange: (v) => {
                        selectedValue.value = v;
                    }
                })
            ).build();
    }

    static checkBoxField(name: HtmlPropertyValue, text: HtmlPropertyValue, checked: TypeOrSignal<boolean> = false, required = false, onchange = (v: boolean) => {}) {
        return create("div")
            .classes("flex", "space-outwards")
            .children(GenericTemplates.checkbox(name, checked, text, required, onchange))
            .build();
    }

    static textField(title: string, name: string, placeholder: string, type = "text", value: StringOrSignal = "", required = false, onchange: Function = (val: string) => {
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
}