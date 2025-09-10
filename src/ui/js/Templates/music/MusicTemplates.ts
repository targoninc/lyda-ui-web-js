import { GenericTemplates, horizontal } from "../generic/GenericTemplates.ts";
import { AnyNode, compute, create, Signal, signal, when } from "@targoninc/jess";
import { currentTrackId, currentUser, loadingAudio, manualQueue, playingFrom, playingHere } from "../../state.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { TrackTemplates } from "./TrackTemplates.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { Ui } from "../../Classes/Ui.ts";
import { MediaActions } from "../../Actions/MediaActions.ts";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { startItem } from "../../Actions/MusicActions.ts";
import { Icons } from "../../Enums/Icons.ts";
import { ApiRoutes } from "../../Api/ApiRoutes.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { button } from "@targoninc/jess-components";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { Api } from "../../Api/Api.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";

export class MusicTemplates {
    static feedEntry(type: EntityType, item: Track | Playlist | Album) {
        const icons = [];
        const isPrivate = item.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }
        const playingClass = compute(
            (id): string => (id === item.id ? "playing" : "_"),
            currentTrackId
        );

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes(`feed-${type}`, "flex", "padded", "rounded", "fullWidth", "card", "align-children", playingClass)
                    .id(item.id)
                    .styles("max-width", "100%")
                    .children(
                        MusicTemplates.playButton(type, item.id, () => startItem(type, item)),
                        MusicTemplates.cover(type, item, "inline-cover"),
                        create("div")
                            .classes("flex", "flex-grow", "no-gap", "space-outwards")
                            .children(
                                create("div")
                                    .classes("flex")
                                    .children(
                                        create("div")
                                            .classes("flex-v", "flex-grow", "no-gap")
                                            .children(
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        MusicTemplates.title(type, item.title, item.id, icons),
                                                        item.collab ? TrackTemplates.collabIndicator(item.collab) : null,
                                                        item.repost ? TrackTemplates.repostIndicator(item.repost) : null,
                                                    ).build(),
                                                create("div")
                                                    .classes("flex")
                                                    .children(
                                                        UserTemplates.userLink(UserWidgetContext.card, item.user!),
                                                        create("span")
                                                            .classes("date", "text-small", "nopointer", "color-dim", "align-center")
                                                            .text(Time.ago(item.created_at))
                                                            .build()
                                                    ).build()
                                            ).build()
                                    ).build(),
                                create("div")
                                    .classes("flex", "space-outwards", "align-children")
                                    .children(
                                        horizontal(
                                            when(
                                                type === EntityType.track,
                                                TrackTemplates.addToQueueButton(item as Track)
                                            ),
                                            InteractionTemplates.interactions(type, item)
                                        ).classes("align-children")
                                    ).build()
                            ).build()
                    ).build()
            ).build();
    }

    private static itemSpecificItems(type: EntityType, item: Track | Playlist | Album) {
        const items = [];

        switch (type) {
            case EntityType.track:
                if ((item as Track).processed) {
                    items.push(
                        TrackTemplates.waveform(
                            item as Track,
                            JSON.parse((item as Track).loudness_data)
                        )
                    );
                } else {
                    items.push(TrackTemplates.waveform(item as Track, []));
                }
                items.push(
                    create("span")
                        .classes("nopointer", "text-small", "align-center")
                        .text(Time.format((item as Track).length))
                        .build()
                );
        }

        return items;
    }

    static cover(
        type: EntityType,
        item: Track | Playlist | Album,
        coverContext: string,
        startCallback: Function | null = null
    ) {
        const imageState = signal(DefaultImages[type]);
        const fileType = `${type}Cover` as MediaFileType;
        if (item.has_cover) {
            imageState.value = Util.getImage(item.id, fileType);
        }
        const coverLoading = signal(false);
        const start = async () => startItem(type, item, { startCallback });
        const isOwnItem = compute(u => u?.id === item.user_id, currentUser);
        const playButtonContexts = ["card-cover", "queue-cover"];
        const onlyShowOnHover = compute(
            id => coverContext !== "cover" && id !== item.id,
            currentTrackId
        );
        const buttonClass = compute(
            (s): string => (s ? "showOnParentHover" : "_"),
            onlyShowOnHover
        );
        const hiddenClass = compute((s): string => (s ? "hidden" : "_"), onlyShowOnHover);

        return create("div")
            .classes("cover-container", "relative", "pointer", coverContext)
            .attributes(`${type}_id`, item.id)
            .id(item.id)
            .children(
                create("img")
                    .classes("cover", "blurOnParentHover")
                    .src(imageState)
                    .alt(item.title)
                    .onclick(() => {
                        Ui.showImageModal(imageState);
                    })
                    .build(),
                when(
                    isOwnItem,
                    create("div")
                        .classes(
                            "hidden",
                            coverContext === "cover" ? "showOnParentHover" : "_",
                            "centeredInParent",
                            "flex"
                        )
                        .children(
                            MusicTemplates.entityCoverButtons(fileType, item, imageState, coverLoading),
                            when(coverLoading, GenericTemplates.loadingSpinner())
                        )
                        .build()
                ),
                when(
                    playButtonContexts.includes(coverContext),
                    create("div")
                        .classes("centeredInParent", hiddenClass, buttonClass)
                        .children(MusicTemplates.playButton(type, item.id, start))
                        .build()
                )
            ).build();
    }

    static entityCoverButtons(fileType: MediaFileType, item: Track | Playlist | Album, imageState: Signal<string>, coverLoading: Signal<boolean>) {
        return horizontal(
            GenericTemplates.deleteIconButton("delete-image-button", () =>
                MediaActions.deleteMedia(
                    fileType,
                    item.id,
                    imageState,
                    coverLoading,
                ),
            ),
            GenericTemplates.uploadIconButton("replace-image-button", () =>
                TrackActions.replaceCover(item.id, true, imageState, coverLoading),
            ),
        );
    }

    static playButton(type: EntityType, itemId: number, start: Function) {
        const isPlaying = compute(
            (c, pf, p) => {
                if (type !== EntityType.track) {
                    return pf?.id === itemId && p;
                }

                return c === itemId && p;
            },
            currentTrackId,
            playingFrom,
            playingHere
        );
        const onclick = async () => {
            if (playingHere.value && currentTrackId.value === itemId) {
                await PlayManager.pauseAsync(currentTrackId.value);
            } else {
                start();
            }
        };
        const isLoading = compute((id, loading) => id === itemId && loading, currentTrackId, loadingAudio);
        const icon = getPlayIcon(isPlaying, isLoading);

        return GenericTemplates.roundIconButton(
            {
                icon,
                isUrl: true,
                classes: ["svgInverted", compute((l): string => l ? "spinner-animation" : "_", isLoading)],
            },
            onclick
        );
    }

    static feed(type: string, options: any = {}) {
        const feedMap: Record<string, string> = {
            following: ApiRoutes.followingFeed,
            explore: ApiRoutes.exploreFeed,
            history: ApiRoutes.historyFeed,
            autoQueue: ApiRoutes.autoQueueFeed,
        };
        const endpoint = feedMap[type];
        const pageState = signal(1);
        const tracksState = signal<Track[]>([]);
        const filterState = signal("all");
        const loadingState = signal(false);
        const pageSize = 10;
        const update = async () => {
            const pageNumber = pageState.value;
            const filter = filterState.value;
            const offset = (pageNumber - 1) * pageSize;
            const params = type === "following" ? { offset, filter } : { offset };
            loadingState.value = true;
            const res = await Api.getFeed(endpoint, Object.assign(params, options));
            const newTracks = res ?? [];

            if (newTracks && newTracks.length === 0 && pageNumber > 1) {
                pageState.value -= 1;
                loadingState.value = false;
                return;
            }

            tracksState.value = newTracks;
            loadingState.value = false;
        };
        pageState.subscribe(update);
        filterState.subscribe(update);
        const feedVisible = compute(u => u || type === "explore", currentUser);
        setTimeout(() => update());

        return create("div")
            .classes("fullHeight")
            .children(
                when(feedVisible, create("span").text("Log in to see this feed").build(), true),
                when(
                    feedVisible,
                    TrackTemplates.trackListWithPagination(
                        tracksState,
                        pageState,
                        type,
                        filterState
                    )
                )
            ).build();
    }

    static addListToQueueButton(list: Playlist | Album) {
        const allTracksInQueue = compute(
            q => list.tracks && list.tracks.every(t => q.includes(t.track_id)),
            manualQueue
        );
        const text = compute((q): string => (q ? "Unqueue" : "Queue"), allTracksInQueue);
        const icon = compute((q): string => (q ? Icons.UNQUEUE : Icons.QUEUE), allTracksInQueue);
        const buttonClass = compute(
            (q): string => (q ? "audio-queueremove" : "audio-queueadd"),
            allTracksInQueue
        );

        return button({
            text,
            icon: {
                icon,
                classes: ["inline-icon", "svg", "nopointer"],
                adaptive: true,
                isUrl: true,
            },
            classes: [buttonClass, "secondary"],
            onclick: async () => {
                for (const track of list.tracks!) {
                    if (!manualQueue.value.includes(track.track_id)) {
                        QueueManager.addToManualQueue(track.track_id);
                    }
                }
            },
        });
    }

    static title(type: EntityType, title: string, id: number, icons: AnyNode[] = [], textSize: string = "text-large") {
        let baseRoute = RoutePath.track;
        switch (type) {
            case EntityType.album:
                baseRoute = RoutePath.album;
                break;
            case EntityType.playlist:
                baseRoute = RoutePath.playlist;
                break;
        }

        return create("div")
            .classes("flex")
            .children(
                create("span")
                    .classes("clickable", textSize, "pointer")
                    .text(title)
                    .onclick(() => navigate(`${baseRoute}/${id}`))
                    .build(),
                ...icons,
            ).build();
    }
}
