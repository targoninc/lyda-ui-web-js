import {AnyElement, AnyNode, create, InputType, Signal, signal, when} from "@targoninc/jess";
import {
    button,
    checkbox as jessCheckbox,
    heading,
    icon,
    input,
    searchableSelect,
    select,
    textarea,
    toggle as jessToggle,
} from "@targoninc/jess-components";
import {GenericTemplates, horizontal, tabSelected, vertical} from "../generic/GenericTemplates.ts";
import {artworkDisplay, ArtworkFormat, ArtworkOptions} from "../music/ArtworkTemplates.ts";
import {InteractionTemplates} from "../InteractionTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {FeedTemplates} from "../generic/FeedTemplates.ts";
import {ContextMenuTemplates} from "../generic/ContextMenuTemplates.ts";
import {TableTemplates} from "../generic/TableTemplates.ts";
import {ChartTemplates} from "../generic/ChartTemplates.ts";
import {FormTemplates} from "../generic/FormTemplates.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {Api} from "../../Api/Api.ts";
import {Util} from "../../Classes/Util.ts";
import {currentUser} from "../../state.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import {Badge} from "@targoninc/lyda-shared/src/Models/db/lyda/Badge";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {Visibility} from "@targoninc/lyda-shared/src/Enums/Visibility";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {PillOption} from "../../Models/PillOption.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {DefaultImages} from "../../Enums/DefaultImages.ts";
import {TextSize} from "../../Enums/TextSize.ts";
import {t} from "../../../locales";

const sampleUser: User = {
    id: 1,
    username: "lyda",
    displayname: "Lyda",
    description: "",
    emails: [],
    password_hash: "",
    password_token: null,
    verified: true,
    verification_status: "",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    banned_at: null,
    password_updated_at: new Date(),
    tos_agreed_at: new Date(),
    ip: "",
    has_avatar: false,
    has_banner: false,
    email_mfa_code: "",
    passkey_user_id: "",
};

const sampleTrack = {
    id: 1,
    visibility: Visibility.public,
    likes: {count: 42, interacted: false},
    reposts: {count: 7, interacted: true},
    comments: {count: 3},
} as unknown as Track;

const sampleAlbum = {id: 2, likes: {count: 5, interacted: true}} as unknown as Album;
const samplePlaylist = {id: 3, likes: {count: 11, interacted: false}} as unknown as Playlist;
const sampleComment = {id: 4, likes: {count: 2, interacted: false}} as unknown as Comment;

type GalleryItem = { id: number; title: string; artist: string };
const feedItems: GalleryItem[] = [
    {id: 1, title: "First Light", artist: "Aurora Lane"},
    {id: 2, title: "Paper Boats", artist: "The Nightjars"},
    {id: 3, title: "Static Bloom", artist: "Mira Vale"},
    {id: 4, title: "Low Tide", artist: "Aurora Lane"},
];

type ArtworkCover = { type: EntityType; id: number; title: string };

/** Random track, album and playlist covers from the logged-in user's profile. */
async function loadUserArtworkCovers(): Promise<ArtworkCover[]> {
    const user = currentUser.value;
    if (!user) {
        return [];
    }
    const [tracks, albums, playlists] = await Promise.all([
        Api.getFeed(ApiRoutes.profileTracksFeed, {offset: 0, limit: 30, id: user.id}),
        Api.getAlbumsByUserId(user.id, ""),
        Api.getPlaylistsByUserId(user.id, ""),
    ]);
    const trackList: Track[] = Array.isArray(tracks) ? tracks : tracks?.items ?? [];
    const covers: ArtworkCover[] = [
        ...trackList.filter(t => t.has_cover).map(t => ({type: EntityType.track, id: t.id, title: t.title})),
        ...(albums?.items ?? []).filter(a => a.has_cover).map(a => ({type: EntityType.album, id: a.id, title: a.title})),
        ...(playlists?.items ?? []).filter(p => p.has_cover).map(p => ({type: EntityType.playlist, id: p.id, title: p.title})),
    ];
    for (let i = covers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [covers[i], covers[j]] = [covers[j], covers[i]];
    }
    return covers;
}

