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
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {User} from "../Models/DbModels/User.ts";
import {navigate} from "../Routing/Router.ts";
import {FJSC} from "../../fjsc";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {currentlyBuffered, currentTrackId, currentTrackPosition, playingElsewhere, playingFrom} from "../state.ts";

export class PlayerTemplates {
    static audioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        setInterval(async () => {
            await PlayManager.playCheck(track);
        }, 1000);
        const isPlaying = PlayManager.isPlaying(track.id);
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
                        create("div")
                            .classes("audio-player-toggle", "audio-player-control", "clickable", "fakeButton", "flex", "rounded-50", "relative")
                            .id(track.id)
                            .onclick(() => {
                                PlayManager.togglePlayAsync(track.id).then();
                            })
                            .children(
                                FJSC.icon({
                                    icon: isPlaying ? Icons.PAUSE : Icons.PLAY,
                                    adaptive: true,
                                    id: track.id,
                                    isUrl: true,
                                    classes: ["audio-player-control-icon", "align-center", "inline-icon", "svg", "nopointer"]
                                }),
                                create("span")
                                    .classes("nopointer", "hidden")
                                    .text(isPlaying ? "Pause" : "Play")
                                    .build()
                            ).build(),
                        create("div")
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
                            ).build(),
                        create("div")
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
                            ).build(),
                        PlayerTemplates.loudnessControl(track)
                    ).build()
            ).build();
    }

    static loudnessControl(track: Track) {
        setTimeout(() => {
            StreamingUpdater.updateLoudness(currentTrackId.value, PlayManager.getLoudness(currentTrackId.value));
            StreamingUpdater.updateMuteState(currentTrackId.value);
        }, 100);
        const volumePercent = PlayManager.getLoudness(track.id) * 100;

        return create("div")
            .classes("loudness-control", "clickable", "relative")
            .id(track.id)
            .onwheel(PlayManager.setLoudnessFromWheel)
            .children(
                create("div")
                    .classes("loudness-button", "audio-player-control", "fakeButton", "clickable", "flex", "rounded-50")
                    .id(track.id)
                    .onclick(() => {
                        PlayManager.toggleMute(track.id);
                    })
                    .children(
                        create("img")
                            .classes("loudness-control-icon", "audio-player-control-icon", "align-center", "inline-icon", "svg", "nopointer")
                            .id(track.id)
                            .src(Icons.LOUD)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("loudness-bar", "rounded", "padded", "relative", "hidden")
                    .id(track.id)
                    .onmousemove(async e => {
                        if (e.buttons === 1) {
                            await PlayManager.setLoudnessFromElement(e);
                        }
                    })
                    .onclick(PlayManager.setLoudnessFromElement)
                    .children(
                        create("div")
                            .classes("audio-player-loudnessbackground", "fakeButton", "nopointer")
                            .build(),
                        create("div")
                            .classes("audio-player-loudnessbar", "rounded", "nopointer")
                            .build(),
                        create("div")
                            .classes("audio-player-loudnesshead", "rounded", "nopointer")
                            .styles("bottom", volumePercent.toString() + "%")
                            .id(track.id)
                            .build(),
                    )
                    .build()
            )
            .build();
    }

    static async player(track: Track, trackUser: User, user: User) {
        const queue = QueueManager.getManualQueue();
        const tasks = queue.map(id => PlayManager.getTrackData(id));
        const trackList = await Promise.all(tasks);
        const loopingSingle = PlayManager.isLoopingSingle();
        const loopingContext = PlayManager.isLoopingContext();

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
                                ...await PlayerTemplates.bottomTrackInfo(track, trackUser, user),
                                ...await QueueTemplates.queue(trackList),
                                ...PlayerTemplates.audioControls(loopingSingle, loopingContext)
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

    static async bottomTrackInfo(track: Track, trackUser: User, user: User) {
        const icons = [];
        const isPrivate = track.visibility !== "public";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        track.likes = track.likes ?? [];
        track.comments = track.comments ?? [];
        track.reposts = track.reposts ?? [];

        const cover = signal(Images.DEFAULT_AVATAR);
        if (track.has_cover) {
            Util.getCoverFileFromTrackIdAsync(track.id, track.user_id).then((src) => {
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
                [], ["align-center"]),
            PlayerTemplates.playingFrom(),
            create("div")
                .classes("flex", "align-center")
                .children(
                    StatisticsTemplates.likesIndicator("track", track.id, track.likes.length,
                        Util.arrayPropertyMatchesUser(track.likes, "userId", user)),
                    isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "userId", user)),
                    CommentTemplates.commentsIndicator(track.id, track.comments.length),
                ).build()
        ];
    }

    static audioControls(loopingSingle: boolean, loopingContext: boolean) {
        let src = Icons.LOOP_OFF;
        if (loopingContext) {
            src = Icons.LOOP_CONTEXT;
        } else if (loopingSingle) {
            src = Icons.LOOP_SINGLE;
        }

        return [
            create("div")
                .classes("loop-button", "fakeButton", "clickable", "flex", "rounded-50", "padded-inline", "align-center")
                .onclick(async () => {
                    await PlayManager.toggleLoop();
                })
                .title("Change loop mode")
                .children(
                    create("img")
                        .classes("loop-button-img", "align-center", "inline-icon", "svg", "nopointer")
                        .src(src)
                        .build(),
                ).build()
        ];
    }
}