import {computedSignal, create, ifjs, signal, signalMap} from "https://fjs.targoninc.com/f.js";
import {Icons} from "../Enums/Icons.mjs";
import {AlbumActions} from "../Actions/AlbumActions.mjs";
import {PlaylistActions} from "../Actions/PlaylistActions.mjs";
import {Links} from "../Enums/Links.mjs";
import {Api} from "../Classes/Api.mjs";
import {TrackActions} from "../Actions/TrackActions.mjs";

export class GenericTemplates {
    static buttonWithIcon(text, icon, alt, callback = () => {
    }, extraClasses = [], id = null) {
        return create("button")
            .classes(...extraClasses)
            .id(id)
            .onclick(callback)
            .children(
                GenericTemplates.inlineIcon(icon),
                create("span")
                    .text(text)
                    .build()
            )
            .build();
    }

    static inlineIcon(icon) {
        return create("img")
            .classes("inline-icon", "svg", "nopointer")
            .attributes("src", icon)
            .build();
    }

    static toggle(text, id, callback = () => {
    }, extraClasses = [], checked = false) {
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
                    .classes("toggle-container", "align-center")
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

    static button(text, callback = () => {
    }, extraClasses = [], id = null) {
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

    static title(title, icons = []) {
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

    static text(text, extraClasses = []) {
        return create("span")
            .classes("text", ...extraClasses)
            .text(text)
            .build();
    }

    static textWithHtml(text, extraClasses = []) {
        return create("span")
            .classes("text", "notification-text", ...extraClasses)
            .html(text)
            .build();
    }

    static dragTargetInList(dragStopCallback = () => {}, id = "", dropEffect = "move") {
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
                        e.target.previousSibling.classList.add("dragover");
                    })
                    .ondragleave(e => {
                        e.preventDefault();
                        e.target.previousSibling.classList.remove("dragover");
                    })
                    .ondragover(e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = dropEffect;
                    })
                    .ondrop(e => {
                        e.preventDefault();
                        e.target.previousSibling.classList.remove("dragover");
                        const data = e.dataTransfer.getData("text/plain");
                        dragStopCallback(JSON.parse(data));
                    })
                    .build()
            ).build();
    }

    static action(icon, text, id, onclick, attributes = [], classes = [], link = null) {
        return create(link ? "a" : "div")
            .classes("flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded")
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .src(icon)
                    .alt(text)
                    .build(),
                create("span")
                    .classes("nopointer")
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

    static newAlbumButton(classes = []) {
        return GenericTemplates.action(Icons.ALBUM_ADD, "New album", "new_album", async e => {
            e.preventDefault();
            await AlbumActions.openNewAlbumModal();
        }, [], ["positive", ...classes]);
    }

    static newPlaylistButton(classes = []) {
        return GenericTemplates.action(Icons.PLAYLIST_ADD, "New playlist", "new_playlist", async e => {
            e.preventDefault();
            await PlaylistActions.openNewPlaylistModal();
        }, [], ["positive", ...classes]);
    }

    static newTrackButton(classes = []) {
        return GenericTemplates.action(Icons.UPLOAD, "Upload", "upload", async e => {
            e.preventDefault();
            window.router.navigate("upload");
        }, [], ["positive", ...classes], Links.LINK("upload"));
    }

    static openPageButton(text, page) {
        return GenericTemplates.action(Icons.STARS, text, page, async e => {
            e.preventDefault();
            window.router.navigate(page);
        }, [], ["positive", "secondary"], Links.LINK(page));
    }

    static actionWithSmallBreakpoint(icon, text, id, onclick, attributes = [], classes = [], link = null) {
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
            )
            .id(id)
            .attributes(...attributes)
            .classes(...classes)
            .href(link)
            .onclick(onclick)
            .build();
    }

    static actionWithMidBreakpoint(icon, text, id, onclick, attributes = [], classes = [], link = null) {
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

    static pill(value, text, onclick = () => {}, pillState, extraClasses = []) {
        const selectedState = signal(pillState.value === value ? "active" : "_");
        pillState.onUpdate = (newSelected) => {
            selectedState.value = newSelected === value ? "active" : "_";
        };

        return create("div")
            .classes("pill", "padded-inline", "clickable", "fakeButton", "rounded-max", selectedState, ...extraClasses)
            .onclick(onclick)
            .text(text)
            .build();
    }

    static pills(options, pillState, extraClasses = [], loadingState = null) {
        let spinner = null;
        if (loadingState) {
            const spinnerClass = signal(loadingState.value ? "_" : "hidden");
            loadingState.onUpdate = (loading) => {
                spinnerClass.value = loading ? "_" : "hidden";
            };
            spinner = create("img")
                .src(Icons.SPINNER)
                .alt("Loading...")
                .classes("spinner-animation", "icon", "align-center", "nopointer", spinnerClass)
                .build();
        }

        return create("div")
            .classes("flex", "pill-container", ...extraClasses)
            .children(
                ...options.map(p => {
                    return GenericTemplates.pill(p.value, p.text, p.onclick, pillState);
                }),
                spinner
            )
            .build();
    }

    static inlineAction = (text, icon, alt, id = null, callback = () => {
    }, extraAttributes = [], extraClasses = []) => {
        return create("div")
            .classes("inline-action", "flex", "clickable", "fakeButton", "padded-inline", "rounded", "align-center")
            .id(id)
            .attributes(...extraAttributes)
            .classes(...extraClasses)
            .onclick(callback)
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .attributes("src", icon, "alt", alt)
                    .build(),
                create("span")
                    .classes("nopointer", "text-xsmall")
                    .text(text)
                    .build()
            )
            .build();
    };
    static centeredDeleteButton = (id, callback, extraClasses) => {
        return create("div")
            .id(id)
            .classes("delete-button", "fakeButton", "centeredInParent", "clickable", "flex", "padded-inline", "rounded", ...extraClasses)
            .onclick(callback)
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .attributes("src", Icons.DELETE, "alt", "Delete")
                    .build()
            )
            .build();
    };
    static card = () => {
        return create("div")
            .classes("card")
            .build();
    };
    static notification = (type = "success", text = "Success!") => {
        return create("div")
            .classes("notification", type)
            .text(text)
            .build();
    };
    static fileInput = (id, name, accept, text, required = false, changeCallback = () => {}) => {
        return create("div")
            .children(
                create("input")
                    .type("button")
                    .classes("full")
                    .value(text)
                    .onclick(e => {
                        e.target.nextElementSibling.click();
                        e.target.value = "Choosing...";
                    })
                    .build(),
                create("input")
                    .type("file")
                    .styles("display", "none")
                    .id(id)
                    .name(name)
                    .required(required)
                    .attributes("accept", accept)
                    .onchange(e => {
                        const accept = e.target.getAttribute("accept");
                        let fileName = e.target.value;
                        if (accept && !accept.includes("*")) {
                            const accepts = accept.split(",");
                            const extension = fileName.substring(fileName.lastIndexOf(".") + 1);
                            if (!accepts.includes(extension)) {
                                fileName = "Not supported type.";
                            }
                        }
                        e.target.previousElementSibling.value = truncate(fileName);
                        e.target.previousElementSibling.title = fileName;
                        const probableName = fileName.substring(fileName.lastIndexOf("\\") + 1);
                        changeCallback(probableName);

                        const preview = document.getElementById(name + "-preview");
                        if (preview) {
                            preview.src = URL.createObjectURL(e.target.files[0]);
                            preview.style.display = "initial";
                        }

                        function truncate(text) {
                            return text.length > 20 ? text.substring(0, 20) + "..." : text;
                        }
                    })
                    .build()
            )
            .build();
    };
    static checkbox = (name, checked = false, text = "", required = false, onchange = () => {}) => {
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
                    .onchange((e) => onchange(e.target.checked))
                    .build(),
                create("span")
                    .classes("checkmark")
                    .children(
                        create("span")
                            .classes("checkmark-icon")
                            .text("✓")
                            .build()
                    )
                    .build(),
            )
            .build();
    };

    static modal = (children, extraClasses = []) => {
        return create("div")
            .classes("modal-container")
            .children(
                create("div")
                    .classes("modal-overlay")
                    .build(),
                create("div")
                    .classes("modal", "padded-large", "rounded", ...extraClasses)
                    .children(
                        ...children
                    )
                    .build()
            ).build();
    };

    static confirmationModal = (title, text, icon, confirmText, cancelText, confirmCallback, cancelCallback) => {
        return GenericTemplates.modal([
            create("div")
                .classes("flex")
                .children(
                    create("img")
                        .styles("width", "30px", "height", "auto")
                        .attributes("src", icon)
                        .build(),
                    create("h2")
                        .text(title)
                        .build()
                )
                .build(),
            create("p")
                .text(text)
                .build(),
            create("div")
                .classes("flex")
                .children(
                    GenericTemplates.button(confirmText ?? "Confirm", confirmCallback, ["positive"]),
                    GenericTemplates.button(cancelText ?? "Cancel", cancelCallback, ["negative"])
                )
                .build()
        ], ["confirmationModal"]
        );
    };

    static imageModal(imageUrl) {
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

    static textInputModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback, cancelCallback) {
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
                    create("input")
                        .classes("full")
                        .id("textInputModalInput")
                        .value(currentValue ?? "")
                        .build(),
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.button(confirmText ?? "Confirm", confirmCallback, ["positive"]),
                            GenericTemplates.button(cancelText ?? "Cancel", cancelCallback, ["negative"])
                        ).build()
                ).build(),
        ], ["confirmationModal"]
        );
    }

    static textAreaInputModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback, cancelCallback) {
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
                    create("textarea")
                        .classes("full", "fullWidth")
                        .id("textAreaInputModalInput")
                        .value(currentValue ?? "")
                        .build(),
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.button(confirmText ?? "Confirm", confirmCallback, ["positive"]),
                            GenericTemplates.button(cancelText ?? "Cancel", cancelCallback, ["negative"])
                        ).build()
                ).build(),
        ], ["confirmationModal"]
        );
    }

    static tabSelector(tabs, callback, selectedTab = 0) {
        const selectedState = signal(selectedTab);
        selectedState.onUpdate = (newSelected) => {
            callback(newSelected);
        };
        callback(selectedTab);

        return create("div")
            .classes("tab-selector", "flex", "rounded", "limitToContentWidth")
            .children(
                ...tabs.map((t, i) => {
                    const innerSelectedState = signal(i === selectedTab ? "selected" : "_");
                    selectedState.onUpdate = (newSelected) => {
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

    static containerWithSpinner(className) {
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

    static addUserLinkSearchResult(entry, selectedState) {
        const selectedClassState = signal(selectedState.value === entry.id ? "active" : "_");
        selectedState.onUpdate = (newSelected) => {
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

    static select(options, value, id = null, classes = []) {
        const baseSelect = create("select")
            .classes(...classes)
            .id(id)
            .value(value)
            .build();

        return create("div")
            .children(
                signalMap(options, baseSelect, option => GenericTemplates.selectOption(option))
            ).build();
    }

    static selectOption(option) {
        return create("option")
            .text(option.name)
            .value(option.id)
            .build();
    }

    static searchableSelect(options, value, id = null, classes = []) {
        const search = signal(options.value.find(o => o.id === value)?.name ?? "");
        const optionsVisible = signal(false);
        const filtered = signal(options.value);
        const selectedIndex = signal(0);
        const filter = () => {
            filtered.value = options.value.filter(o => o.name.toLowerCase().includes(search.value.toLowerCase()));
        }
        options.subscribe(filter);
        search.subscribe(filter);
        filter();
        const selectedId = signal(options.value[0].id);
        const updateSelectedId = () => {
            selectedId.value = filtered.value[selectedIndex.value]?.id;
        }
        selectedIndex.subscribe(updateSelectedId);
        filtered.subscribe(updateSelectedId);
        updateSelectedId();

        return create("div")
            .classes("search-select", "flex-v", "relative")
            .children(
                create("div")
                    .classes("flex", "search-select-visible")
                    .children(
                        create("input")
                            .classes("search-select-input")
                            .value(search)
                            .onfocus(() => {
                                optionsVisible.value = true;
                            })
                            .onkeydown((e) => {
                                switch (e.key) {
                                    case "Enter":
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const selectedOption = filtered.value[selectedIndex.value];
                                        value.value = selectedOption?.id ?? value.value;
                                        search.value = selectedOption?.name ?? search.value;
                                        optionsVisible.value = false;
                                        break;
                                    case "ArrowDown":
                                        e.preventDefault();
                                        e.stopPropagation();
                                        selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length;
                                        break;
                                    case "ArrowUp":
                                        e.preventDefault();
                                        e.stopPropagation();
                                        selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length;
                                        break;
                                    case "Escape":
                                    case "Tab":
                                        optionsVisible.value = false;
                                        break;
                                    default:
                                        selectedIndex.value = 0;
                                        break;
                                }
                            })
                            .build(),
                        create("div")
                            .classes("search-select-dropdown")
                            .onclick(() => {
                                optionsVisible.value = !optionsVisible.value;
                            })
                            .children(
                                GenericTemplates.inlineIcon(Icons.ARROW_DOWN)
                            ).build()
                    ).build(),
                ifjs(optionsVisible, signalMap(filtered, create("div").classes("search-select-options", "flex-v"), option => GenericTemplates.searchSelectOption(option, value, search, optionsVisible, selectedId)))
            ).build();
    }

    static searchSelectOption(option, value, search, optionsVisible, selectedId) {
        let element;
        const selectedClass = computedSignal(selectedId, (id) => {
            element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            return id === option.id ? "selected" : "_";
        });

        element = create("div")
            .classes("search-select-option", "padded", selectedClass)
            .onclick(() => {
                value.value = option.id;
                search.value = option.name;
                optionsVisible.value = false;
            })
            .children(
                ifjs(option.image, GenericTemplates.inlineIcon(option.image)),
                create("span")
                    .text(option.name)
                    .build()
            ).build();
        return element;
    }

    static addLinkedUserModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback, cancelCallback) {
        const selectedState = signal(0);
        const userMap = new Map();
        const collabTypeOptions = signal(create("span").text("Loading collab types...").build());
        let collabTypes = [];
        const collabType = signal("1");
        TrackActions.getCollabTypes().then(types => {
            collabTypes = types;
            collabTypeOptions.value = GenericTemplates.searchableSelect(signal(types), collabType, "collabType", ["full"]);
        });

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
                    create("input")
                        .classes("full")
                        .id("addUserSearch")
                        .value(currentValue ?? "")
                        .oninput(async (e) => {
                            const search = e.target.value;
                            const res = await Api.getAsync(Api.endpoints.search, {
                                search,
                                filters: JSON.stringify(["users"])
                            });
                            if (res.code === 200) {
                                const results = document.getElementById("user-search-results");
                                results.innerHTML = "";
                                for (const user of res.data) {
                                    userMap.set(user.id, user);
                                    results.appendChild(GenericTemplates.addUserLinkSearchResult(user, selectedState));
                                }
                            }
                        })
                        .build(),
                    create("div")
                        .classes("flex-v")
                        .styles("max-height", "200px", "overflow", "auto", "flex-wrap", "nowrap")
                        .id("user-search-results")
                        .build(),
                    collabTypeOptions,
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.button(confirmText ?? "Confirm", () => {
                                const user = userMap.get(selectedState.value);
                                user.collab_type = parseInt(collabType.value);
                                confirmCallback(selectedState.value, user, collabTypes);
                            }, ["positive"]),
                            GenericTemplates.button(cancelText ?? "Cancel", cancelCallback, ["negative"])
                        ).build()
                ).build(),
        ], ["confirmationModal"]
        );
    }

    static breadcrumbs(pageMap, history, stepState) {
        return history.value.map((step) => {
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
}