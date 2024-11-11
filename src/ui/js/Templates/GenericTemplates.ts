import {Icons} from "../Enums/Icons.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Links} from "../Enums/Links.ts";
import {Api} from "../Api/Api.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {
    AnyElement,
    AnyNode,
    computedSignal,
    create,
    HtmlPropertyValue,
    ifjs,
    signal,
    Signal, signalMap,
    StringOrSignal,
    TypeOrSignal
} from "../../fjsc/f2.ts";
import {FJSC} from "../../fjsc";
import {InputType, SearchableSelectConfig} from "../../fjsc/Types.ts";
import {Util} from "../Classes/Util.ts";
import {navigate} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {ProgressState} from "../Enums/ProgressState.ts";
import {ProgressPart} from "../Models/ProgressPart.ts";

export class GenericTemplates {
    static icon(icon: StringOrSignal, adaptive = false, classes: StringOrSignal[] = [], title = "") {
        const urlIndicators = [window.location.origin, "http", "data:", "blob:"];
        // @ts-ignore
        const isMaterial = icon && (icon as string) && icon.includes && !urlIndicators.some(i => icon.includes(i));
        const iconClass = adaptive ? "adaptive-icon" : "inline-icon";
        const svgClass = isMaterial ? "_" : "svg";

        return FJSC.icon({
            icon,
            adaptive,
            title,
            isUrl: !isMaterial,
            classes: [iconClass, svgClass, ...classes],
        });
    }

