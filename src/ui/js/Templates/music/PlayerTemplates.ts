import {PlayManager} from "../../Streaming/PlayManager.ts";
import {Icons} from "../../Enums/Icons.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {Images} from "../../Enums/Images.ts";
import {QueueTemplates} from "./QueueTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {Ui} from "../../Classes/Ui.ts";
import {Util} from "../../Classes/Util.ts";
import {AnyElement, compute, create, Signal, signal, when} from "@targoninc/jess";
import {navigate} from "../../Routing/Router.ts";
import {
    currentlyBuffered,
    currentTrackId,
    currentTrackPosition,
    loopMode,
    manualQueue,
    muted,
    playingElsewhere,
    playingFrom,
    playingHere,
    volume
} from "../../state.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {heading} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {LoopMode} from "@targoninc/lyda-shared/src/Enums/LoopMode";
import {InteractionTemplates} from "../InteractionTemplates.ts";
import {MusicTemplates} from "./MusicTemplates.ts";
import {TrackTemplates} from "./TrackTemplates.ts";

export class PlayerTemplates {
    static audioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        setInterval(async () => {
            await PlayManager.playCheck(track);
        }, 1000);
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute((p, isCurrent) => isCurrent ? `${p.relative * 100}%` : "0%", currentTrackPosition, isCurrentTrack);
        const bufferPercent = compute((p, isCurrent) => isCurrent ? `${p * 100}%` : "0%", currentlyBuffered, isCurrentTrack);

