import { Icons } from "../../Enums/Icons.ts";
import { AlbumActions } from "../../Actions/AlbumActions.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import {
    AnyElement,
    AnyNode,
    asSignal,
    compute,
    create,
    HtmlPropertyValue,
    InputType,
    signal,
    Signal,
    signalMap,
    SignalMapCallback,
    StringOrSignal,
    TypeOrSignal,
    when,
} from "@targoninc/jess";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { navigate } from "../../Routing/Router.ts";
import { currentTrackId, loadingAudio, playingHere } from "../../state.ts";
import { PillOption } from "../../Models/PillOption.ts";
import { dayFromValue } from "../../Classes/Helpers/Date.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { AuthActions } from "../../Actions/AuthActions.ts";
import { Images } from "../../Enums/Images.ts";
import { button, icon, IconConfig, input, textarea } from "@targoninc/jess-components";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { SearchResult } from "@targoninc/lyda-shared/src/Models/SearchResult";
import { Filter } from "@targoninc/lyda-shared/src/Models/Filter";
import { ProgressState } from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { ProgressPart } from "../../Models/ProgressPart.ts";
import { t } from "../../../locales";

export class GenericTemplates {
    static icon(
        icon$: StringOrSignal,
        adaptive = false,
        classes: StringOrSignal[] = [],
        title: StringOrSignal = "",
        onclick: Function | undefined = undefined,
    ) {
        const urlIndicators = [window.location.origin, "http", "data:", "blob:"];
        const iconClass = adaptive ? "adaptive-icon" : "inline-icon";
        icon$ = asSignal(icon$) as Signal<string>;
        const isMaterial = compute(
            icon => icon && (icon as string) && icon.includes && !urlIndicators.some(i => icon.includes(i)),
            icon$,
        );
        const svgClass = compute((m): string => (m ? "_" : "svg"), isMaterial);
        const actual = compute((i, m) => (!i && m ? "" : i), icon$, isMaterial);

        return icon({
            icon: actual,
            adaptive,
            title,
            isUrl: compute(m => !m, isMaterial),
            onclick,
            classes: [iconClass, svgClass, ...classes],
        });
    }

    static gif8831(url: StringOrSignal, link: StringOrSignal | null = null) {
        let item;
        if (link) {
            item = create("a").href(link).target("_blank").children(
                create("img").styles("width", "88", "height", "31").width(88).height(31).src(url).alt("88x31").build(),
            ).build();
        } else {
            item = create("img").styles("width", "88", "height", "31").width(88).height(31).src(url).alt("88x31").build();
        }

        return create("div").classes("gif8831").children(item).build();
    }

    static cardLabel(
        text: HtmlPropertyValue,
        icon$: StringOrSignal | null = null,
        hasError: Signal<boolean> = signal(false),
    ) {
        const errorClass = compute((h): string => (h ? "error" : "_"), hasError);

        return create("div").classes("flex", "align-children", "small-gap").children(
            create("div").classes("card-label", "align-children", "flex", "small-gap", errorClass).children(
                when(
                    icon$,
                    horizontal(
                        icon({
                            icon: icon$ as StringOrSignal,
                        }),
                    ).build(),
                ),
                create("span").text(text).build(),
            ).build(),
            when(
                hasError,
                horizontal(
                    icon({
                        icon: "warning",
                        classes: ["error", "has-title"],
                        title: t("SECTION_HAS_ERRORS"),
                    }),
                ).build(),
            ),
        ).build();
    }

    static toggle(
        text: HtmlPropertyValue,
        id: HtmlPropertyValue,
        callback = () => {
        },
        extraClasses: string[] = [],
        checked = false,
    ) {
        return create("label").classes("flex", ...extraClasses).for(id).children(
            create("input").type(InputType.checkbox).classes("hidden", "slider").id(id).checked(checked).onclick(callback).build(),
            create("div").classes("toggle-container").children(create("span").classes("toggle-slider").build()).build(),
            create("span").classes("toggle-text").text(text).build(),
        ).build();
    }

    static logoutButton(classes: string[] = []) {
        return button({
            text: t("LOG_OUT"),
            classes: ["negative", ...classes],
            icon: { icon: "logout" },
            onclick: async () => {
                await AuthActions.logOut();
            },
        });
    }

    static lock() {
        return create("img")
            .classes("inline-icon", "svg", "nopointer")
            .attributes("src", Icons.LOCK, "title", t("PRIVATE"))
            .build();
    }