export class ComponentGalleryTemplates {
    static page() {
        // The player footer is fixed to the viewport bottom and would overlap
        // every section screenshot. Hide it while the gallery is open.
        document.querySelector("footer")?.classList.add("hidden");
        // The nav and fixed-bar widgets are position:sticky; they would stick
        // to the viewport top and overlay section screenshots. Render them
        // statically on this page.
        // Flex columns must not wrap: with flex-wrap:wrap, the chart rows end up
        // sized to their max-content, so the fixed-width chart cards stretch the
        // section beyond the viewport and the tall cards overlap their rows.
        const style = create("style").text(
            "nav { position: static !important; } .fixed-bar { position: static !important; }" +
            ".gallery-page, .gallery-page .flex-v { flex-wrap: nowrap !important; }" +
            ".gallery-page > .flex-v, .gallery-page > .flex-v > .flex { min-width: 0 !important; }",
        ).build();
        document.head.appendChild(style);

        const pillState = signal("all");
        const pills: PillOption[] = [
            {text: `${t("ALL")}`, value: "all"},
            {text: `${t("TRACKS")}`, value: "tracks"},
            {text: `${t("ALBUMS")}`, value: "albums"},
        ];

        const tabs = [
            "jess-components",
            "Generic",
            "Forms",
            "Display",
            "Interactions",
            "User widgets",
            "Feed",
            "Menus & modals",
            "Tables & charts",
        ];
        const selectedTab = signal(0);

        return vertical(
            heading({level: 1, text: "Component gallery"}),
            GenericTemplates.text("Screenshots for the development docs. Not linked anywhere."),
            GenericTemplates.combinedSelector(tabs, i => selectedTab.value = i, selectedTab.value),

            when(tabSelected(selectedTab, 0), ComponentGalleryTemplates.#jessComponents(pillState, pills)),
            when(tabSelected(selectedTab, 1), ComponentGalleryTemplates.#layoutAndButtons(pills, pillState)),
            when(tabSelected(selectedTab, 2), ComponentGalleryTemplates.#forms()),
            when(tabSelected(selectedTab, 3), ComponentGalleryTemplates.#display()),
            when(tabSelected(selectedTab, 4), ComponentGalleryTemplates.#interactions()),
            when(tabSelected(selectedTab, 5), ComponentGalleryTemplates.#users()),
            when(tabSelected(selectedTab, 6), ComponentGalleryTemplates.#feed()),
            when(tabSelected(selectedTab, 7), ComponentGalleryTemplates.#menusAndModals()),
            when(tabSelected(selectedTab, 8), ComponentGalleryTemplates.#tablesAndCharts()),
        ).classes("gallery-page", "padded-page", "flex-v", "gap").build();
    }

    static #section(id: string, title: string, ...rows: (AnyNode | Signal<AnyElement>)[]) {
        return create("div")
            .classes("flex-v", "gap")
            .id(id)
            .children(
                heading({level: 2, text: title}),
                ...rows,
            ).build();
    }

    static #row(...children: (AnyNode | Signal<AnyElement>)[]) {
        return horizontal(...children).classes("gap", "padded", "align-children", "noflexwrap").build();
    }

    static #jessComponents(pillState: Signal<string>, pills: PillOption[]) {
        const textValue = signal("");
        const selectOptions = signal([
            {id: "a", name: "Alpha"},
            {id: "b", name: "Beta"},
            {id: "c", name: "Gamma"},
        ]);
        const selectValue = signal("a");

        return ComponentGalleryTemplates.#section(
            "gallery-jess-components",
            "jess-components",
            ComponentGalleryTemplates.#row(
                heading({level: 3, text: "Heading"}),
                GenericTemplates.text("Text"),
                button({text: "Button", icon: {icon: "play_arrow"}, onclick: () => {}}),
                button({text: "Disabled", disabled: true, onclick: () => {}}),
                icon({icon: "favorite", adaptive: true, isUrl: false}),
                icon({icon: "queue_music", adaptive: true, isUrl: false}),
            ),
            ComponentGalleryTemplates.#row(
                input<string>({type: InputType.text, name: "demo-text", label: "Text input", placeholder: "Type here", value: textValue, onchange: v => textValue.value = v}),
                input<string>({type: InputType.password, name: "demo-password", label: "Password", value: signal("")}),
                input<string>({type: InputType.number, name: "demo-number", label: "Number", value: signal("")}),
                textarea({name: "demo-textarea", label: "Textarea", placeholder: "Write something", value: signal("")}),
            ),
            ComponentGalleryTemplates.#row(
                select({label: "Select", options: selectOptions, value: selectValue, onchange: v => selectValue.value = v}),
                searchableSelect({label: "Searchable select", options: selectOptions, value: selectValue}),
                jessCheckbox({name: "demo-checkbox", checked: signal(true), text: "Checkbox", onchange: () => {}}),
                jessToggle({name: "demo-toggle", checked: signal(true), text: "Toggle", onchange: () => {}}),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.pills(pills, pillState),
            ),
        );
    }

    static #layoutAndButtons(pills: PillOption[], pillState: Signal<string>) {
        const menuShown = signal(true);

        return ComponentGalleryTemplates.#section(
            "gallery-buttons",
            "GenericTemplates: layout and buttons",
            ComponentGalleryTemplates.#row(
                GenericTemplates.card(),
                GenericTemplates.fixedBar([
                    button({text: `${t("REFRESH")}`, icon: {icon: "refresh"}, onclick: () => {}}),
                    button({text: `${t("FILTER")}`, icon: {icon: "filter_alt"}, onclick: () => {}}),
                ]),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.pill(pills[0], pillState),
                GenericTemplates.roundIconButton({icon: "play_arrow"}, () => {}, ""),
                GenericTemplates.roundIconButton({icon: "pause"}, () => {}, ""),
                GenericTemplates.deleteIconButton("del", () => {}),
                GenericTemplates.uploadIconButton("up", () => {}),
                GenericTemplates.textButton("Text button", () => {}, "open_in_new"),
                GenericTemplates.newTrackButton(),
                GenericTemplates.logoutButton(),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.combinedSelector(["One", "Two", "Three"], () => {}),
                create("div").styles("width", "560px").build(),
                (() => {
                    // .popout-below positions the menu below its anchor. Pin it to the
                    // top of the wrapper so it stays inside this row for screenshots.
                    const wrapper = create("div").classes("relative").styles("height", "130px").children(
                        GenericTemplates.menu(menuShown,
                            button({text: "Menu item 1", onclick: () => {}}),
                            button({text: "Menu item 2", onclick: () => {}}),
                        ),
                    ).build() as HTMLElement;
                    const menuEl = wrapper.querySelector(".popout-below") as HTMLElement | null;
                    if (menuEl) {
                        menuEl.style.top = "0";
                    }
                    return wrapper;
                })(),
            ),
        );
    }

    static #forms() {
        const formState = signal<{ release_date: Date; visibility?: string }>({release_date: new Date(), visibility: Visibility.public});
        const sliderValue = signal(50);
        const pageState = signal(1);
        const isPrivate = signal(false);

        return ComponentGalleryTemplates.#section(
            "gallery-forms",
            "Forms",
            ComponentGalleryTemplates.#row(
                FormTemplates.textField("Title", "title", "Track title", "text", "My track", true, () => {}),
                FormTemplates.moneyField("Price", "price", "0.00", signal(4.99), false, () => {}),
                FormTemplates.dropDownField("Visibility", signal([
                    {id: Visibility.public, name: "Public"},
                    {id: Visibility.private, name: `${t("PRIVATE")}`},
                ]), signal<string>(Visibility.public)),
                FormTemplates.checkBoxField("agree", `${t("CONFIRM")}`, true, false, () => {}),
                FormTemplates.visibilityToggle(isPrivate, formState),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.checkbox("terms", true, `${t("CONFIRM")}`, false, () => {}),
                GenericTemplates.toggle(`${t("PRIVATE")}`, "private", () => {}),
                GenericTemplates.fileInput("cover", "cover", ".png,.jpg", "No file selected", false, () => {}),
                GenericTemplates.releaseDateInput(formState),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.steppedSlider("Volume", 0, 100, 25, sliderValue, v => sliderValue.value = v, "50%"),
                GenericTemplates.paginationControls(pageState, signal(false)),
            ),
        );
    }

    static #display() {
        const progressPart = signal<ProgressPart | null>({
            icon: "check",
            text: "Upload complete",
            state: ProgressState.complete,
            title: "Upload",
            progress: 100,
        });
        const artworkCovers = signal<ArtworkCover[] | null | undefined>(undefined);
        loadUserArtworkCovers().then(covers => {
            artworkCovers.value = covers;
        });

        return ComponentGalleryTemplates.#section(
            "gallery-display",
            "Display",
            ComponentGalleryTemplates.#row(
                GenericTemplates.icon("favorite", false),
                GenericTemplates.icon("favorite", true),
                GenericTemplates.icon("warning", true, ["text-positive"]),
                GenericTemplates.title("Track title", [GenericTemplates.checkInCorner()]),
                GenericTemplates.cardLabel("Label", "info"),
                GenericTemplates.tag("Generic", "generic"),
                GenericTemplates.tag(`${t("FOLLOWS_YOU")}`, "follow"),
                GenericTemplates.verifiedWithDate(new Date()),
                GenericTemplates.lock(),
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.timestamp(new Date()),
                GenericTemplates.loadingSpinner(),
                GenericTemplates.loadingBlobs(20),
                GenericTemplates.progressSectionPart(progressPart),
                GenericTemplates.benefit("No ads", "block"),
                // .update-available is position:fixed. A transformed ancestor turns
                // it into a containing block, keeping it inside this row.
                create("div").classes("flex-v", "gap").styles("transform", "translateZ(0)", "height", "230px").children(
                    GenericTemplates.updateAvailable("0.0.999"),
                ).build(),

            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.gif8831("/img/88x31/firefox.gif"),
                create("div").styles("max-width", "280px").children(GenericTemplates.graphic("nothing_found.svg")).build(),
                create("div").styles("width", "500px", "height", "280px", "overflow", "hidden").children(GenericTemplates.noTracks()).build(),
                create("div").styles("max-width", "280px").children(GenericTemplates.missingPermission()).build(),
            ),
            when(artworkCovers, () => ComponentGalleryTemplates.#artworkRows(artworkCovers.value ?? [])),
        );
    }

    static #artworkRows(covers: ArtworkCover[]) {
        const coverAt = (i: number) => covers.length > 0 ? covers[i % covers.length] : undefined;
        return create("div")
            .classes("flex-v", "gap")
            .children(
                ComponentGalleryTemplates.#row(
                    ComponentGalleryTemplates.#artworkVariant("cover", "cover", {}, coverAt(0)),
                    ComponentGalleryTemplates.#artworkVariant("cd", "cd", {}, coverAt(1)),
                    ComponentGalleryTemplates.#artworkVariant("vinyl", "vinyl", {}, coverAt(2)),
                ),
                ComponentGalleryTemplates.#row(
                    ComponentGalleryTemplates.#artworkVariant("cover", "cover, stickers", {bought: true, liked: true, reposted: true, topFan: true, signatureText: "Aurora Lane", price: 4.99, paidAmount: 6.29, seed: 2}, coverAt(3)),
                    ComponentGalleryTemplates.#artworkVariant("cd", "cd, stickers", {bought: true, liked: true, reposted: true, topFan: true, price: 4.99, paidAmount: 6.29, seed: 3}, coverAt(4)),
                    ComponentGalleryTemplates.#artworkVariant("vinyl", "vinyl, stickers", {bought: true, liked: true, reposted: true, topFan: true, price: 4.99, paidAmount: 6.29, seed: 4}, coverAt(5)),
                ),
                ComponentGalleryTemplates.#row(
                    ComponentGalleryTemplates.#artworkVariant("vinyl", "bought", {bought: true, price: 4.99, paidAmount: 6.29, seed: 5}, coverAt(6)),
                    ComponentGalleryTemplates.#artworkVariant("vinyl", "liked", {liked: true, seed: 6}, coverAt(7)),
                    ComponentGalleryTemplates.#artworkVariant("vinyl", "reposted", {reposted: true, seed: 7}, coverAt(8)),
                    ComponentGalleryTemplates.#artworkVariant("cover", "signature (top fan + bought)", {topFan: true, bought: true, price: 4.99, signatureText: "Aurora Lane", seed: 8}, coverAt(9)),
                    ComponentGalleryTemplates.#artworkVariant("cover", "signature, artist-made", {topFan: true, bought: true, price: 4.99, seed: 9}, coverAt(10)),
                ),
            ).build();
    }

    static #artworkVariant(format: ArtworkFormat, label: string, opts: ArtworkOptions, cover?: ArtworkCover) {
        const url = cover
            ? Util.getImage(cover.id, `${cover.type}Cover` as MediaFileType)
            : DefaultImages[EntityType.album];
        return vertical(
            // Same size as the standalone cover on track/album/playlist pages (--cover-size: 200px).
            artworkDisplay(url, {format, size: 200, ...opts}),
            create("span").classes("color-dim", TextSize.small).text(label).build(),
        ).classes("small-gap", "align-center").build();
    }

    static #interactions() {
        const group = (label: string, entityType: EntityType, entity: any, showCount = true) =>
            vertical(
                create("span").classes("color-dim").text(label).build(),
                InteractionTemplates.interactions(entityType, entity, {showCount}),
            ).classes("small-gap").build();

        const section = ComponentGalleryTemplates.#section(
            "gallery-interactions",
            "Interactions",
            ComponentGalleryTemplates.#row(
                group("Track", EntityType.track, sampleTrack),
                group("Album", EntityType.album, sampleAlbum),
                group("Playlist", EntityType.playlist, samplePlaylist),
                group("Comment", EntityType.comment, sampleComment),
            ),
            ComponentGalleryTemplates.#row(
                group("Track, no counts", EntityType.track, sampleTrack, false),
                group("Album, no counts", EntityType.album, sampleAlbum, false),
            ),
            ComponentGalleryTemplates.#row(
                group("Playlist, no counts", EntityType.playlist, samplePlaylist, false),
                group("Comment, no counts", EntityType.comment, sampleComment, false),
            ),
        );

        // Logged-out users see interaction buttons disabled (opacity 0.2).
        // Drop the class so the gallery shows the enabled state.
        (section as HTMLElement).querySelectorAll(".disabled").forEach(el => el.classList.remove("disabled"));
        return section;
    }

    static #users() {
        return ComponentGalleryTemplates.#section(
            "gallery-users",
            "User widgets",
            ComponentGalleryTemplates.#row(
                UserTemplates.userLink(UserWidgetContext.list, sampleUser),
                UserTemplates.username(sampleUser, false),
                UserTemplates.displayname(sampleUser),
                UserTemplates.verificationBadge(),
                UserTemplates.badges([{name: "staff", description: "Staff"} as Badge]),
                UserTemplates.followButton(signal(true), 1, false),
                UserTemplates.followsBackIndicator(),
            ),
            ComponentGalleryTemplates.#row(
                UserTemplates.userLink(UserWidgetContext.singlePage, sampleUser),
                UserTemplates.userLink(UserWidgetContext.player, sampleUser),
                UserTemplates.followButton(signal(false), 1, true),
                UserTemplates.badge({name: "vip", description: "VIP"} as Badge),
            ),
            ComponentGalleryTemplates.#row(
                UserTemplates.userLink(UserWidgetContext.card, sampleUser),
                UserTemplates.userLink(UserWidgetContext.comment, sampleUser),
                UserTemplates.badges([
                    {name: "staff", description: "Staff"} as Badge,
                    {name: "cute", description: "Cute"} as Badge,
                    {name: "vip", description: "VIP"} as Badge,
                ]),
            ),
            ComponentGalleryTemplates.#row(
                UserTemplates.userLink(UserWidgetContext.nav, sampleUser),
                UserTemplates.username(sampleUser, true),
                UserTemplates.followsBackIndicator(),
                UserTemplates.verificationBadge(),
            ),
        );
    }

    static #feed() {
        const feed = FeedTemplates.create<GalleryItem>({
            columns: [
                {
                    key: "title",
                    header: "Title",
                    render: item => create("span").text(item.title).build(),
                },
                {
                    key: "artist",
                    header: "Artist",
                    render: item => create("span").text(item.artist).build(),
                },
            ],
            pageSize: 10,
            fetchPage: async () => ({items: feedItems, total: feedItems.length}),
            buildMenuActions: () => [],
            onPlayToggle: async () => {},
            isPlaying: () => signal(false),
            sortable: false,
        });

        return ComponentGalleryTemplates.#section(
            "gallery-feed",
            "Feed",
            feed,
        );
    }

    static #menusAndModals() {
        const ctx = ContextMenuTemplates.create<GalleryItem>(feedItems[0], () => [
            {label: "Add to queue", icon: "playlist_add", onclick: () => {}},
            {label: "Go to album", icon: "album", onclick: () => {}},
            {label: `${t("DELETE")}`, icon: "delete", onclick: () => {}},
        ]);
        const ctxContainer = horizontal(ctx.button, ctx.popover).classes("relative").build() as HTMLElement;


        return ComponentGalleryTemplates.#section(
            "gallery-menus-modals",
            "Menus and modals",
            ComponentGalleryTemplates.#row(
                // The popover opens below and to the LEFT of the button. Give it
                // room so it does not clip at the page edge.
                create("div").styles("width", "220px").build(),
                ctxContainer,
            ),
            ComponentGalleryTemplates.#row(
                GenericTemplates.notification(NotificationType.success, `${t("SUCCESS")}`, false),
                GenericTemplates.notification(NotificationType.error, "Something went wrong", false),
                GenericTemplates.notification(NotificationType.info, "Heads up", false),
            ),
            ComponentGalleryTemplates.#row(
                // The content only. Rendering GenericTemplates.modal() here would put a
                // fixed, full-viewport overlay on top of every other section screenshot.
                create("div").classes("card", "padded").children(
                    GenericTemplates.confirmationModal(
                        `${t("CONFIRM")}`,
                        "Are you sure you want to do the thing?",
                        "warning",
                        `${t("CONFIRM")}`,
                        `${t("CANCEL")}`,
                        () => {},
                        () => {},
                    ),
                ).build(),
                create("div").classes("card", "padded").children(
                    GenericTemplates.textInputModal(
                        "Rename",
                        "Enter a new name.",
                        signal("My playlist"),
                        "edit",
                        `${t("CONFIRM")}`,
                        `${t("CANCEL")}`,
                        () => {},
                        () => {},
                    ),
                ).build(),
            ),
        );
    }

    static #tablesAndCharts() {
        const sortState = signal<keyof GalleryItem | null>(null);
        const rows = feedItems.map(item => TableTemplates.tr({
            cellClasses: ["padded-inline"],
            data: [
                create("span").text(item.title).build(),
                create("span").text(item.artist).build(),
            ],
        }));

        return ComponentGalleryTemplates.#section(
            "gallery-tables-charts",
            "Tables and charts",
            ComponentGalleryTemplates.#row(
                TableTemplates.table(
                    TableTemplates.tableHeaders<GalleryItem>([
                        {title: "Title", property: "title"},
                        {title: "Artist", property: "artist"},
                    ], sortState),
                    ...rows,
                ),
            ),
            ComponentGalleryTemplates.#row(
                ChartTemplates.barChart(
                    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    [12, 19, 7, 25, 31, 8],
                    "Plays",
                    "Sample chart",
                    "gallery-chart",
                ),
                ChartTemplates.barChart(
                    ["First Light", "Paper Boats", "Static Bloom", "Low Tide", "Nightjars", "Aurora Lane"],
                    [12, 19, 7, 25, 31, 8],
                    `${t("PLAYS")}`,
                    "Sample chart with long labels",
                    "gallery-chart-long-labels",
                ),
                ChartTemplates.noData("Nothing here"),
            ),
            ComponentGalleryTemplates.#row(
                ChartTemplates.lineChart(
                    ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
                    [120, 95, 140, 130, 175, 150, 210],
                    `${t("PLAYS")}`,
                    "Monthly plays",
                    "gallery-line-chart",
                    [
                        { label: `${t("TOTAL")}`, value: "1,020" },
                        { label: `${t("AVERAGE")}`, value: "146" },
                        { label: `${t("BEST")}`, value: "210" },
                    ],
                ),
                ChartTemplates.boxPlotChart(
                    { min: 3, q1: 12, median: 18, q3: 27, max: 45 },
                    "Royalty spread",
                    "gallery-box-chart",
                    undefined,
                    true,
                ),
            ),
            ComponentGalleryTemplates.#row(
                ChartTemplates.paginatedLineChart({
                    title: `${t("PLAYCOUNT_BY_MONTH")}`,
                    endpoint: ApiRoutes.getPlayCountByMonth,
                    timeType: "month",
                }),
                ChartTemplates.paginatedLineChart({
                    title: `${t("CUMULATIVE_TRACKS")}`,
                    endpoint: ApiRoutes.getGlobalCumulativeTracksByMonth,
                    timeType: "month",
                    cumulative: true,
                }),
            ),
        );
    }
}
