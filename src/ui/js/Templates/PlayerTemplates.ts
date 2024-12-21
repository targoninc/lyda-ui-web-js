import {PlayManager} from "../Streaming/PlayManager.ts";
import {StreamingUpdater} from "../Streaming/StreamingUpdater.ts";
import {Icons} from "../Enums/Icons.js";
import {Time} from "../Classes/Helpers/Time.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {Images} from "../Enums/Images.ts";
import {QueueTemplates} from "./QueueTemplates.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {CommentTemplates} from "./CommentTemplates.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {Util} from "../Classes/Util.ts";
import {create, ifjs, StringOrSignal} from "../../fjsc/src/f2.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {User} from "../Models/DbModels/User.ts";
import {navigate} from "../Routing/Router.ts";
import {FJSC} from "../../fjsc";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {
    currentlyBuffered,
    currentTrackId,
    currentTrackPosition, loopMode, muted,
    playingElsewhere,
    playingFrom,
    playingHere, volume
} from "../state.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {IconConfig} from "../../fjsc/src/Types.ts";
import {LoopMode} from "../Enums/LoopMode.ts";

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
            .classes("audio-player", "flex-grow", "flex")
            .id("player_" + track.id)
            .children(
                create("div")
                    .classes("audio-player-controls", "fullWidth", "flex", "rounded")
                    .id(track.id)
                    .attributes("duration", track.length)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.playerIconButton({
                            icon: compute(p => p ? Icons.PAUSE : Icons.PLAY, playingHere),
                            adaptive: true,
                            isUrl: true,
                        }, async () => {
                            PlayManager.togglePlayAsync(track.id).then();
                        }, "Play/Pause"),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.trackTime(track),
                        PlayerTemplates.loudnessControl(track)
                    ).build()
            ).build();
    }

    private static trackScrubbar(track: Track, bufferPercent: Signal<string>, positionPercent: Signal<string>) {
        return create("div")
            .classes("audio-player-scrubber", "flex-grow", "flex", "rounded", "padded-inline")
            .id(track.id)
            .onmousedown(PlayManager.scrubFromElement)
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e);
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

    private static trackTime(track: Track) {
        return create("div")
            .classes("audio-player-time", "flex", "rounded", "padded-inline")
            .children(
                create("span")
                    .id(track.id)
                    .classes("audio-player-time-current", "nopointer", "align-center")
                    .text("0:00")
                    .build(),
                create("span")
                    .classes("audio-player-time-separator", "nopointer", "align-center")
                    .text("/")
                    .build(),
                create("span")
                    .classes("audio-player-time-total", "nopointer", "align-center")
                    .text(Time.format(track.length))
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
                PlayerTemplates.playerIconButton({
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

    static async player(track: Track, trackUser: User, user: User) {
        const queue = QueueManager.getManualQueue();
        const tasks = queue.map(id => PlayManager.getTrackData(id));
        const trackList = await Promise.all(tasks);

        return create("div")
            .classes("flex-v")
            .id("permanent-player")
            .children(
                ifjs(playingElsewhere, FJSC.heading({
                    text: "Playing on another instance of Lyda",
                    level: 2,
                })),
                ifjs(playingElsewhere, create("div")
                    .classes("flex-v", "fullWidth")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                ...await PlayerTemplates.bottomTrackInfo(track, trackUser, user, trackList),
                                ...PlayerTemplates.audioControls()
                            ).build(),
                        create("div")
                            .classes("flex")
                            .children(
                                PlayerTemplates.audioPlayer(track),
                            ).build(),
                    ).build(), true)
            ).build();
    }

    static playingFrom() {
        const id = compute(pf => pf?.id, playingFrom);
        const type = compute(pf => pf?.type, playingFrom);
        const name = compute(pf => pf?.name, playingFrom);

        return ifjs(playingFrom, create("div")
            .classes("playing-from", "flex")
            .children(
                create("span")
                    .classes("text-small", "padded-inline", "align-center", "clickable", "rounded")
                    .onclick(() => navigate(`${type.value}/${id.value}`))
                    .text("Playing from " + name)
                    .build(),
            ).build());
    }

    static noSubscriptionInfo() {
        return create("span")
            .classes("no-sub-info", "rounded", "clickable", "text-small", "padded-inline", "align-center")
            .text("Listening in 96kbps. Subscribe for up to 320kbps.")
            .onclick(() => {
                window.open("https://finance.targoninc.com", "_blank");
                notify("Subscriptions page opened in new tab.");
            }).build();
    }

    static async bottomTrackInfo(track: Track, trackUser: User, user: User, trackList: { track: Track }[]) {
        const icons = [];
        const isPrivate = track.visibility !== "public";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        track.likes = track.likes ?? [];
        track.comments = track.comments ?? [];
        track.reposts = track.reposts ?? [];

        const cover = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            Util.getTrackCover(track.id).then((src) => {
                cover.value = src;
            });
        }

        return [
            create("img")
                .classes("cover-image", "inline-cover", "align-center", "rounded", "clickable", "hover-image")
                .src(cover)
                .onclick(async () => {
                    Ui.getImageModal(cover);
                }).build(),
            create("span")
                .classes("title", "clickable", "padded-inline", "align-center")
                .text(track.title)
                .onclick(() => {
                    navigate("track/" + track.id);
                }).build(),
            ...icons,
            UserTemplates.userWidget(trackUser, Util.arrayPropertyMatchesUser(trackUser.follows ?? [], "following_user_id", user),
                [], ["align-center"], UserWidgetContext.player),
            PlayerTemplates.playingFrom(),
            await PlayerTemplates.moreMenu(track, isPrivate, user, trackList),
            create("div")
                .classes("flex", "align-center", "hideOnMidBreakpoint")
                .children(
                    StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                        Util.arrayPropertyMatchesUser(track.likes, "userId", user)),
                    isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "userId", user)),
                    CommentTemplates.commentsIndicator(track.id, track.comments.length),
                    ...await QueueTemplates.queue(trackList)
                ).build()
        ];
    }

    private static async moreMenu(track: Track, isPrivate: boolean, user: User, trackList: { track: Track }[]) {
        const menuShown = signal(false);
        const activeClass = compute((m: boolean): string => m ? "active" : "_", menuShown);

        return create("div")
            .classes("relative", "player-button")
            .children(
                PlayerTemplates.playerIconButton({
                    icon: "more_horiz",
                    adaptive: true,
                }, async () => {
                    menuShown.value = !menuShown.value;
                }, "Open menu", ["showOnMidBreakpoint", activeClass]),
                ifjs(menuShown, create("div")
                    .classes("popout-above", "card", "flex-v")
                    .children(
                        StatisticsTemplates.likesIndicator("track", track.id, track.likes!.length,
                            Util.arrayPropertyMatchesUser(track.likes!, "userId", user)),
                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts!.length, Util.arrayPropertyMatchesUser(track.reposts!, "userId", user)),
                        CommentTemplates.commentsIndicator(track.id, track.comments!.length),
                        ...await QueueTemplates.queue(trackList)
                    ).build())
            ).build();
    }

    static audioControls() {
        const map: Record<LoopMode, string> = {
            [LoopMode.off]: Icons.LOOP_OFF,
            [LoopMode.single]: Icons.LOOP_SINGLE,
            [LoopMode.context]: Icons.LOOP_CONTEXT,
        };

        return [
            PlayerTemplates.playerIconButton({
                icon: compute(mode => map[mode], loopMode),
                adaptive: true,
                isUrl: true,
            }, async () => {
                await PlayManager.nextLoopMode();
            }, "Change loop mode"),
        ];
    }

    static playerIconButton(icon: IconConfig, onclick: Function, title: StringOrSignal = "", classes: StringOrSignal[] = []) {
        return create("button")
            .classes("player-button", "fjsc", ...classes)
            .onclick(onclick)
            .title(title)
            .children(
                FJSC.icon({
                    ...icon,
                    classes: ["player-button-icon", "align-center", "inline-icon", "svg", "nopointer"]
                }),
            ).build()
    }
}