    static title(title: HtmlPropertyValue, icons = []) {
        return create("div").classes("flex", "nopointer").children(create("span").classes("clickable", "text-large").text(title).build(), ...icons).build();
    }

    static missingPermission() {
        return create("div")
            .classes("flex-v")
            .children(
                create("span")
                    .classes("warning")
                    .text(t("NOTHING_FOR_YOU_HERE"))
                    .build(),
                button({
                    text: t("GO_EXPLORE_SOMEWHERE_ELSE"),
                    onclick: () => navigate(RoutePath.explore),
                    icon: { icon: "explore" },
                }),
            ).build();
    }

    static text(text: HtmlPropertyValue, extraClasses: string[] = []) {
        return create("span").classes("text", ...extraClasses).text(text).build();
    }

    static textWithHtml(text: HtmlPropertyValue, extraClasses: string[] = []) {
        return create("span").classes("text", "notification-text", ...extraClasses).html(text).build();
    }

    static dragTargetInList(dragStopCallback: Function, id = "", dropEffect = "move") {
        return create("div").classes("dropzone").attributes("reference_id", id).children(
            create("div").classes("dragIndicator").build(),
            create("div").classes("dragTarget", "fullWidth", "hidden").ondragenter(e => {
                e.preventDefault();
                const target = e.target as HTMLElement;
                const previous = target.previousSibling as HTMLElement;
                previous.classList.add("dragover");
            }).ondragleave(e => {
                e.preventDefault();
                const target = e.target as HTMLElement;
                const previous = target.previousSibling as HTMLElement;
                previous.classList.remove("dragover");
            }).ondragover((e: DragEvent) => {
                e.preventDefault();
                e.dataTransfer!.dropEffect = dropEffect as "link" | "none" | "move" | "copy";
            }).ondrop((e: DragEvent) => {
                e.preventDefault();
                const target = e.target as HTMLElement;
                const previous = target.previousSibling as HTMLElement;
                previous.classList.remove("dragover");
                const data = e.dataTransfer!.getData("text/plain");
                dragStopCallback(JSON.parse(data));
            }).build(),
        );
    }

    static newAlbumButton(classes: string[] = []) {
        return button({
            text: t("NEW_ALBUM"),
            icon: { icon: "forms_add_on" },
            classes,
            onclick: async () => {
                await AlbumActions.openNewAlbumModal();
            },
        });
    }

    static newPlaylistButton(classes: string[] = []) {
        return button({
            text: t("NEW_PLAYLIST"),
            icon: { icon: "playlist_add" },
            classes,
            onclick: async () => {
                await PlaylistActions.openNewPlaylistModal();
            },
        });
    }

    static newTrackButton(classes: string[] = []) {
        return button({
            text: t("UPLOAD"),
            icon: { icon: "upload" },
            classes,
            onclick: () => navigate(RoutePath.upload),
        });
    }

    static pill(p: PillOption, pillState: Signal<any> = signal(null), extraClasses: string[] = []) {
        const selectedState = compute((s): string => (s === p.value ? "active" : "_"), pillState);

        return button({
            text: p.text,
            icon: p.icon
                ? {
                    icon: p.icon,
                    adaptive: true,
                    isUrl: false,
                }
                : undefined,
            classes: ["rounded-max", selectedState, ...extraClasses],
            onclick: p.onclick,
        });
    }

    static verifiedWithDate(date: Date) {
        return create("div")
            .classes("flex", "noflexwrap", "small-gap", "align-children")
            .children(
                icon({
                    icon: "new_releases",
                    adaptive: true,
                    classes: ["text-positive"],
                }),
                create("span")
                    .classes("text-positive")
                    .text(t("VERIFIED_ON", Util.formatDate(date)))
                    .build(),
            ).build();
    }

    static pills(
        options: PillOption[],
        pillState: Signal<any>,
        extraClasses: string[] = [],
        loadingState: Signal<boolean> | null = null,
    ) {
        return create("div")
            .classes("flex", "pill-container", ...extraClasses)
            .children(
                ...options.map(p => {
                    return GenericTemplates.pill(p, pillState);
                }),
                when(
                    loadingState,
                    create("img")
                        .src(Icons.SPINNER)
                        .alt(t("LOADING"))
                        .classes("spinner-animation", "icon", "align-center", "nopointer")
                        .build(),
                ),
            ).build();
    }

