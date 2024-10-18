import {PlayManager} from "../Streaming/PlayManager.ts";
import {StreamingUpdater} from "../Streaming/StreamingUpdater.ts";
import {create, signal} from "https://fjs.targoninc.com/f.js";
import {Icons} from "../Enums/Icons.js";
import {Time} from "../Classes/Helpers/Time.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {Images} from "../Enums/Images.ts";
import {QueueTemplates} from "./QueueTemplates.mjs";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {StatisticsTemplates} from "./StatisticsTemplates.mjs";
import {CommentTemplates} from "./CommentTemplates.mjs";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Ui} from "../Classes/Ui.ts";
import {Util} from "../Classes/Util.ts";

export class PlayerTemplates {
    static audioPlayer(track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        setInterval(async () => {
            await PlayManager.playCheck(track);
        }, 1000);
        const buffered = PlayManager.getBufferedLength(track.id);
        const duration = PlayManager.getDuration(track.id);
        const percent = (buffered / duration) * 100;
        const bufferWidth = Math.min(percent, 100) + "%";
        const isPlaying = PlayManager.isPlaying(track.id);

        return create("div")
            .classes("audio-player", "flex-grow", "flex")
            .id("player_" + track.id)
            .children(
                create("div")
                    .classes("audio-player-controls", "fullWidth", "flex", "rounded", "padded")
                    .id(track.id)
                    .attributes("duration", track.length)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        create("div")
                            .classes("audio-player-toggle", "clickable", "fakeButton", "flex", "rounded-50", "padded-inline", "relative")
                            .id(track.id)
                            .onclick(async e => {
                                await PlayManager.togglePlayAsync(e.target.id);
                            })
                            .children(
                                create("img")
                                    .classes("audio-player-control-icon", "align-center", "inline-icon", "svg", "nopointer", isPlaying ? "pause-adjust" : "play-adjust")
                                    .id(track.id)
                                    .src(isPlaying ? Icons.PAUSE : Icons.PLAY)
                                    .build(),
                                create("span")
                                    .classes("nopointer", "hidden")
                                    .text(isPlaying ? "Pause" : "Play")
                                    .build()
                            )
                            .build(),
                        create("div")
                            .classes("audio-player-scrubber", "flex-grow", "clickable", "flex", "rounded", "padded-inline")
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
                                    .classes("audio-player-scrubbar-buffered", "rounded", "nopointer")
                                    .styles("width", bufferWidth)
                                    .build(),
                                create("div")
                                    .classes("audio-player-scrubbar", "rounded", "nopointer")
                                    .build(),
                                create("div")
                                    .id(track.id)
                                    .classes("audio-player-scrubhead", "rounded", "nopointer")
                                    .build()
                            )
                            .build(),
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
                            )
                            .build(),
                        PlayerTemplates.loudnessControl(track)
                    )
                    .build()
            )
            .build();
    }

    static loudnessControl(track) {
        setTimeout(() => {
            StreamingUpdater.updateLoudness(window.currentTrackId, PlayManager.getLoudness(window.currentTrackId));
            StreamingUpdater.updateMuteState(window.currentTrackId);
        }, 100);
        const volumePercent = PlayManager.getLoudness(track.id) * 100;

        return create("div")
            .classes("loudness-control", "clickable", "relative")
            .id(track.id)
            .onwheel(PlayManager.setLoudnessFromWheel)
            .children(
                create("div")
                    .classes("loudness-button", "fakeButton", "clickable", "flex", "rounded-50", "padded-inline")
                    .id(track.id)
                    .onclick(e => {
                        PlayManager.toggleMute(e.target.id);
                    })
                    .children(
                        create("img")
                            .classes("loudness-control-icon", "align-center", "inline-icon", "svg", "nopointer")
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

    static async player(track, trackUser, user) {
        const queue = QueueManager.getManualQueue();
        const tasks = queue.map(id => PlayManager.getTrackData(id));
        const playingFrom = PlayManager.getPlayingFrom();
        const trackList = await Promise.all(tasks);
        const loopingSingle = PlayManager.isLoopingSingle();
        const loopingContext = PlayManager.isLoopingContext();
        const cover = signal(Images.DEFAULT_AVATAR);
        Util.getCoverFileFromTrackIdAsync(track.id, track.userId).then((src) => {
            cover.value = src;
        });

        return create("div")
            .classes("flex-v")
            .id("permanent-player")
            .children(
                create("div")
                    .classes("flex-v", "fullWidth")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                await PlayerTemplates.bottomTrackInfo(track, trackUser, user, playingFrom),
                                await QueueTemplates.queue(trackList),
                                PlayerTemplates.audioControls(loopingSingle, loopingContext)
                            ).build(),
                        create("div")
                            .classes("flex")
                            .children(
                                create("img")
                                    .classes("cover-image", "inline-cover", "align-center", "rounded", "clickable", "hover-image")
                                    .src(cover)
                                    .onclick(async () => {
                                        Ui.getImageModal(cover);
                                    })
                                    .build(),
                                PlayerTemplates.audioPlayer(track),
                            ).build(),
                    ).build()
            ).build();
    }

    static playingFrom(playingFrom) {
        const functionMap = {
            "album": AlbumActions.openAlbumFromElement,
            "playlist": PlaylistActions.openPlaylistFromElement,
        };

        return create("div")
            .classes("playing-from", "flex", playingFrom.id ? "_" : "hidden")
            .children(
                create("span")
                    .classes("text-small", "padded-inline", "align-center", "clickable", "rounded")
                    .onclick(functionMap[playingFrom.type])
                    .attributes(playingFrom.type + "_id", playingFrom.id)
                    .text("Playing from " + playingFrom.name)
                    .build(),
            ).build();
    }

    static noSubscriptionInfo() {
        return create("span")
            .classes("no-sub-info", "rounded", "clickable", "text-small", "padded-inline", "align-center")
            .text("Listening in 96kbps. Subscribe for up to 320kbps.")
            .onclick(() => {
                window.open("https://finance.targoninc.com", "_blank");
                Ui.notify("Subscriptions page opened in new tab.");
            })
            .build();
    }

    static async bottomTrackInfo(track, trackUser, user, playingFrom) {
        const icons = [];
        const isPrivate = track.visibility !== "public";
        if (isPrivate) {
            icons.push(GenericTemplates.lock());
        }

        return create("div")
            .classes("bottom-track-info", "flex")
            .children(
                !user.isSubscribed ? PlayerTemplates.noSubscriptionInfo() : null,
                create("span")
                    .classes("title", "clickable", "padded-inline", "align-center")
                    .text(track.title)
                    .attributes("track_id", track.id)
                    .onclick(TrackActions.openTrackFromElement)
                    .build(),
                ...icons,
                UserTemplates.userWidget(trackUser.id, trackUser.username, trackUser.displayname, await Util.getAvatarFromUserIdAsync(trackUser.id),
                    Util.arrayPropertyMatchesUser(trackUser.follows, "followingUserId", user),
                    [], ["align-center"]),
                PlayerTemplates.playingFrom(playingFrom),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        StatisticsTemplates.likesIndicator("track", track.id, track.tracklikes.length,
                            Util.arrayPropertyMatchesUser(track.tracklikes, "userId", user)),
                        isPrivate ? null : StatisticsTemplates.repostIndicator(track.id, track.reposts.length, Util.arrayPropertyMatchesUser(track.reposts, "userId", user)),
                        CommentTemplates.commentsIndicator(track.id, track.comments.length,
                            Util.arrayPropertyMatchesUser(track.comments, "userId", user)),
                    ).build()
            ).build();
    }

    static audioControls(loopingSingle, loopingContext) {
        let src = Icons.LOOP_OFF;
        if (loopingContext) {
            src = Icons.LOOP_CONTEXT;
        } else if (loopingSingle) {
            src = Icons.LOOP_SINGLE;
        }

        return create("div")
            .classes("audio-controls", "flex")
            .children(
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
                    ).build(),
            ).build();
    }
}