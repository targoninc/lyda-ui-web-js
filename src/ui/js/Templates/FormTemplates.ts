import {GenericTemplates} from "./GenericTemplates.ts";
import {Api} from "../Api/Api.ts";
import {Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {
    computedSignal,
    create,
    HtmlPropertyValue,
    signal,
    Signal,
    StringOrSignal,
    TypeOrSignal
} from "../../fjsc/f2.js";
import {InputType, SearchableSelectConfig, SelectOption} from "../../fjsc/Types.ts";
import {Genre} from "../Enums/Genre.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

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

    static dropDownField<T>(title: string, options: Signal<SelectOption[]>, selectedValue: Signal<T>) {
        const optionsState = options.constructor === Signal ? options : signal(options);

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .build(),
                FJSC.searchableSelect(<SearchableSelectConfig>{
                    options: optionsState as Signal<SelectOption[]>,
                    value: selectedValue
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
        return FJSC.input<string>({
            type: type as InputType,
            name,
            label: title,
            placeholder,
            value,
            required,
            onchange: onchange as (v: string) => void,
            autofocus,
            onkeydown,
            classes
        });
    }

    static genre(parentState: Signal<any>) {
        const genres = Object.values(Genre).map((genre: string) => {
            return { name: genre, id: genre };
        }) as SelectOption[];
        const value = computedSignal<String>(parentState, (p: any) => p.genre ?? "other");
        return FormTemplates.dropDownField<String>("Genre", signal(genres), value);
    }
}