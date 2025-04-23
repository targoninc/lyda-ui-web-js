import {GenericTemplates} from "../GenericTemplates.ts";
import {Track} from "../../Models/DbModels/lyda/Track.ts";
import {Album} from "../../Models/DbModels/lyda/Album.ts";
import {Playlist} from "../../Models/DbModels/lyda/Playlist.ts";
import {create, ifjs} from "../../../fjsc/src/f2.ts";
import {currentTrackId, currentUser, playingFrom, playingHere} from "../../state.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {Util} from "../../Classes/Util.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {StatisticsTemplates} from "../StatisticsTemplates.ts";
import {ItemType} from "../../Enums/ItemType.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {compute, signal} from "../../../fjsc/src/signals.ts";
import {DefaultImages} from "../../Enums/DefaultImages.ts";
import {MediaFileType} from "../../Enums/MediaFileType.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {Ui} from "../../Classes/Ui.ts";
import {MediaActions} from "../../Actions/MediaActions.ts";
import {TrackActions} from "../../Actions/TrackActions.ts";
import {startItem} from "../../Actions/MusicActions.ts";
import {Icons} from "../../Enums/Icons.ts";

export class MusicTemplates {
    static feedEntry(type: ItemType, item: Track | Playlist | Album) {
        const icons = [];
        const isPrivate = item.visibility === "private";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }
        const playingClass = compute((id): string => id === item.id ? "playing" : "_", currentTrackId);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes(`feed-${type}`, "flex", "padded", "rounded", "fullWidth", "card", playingClass)
                    .id(item.id)
                    .styles("max-width", "100%")
                    .children(
                        MusicTemplates.cover(type, item, "inline-cover"),
                        create("div")
                            .classes("flex-v", "flex-grow", "no-gap")
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
                                                        TrackTemplates.title(item.title, item.id, icons),
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
                                                            .build(),
                                                    ).build()
                                            ).build(),
                                    ).build(),
                                create("div")
                                    .classes("flex", "space-outwards", "align-children")
                                    .children(
                                        create("div")
                                            .classes("flex", "align-children")
                                            .children(
                                                ...MusicTemplates.itemSpecificItems(type, item),
                                            ).build(),
                                        create("div")
                                            .classes("flex", "align-children")
                                            .children(
                                                StatisticsTemplates.likesIndicator(type, item.id, item.likes?.length ?? 0,
                                                    Util.arrayPropertyMatchesUser(item.likes ?? [], "user_id")),
                                                StatisticsTemplates.likeListOpener(item.likes ?? []),
                                                ...MusicTemplates.itemSpecificActions(type, item),
                                            ).build(),
                                    ).build(),
                            ).build()
                    ).build()
            ).build();
    }

    private static itemSpecificActions(type: ItemType, item: Track | Playlist | Album) {
        const items = [];

        switch (type) {
            case ItemType.track:
                item = item as Track;
                if (item.visibility !== "private") {
                    items.push(StatisticsTemplates.repostIndicator(item.id, item.reposts?.length ?? 0, Util.arrayPropertyMatchesUser(item.reposts ?? [], "user_id")));
                    items.push(StatisticsTemplates.repostListOpener(item.reposts ?? []));
                }
                items.push(TrackTemplates.addToQueueButton(item));
        }

        return items;
    }

    private static itemSpecificItems(type: ItemType, item: Track | Playlist | Album) {
        const items = [];

        switch (type) {
            case ItemType.track:
                item = item as Track;
                if (item.processed) {
                    items.push(TrackTemplates.waveform(item, JSON.parse(item.loudness_data)));
                } else {
                    items.push(TrackTemplates.waveform(item, []));
                }
                items.push(create("span")
                    .classes("nopointer", "text-small", "align-center")
                    .text(Time.format(item.length))
                    .build());
        }

        return items;
    }

    static cover(type: ItemType, item: Track | Playlist | Album, coverContext: string, startCallback: Function | null = null) {
        const imageState = signal(DefaultImages[type]);
        const fileType = `${type}Cover` as MediaFileType;
        if (item.has_cover) {
            imageState.value = Util.getCover(item.id, fileType);
        }
        const coverLoading = signal(false);
        const start = async () => startItem(type, item, startCallback);
        const isOwnItem = compute(u => u?.id === item.user_id, currentUser);

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
                ifjs(isOwnItem, create("div")
                    .classes("hidden", coverContext === "cover" ? "showOnParentHover" : "_", "centeredInParent", "flex")
                    .children(
                        GenericTemplates.deleteIconButton("delete-image-button", () => MediaActions.deleteMedia(fileType, item.id, imageState, coverLoading)),
                        GenericTemplates.uploadIconButton("replace-image-button", () => TrackActions.replaceCover(item.id, true, imageState, coverLoading)),
                        ifjs(coverLoading, GenericTemplates.loadingSpinner()),
                    ).build()),
                ifjs(coverContext !== "cover", create("div")
                    .classes("centeredInParent", "hidden", coverContext !== "cover" ? "showOnParentHover" : "_")
                    .children(
                        MusicTemplates.playButton(type, item.id, start)
                    ).build()),
            ).build();
    }

    static playButton(type: ItemType, itemId: number, start: Function) {
        const isPlaying = compute((c, pf, p) => {
            if (type !== ItemType.track) {
                return pf?.id === itemId;
            }

            return c === itemId && p;
        }, currentTrackId, playingFrom, playingHere);
        const icon = compute(p => p ? Icons.PAUSE : Icons.PLAY, isPlaying);
        const onclick = async () => {
            if (isPlaying.value && type !== ItemType.track) {
                await PlayManager.pauseAsync(currentTrackId.value);
            } else {
                start();
            }
        };

        return GenericTemplates.roundIconButton({
            icon,
            isUrl: true,
            classes: ["inline-icon", "svgInverted"]
        }, onclick);
    }
}