        return create("div")
            .classes("audio-player", "flex-grow", "flex-v")
            .id("player_" + track.id)
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.roundIconButton({
                            icon: compute(p => p ? Icons.PAUSE : Icons.PLAY, playingHere),
                            adaptive: true,
                            isUrl: true,
                        }, async () => {
                            PlayManager.togglePlayAsync(track.id).then();
                        }, "Play/Pause"),
                        GenericTemplates.roundIconButton({
                            icon: "skip_next",
                            adaptive: true,
                        }, PlayManager.playNextFromQueues, "Next"),
                        PlayerTemplates.loopModeButton(),
                        create("div")
                            .classes("flex", "align-center", "hideOnMidBreakpoint")
                            .children(
                                InteractionTemplates.interactions(EntityType.track, track),
                            ).build()
                    ).build(),
                create("div")
                    .classes("audio-player-controls", "fullWidth", "flex", "rounded", "align-children")
                    .id(track.id)
                    .attributes("duration", track.length)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.currentTrackTime(track),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.totalTrackTime(track),
                    ).build()
            ).build();
    }

    private static currentTrackTime(track: Track) {
        return create("span")
            .id(track.id)
            .classes("audio-player-time-current", "nopointer", "align-center", "hideOnMidBreakpoint")
            .text("0:00")
            .build();
    }

    private static totalTrackTime(track: Track) {
        return create("span")
            .classes("audio-player-time-total", "nopointer", "align-center", "hideOnMidBreakpoint")
            .text(Time.format(track.length))
            .build();
    }

    private static trackScrubbar(track: Track, bufferPercent: Signal<string>, positionPercent: Signal<string>) {
        return create("div")
            .classes("audio-player-scrubber", "flex-grow", "flex", "rounded", "padded-inline")
            .id(track.id)
            .onmousedown(e => PlayManager.scrubFromElement(e, track.id))
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e, track.id);
                }
            })
            .children(
                create("div")
                    .id(track.id)
                    .classes("audio-player-buffer-indicator", "rounded", "nopointer")
                    .styles("left", bufferPercent)
                    .build(),
                create("div")
                    .classes("audio-player-scrubbar", "rounded", "nopointer")
                    .build(),
                create("div")
                    .classes("audio-player-scrubbar-time", "rounded", "nopointer")
                    .styles("width", positionPercent)
                    .build(),
                create("div")
                    .id(track.id)
                    .classes("audio-player-scrubhead", "rounded", "nopointer")
                    .styles("left", positionPercent)
                    .build()
            ).build();
    }

    static loudnessControl(track: Track) {
        const volumePercent = compute(vol => `${vol * 100}%`, volume);

        return create("div")
            .classes("loudness-control", "clickable", "relative")
            .id(track.id)
            .onwheel(PlayManager.setLoudnessFromWheel)
            .children(
                GenericTemplates.roundIconButton({
                    icon: compute(p => p ? Icons.MUTE : Icons.LOUD, muted),
                    adaptive: true,
                    isUrl: true,
                }, async () => {
                    PlayManager.toggleMute(track.id);
                }, "Mute/Unmute", ["loudness-button"]),
                create("div")
                    .classes("loudness-bar", "rounded", "padded", "relative", "hidden")
                    .id(track.id)
                    .children(
                        create("div")
                            .classes("audio-player-loudnessbackground", "fakeButton", "nopointer")
                            .build(),
                        create("div")
                            .classes("audio-player-loudnesstracker")
                            .onmousemove(async e => {
                                if (e.buttons === 1) {
                                    await PlayManager.setLoudnessFromElement(e);
                                }
                            })
                            .onclick(e => PlayManager.setLoudnessFromElement(e))
                            .build(),
                        create("div")
                            .classes("audio-player-loudnessbar", "rounded", "nopointer")
                            .build(),
                        create("div")
                            .classes("audio-player-loudnesshead", "rounded", "nopointer")
                            .styles("bottom", volumePercent)
                            .id(track.id)
                            .build(),
                    ).build()
            ).build();
    }

    static async player(track: Track, trackUser: User) {
        const cover = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            cover.value = Util.getTrackCover(track.id);
        }

        const trackList = signal<{ track: Track }[]>([]);
        manualQueue.subscribe(async (queue) => {
            const tasks = queue.map(id => PlayManager.getTrackData(id));
            trackList.value = await Promise.all(tasks);
        });
        const tasks = manualQueue.value.map(id => PlayManager.getTrackData(id));
        Promise.all(tasks).then(tracks => {
            trackList.value = tracks;
        });
        const queueComponentMore = compute((q: any[]) => QueueTemplates.queue(q), trackList);

        return create("div")
            .classes("flex-v")
            .id("permanent-player")
            .children(
                when(playingElsewhere, heading({
                    text: "Playing on another instance of Lyda",
                    level: 2,
                })),
                when(playingElsewhere, create("div")
                    .classes("flex", "fullWidth")
                    .children(
                        horizontal(
                            MusicTemplates.cover(EntityType.track, track, "player-cover", () => {
                                const windowWidth = window.innerWidth;
                                if (windowWidth < 600) {
                                    navigate(`${RoutePath.track}/` + track.id);
                                } else {
                                    Ui.showImageModal(cover);
                                }
                            }),
                        ).classes("hideOnSmallBreakpoint", "align-center"),
                        create("div")
                            .classes("flex", "flex-grow")
                            .children(
                                await PlayerTemplates.bottomTrackInfo(track, trackUser),
                                PlayerTemplates.audioPlayer(track),
                                await PlayerTemplates.moreMenu(track, queueComponentMore),
                                create("div")
                                    .classes("flex", "hideOnMidBreakpoint")
                                    .children(
                                        PlayerTemplates.loudnessControl(track),
                                        compute((q: any[]) => QueueTemplates.queue(q), trackList),
                                    ).build()
                            ).build(),
                    ).build(), true)
            ).build();
    }

    static playingFrom() {
        const id = compute(pf => pf?.id, playingFrom);
        const type = compute(pf => pf?.type, playingFrom);
        const name = compute(pf => `Playing from ${pf?.name}`, playingFrom);

        return when(playingFrom, create("div")
            .classes("playing-from", "flex")
            .children(
                create("span")
                    .classes("text-small", "padded-inline", "align-center", "clickable", "rounded")
                    .onclick(() => navigate(`${type.value}/${id.value}`))
                    .text(name)
                    .build(),
            ).build());
    }

    static noSubscriptionInfo() {
        return create("span")
            .classes("no-sub-info", "rounded", "clickable", "text-small", "padded-inline", "align-center")
            .text("Listening in 96kbps. Subscribe for up to 320kbps.")
            .onclick(() => navigate(RoutePath.subscribe)).build();
    }

    static async bottomTrackInfo(track: Track, trackUser: User) {
        const icons = track.visibility === "private" ? [GenericTemplates.lock()] : [];

        return vertical(
            TrackTemplates.title(track.title, track.id, icons),
            UserTemplates.userLink(UserWidgetContext.player, trackUser),
            PlayerTemplates.playingFrom(),
        ).classes("align-center", "no-gap").build();
    }

    private static async moreMenu(track: Track, queueComponent: Signal<AnyElement>) {
        const menuShown = signal(false);
        const activeClass = compute((m: boolean): string => m ? "active" : "_", menuShown);

        return create("div")
            .classes("relative", "round-button", "showOnMidBreakpoint")
            .children(
                GenericTemplates.roundIconButton({
                    icon: "more_horiz",
                    adaptive: true,
                }, async () => {
                    menuShown.value = !menuShown.value;
                }, "Open menu", ["showOnMidBreakpoint", activeClass]),
                when(menuShown, create("div")
                    .classes("popout-above", "card", "flex-v")
                    .children(
                        InteractionTemplates.interactions(EntityType.track, track),
                        queueComponent
                    ).build())
            ).build();
    }

    static loopModeButton() {
        const map: Record<LoopMode, string> = {
            [LoopMode.off]: Icons.LOOP_OFF,
            [LoopMode.single]: Icons.LOOP_SINGLE,
            [LoopMode.context]: Icons.LOOP_CONTEXT,
        };

        return GenericTemplates.roundIconButton({
            icon: compute(mode => map[mode as LoopMode], loopMode),
            adaptive: true,
            isUrl: true,
        }, async () => {
            await PlayManager.nextLoopMode();
        }, "Change loop mode");
    }
}