    static cardLabel(text: HtmlPropertyValue, icon: StringOrSignal = null, hasError: Signal<boolean> = signal(false)) {
        const errorClass = computedSignal<string>(hasError, (h: boolean) => h ? "error" : "_");

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card-label", "flex", "small-gap", errorClass)
                    .children(
                        ifjs(icon, GenericTemplates.icon(icon)),
                        create("span")
                            .text(text)
                            .build(),
                    ).build(),
                ifjs(hasError, GenericTemplates.icon("warning", true, ["error"], "This section has errors"))
            ).build();
    }

    static toggle(text: HtmlPropertyValue, id: HtmlPropertyValue, callback = () => {
    }, extraClasses: string[] = [], checked = false) {
        return create("label")
            .classes("flex", ...extraClasses)
            .for(id)
            .children(
                create("input")
                    .type("checkbox")
                    .classes("hidden", "slider")
                    .id(id)
                    .checked(checked)
                    .onclick(callback)
                    .build(),
                create("div")
                    .classes("toggle-container")
                    .children(
                        create("span")
                            .classes("toggle-slider")
                            .build()
                    ).build(),
                create("span")
                    .classes("toggle-text")
                    .text(text)
                    .build(),
            ).build();
    }

    static button(text: HtmlPropertyValue, callback = () => {
    }, extraClasses: string[] = [], id: HtmlPropertyValue | null = null) {
        return create("button")
            .classes(...extraClasses)
            .id(id)
            .onclick(callback)
            .text(text)
            .build();
    }

    static lock() {
        return create("img")
            .classes("inline-icon", "svg", "nopointer")
            .attributes("src", Icons.LOCK, "title", "Private")
            .build();
    }

    static title(title: HtmlPropertyValue, icons = []) {
        return create("div")
            .classes("flex", "nopointer")
            .children(
                create("span")
                    .classes("clickable", "text-large")
                    .text(title)
                    .build(),
                ...icons,
            ).build();
    }

    static text(text: HtmlPropertyValue, extraClasses: string[] = []) {
        return create("span")
            .classes("text", ...extraClasses)
            .text(text)
            .build();
    }

    static textWithHtml(text: HtmlPropertyValue, extraClasses: string[] = []) {
        return create("span")
            .classes("text", "notification-text", ...extraClasses)
            .html(text)
            .build();
    }

    static dragTargetInList(dragStopCallback: Function, id = "", dropEffect = "move") {
        return create("div")
            .classes("dropzone", "fullWidth", "relative")
            .attributes("reference_id", id)
            .children(
                create("div")
                    .classes("dragIndicator")
                    .build(),
                create("div")
                    .classes("dragTarget", "fullWidth", "hidden")
                    .ondragenter(e => {
                        e.preventDefault();
                        const target = e.target as HTMLElement;
                        const previous = target.previousSibling as HTMLElement;
                        previous.classList.add("dragover");
                    })
                    .ondragleave(e => {
                        e.preventDefault();
                        const target = e.target as HTMLElement;
                        const previous = target.previousSibling as HTMLElement;
                        previous.classList.remove("dragover");
                    })
                    .ondragover((e: DragEvent) => {
                        e.preventDefault();
                        e.dataTransfer!.dropEffect = dropEffect as ("link" | "none" | "move" | "copy");
                    })
                    .ondrop((e: DragEvent) => {
                        e.preventDefault();
                        const target = e.target as HTMLElement;
                        const previous = target.previousSibling as HTMLElement;
                        previous.classList.remove("dragover");
                        const data = e.dataTransfer!.getData("text/plain");
                        dragStopCallback(JSON.parse(data));
                    }).build()
            ).build();
    }

    static action(icon: StringOrSignal, text: HtmlPropertyValue, id: HtmlPropertyValue, onclick: (e: any) => void, attributes: HtmlPropertyValue[] = [], classes: StringOrSignal[] = [], link: StringOrSignal|null = null) {
        return create(link ? "a" : "div")
            .classes("flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded")
            .children(
                GenericTemplates.icon(icon),
                create("span")
                    .classes("nopointer")
                    .text(text)
                    .build()
            ).id(id)
            .attributes(...attributes)
            .classes(...classes)
            .href(link)
            .onclick(onclick)
            .build();
    }

    static newAlbumButton(classes: string[] = []) {
        return GenericTemplates.action(Icons.ALBUM_ADD, "New album", "new_album", (e: any) => {
            e.preventDefault();
            AlbumActions.openNewAlbumModal().then();
        }, [], ["positive", ...classes]);
    }

    static newPlaylistButton(classes: string[] = []) {
        return GenericTemplates.action(Icons.PLAYLIST_ADD, "New playlist", "new_playlist", e => {
            e.preventDefault();
            PlaylistActions.openNewPlaylistModal().then();
        }, [], ["positive", ...classes]);
    }

    static newTrackButton(classes: string[] = []) {
        return GenericTemplates.action(Icons.UPLOAD, "Upload", "upload", async e => {
            e.preventDefault();
            navigate("upload");
        }, [], ["positive", ...classes], Links.LINK("upload"));
    }

    static openPageButton(text: HtmlPropertyValue, page: string) {
        return GenericTemplates.action(Icons.STARS, text, page, async e => {
            e.preventDefault();
            navigate(page);
        }, [], ["positive", "secondary"], Links.LINK(page));
    }

    static actionWithSmallBreakpoint(icon: HtmlPropertyValue, text: HtmlPropertyValue, id: HtmlPropertyValue, onclick: Function, attributes = [], classes: string[] = [], link = null) {
        return create(link ? "a" : "div")
            .classes("flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded")
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .src(icon)
                    .alt(text)
                    .build(),
                create("span")
                    .classes("nopointer", "hideOnSmallBreakpoint")
                    .text(text)
                    .build()
            ).id(id)
            .attributes(...attributes)
            .classes(...classes)
            .href(link)
            .onclick(onclick)
            .build();
    }

    static actionWithMidBreakpoint(icon: HtmlPropertyValue, text: HtmlPropertyValue, id: HtmlPropertyValue, onclick: Function, attributes = [], classes: string[] = [], link = null) {
        return create(link ? "a" : "div")
            .classes("flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded")
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .src(icon)
                    .alt(text)
                    .build(),
                create("span")
                    .classes("nopointer", "hideOnMidBreakpoint")
                    .text(text)
                    .build()
            )
            .id(id)
            .attributes(...attributes)
            .classes(...classes)
            .href(link)
            .onclick(onclick)
            .build();
    }

    static pill(value: any, text: HtmlPropertyValue, onclick = () => {
    }, pillState: Signal<any>, extraClasses: string[] = []) {
        const selectedState = signal(pillState.value === value ? "active" : "_");
        pillState.onUpdate = (newSelected: any) => {
            selectedState.value = newSelected === value ? "active" : "_";
        };

        return create("div")
            .classes("pill", "padded-inline", "clickable", "fakeButton", "rounded-max", selectedState, ...extraClasses)
            .onclick(onclick)
            .text(text)
            .build();
    }

    static pills(options: any[], pillState: Signal<any>, extraClasses: string[] = [], loadingState: Signal<boolean> | null = null) {
        return create("div")
            .classes("flex", "pill-container", ...extraClasses)
            .children(
                ...options.map(p => {
                    return GenericTemplates.pill(p.value, p.text, p.onclick, pillState);
                }),
                ifjs(loadingState, create("img")
                    .src(Icons.SPINNER)
                    .alt("Loading...")
                    .classes("spinner-animation", "icon", "align-center", "nopointer")
                    .build())
            ).build();
    }

    static inlineAction(text: HtmlPropertyValue, icon: StringOrSignal, id: HtmlPropertyValue = null, callback: Function, extraAttributes: HtmlPropertyValue[] = [], extraClasses: HtmlPropertyValue[] = []) {
        return create("div")
            .classes("inline-action", "flex", "clickable", "fakeButton", "padded-inline", "rounded", "align-center")
            .id(id)
            .attributes(...extraAttributes)
            .classes(...extraClasses)
            .onclick(callback)
            .children(
                FJSC.icon({
                    icon: icon,
                    adaptive: true,
                    classes: ["inline-icon", "svg", "nopointer"],
                    isUrl: false,
                }),
                create("span")
                    .classes("nopointer", "text-xsmall")
                    .text(text)
                    .build()
            ).build();
    }

    static centeredDeleteButton(id: HtmlPropertyValue, callback: Function, extraClasses: string[] = []) {
        return create("div")
            .id(id)
            .classes("delete-button", "fakeButton", "centeredInParent", "clickable", "flex", "padded-inline", "rounded", ...extraClasses)
            .onclick(callback)
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .attributes("src", Icons.DELETE, "alt", "Delete")
                    .build()
            ).build();
    }

    static card() {
        return create("div")
            .classes("card")
            .build();
    }

    static notification(type = "success", text = "Success!") {
        return create("div")
            .classes("notification", type)
            .text(text)
            .build();
    }

    static fileInput(id: HtmlPropertyValue, name: HtmlPropertyValue, accept: string, initialText: string, required = false, changeCallback = (v: string, files: FileList | null) => {
    }) {
        // TODO: Use signals
        const text = signal(initialText);
        const button = FJSC.button({
            text: text,
            onclick: () => {
                text.value = "Choosing file...";
                input.click();
            }
        }) as HTMLButtonElement;
        const input = create("input")
            .type("file")
            .styles("display", "none")
            .id(id)
            .name(name)
            .required(required)
            .attributes("accept", accept)
            .onchange(e => {
                let fileName = input.value;
                if (accept && !accept.includes("*")) {
                    const accepts = accept.split(",");
                    const extension = fileName.substring(fileName.lastIndexOf(".") + 1);
                    if (!accepts.includes(extension)) {
                        text.value = "Not supported type.";
                        return;
                    }
                }
                button.value = truncate(fileName);
                button.title = fileName;
                const probableName = fileName.substring(fileName.lastIndexOf("\\") + 1);
                text.value = probableName;
                changeCallback(probableName, input.files);

                const preview = document.getElementById(name + "-preview") as HTMLImageElement;
                if (preview && input.files) {
                    preview.src = URL.createObjectURL(input.files[0]);
                    preview.style.display = "initial";
                }

                function truncate(text: string) {
                    return text.length > 20 ? text.substring(0, 20) + "..." : text;
                }
            }).build() as HTMLInputElement;

        return create("div")
            .children(
                button,
                input
            ).build();
    };

    static checkbox(name: HtmlPropertyValue, checked: TypeOrSignal<boolean> = false, text: HtmlPropertyValue = "", required = false, onchange = (v: boolean) => {
    }) {
        return create("label")
            .classes("checkbox-container")
            .text(text)
            .children(
                create("input")
                    .type("checkbox")
                    .name(name)
                    .id(name)
                    .required(required)
                    .checked(checked)
                    .onchange((e) => onchange((e.target as HTMLInputElement).checked))
                    .build(),
                create("span")
                    .classes("checkmark")
                    .children(
                        create("span")
                            .classes("checkmark-icon")
                            .text("✓")
                            .build()
                    ).build(),
            ).build();
    }

    static modal = (children: AnyNode[], extraClasses: string[] = []) => {
        return create("div")
            .classes("modal-container")
            .children(
                create("div")
                    .classes("modal-overlay")
                    .build(),
                create("div")
                    .classes("modal", "padded-large", ...extraClasses)
                    .children(
                        ...children
                    ).build()
            ).build();
    }

    static confirmationModal(title: HtmlPropertyValue, text: HtmlPropertyValue, icon: StringOrSignal,
                             confirmText: StringOrSignal, cancelText: StringOrSignal, confirmCallback: Function,
                             cancelCallback: Function) {
        return GenericTemplates.modal([
                create("div")
                    .classes("flex")
                    .children(
                        create("h2")
                            .classes("flex")
                            .children(
                                GenericTemplates.icon(icon, true),
                                create("span")
                                    .text(title)
                                    .build()
                            ).build()
                    ).build(),
                create("p")
                    .text(text)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: confirmText ?? "Confirm",
                            onclick: confirmCallback,
                            classes: ["positive"],
                            icon: {icon: "check"}
                        }),
                        FJSC.button({
                            text: cancelText ?? "Cancel",
                            onclick: cancelCallback,
                            classes: ["negative"],
                            icon: {icon: "close"}
                        }),
                    ).build()
            ], ["confirmationModal"]
        );
    }

    static imageModal(imageUrl: StringOrSignal) {
        return create("div")
            .classes("modal-container")
            .children(
                create("div")
                    .classes("modal-overlay")
                    .build(),
                create("div")
                    .classes("modal", "padded-large", "rounded")
                    .children(
                        create("img")
                            .classes("full")
                            .attributes("src", imageUrl)
                            .build()
                    ).build()
            ).build();
    }

    static textInputModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: StringOrSignal,
                          newValue: Signal<string>, icon: HtmlPropertyValue, confirmText: StringOrSignal, cancelText: StringOrSignal,
                          confirmCallback: Function, cancelCallback: Function) {
        return GenericTemplates.modal([
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                create("img")
                                    .classes("icon", "svg")
                                    .styles("width", "30px", "height", "auto")
                                    .attributes("src", icon)
                                    .build(),
                                create("h2")
                                    .text(title)
                                    .build()
                            ).build(),
                        create("p")
                            .text(text)
                            .build(),
                        FJSC.input<string>({
                            type: InputType.text,
                            name: "textInputModalInput",
                            label: "",
                            placeholder: "",
                            value: newValue,
                            onchange: (v) => {
                                newValue.value = v;
                            }
                        }),
                        create("div")
                            .classes("flex")
                            .children(
                                FJSC.button({
                                    text: confirmText ?? "Confirm",
                                    onclick: confirmCallback,
                                    classes: ["positive"],
                                    icon: {icon: "check"}
                                }),
                                FJSC.button({
                                    text: cancelText ?? "Cancel",
                                    onclick: cancelCallback,
                                    classes: ["negative"],
                                    icon: {icon: "close"}
                                }),
                            ).build()
                    ).build(),
            ], ["confirmationModal"]
        );
    }

    static textAreaInputModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: HtmlPropertyValue,
                              newValue: Signal<string>, icon: HtmlPropertyValue, confirmText: StringOrSignal, cancelText: StringOrSignal,
                              confirmCallback: Function, cancelCallback: Function) {
        return GenericTemplates.modal([
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                create("img")
                                    .classes("icon", "svg")
                                    .styles("width", "30px", "height", "auto")
                                    .attributes("src", icon)
                                    .build(),
                                create("h2")
                                    .text(title)
                                    .build()
                            ).build(),
                        create("p")
                            .text(text)
                            .build(),
                        FJSC.textarea({
                            name: "textInputModalInput",
                            label: "",
                            placeholder: "",
                            value: newValue,
                            onchange: (v) => {
                                newValue.value = v;
                            }
                        }),
                        create("textarea")
                            .classes("full", "fullWidth")
                            .id("textAreaInputModalInput")
                            .value(currentValue ?? "")
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(
                                FJSC.button({
                                    text: confirmText ?? "Confirm",
                                    onclick: confirmCallback,
                                    classes: ["positive"],
                                    icon: {icon: "check"}
                                }),
                                FJSC.button({
                                    text: cancelText ?? "Cancel",
                                    onclick: cancelCallback,
                                    classes: ["negative"],
                                    icon: {icon: "close"}
                                }),
                            ).build()
                    ).build(),
            ], ["confirmationModal"]
        );
    }

    static tabSelector(tabs: any[], callback: Function, selectedTab = 0) {
        const selectedState = signal(selectedTab);
        selectedState.onUpdate = (newSelected: number) => {
            callback(newSelected);
        };
        callback(selectedTab);

        return create("div")
            .classes("tab-selector", "flex", "rounded", "limitToContentWidth")
            .children(
                ...tabs.map((t, i) => {
                    const innerSelectedState = signal(i === selectedTab ? "selected" : "_");
                    selectedState.onUpdate = (newSelected: number) => {
                        innerSelectedState.value = i === newSelected ? "selected" : "_";
                    };
                    return create("button")
                        .classes("tab", innerSelectedState)
                        .onclick(() => {
                            selectedState.value = i;
                        })
                        .text(t)
                        .build();
                })
            )
            .build();
    }

    static containerWithSpinner(className: string) {
        return create("div")
            .classes(className)
            .children(
                GenericTemplates.loadingSpinner()
            ).build();
    }

    static loadingSpinner() {
        return create("div")
            .classes("spinner")
            .children()
            .build();
    }

    static modalCancelButton(modal: AnyElement|null = null) {
        return FJSC.button({
            text: "Cancel",
            onclick: () => Util.removeModal(modal),
            classes: ["negative"],
            icon: { icon: "close" }
        });
    }

    static addUserLinkSearchResult(entry: { id: number, display: string, image: string }, selectedState: Signal<number>) {
        const selectedClassState = signal(selectedState.value === entry.id ? "active" : "_");
        selectedState.onUpdate = (newSelected: number) => {
            selectedClassState.value = newSelected === entry.id ? "active" : "_";
        };
        return create("div")
            .classes("flex", "clickable", "fakeButton", "padded", "rounded", selectedClassState)
            .onclick(() => {
                selectedState.value = entry.id;
            })
            .children(
                create("img")
                    .classes("user-icon", "nopointer")
                    .attributes("src", entry.image)
                    .build(),
                create("span")
                    .classes("nopointer")
                    .text(entry.display)
                    .build()
            ).build();
    }

    static addLinkedUserModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: HtmlPropertyValue,
                              icon: StringOrSignal, confirmText: StringOrSignal, cancelText: StringOrSignal,
                              confirmCallback: Function, cancelCallback: Function) {
        const selectedState = signal(0);
        const userMap = new Map();
        const collabTypeOptions = signal(create("span").text("Loading collab types...").build());
        const collabType = signal("1");
        TrackActions.getCollabTypes().then(types => {
            collabTypeOptions.value = FJSC.searchableSelect(<SearchableSelectConfig>{
                options: signal(types),
                value: collabType,
                onchange: (v) => {
                    collabType.value = v;
                }
            });
        });

        return GenericTemplates.modal([
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                create("h2")
                                    .classes("flex")
                                    .children(
                                        GenericTemplates.icon(icon, true),
                                        create("span")
                                            .text(title)
                                            .build(),
                                    ).build()
                            ).build(),
                        create("p")
                            .text(text)
                            .build(),
                        FJSC.input({
                            id: "addUserSearch",
                            name: "addUserSearch",
                            type: InputType.text,
                            value: currentValue ?? "",
                            onkeydown: async (e) => {
                                const target = e.target as HTMLInputElement;
                                const search = target.value;
                                const res = await Api.getAsync(ApiRoutes.searchUsers, {
                                    search,
                                    filters: JSON.stringify(["users"])
                                });
                                if (res.code === 200) {
                                    const results = document.getElementById("user-search-results");
                                    if (results) {
                                        results.innerHTML = "";
                                        for (const user of res.data) {
                                            userMap.set(user.id, user);
                                            results.appendChild(GenericTemplates.addUserLinkSearchResult(user, selectedState));
                                        }
                                    }
                                }
                            },
                        }),
                        create("div")
                            .classes("flex-v")
                            .styles("max-height", "200px", "overflow", "auto", "flex-wrap", "nowrap")
                            .id("user-search-results")
                            .build(),
                        collabTypeOptions,
                        create("div")
                            .classes("flex")
                            .children(
                                FJSC.button({
                                    text: confirmText ?? "Confirm",
                                    onclick: async () => {
                                        const user = userMap.get(selectedState.value); // TODO: Typing lol
                                        user.collab_type = parseInt(collabType.value);
                                        confirmCallback(selectedState.value, user, collabType);
                                    },
                                    icon: {
                                        icon: "person_add"
                                    },
                                    classes: ["positive"],
                                }),
                                FJSC.button({
                                    text: cancelText ?? "Cancel",
                                    onclick: cancelCallback,
                                    classes: ["negative"],
                                    icon: {icon: "close"}
                                }),
                            ).build()
                    ).build(),
            ], ["confirmationModal"]
        );
    }

    static breadcrumbs(pageMap: any, history: Signal<any>, stepState: Signal<any>) {
        return history.value.map((step: any) => {
            if (!pageMap[step]) {
                return null;
            }

            const isLast = step === history.value[history.value.length - 1];

            return create("div")
                .classes("flex")
                .children(
                    create("span")
                        .classes("inlineLink")
                        .text(pageMap[step])
                        .onclick(() => {
                            if (stepState.value === step) {
                                return;
                            }

                            const index = history.value.indexOf(step);
                            history.value = history.value.slice(0, index);
                            stepState.value = step;
                        }).build(),
                    ifjs(isLast, create("span").text(">").build(), true)
                ).build();
        });
    }

    static checkInCorner(title = "") {
        return create("img")
            .classes("corner-check")
            .title(title)
            .src(Icons.CHECK)
            .build();
    }

    static giftIcon(title = "") {
        return create("img")
            .classes("gift-icon", "inline-icon", "svg", "nopointer")
            .title(title)
            .src(Icons.GIFT)
            .build();
    }

    static inlineLink(link: Function|StringOrSignal, text: HtmlPropertyValue, newTab = true) {
        if (link.constructor === Function) {
            return create("a")
                .classes("inlineLink")
                .onclick(link as Function)
                .text(text)
                .build();
        }

        return create("a")
            .classes("inlineLink")
            .href(link as StringOrSignal)
            .target(newTab ? "_blank" : "_self")
            .text(text)
            .build()
    }

    static progressSections(progressState: Signal<ProgressPart[]>) {
        return create("div")
            .classes("progress-sections")
            .children(
                signalMap(progressState, create("div").classes("flex", "small-gap"), part => GenericTemplates.progressSectionPart(part))
            ).build();
    }

    static progressSectionPart(part: ProgressPart) {
        return create("div")
            .classes("flex-v", "progress-section-part-container")
            .title(part.title ?? "")
            .children(
                create("div")
                    .classes("progress-section-part", "small-gap", "flex", part.state)
                    .children(
                        GenericTemplates.icon(part.icon, true, [part.state]),
                        create("span")
                            .classes("progress-section-part-text")
                            .text(part.text)
                            .build(),
                    ).build(),
                ifjs(part.retryFunction && part.state === ProgressState.error, create("div")
                    .classes("progress-section-retry", "flex", "small-gap")
                    .children(
                        GenericTemplates.icon("refresh", true, [part.state]),
                        create("span")
                            .classes("progress-section-part-text")
                            .text("Retry")
                            .onclick(() => part.retryFunction ? part.retryFunction() : () => {})
                            .build()
                    ).build())
            ).build();
    }
}