    static deleteIconButton(id: HtmlPropertyValue, callback: Function, extraClasses: string[] = []) {
        return button({
            id,
            classes: ["negative", ...extraClasses],
            onclick: e => {
                e.stopPropagation();
                callback();
            },
            icon: { icon: "delete" },
            title: t("DELETE"),
            text: "",
        });
    }

    static uploadIconButton(id: HtmlPropertyValue, callback: Function, extraClasses: string[] = []) {
        return button({
            id,
            classes: ["positive", ...extraClasses],
            onclick: e => {
                e.stopPropagation();
                callback();
            },
            icon: { icon: "upload" },
            title: t("UPLOAD"),
            text: "",
        });
    }

    static card() {
        return create("div").classes("card").build();
    }

    static notification(type: NotificationType = NotificationType.success, text: HtmlPropertyValue = t("SUCCESS")) {
        return create("div").classes("notification", "out-of-frame", type).text(text).build();
    }

    static fileInput(
        id: HtmlPropertyValue,
        name: HtmlPropertyValue,
        accept: string,
        initialText: string,
        required = false,
        changeCallback = (_: string, _2: FileList | null) => {
        },
    ) {
        const text = signal(initialText);
        const fileButton = button({
            text: text,
            onclick: () => {
                text.value = `${t("CHOOSING_FILE")}`;
                input.click();
            },
        }) as HTMLButtonElement;
        const input = create("input").type(InputType.file).styles("display", "none").id(id).name(name).required(required).attributes("accept", accept).onchange(_ => {
            const fileName = input.value;
            if (accept && !accept.includes("*")) {
                const accepts = accept.split(",");
                const extension = fileName.substring(fileName.lastIndexOf(".") + 1);
                if (!accepts.includes(extension)) {
                    text.value = `${t("NOT_SUPPORTED_TYPE")}`;
                    return;
                }
            }
            fileButton.value = truncate(fileName);
            fileButton.title = fileName;
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

        return create("div").children(fileButton, input).build();
    }

    static checkbox(
        name: HtmlPropertyValue,
        checked: TypeOrSignal<boolean> = false,
        text: HtmlPropertyValue = "",
        required = false,
        onchange = (_: boolean) => {
        },
    ) {
        return create("label").classes("checkbox-container").text(text).children(
            create("input").type(InputType.checkbox).name(name).id(name).required(required).checked(checked as HtmlPropertyValue).onchange(e => onchange((e.target as HTMLInputElement).checked)).build(),
            create("span").classes("checkmark").children(create("span").classes("checkmark-icon").text("✓").build()).build(),
        ).build();
    }

    static modal(children: AnyNode[], modalId: string) {
        return create("div").classes("modal-container").id("modal-" + modalId).children(
            create("div").classes("modal-overlay").build(),
            create("div").classes("modal", "flex-v", "padded-large").children(...children).build(),
        ).build();
    }

    static confirmationModal(
        title: HtmlPropertyValue,
        text: HtmlPropertyValue,
        icon: StringOrSignal,
        confirmText: StringOrSignal,
        cancelText: StringOrSignal,
        confirmCallback: Function,
        cancelCallback: Function,
    ) {
        return vertical(
            create("div").classes("flex").children(
                create("h2").classes("flex").children(GenericTemplates.icon(icon, true), create("span").text(title).build()).build(),
            ).build(),
            create("p").text(text).build(),
            create("div").classes("flex").children(
                button({
                    text: confirmText ?? t("CONFIRM"),
                    onclick: confirmCallback,
                    classes: ["positive"],
                    icon: { icon: "check" },
                }),
                button({
                    text: cancelText ?? t("CANCEL"),
                    onclick: cancelCallback,
                    classes: ["negative"],
                    icon: { icon: "close" },
                }),
            ).build(),
        );
    }

    static modalImage(imageUrl: StringOrSignal) {
        return create("img")
            .classes("full")
            .attributes("src", imageUrl)
            .build();
    }

    static graphic(imageUrl: string) {
        return create("img")
            .classes("graphic", "svg")
            .attributes("src", `/img/graphics/${imageUrl}`)
            .build();
    }

    static noTracks() {
        return horizontal(
            GenericTemplates.graphic("nothing_found.svg"),
            create("span")
                .text(t("NOTHING_FOUND"))
                .build(),
        ).classes("align-children")
         .build();
    }

    static textInputModal(
        title: HtmlPropertyValue,
        text: HtmlPropertyValue,
        newValue: Signal<string>,
        icon: HtmlPropertyValue,
        confirmText: StringOrSignal,
        cancelText: StringOrSignal,
        confirmCallback: Function,
        cancelCallback: Function,
    ) {
        return create("div").classes("flex-v").children(
            create("h2").classes("flex").children(
                icon ? GenericTemplates.icon(icon as StringOrSignal, true) : null,
                create("span").text(title).build(),
            ).build(),
            create("p").text(text).build(),
            input<string>({
                type: InputType.text,
                name: "textInputModalInput",
                label: "",
                placeholder: "",
                value: newValue,
                onchange: v => {
                    newValue.value = v;
                },
            }),
            create("div").classes("flex").children(
                button({
                    text: confirmText ?? t("CONFIRM"),
                    onclick: confirmCallback,
                    classes: ["positive"],
                    icon: { icon: "check" },
                }),
                button({
                    text: cancelText ?? t("CANCEL"),
                    onclick: cancelCallback,
                    classes: ["negative"],
                    icon: { icon: "close" },
                }),
            ).build(),
        ).build();
    }

    static textAreaInputModal(
        title: HtmlPropertyValue,
        text: HtmlPropertyValue,
        currentValue: HtmlPropertyValue,
        newValue: Signal<string>,
        icon: HtmlPropertyValue,
        confirmText: StringOrSignal,
        cancelText: StringOrSignal,
        confirmCallback: Function,
        cancelCallback: Function,
    ) {
        return create("div").classes("flex-v").children(
            create("div").classes("flex").children(
                create("img").classes("icon", "svg").styles("width", "30px", "height", "auto").attributes("src", icon).build(),
                create("h2").text(title).build(),
            ).build(),
            create("p").text(text).build(),
            textarea({
                name: "textInputModalInput",
                label: "",
                placeholder: "",
                value: newValue,
                onchange: v => {
                    newValue.value = v;
                },
            }),
            create("div").classes("flex").children(
                button({
                    text: confirmText ?? t("CONFIRM"),
                    onclick: confirmCallback,
                    classes: ["positive"],
                    icon: { icon: "check" },
                }),
                button({
                    text: cancelText ?? t("CANCEL"),
                    onclick: cancelCallback,
                    classes: ["negative"],
                    icon: { icon: "close" },
                }),
            ).build(),
        ).build();
    }

    static combinedSelector(tabs: any[], callback: (newIndex: number) => void, selectedIndex = 0) {
        const selectedState = signal(selectedIndex);
        selectedState.subscribe((newSelected: number) => {
            callback(newSelected);
        });
        callback(selectedIndex);

        return create("div").classes("tab-selector", "flex", "rounded", "limitToContentWidth").children(
            ...tabs.map((t, i) => {
                const innerSelectedState = signal(i === selectedIndex ? "selected" : "_");
                selectedState.subscribe((newSelected: number) => {
                    innerSelectedState.value = i === newSelected ? "selected" : "_";
                });
                return create("button").classes("tab", innerSelectedState).onclick(() => {
                    selectedState.value = i;
                }).text(t).build();
            }),
        ).build();
    }

    static loadingSpinner() {
        return create("div").classes("spinner").children().build();
    }

    static roundIconButton(
        iconConfig: IconConfig,
        onclick: Function,
        title: StringOrSignal = "",
        classes: StringOrSignal[] = [],
    ) {
        return create("button")
            .classes("round-button", "jess", ...classes)
            .onclick(onclick)
            .title(title)
            .children(
                icon({
                    ...iconConfig,
                    classes: ["round-button-icon", "align-center", "inline-icon", "svg", "nopointer", ...(iconConfig.classes ?? [])],
                }),
            ).build();
    }

    static playButton(trackId: number, start: Function) {
        const isPlaying = compute((c, p) => c === trackId && p, currentTrackId, playingHere);
        const icon = getPlayIcon(isPlaying, loadingAudio);
        const onclick = async () => {
            if (isPlaying.value) {
                await PlayManager.pauseAsync(trackId);
            } else {
                start();
            }
        };

        return GenericTemplates.roundIconButton(
            {
                icon,
                isUrl: true,
                classes: ["inline-icon", "svgInverted"],
            },
            onclick,
        );
    }

    static benefit(benefit: StringOrSignal, icon: string) {
        return create("div")
            .classes("benefit-item")
            .children(
                GenericTemplates.icon(icon, true),
                create("span")
                    .text(benefit)
                    .build(),
            ).build();
    }

    static modalCancelButton(modal: AnyElement | null = null) {
        return button({
            text: t("CANCEL"),
            onclick: () => Util.removeModal(modal),
            classes: ["negative"],
            icon: { icon: "close" },
        });
    }

    static addUserLinkSearchResult(entry: SearchResult, selectedState: Signal<number>) {
        const selectedClassState = compute((s): string => (s === entry.id ? "active" : "_"), selectedState);
        const avatar = signal(Images.DEFAULT_AVATAR);
        if (entry.hasImage) {
            avatar.value = Util.getUserAvatar(entry.id);
        }

        return button({
            onclick: () => (selectedState.value = entry.id),
            icon: {
                isUrl: true,
                icon: avatar,
                adaptive: true,
                classes: ["user-icon", "nopointer"],
            },
            classes: [selectedClassState],
            text: `${entry.display} ${entry.subtitle}`,
        });
    }

    static breadcrumbs(pageMap: any, history: Signal<any>, stepState: Signal<any>) {
        return history.value.map((step: any) => {
            if (!pageMap[step]) {
                return null;
            }

            const isLast = step === history.value[history.value.length - 1];

            return create("div").classes("flex").children(
                create("span").classes("inlineLink").text(pageMap[step]).onclick(() => {
                    if (stepState.value === step) {
                        return;
                    }

                    const index = history.value.indexOf(step);
                    history.value = history.value.slice(0, index);
                    stepState.value = step;
                }).build(),
                when(isLast, create("span").text(">").build(), true),
            ).build();
        });
    }

    static checkInCorner(title: StringOrSignal = "", extraClasses: string[] = []) {
        return create("img")
            .classes("corner-check", ...extraClasses)
            .title(title)
            .src(Icons.CHECK)
            .build();
    }

    static giftIcon(title: StringOrSignal = "") {
        return GenericTemplates.icon("featured_seasonal_and_gifts", true, ["gift-icon"], title);
    }

    static searchWithFilter<T>(
        results: Signal<T[]>,
        entryFunction: SignalMapCallback<T>,
        skip: Signal<number>,
        loading: Signal<boolean>,
        load: (f: Record<string, any>) => void,
        filters?: Filter[],
        docsLink?: StringOrSignal,
    ) {
        const localSearch = signal("");
        const filteredResults = compute(
            (r, f) => {
                if (!r) {
                    return [];
                }
                return r.filter(e => JSON.stringify(e).includes(f));
            },
            results,
            localSearch,
        );
        const filter = signal<Record<string, any>>({});
        filters ??= [];
        skip.subscribe(() => load(filter.value));
        filter.subscribe(f => load(f));

        return create("div").classes("flex-v").children(
            create("div").classes("flex", "align-children", "fixed-bar").children(
                button({
                    text: t("REFRESH"),
                    icon: { icon: "refresh" },
                    classes: ["positive"],
                    disabled: loading,
                    onclick: () => load(filter.value),
                }),
                button({
                    text: t("PREVIOUS_PAGE"),
                    icon: { icon: "skip_previous" },
                    disabled: compute((l, s) => l || s <= 0, loading, skip),
                    onclick: () => {
                        skip.value = Math.max(0, skip.value - 100);
                    },
                }),
                button({
                    text: t("NEXT_PAGE"),
                    icon: { icon: "skip_next" },
                    disabled: compute((l, e) => l || e.length < 100, loading, results),
                    onclick: () => {
                        skip.value = skip.value + 100;
                    },
                }),
                input<string>({
                    type: InputType.text,
                    name: "filter",
                    placeholder: t("FILTER"),
                    value: localSearch,
                    onchange: (newValue: string) => (localSearch.value = newValue),
                }),
                ...filters.map(f => {
                    const filterValue = compute(fv => fv[f.key] ?? f.default, filter);

                    return input({
                        type: f.type,
                        name: f.key,
                        placeholder: f.name,
                        value: filterValue,
                        onchange: (newValue: string) => {
                            filter.value = {
                                ...filter.value,
                                [f.key]: newValue,
                            };
                        },
                    });
                }),
                create("span")
                    .text(compute(e => `${t("N_RESULTS", e.length)}`, results))
                    .build(),
                when(docsLink, GenericTemplates.inlineLink(docsLink ?? "", t("DOCS"), true)),
            ).build(),
            signalMap(filteredResults, create("div").classes("flex-v", "fixed-bar-content"), entryFunction),
        ).build();
    }

    static inlineLink(link: Function | StringOrSignal, text: HtmlPropertyValue, newTab = true) {
        if (link.constructor === Function) {
            return create("a").classes("inlineLink").onclick(link as Function).text(text).build();
        }

        return create("a").classes("inlineLink").href(link as StringOrSignal).target(newTab ? "_blank" : "_self").text(text).build();
    }

    static progressSectionPart(part: Signal<ProgressPart | null>) {
        const retryable = compute((p): boolean => {
            return (p && p.state && p.state === ProgressState.error && p.retryFunction !== undefined) ?? false;
        }, part);
        const title = compute(p => p?.title, part) as StringOrSignal;
        const state = compute(p => p?.state, part) as StringOrSignal;
        const icon = compute(p => p?.icon, part) as StringOrSignal;
        const text = compute(p => p?.text, part) as StringOrSignal;
        const progress = compute(p => p?.progress ?? 0, part);
        const retryFunction = compute(p => p?.retryFunction, part);

        return when(
            part,
            create("div").classes("flex", "relative", "progress-section", state, "align-children", "no-gap").title(title).children(
                when(
                    progress,
                    create("div").classes("progress-circle").styles(
                        "background",
                        compute(
                            p => `conic-gradient(var(--progress-color) ${p}%, transparent 0%)`,
                            progress,
                        ),
                    ).children(create("div").classes("progress-circle-overlay")).build(),
                ),
                create("div").classes("progress-section-part", "small-gap", "flex").children(
                    create("span").classes("progress-section-part-text").text(text).build(),
                    GenericTemplates.icon(icon, true, [state]),
                ).build(),
                when(
                    retryable,
                    create("div").classes("progress-section-retry", "flex", "small-gap").children(
                        GenericTemplates.icon("refresh", true, [state]),
                        create("span")
                            .classes("progress-section-part-text")
                            .text(t("RETRY")).onclick(() => (retryFunction.value ? retryFunction.value() : () => {
                        })).build(),
                    ).build(),
                ),
            ).build(),
        );
    }

    static verticalDragIndicator() {
        return create("div").classes("vertical-drag-indicator").build();
    }

    static releaseDateInput(
        state: Signal<
            | {
            release_date: Date;
        }
            | any
        >,
    ) {
        return input<string>({
            type: InputType.date,
            name: "release_date",
            label: t("RELEASE_DATE"),
            placeholder: "YYYY-MM-DD",
            value: compute(s => dayFromValue(s.release_date), state),
            onchange: v => {
                state.value = { ...state.value, release_date: new Date(v) };
            },
        });
    }

    static updateAvailable(version: string) {
        return create("div").classes("update-available").children(
            create("div").classes("card", "flex-v").children(
                create("span")
                    .classes("text-large")
                    .text(t("UPDATE_AVAILABLE_VERSION", version))
                    .build(),
                create("span")
                    .classes("text-small")
                    .text(t("NEW_VERSION_AVAILABLE"))
                    .build(),
                button({
                    text: t("RELOAD"),
                    onclick: () => {
                        // @ts-expect-error because it works on firefox
                        window.location.reload(true);
                    },
                    classes: ["positive"],
                    icon: { icon: "download" },
                }),
            ).build(),
        ).build();
    }

    static tag(text: StringOrSignal, type: string = "generic") {
        return create("span")
            .classes("tag", type)
            .text(text)
            .build();
    }

    static textButton(text: StringOrSignal, onclick: (e: MouseEvent) => void, icon: StringOrSignal) {
        return create("a")
            .classes("page-link", "color-dim", "flex", "align-children", "small-gap", "text-button")
            .onclick(onclick)
            .children(
                GenericTemplates.icon(icon, true),
                create("span")
                    .classes("text", "align-center", "nopointer", "user-displayname")
                    .text(text)
                    .build(),
            ).build();
    }

    static menu(shown: Signal<boolean>, ...children: (AnyElement | Signal<AnyElement>)[]) {
        return when(shown, vertical(
                ...children,
            ).classes("popout-below", "card", "absolute-align-left")
             .build(),
        );
    }
}

export function vertical(...children: (AnyNode | Signal<AnyNode> | Signal<AnyElement>)[]) {
    return create("div").classes("flex-v").children(...children);
}

export function horizontal(...children: (AnyNode | Signal<AnyNode> | Signal<AnyElement>)[]) {
    return create("div").classes("flex").children(...children);
}

export const tabSelected = (current: Signal<number>, i: number) => {
    return compute(c => c === i, current);
};

export function text(text: StringOrSignal | undefined | null) {
    return create("span").text(text);
}