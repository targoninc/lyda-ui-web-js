import {GenericTemplates} from "./GenericTemplates.ts";
import {Api} from "../Classes/Api";
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
import {SearchableSelectConfig, SelectOption} from "../../fjsc/Types.ts";

export class FormTemplates {
    static fileField(title: string, text: string, name: string, accept: string, required = false, onchange = (v: string) => {}) {
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

    static textAreaField(title: HtmlPropertyValue, name: HtmlPropertyValue, placeholder: HtmlPropertyValue, value: StringOrSignal = "", required = false, rows = 3, onchange = (v: string) => {}) {
        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .build(),
                create("textarea")
                    .name(name)
                    .id(name)
                    .attributes("rows", rows.toString())
                    .placeholder(placeholder)
                    .value(value)
                    .required(required)
                    .onchange((e) => onchange(e.target!.value))
                    .styles("flex-grow", "1")
                    .build(),
            ).build();
    }

    static textField(title: string, name: string, placeholder: string, type = "text", value: StringOrSignal = "", required = false, onchange = (val: string) => {
    }, autofocus = false, onkeydown = () => {
    }, classes = []) {
        const input = create("input")
            .name(name)
            .id(name)
            .type(type)
            .placeholder(placeholder)
            .value(value)
            .required(required)
            .onchange((e: any) => onchange(e.target.value))
            .onkeydown(onkeydown);

        if (autofocus) {
            input.attributes("autofocus", "true");
        }

        return create("div")
            .classes("flex-v", "small-gap", ...classes)
            .children(
                create("label")
                    .text(title)
                    .build(),
                input.build(),
            ).build();
    }

    static genre(parentState: Signal<any>) {
        const genres = signal<SelectOption[]>([]);
        Api.getAsync(Api.endpoints.genres.list).then((res) => {
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