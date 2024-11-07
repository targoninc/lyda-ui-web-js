import {GenericTemplates} from "./GenericTemplates.ts";
import {Api, ApiRoutes} from "../Classes/Api";
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

    static checkBoxField(name: HtmlPropertyValue, text: HtmlPropertyValue, checked: TypeOrSignal<boolean> = false, required = false, onchange = (v) => {}) {
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
        const genres = signal<SelectOption[]>([]);
        Api.getAsync(ApiRoutes.listGenres).then((res) => {
            if (res.code !== 200) {
                Ui.notify("Failed to load genres", "error");
            }
            genres.value = res.data.map((genre: any) => {
                return {name: genre.genre, id: genre.genre};
            }) as SelectOption[];
        });
        const value = computedSignal<String>(parentState, (p: any) => p.genre ?? "other");
        return FormTemplates.dropDownField<String>("Genre", genres, value);
    }
}