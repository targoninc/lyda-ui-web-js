import {create, FjsObservable, signal} from "https://fjs.targoninc.com/f.js";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Api} from "../Classes/Api.mjs";
import {TrackEditTemplates} from "./TrackEditTemplates.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class FormTemplates {
    static fileField(title, text, name, accept, required = false, onchange = () => {}) {
        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .for(name)
                    .build(),
                GenericTemplates.fileInput(name, name, accept, text, required, onchange)
            )
            .build();
    }

    static visibility(value = "public", parentState = null) {
        const state = TrackEditTemplates.getStateWithParentUpdate("visibility", value, parentState);
        return GenericTemplates.toggle("Private", "visibility", () => {
            state.value = state.value === "public" ? "private" : "public";
        }, [], value === "private");
    }

    /**
     *
     * @param title {string|FjsObservable}
     * @param name {string|FjsObservable}
     * @param options {Array<{value: string, text: string}>|FjsObservable}
     * @param selectedValue {string|FjsObservable}
     * @param required {boolean}
     * @param onchange {function}
     * @returns {*}
     */
    static dropDownField(title, name, options, selectedValue = "", required = false, onchange = () => {}) {
        const optionsState = options.constructor === FjsObservable ? options : signal(options);

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                create("label")
                    .text(title)
                    .build(),
                GenericTemplates.searchableSelect(optionsState, selectedValue, name)
            ).build();
    }

    static checkBoxField(title, name, text, checked = false, required = false, onchange = () => {}) {
        return create("div")
            .classes("flex", "space-outwards")
            .children(GenericTemplates.checkbox(name, checked, text, required, onchange))
            .build();
    }

    static textAreaField(title, name, placeholder, value = "", required = false, rows = 3, onchange = () => {}) {
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
                    .onchange((e) => onchange(e.target.value))
                    .styles("flex-grow", "1")
                    .build(),
            )
            .build();
    }

    static textField(title, name, placeholder, type = "text", value = "", required = false, onchange = () => {
    }, autofocus = false, onkeydown = () => {
    }, classes = []) {
        const input = create("input")
            .name(name)
            .id(name)
            .type(type)
            .placeholder(placeholder)
            .value(value)
            .required(required)
            .onchange((e) => onchange(e.target.value))
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

    static genre(value = "other", parentState = null) {
        const genres = signal([{ name: value, id: value }]);
        Api.getAsync(Api.endpoints.genres.list).then((res) => {
            if (res.code !== 200) {
                Ui.notify("Failed to load genres", "error");
            }
            genres.value = res.data.map((genre) => {
                return {name: genre.genre, id: genre.genre};
            });
        });
        const state = TrackEditTemplates.getStateWithParentUpdate("genre", value, parentState);
        return FormTemplates.dropDownField("Genre", "genre", genres, state, true, v => {
            state.value = v;
        });
    }
}