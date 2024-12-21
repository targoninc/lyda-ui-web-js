import {Icons} from "../Enums/Icons.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Links} from "../Enums/Links.ts";
import {Api} from "../Api/Api.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {
    AnyElement,
    AnyNode,
    create,
    HtmlPropertyValue,
    ifjs,
    signalMap,
    StringOrSignal,
    TypeOrSignal
} from "../../fjsc/src/f2.ts";
import {FJSC} from "../../fjsc";
import {InputType, SearchableSelectConfig} from "../../fjsc/src/Types.ts";
import {Util} from "../Classes/Util.ts";
import {navigate} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {ProgressState} from "../Enums/ProgressState.ts";
import {ProgressPart} from "../Models/ProgressPart.ts";
import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
import {SearchResult} from "../Models/SearchResult.ts";
import {openMenus} from "../state.ts";
import {PillOption} from "../Models/PillOption.ts";

export class GenericTemplates {
    static icon(icon: StringOrSignal, adaptive = false, classes: StringOrSignal[] = [], title = "", onclick: Function | undefined = undefined) {
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
            onclick,
            classes: [iconClass, svgClass, ...classes],
        });
    }

    static gif8831(url: StringOrSignal, link: StringOrSignal|null = null) {
        let item;
        if (link) {
            item = create("a")
                .href(link)
                .target("_blank")
                .children(
                    create("img")
                        .styles("width", "88", "height", "31")
                        .width(88)
                        .height(31)
                        .src(url)
                        .alt("88x31")
                        .build()
                ).build();
        } else {
            item = create("img")
                .styles("width", "88", "height", "31")
                .width(88)
                .height(31)
                .src(url)
                .alt("88x31")
                .build();
        }

        return create("div")
            .classes("gif8831")
            .children(item)
            .build();
    }

    static cardLabel(text: HtmlPropertyValue, icon: StringOrSignal|null = null, hasError: Signal<boolean> = signal(false)) {
        const errorClass = compute((h): string => h ? "error" : "_", hasError);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card-label", "flex", "small-gap", errorClass)
                    .children(
                        ifjs(icon, GenericTemplates.icon(icon ?? "")),
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
                    .type(InputType.checkbox)
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

    static button(text: HtmlPropertyValue, callback: Function = () => {
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

    static action(icon: StringOrSignal, text: HtmlPropertyValue, id: HtmlPropertyValue, onclick: Function, attributes: HtmlPropertyValue[] = [], classes: StringOrSignal[] = [], link: StringOrSignal|null = null) {
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
        return FJSC.button({
            text: "New album",
            icon: { icon: "forms_add_on" },
            classes: ["positive", ...classes],
            onclick: async () => {
                await AlbumActions.openNewAlbumModal();
            }
        });
    }

    static newPlaylistButton(classes: string[] = []) {
        return FJSC.button({
            text: "New playlist",
            icon: { icon: "playlist_add" },
            classes: ["positive", ...classes],
            onclick: async () => {
                await PlaylistActions.openNewPlaylistModal();
            }
        });
    }

    static newTrackButton(classes: string[] = []) {
        return FJSC.button({
            text: "Upload",
            icon: { icon: "upload" },
            classes: ["positive", ...classes],
            onclick: async () => {
                navigate("upload");
            }
        });
    }

    static openPageButton(text: HtmlPropertyValue, page: string) {
        return GenericTemplates.action(Icons.STARS, text, page, async (e: MouseEvent) => {
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

    static actionWithMidBreakpoint(icon: HtmlPropertyValue, text: HtmlPropertyValue, id: HtmlPropertyValue, onclick: Function, attributes = [], classes: string[] = [], link: HtmlPropertyValue = null) {
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

    static pill(p: PillOption, pillState: Signal<any>, extraClasses: string[] = []) {
        const selectedState = signal(pillState.value === p.value ? "active" : "_");
        pillState.onUpdate = (newSelected: any) => {
            selectedState.value = newSelected === p.value ? "active" : "_";
        };

        return FJSC.button({
            text: p.text,
            icon: p.icon ? {
                icon: p.icon,
                adaptive: true,
                isUrl: false,
            } : undefined,
            classes: ["rounded-max", selectedState, ...extraClasses],
            onclick: p.onclick,
        });
    }

    static pills(options: PillOption[], pillState: Signal<any>, extraClasses: string[] = [], loadingState: Signal<boolean> | null = null) {
        return create("div")
            .classes("flex", "pill-container", ...extraClasses)
            .children(
                ...options.map(p => {
                    return GenericTemplates.pill(p, pillState);
                }),
                ifjs(loadingState, create("img")
                    .src(Icons.SPINNER)
                    .alt("Loading...")
                    .classes("spinner-animation", "icon", "align-center", "nopointer")
                    .build())
            ).build();
    }

    static inlineAction(text: HtmlPropertyValue, icon: StringOrSignal, id: HtmlPropertyValue = null, callback: Function, extraAttributes: HtmlPropertyValue[] = [], extraClasses: StringOrSignal[] = []) {
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

    static deleteIconButton(id: HtmlPropertyValue, callback: Function, extraClasses: string[] = []) {
        return FJSC.button({
            id,
            classes: ["negative", ...extraClasses],
            onclick: callback,
            icon: { icon: "delete" },
            title: "Delete",
            text: ""
        });
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
            .type(InputType.file)
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
                    .type(InputType.checkbox)
                    .name(name)
                    .id(name)
                    .required(required)
                    .checked(checked as HtmlPropertyValue)
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

    static modal(children: AnyNode[], modalId: string) {
        if (openMenus.value.includes(modalId)) {
            return null;
        }
        openMenus.value.push(modalId);
        const interval = setInterval(() => {
            if (!document.getElementById("modal-" + modalId)) {
                clearInterval(interval);
                openMenus.value = openMenus.value.filter(id => id !== modalId);
            }
        }, 500);

        return create("div")
            .classes("modal-container")
            .id("modal-" + modalId)
            .children(
                create("div")
                    .classes("modal-overlay")
                    .build(),
                create("div")
                    .classes("modal", "flex-v", "padded-large")
                    .children(...children)
                    .build()
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
            ], "confirmation");
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
            ], "text-input");
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
            ], "text-area-input");
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

    static addLinkedUserModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: string,
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
                                const res = await Api.getAsync<SearchResult[]>(ApiRoutes.searchUsers, {
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
            ], "add-linked-user");
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
        const parts = signal(progressState.value.map(part => part.id));
        progressState.subscribe(p => {
            const newList = p.map(part => part.id);
            if (newList.length !== parts.value.length) {
                parts.value = newList;
            }
        });

        return create("div")
            .classes("progress-sections")
            .children(
                signalMap(parts, create("div").classes("flex", "small-gap"), (id: string) => GenericTemplates.progressSectionPart(progressState.value.find(p => p.id === id)!))
            ).build();
    }

    static progressSectionPart(part: ProgressPart) {
        const retryable = compute((state): boolean => {
            return state && state === ProgressState.error && (part.retryFunction !== undefined);
        }, part.state);

        return create("div")
            .classes("flex-v", "progress-section-part-container", "relative")
            .title(part.title ?? "")
            .children(
                ifjs(part.progress, create("div").classes("progress-section-part-progress").css({
                        width: compute(p => p + "%", part.progress ?? signal(0))
                    }).build()),
                create("div")
                    .classes("progress-section-part", "small-gap", "flex", part.state as Signal<string>)
                    .children(
                        GenericTemplates.icon(part.icon, true, [part.state as Signal<string>]),
                        create("span")
                            .classes("progress-section-part-text")
                            .text(part.text)
                            .build(),
                    ).build(),
                ifjs(retryable, create("div")
                    .classes("progress-section-retry", "flex", "small-gap")
                    .children(
                        GenericTemplates.icon("refresh", true, [part.state as Signal<string>]),
                        create("span")
                            .classes("progress-section-part-text")
                            .text("Retry")
                            .onclick(() => part.retryFunction ? part.retryFunction() : () => {})
                            .build()
                    ).build())
            ).build();
    }
}
