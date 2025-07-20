import { PlayManager } from "../../Streaming/PlayManager.ts";
import { Icons } from "../../Enums/Icons.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Images } from "../../Enums/Images.ts";
import { QueueTemplates } from "./QueueTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { Ui } from "../../Classes/Ui.ts";
import { Util } from "../../Classes/Util.ts";
import { compute, create, Signal, signal, when } from "@targoninc/jess";
import { navigate } from "../../Routing/Router.ts";
import {
    currentlyBuffered,
    currentQuality,
    currentTrackId,
    currentTrackPosition,
    loopMode,
    muted,
    playerExpanded,
    playingElsewhere,
    playingFrom,
    playingHere,
    volume,
} from "../../state.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { heading } from "@targoninc/jess-components";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { LoopMode } from "@targoninc/lyda-shared/src/Enums/LoopMode";
import { InteractionTemplates } from "../InteractionTemplates.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { TrackTemplates } from "./TrackTemplates.ts";
import { StreamingQuality } from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";

export class PlayerTemplates {
    static async bigAudioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        setInterval(async () => {
            await PlayManager.playCheck(track);
        }, 1000);
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack
        );

        return create("div")
            .classes("audio-player", "flex-grow", "flex-v")
            .id("player_" + track.id)
            .children(
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        GenericTemplates.roundIconButton(
                            {
                                icon: "skip_previous",
                                adaptive: true,
                            },
                            PlayManager.playPreviousFromQueues,
                            "Previous"
                        ),
                        PlayerTemplates.roundPlayButton(track),
                        GenericTemplates.roundIconButton(
                            {
                                icon: "skip_next",
                                adaptive: true,
                            },
                            PlayManager.playNextFromQueues,
                            "Next"
                        ),
                        PlayerTemplates.loopModeButton(),
                        create("div")
                            .classes("flex", "align-center", "hideOnMidBreakpoint")
                            .children(InteractionTemplates.interactions(EntityType.track, track))
                            .build(),
                        await PlayerTemplates.moreMenu(track)
                    )
                    .build(),
                create("div")
                    .classes(
                        "audio-player-controls",
                        "fullWidth",
                        "flex",
                        "rounded",
                        "align-children"
                    )
                    .id(track.id)
                    .attributes("duration", track.length)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.currentTrackTime(),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.totalTrackTime(track)
                    )
                    .build()
            )
            .build();
    }

    static async mobileAudioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        setInterval(async () => {
            await PlayManager.playCheck(track);
        }, 1000);
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack
        );

        return create("div")
            .classes("audio-player", "flex-grow", "flex-v")
            .id("player_" + track.id)
            .children(
                create("div")
                    .classes("flex", "space-outwards")
                    .children(
                        PlayerTemplates.loopModeButton(),
                        horizontal(
                            GenericTemplates.roundIconButton(
                                {
                                    icon: "skip_previous",
                                    adaptive: true,
                                },
                                PlayManager.playPreviousFromQueues,
                                "Previous"
                            ),
                            PlayerTemplates.roundPlayButton(track),
                            GenericTemplates.roundIconButton(
                                {
                                    icon: "skip_next",
                                    adaptive: true,
                                },
                                PlayManager.playNextFromQueues,
                                "Next"
                            ),
                        ),
                        InteractionTemplates.interactions(EntityType.track, track, {
                            showCount: false,
                            overrideActions: [InteractionType.like],
                        })
                    )
                    .build(),
                create("div")
                    .classes(
                        "audio-player-controls",
                        "fullWidth",
                        "flex",
                        "rounded",
                        "align-children"
                    )
                    .id(track.id)
                    .attributes("duration", track.length)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.currentTrackTime(true),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.totalTrackTime(track, true)
                    ).build()
            ).build();
    }

    private static roundPlayButton(track: Track) {
        return GenericTemplates.roundIconButton(
            {
                icon: compute(p => (p ? Icons.PAUSE : Icons.PLAY), playingHere),
                adaptive: true,
                isUrl: true,
            },
            async () => {
                PlayManager.togglePlayAsync(track.id).then();
            },
            "Play/Pause"
        );
    }

    private static currentTrackTime(mobilePlayer = false) {
        return create("span")
            .classes("nopointer", "align-center", mobilePlayer ? "_" : "hideOnMidBreakpoint")
            .text(compute(t => Time.format(t.absolute), currentTrackPosition))
            .build();
    }

    private static totalTrackTime(track: Track, mobilePlayer = false) {
        return create("span")
            .classes("audio-player-time-total", "nopointer", "align-center", mobilePlayer ? "_" : "hideOnMidBreakpoint")
            .text(Time.format(track.length))
            .build();
    }

    private static trackScrubbar(
        track: Track,
        bufferPercent: Signal<string>,
        positionPercent: Signal<string>
    ) {
        return create("div")
            .classes("audio-player-scrubber", "flex-grow", "flex", "rounded", "padded-inline")
            .id(track.id)
            .onmousedown(e => PlayManager.scrubFromElement(e, track.id))
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e, track.id);
                }
            })
            .on("pointerdown", async e => {
                await PlayManager.scrubFromElement(e, track.id);
            })
            .children(
                create("div")
                    .id(track.id)
                    .classes("audio-player-buffer-indicator", "rounded", "nopointer")
                    .styles("left", bufferPercent)
                    .build(),
                create("div").classes("audio-player-scrubbar", "rounded", "nopointer").build(),
                create("div")
                    .classes("audio-player-scrubbar-time", "rounded", "nopointer")
                    .styles("width", positionPercent)
                    .build(),
                create("div")
                    .id(track.id)
                    .classes("audio-player-scrubhead", "rounded", "nopointer")
                    .styles("left", positionPercent)
                    .build()
            )
            .build();
    }

    static loudnessControl(track: Track) {
        const volumePercent = compute(vol => `${vol * 100}%`, volume);

        return create("div")
            .classes("loudness-control", "clickable", "relative")
            .id(track.id)
            .onwheel(PlayManager.setLoudnessFromWheel)
            .children(
                GenericTemplates.roundIconButton(
                    {
                        icon: compute(p => (p ? Icons.MUTE : Icons.LOUD), muted),
                        adaptive: true,
                        isUrl: true,
                    },
                    async () => {
                        PlayManager.toggleMute(track.id);
                    },
                    "Mute/Unmute",
                    ["loudness-button"]
                ),
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
                            .build()
                    )
                    .build()
            )
            .build();
    }

    static async player(track: Track, trackUser: User) {
        const cover = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            cover.value = Util.getTrackCover(track.id);
        }

        return create("div")
            .classes("flex-v", "relative")
            .id("permanent-player")
            .children(
                when(
                    playingElsewhere,
                    heading({
                        text: "Playing on another instance of Lyda",
                        level: 2,
                    })
                ),
                when(
                    playingElsewhere,
                    horizontal(
                        horizontal(
                            MusicTemplates.cover(EntityType.track, track, "player-cover", () => {
                                const windowWidth = window.innerWidth;
                                if (windowWidth < 600) {
                                    navigate(`${RoutePath.track}/` + track.id);
                                } else {
                                    Ui.showImageModal(cover);
                                }
                            })
                        ).classes("hideOnSmallBreakpoint"),
                        when(playerExpanded, await PlayerTemplates.smallPlayerLayout(track), true),
                        await PlayerTemplates.bigPlayerLayout(track, trackUser)
                    )
                        .classes("fullWidth")
                        .build(),
                    true
                ),
                QueueTemplates.queuePopout(),
                await PlayerTemplates.playerPopout(track)
            )
            .build();
    }

    private static async bigPlayerLayout(track: Track, trackUser: User) {
        return create("div")
            .classes("flex", "flex-grow", "hideOnSmallBreakpoint")
            .children(
                await PlayerTemplates.trackInfo(track, trackUser),
                await PlayerTemplates.bigAudioPlayer(track),
                create("div")
                    .classes("flex", "hideOnMidBreakpoint")
                    .children(PlayerTemplates.loudnessControl(track), QueueTemplates.queueButton())
                    .build()
            )
            .build();
    }

    private static async smallPlayerLayout(track: Track) {
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack
        );

        return create("div")
            .classes("flex", "flex-grow", "showOnSmallBreakpoint", "noflexwrap")
            .children(
                vertical(PlayerTemplates.roundPlayButton(track)).classes("align-center"),
                vertical(
                    TrackTemplates.title(track.title, track.id, PlayerTemplates.trackIcons(track)),
                    PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent)
                )
                    .classes("flex-grow", "no-gap")
                    .build(),
                vertical(
                    GenericTemplates.roundIconButton(
                        {
                            icon: compute(
                                (p): string => (p ? "keyboard_arrow_down" : "keyboard_arrow_up"),
                                playerExpanded
                            ),
                            adaptive: true,
                        },
                        async () => (playerExpanded.value = !playerExpanded.value),
                        "Toggle expanded player"
                    )
                ).classes("align-center")
            )
            .build();
    }

    static playingFrom() {
        const id = compute(pf => pf?.id, playingFrom);
        const type = compute(pf => pf?.type, playingFrom);
        const name = compute(pf => pf?.name ?? "", playingFrom);
        const img$ = signal(Images.DEFAULT_COVER_ALBUM);
        const typeMap: Record<string, MediaFileType> = {
            album: MediaFileType.albumCover,
            playlist: MediaFileType.playlistCover,
        };
        playingFrom.subscribe(pf => {
            if (pf && pf.entity && pf.entity.has_cover) {
                img$.value = Util.getImage(pf.id, typeMap[pf.type]);
            }
        });

        return when(
            playingFrom,
            create("div")
                .classes("playing-from", "flex")
                .children(
                    create("a")
                        .classes("page-link", "color-dim", "flex", "align-children", "small-gap")
                        .href(compute(pf => `/${pf?.type}/${pf?.id}`, playingFrom))
                        .onclick(e => {
                            if (e.button === 0) {
                                e.preventDefault();
                                navigate(`${type.value}/${id.value}`);
                            }
                        })
                        .children(
                            create("img").classes("tiny-cover").src(img$),
                            create("span").classes("text-small").text(name)
                        )
                        .build()
                )
                .build()
        );
    }

    static noSubscriptionInfo() {
        const text = compute((q): string => {
            switch (q) {
                case StreamingQuality.low:
                    return "96kbps";
                case StreamingQuality.medium:
                    return "128kbps";
                case StreamingQuality.high:
                    return "320kbps";
                default:
                    return "???kbps";
            }
        }, currentQuality);

        return create("a")
            .classes("page-link", "color-dim", "text-small")
            .text(text)
            .href(RoutePath.settings)
            .onclick(e => {
                if (e.button === 0) {
                    e.preventDefault();
                    navigate(RoutePath.settings);
                }
            })
            .build();
    }

    static trackIcons(track: Track) {
        return track.visibility === "private" ? [GenericTemplates.lock()] : [];
    }

    static async trackInfo(track: Track, trackUser: User) {
        return vertical(
            TrackTemplates.title(track.title, track.id, PlayerTemplates.trackIcons(track)),
            UserTemplates.userLink(UserWidgetContext.player, trackUser),
            horizontal(PlayerTemplates.noSubscriptionInfo(), PlayerTemplates.playingFrom())
        )
            .classes("align-center", "no-gap")
            .build();
    }

    private static async moreMenu(track: Track) {
        const menuShown = signal(false);
        const activeClass = compute((m: boolean): string => (m ? "active" : "_"), menuShown);

        return create("div")
            .classes("relative", "round-button", "showOnMidBreakpoint")
            .children(
                GenericTemplates.roundIconButton(
                    {
                        icon: "more_horiz",
                        adaptive: true,
                    },
                    async () => {
                        menuShown.value = !menuShown.value;
                    },
                    "Open menu",
                    ["showOnMidBreakpoint", activeClass]
                ),
                when(
                    menuShown,
                    create("div")
                        .classes("flex", "popout-above", "absolute-align-right", "card")
                        .children(
                            InteractionTemplates.interactions(EntityType.track, track),
                            QueueTemplates.queueButton()
                        )
                        .build()
                )
            )
            .build();
    }

    static loopModeButton() {
        const map: Record<LoopMode, string> = {
            [LoopMode.off]: Icons.LOOP_OFF,
            [LoopMode.single]: Icons.LOOP_SINGLE,
            [LoopMode.context]: Icons.LOOP_CONTEXT,
        };

        return GenericTemplates.roundIconButton(
            {
                icon: compute(mode => map[mode as LoopMode], loopMode),
                adaptive: true,
                isUrl: true,
            },
            async () => {
                await PlayManager.nextLoopMode();
            },
            "Change loop mode"
        );
    }

    private static async playerPopout(track: Track) {
        const vClass = compute((v): string => (v ? "visible" : "hide"), playerExpanded);
        const trackUser = track.user!;
        const cover = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            cover.value = Util.getTrackCover(track.id);
        }
        const tabs: any[] = ["Player", "Queue"];
        const tabContents = [
            await PlayerTemplates.mobilePlayerTab(track, cover, trackUser),
            QueueTemplates.fullQueueList()
        ];

        return create("div")
            .classes("player-popout", vClass, "flex-v", "noflexwrap")
            .children(
                horizontal(
                    GenericTemplates.combinedSelector(tabs, i => {
                        tabContents.forEach((c, j) => {
                            c.style.display = i === j ? "flex" : "none";
                        });
                    }, 0),
                    GenericTemplates.roundIconButton({
                        icon: "close",
                        adaptive: true,
                        isUrl: false,
                    }, () => {
                        playerExpanded.value = false;
                    })
                ).classes("align-children", "space-outwards", "mobile-player"),
                ...tabContents
            ).build();
    }

    private static async mobilePlayerTab(track: Track, cover: Signal<string>, trackUser: User) {
        return vertical(
            vertical(
                horizontal(
                    MusicTemplates.cover(EntityType.track, track, "fullsize-cover", () => {
                        const windowWidth = window.innerWidth;
                        if (windowWidth < 600) {
                            navigate(`${RoutePath.track}/` + track.id);
                        } else {
                            Ui.showImageModal(cover);
                        }
                    }),
                ).classes("align-center"),
                horizontal(await PlayerTemplates.trackInfo(track, trackUser)),
            ),
            vertical(
                await PlayerTemplates.mobileAudioPlayer(track),
                create("div")
                    .classes("flex", "hideOnMidBreakpoint")
                    .children(
                        PlayerTemplates.loudnessControl(track),
                        QueueTemplates.queueButton()
                    )
                    .build()
            )
        ).classes("space-outwards", "mobile-player")
        .styles("flex-grow", "1")
        .build();
    }
}