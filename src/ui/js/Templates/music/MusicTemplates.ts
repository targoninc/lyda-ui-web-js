import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { AnyNode, compute, create, Signal, signal, signalMap, when } from "@targoninc/jess";
import {currentTrackId, currentUser, loadingAudio, manualQueue, playingFrom, playingHere} from "../../state.ts";
import { InteractionStateManager } from "../../Classes/InteractionStateManager.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { TrackTemplates } from "./TrackTemplates.ts";
import { DefaultImages } from "../../Enums/DefaultImages.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { Ui } from "../../Classes/Ui.ts";
import { MediaActions } from "../../Actions/MediaActions.ts";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { Icons } from "../../Enums/Icons.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { button } from "@targoninc/jess-components";
import { QueueManager } from "../../Streaming/QueueManager.ts";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { t } from "../../../locales";
import { TrackList } from "../../Models/TrackList.ts";
import { FeedItem } from "../../Models/FeedItem.ts";
import { Visibility } from "@targoninc/lyda-shared/src/Enums/Visibility";
import { truncateText } from "../../Classes/Helpers/CustomText.ts";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { AlbumActions } from "../../Actions/AlbumActions.ts";
import { PlaylistActions } from "../../Actions/PlaylistActions.ts";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import {startItem} from "../../Actions/MusicActions.ts";

export class MusicTemplates {

    static cover(
        type: EntityType,
        item: FeedItem,
        coverContext: CoverContext,
        onclickOverride: Function | null = null,
    ) {
        const imageState = signal(DefaultImages[type]);
        const fileType = `${type}Cover` as MediaFileType;
        if (item.has_cover) {
            imageState.value = Util.getImage(item.id, fileType);
        }
        const coverLoading = signal(false);
        const start = async () => {
            if (onclickOverride) {
                await onclickOverride();
            } else {
                switch (type) {
                    case EntityType.track:
                        await startItem(item as Track);
                        break;
                    case EntityType.playlist: {
                        const firstTrack = item.tracks ? item.tracks[0].track : null;
                        if (firstTrack) {
                            await PlaylistActions.startTrackInPlaylist(item as Playlist, firstTrack, true);
                        }
                        break;
                    }
                    case EntityType.album: {
                        const firstTrack = item.tracks ? item.tracks[0].track : null;
                        if (firstTrack) {
                            await AlbumActions.startTrackInAlbum(item as Album, firstTrack, true);
                        }
                        break;
                    }
                }
            }
        };
        const isOwnItem = compute(u => u?.id === item.user_id, currentUser);
        const playButtonContexts = [CoverContext.card, CoverContext.queue, CoverContext.small];
        const onlyShowOnHover = compute(
            id => coverContext !== CoverContext.standalone && id !== item.id,
            currentTrackId,
        );
        const buttonClass = compute(
            (s): string => (s ? "showOnParentHover" : "_"),
            onlyShowOnHover,
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
                    }).build(),
                when(
                    isOwnItem,
                    create("div")
                        .classes(
                            "hidden",
                            coverContext === CoverContext.standalone ? "showOnParentHover" : "_",
                            "centeredInParent",
                            "flex",
                        ).children(
                        MusicTemplates.entityCoverButtons(fileType, item, imageState, coverLoading),
                        when(coverLoading, GenericTemplates.loadingSpinner()),
                    ).build(),
                ),
                when(
                    playButtonContexts.includes(coverContext),
                    create("div")
                        .classes("centeredInParent", hiddenClass, buttonClass)
                        .children(MusicTemplates.playButton(type, item.id, start))
                        .build(),
                ),
            ).build();
    }

    static entityCoverButtons(fileType: MediaFileType, item: FeedItem, imageState: Signal<string>, coverLoading: Signal<boolean>) {
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
                MediaActions.replaceImage(fileType, item.id, true, imageState, coverLoading)),
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
            playingHere,
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
        const disabledClass = compute((l): string => l ? "disabled" : "_", loadingAudio);

        return GenericTemplates.roundIconButton(
            {
                icon,
                isUrl: true,
                classes: [compute((l): string => l ? "spinner-animation" : "_", isLoading)],
            },
            onclick,
            t("PLAY_PAUSE"),
            [disabledClass],
        );
    }

    static tracksInList(
        tracks: Signal<ListTrack[]>,
        canEdit: boolean,
        list: Album | Playlist,
        type: "album" | "playlist",
    ) {
        const noTracks = compute(t => t.length === 0, tracks);

        return create("div")
            .classes("flex-v")
            .children(
                when(
                    noTracks,
                    create("div")
                        .classes("card")
                        .children(
                            create("span")
                                .text(t("NOTHING_FOUND"))
                                .build(),
                        ).build(),
                ),
                signalMap(tracks, create("div").classes("flex-v"), (track, i) => {
                    let parent = horizontal().classes("fullWidth");
                    if (canEdit) {
                        parent = GenericTemplates.dragTargetInList(async (data: any) => {
                            await TrackActions.reorderTrack(type, list.id, data.id, tracks, i);
                        }, i.toString()).classes("fullWidth");
                    }

                    return create("div")
                        .classes("flex-v", "relative")
                        .children(
                            parent
                                .children(TrackTemplates.trackInList(track, canEdit, list, tracks, type))
                                .build(),
                        ).build();
                }),
            ).build();
    }

    static cardItem(type: EntityType, list: TrackList, isSecondary = false) {
        if (!list.user) {
            throw new Error(`Album has no user: ${list.id}`);
        }
        InteractionStateManager.addContext(type, list.id, "list");

        const icons = [];
        if (list.visibility === Visibility.private) {
            icons.push(GenericTemplates.lock());
        }

        return create("div")
            .classes(`${type}-card`, "padded", "flex-v", "small-gap", isSecondary ? "secondary" : "_")
            .children(
                vertical(
                    MusicTemplates.cover(type, list, CoverContext.card),
                    horizontal(
                        InteractionTemplates.interactions(type, list, {
                            showCount: false,
                        }),
                        MusicTemplates.title(type, list.title, list.id, icons),
                    ).classes("align-children"),
                ),
            ).build();
    }

    static addListToQueueButton(list: Playlist | Album) {
        const allTracksInQueue = compute(
            q => list.tracks && list.tracks.length > 0 && list.tracks.every(t => q.includes(t.track_id)),
            manualQueue,
        );
        const text = compute((q): string => (q ? `${t("UNQUEUE")}` : `${t("QUEUE")}`), allTracksInQueue);
        const icon = compute((q): string => (q ? Icons.UNQUEUE : Icons.QUEUE), allTracksInQueue);
        const buttonClass = compute(
            (q): string => (q ? "audio-queueremove" : "audio-queueadd"),
            allTracksInQueue,
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

    static title(type: EntityType, title: string, id: number, icons: AnyNode[] = [], textSize: TextSize = TextSize.large, goToEntity = true, noTruncate = false) {
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
                    .classes(...(goToEntity ? ["clickable", "pointer"] : ["_"]), textSize)
                    .title(title)
                    .text(noTruncate ? title : truncateText(title, 75))
                    .onclick(() => goToEntity ? navigate(`${baseRoute}/${id}`) : null)
                    .build(),
                ...icons,
            ).build();
    }
}
