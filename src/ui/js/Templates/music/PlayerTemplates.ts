import { PlayManager } from "../../Streaming/PlayManager.ts";
import { Icons } from "../../Enums/Icons.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { Images } from "../../Enums/Images.ts";
import { QueueTemplates } from "./QueueTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { PopoverTemplates } from "../generic/PopoverTemplates.ts";
import { Ui } from "../../Classes/Ui.ts";
import { getPlayIcon, Util } from "../../Classes/Util.ts";
import { compute, computeAsync, create, nullElement, Signal, signal, when } from "@targoninc/jess";
import { navigate } from "../../Routing/Router.ts";
import {
    currentlyBuffered,
    currentQuality,
    currentTrackId,
    currentTrackPosition,
    currentUser,
    loadingAudio,
    loopMode,
    muted,
    playerExpanded,
    playingElsewhere,
    playingFrom,
    playingHere,
    shuffling,
    trackInfo,
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
import { StreamingQuality } from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";
import { t } from "../../../locales";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { CoverContext } from "../../Enums/CoverContext.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { PlayingFromResolver } from "../../Classes/PlayingFromResolver.ts";


export class PlayerTemplates {
    static bigAudioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack,
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack,
        );

        return create("div")
            .classes("audio-player", "flex-grow", "flex-v")
            .id("player_" + track.id)
            .children(
                PlayerTemplates.horizontalVolumeSlider(track),
                create("div")
                    .classes("flex", "align-center", "align-children")
                    .children(
                        PlayerTemplates.shuffleButton(),
                        GenericTemplates.roundIconButton(
                            {
                                icon: "skip_previous",
                                adaptive: true,
                            },
                            PlayManager.playPreviousFromQueues,
                            t("PREVIOUS"),
                        ),
                        PlayerTemplates.roundPlayButton(track),
                        GenericTemplates.roundIconButton(
                            {
                                icon: "skip_next",
                                adaptive: true,
                            },
                            async () => await PlayManager.playNextFromQueues(currentTrackId.value),
                            t("NEXT"),
                        ),
                        PlayerTemplates.loopModeButton(),
                        PlayerTemplates.moreMenu(track),
                    ).build(),
                create("div")
                    .classes(
                        "audio-player-controls",
                        "fullWidth",
                        "flex",
                        "rounded",
                        "align-children",
                    ).id(track.id)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.currentTrackTime(),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.totalTrackTime(track),
                    ).build(),
            ).build();
    }

    static mobileAudioPlayer(track: Track) {
        PlayManager.addStreamClientIfNotExists(track.id, track.length);
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack,
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack,
        );

        return create("div")
            .classes("audio-player", "flex-grow", "flex-v")
            .id("player_" + track.id)
            .children(
                PlayerTemplates.horizontalVolumeSlider(track),
                create("div")
                    .classes("flex", "space-between", "align-children")
                    .children(
                        PlayerTemplates.loopModeButton(),
                        horizontal(
                            GenericTemplates.roundIconButton(
                                {
                                    icon: "skip_previous",
                                    adaptive: true,
                                },
                                PlayManager.playPreviousFromQueues,
                                t("PREVIOUS"),
                            ),
                            PlayerTemplates.roundPlayButton(track),
                            GenericTemplates.roundIconButton(
                                {
                                    icon: "skip_next",
                                    adaptive: true,
                                },
                                async () => await PlayManager.playNextFromQueues(currentTrackId.value),
                                t("NEXT"),
                            ),
                        ).classes("align-children"),
                        InteractionTemplates.interactions(EntityType.track, track, {
                            showCount: false,
                            overrideActions: [InteractionType.like],
                        }),
                    ).build(),
                create("div")
                    .classes(
                        "audio-player-controls",
                        "fullWidth",
                        "flex",
                        "rounded",
                        "align-children",
                    ).id(track.id)
                    .children(
                        create("audio")
                            .id("audio_" + track.id)
                            .styles("display", "none")
                            .build(),
                        PlayerTemplates.currentTrackTime(true),
                        PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                        PlayerTemplates.totalTrackTime(track, true),
                    ).build(),
            ).build();
    }

    private static roundPlayButton(track: Track) {
        const disabledClass = compute((l): string => l ? "disabled" : "_", loadingAudio);

        return GenericTemplates.roundIconButton(
            {
                icon: getPlayIcon(playingHere, loadingAudio),
                adaptive: true,
                isUrl: true,
            },
            async () => {
                PlayManager.togglePlayAsync(track.id).then();
            },
            t("PLAY_PAUSE"),
            ["special", "bigger-input", "rounded-max", disabledClass],
        );
    }

    private static currentTrackTime(mobilePlayer = false) {
        return create("span")
            .classes("nopointer", "align-center", mobilePlayer ? "_" : "hideOnMidBreakpoint")
            .text(compute(t => Time.format(t.absolute), currentTrackPosition)).build();
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
        positionPercent: Signal<string>,
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
                await PlayManager.scrubFromElement(e as PointerEvent, track.id);
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
                    .build(),
            ).build();
    }

    static horizontalVolumeSlider(track: Track) {
        const volumePercent = compute(vol => `${vol * 100}%`, volume);

        return create("div")
            .classes("horizontal-volume-slider", "flex", "align-children", "fullWidth", "padded-inline")
            .id("volume_" + track.id)
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
                    t("MUTE_UNMUTE"),
                    ["horizontal-volume-button"],
                ),
                create("div")
                    .classes("horizontal-volume-track", "flex-grow", "rounded", "relative")
                    .onwheel(PlayManager.setLoudnessFromWheel)
                    .onmousedown(async e => {
                        await PlayManager.setLoudnessFromHorizontalElement(e);
                    })
                    .onmousemove(async e => {
                        if (e.buttons === 1) {
                            await PlayManager.setLoudnessFromHorizontalElement(e);
                        }
                    })
                    .children(
                        create("div")
                            .classes("horizontal-volume-bar", "rounded", "nopointer")
                            .build(),
                        create("div")
                            .classes("horizontal-volume-fill", "rounded", "nopointer")
                            .styles("width", volumePercent)
                            .build(),
                        create("div")
                            .classes("horizontal-volume-head", "rounded", "nopointer")
                            .styles("left", volumePercent)
                            .build(),
                    ).build(),
            ).build();
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
                    t("MUTE_UNMUTE"),
                    ["loudness-button"],
                ),
                create("div")
                    .classes("loudness-bar", "rounded", "padded", "relative", "hidden")
                    .id(track.id)
                    .children(
                        create("div")
                            .classes("audio-player-loudnessbackground", "nopointer")
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
                    ).build(),
            ).build();
    }

    static async player() {
        const currentTrack = await computeAsync(async id => {
            if (!id) {
                return null;
            }

            let t = trackInfo.value[id] as { track: Track } | null;
            if (!t) {
                t = await PlayManager.getTrackData(id);
            }

            return t;
        }, currentTrackId);

        return create("div")
            .children(
                compute(t => t ? this.#player(t.track, t.track.user!) : nullElement(), currentTrack),
            ).build();
    }

    static #player(track: Track, trackUser: User) {
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
                        text: t("PLAYING_ON_OTHER_INSTANCE"),
                        level: 2,
                    }),
                ),
                when(
                    playingElsewhere,
                    horizontal(
                        horizontal(
                            MusicTemplates.cover(EntityType.track, track, CoverContext.desktopPlayer, () => {
                                const windowWidth = window.innerWidth;
                                if (windowWidth < 600) {
                                    navigate(`${RoutePath.track}/` + track.id);
                                } else {
                                    Ui.showImageModal(cover);
                                }
                            }),
                        ).classes("hideOnSmallBreakpoint"),
                        when(playerExpanded, PlayerTemplates.smallPlayerLayout(track), true),
                        PlayerTemplates.bigPlayerLayout(track, trackUser),
                    ).classes("fullWidth")
                     .build(),
                    true,
                ),
                QueueTemplates.queuePopout(),
                PlayerTemplates.playerPopout(track),
            ).build();
    }

    private static bigPlayerLayout(track: Track, trackUser: User) {
        return create("div")
            .classes("flex", "flex-grow", "hideOnSmallBreakpoint")
            .children(
                PlayerTemplates.trackInfo(track, trackUser),
                PlayerTemplates.bigAudioPlayer(track),
                create("div")
                    .classes("flex", "hideOnMidBreakpoint")
                    .children(PlayerTemplates.loudnessControl(track), QueueTemplates.queueButton())
                    .build(),
            ).build();
    }

    private static smallPlayerLayout(track: Track) {
        const isCurrentTrack = compute(id => id === track.id, currentTrackId);
        const positionPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p.relative * 100}%` : "0%"),
            currentTrackPosition,
            isCurrentTrack,
        );
        const bufferPercent = compute(
            (p, isCurrent) => (isCurrent ? `${p * 100}%` : "0%"),
            currentlyBuffered,
            isCurrentTrack,
        );

        return create("div")
            .classes("flex", "flex-grow", "showOnSmallBreakpoint", "noflexwrap")
            .children(
                vertical(PlayerTemplates.roundPlayButton(track)).classes("align-center"),
                vertical(
                    PlayerTemplates.playerTrackTitle(track, () => { playerExpanded.value = !playerExpanded.value; }),
                    PlayerTemplates.trackScrubbar(track, bufferPercent, positionPercent),
                ).classes("flex-grow", "no-gap")
                 .build(),
            ).build();
    }

    static playingFrom() {
        const name = compute(pf => pf?.name ?? "", playingFrom);
        const defaultImg$ = compute(pf => PlayingFromResolver.getDefaultImageUrl(pf), playingFrom);
        const img$ = signal(Images.DEFAULT_COVER_ALBUM);
        const link$ = compute(pf => PlayingFromResolver.getLink(pf), playingFrom);
        const showImage$ = compute(pf => PlayingFromResolver.shouldShowImage(pf), playingFrom);

        playingFrom.subscribe(pf => {
            img$.value = PlayingFromResolver.getImageUrl(pf);
        });

        return when(
            playingFrom,
            create("div")
                .classes("playing-from", "flex")
                .children(
                    create("a")
                        .classes("page-link", "color-dim", "flex", "align-children", "small-gap")
                        .href(link$)
                        .onclick(e => {
                            if (e.button === 0) {
                                e.preventDefault();
                                navigate(link$.value);
                            }
                        })
                        .children(
                            when(showImage$, create("img")
                                .classes("tiny-cover")
                                .src(img$)
                                .onerror((e: Event) => {
                                    (e.target as HTMLImageElement).src = defaultImg$.value;
                                })
                                .build()),
                            create("span")
                                .classes(TextSize.small)
                                .text(name),
                        ).build(),
                ).build(),
        );
    }

    static noSubscriptionInfo() {
        const noSubscription = compute(u => !u || !u.subscription, currentUser);
        const text = compute((q, n): string => {
            if (n) {
                return "64kbps";
            }

            switch (q) {
                case StreamingQuality.low:
                    return "64kbps";
                case StreamingQuality.medium:
                    return "128kbps";
                case StreamingQuality.high:
                    return "192kbps";
                default:
                    return "???kbps";
            }
        }, currentQuality, noSubscription);

        return create("a")
            .classes("page-link", "color-dim", TextSize.small)
            .text(text)
            .href(RoutePath.settings)
            .onclick(e => {
                if (e.button === 0) {
                    e.preventDefault();
                    navigate(`${RoutePath.settings}#streaming-quality`);
                }
            }).build();
    }

    static trackIcons(track: Track) {
        return track.visibility === "private" ? [GenericTemplates.lock()] : [];
    }

    static playerTrackTitle(track: Track, onTitleClick?: () => void) {
        const el = create("div")
            .classes("player-track-title", "clickable", "pointer")
            .onclick(onTitleClick ? (e: Event) => { e.stopPropagation(); onTitleClick(); } : undefined)
            .children(
                MusicTemplates.title(EntityType.track, track.title, track.id, PlayerTemplates.trackIcons(track), undefined, !onTitleClick, true, track.wip)
            ).build() as HTMLElement;

        setTimeout(() => {
            const flex = el.querySelector(".flex") as HTMLElement;
            if (flex && flex.scrollWidth > el.clientWidth) {
                el.classList.add("scrolling");
            }
        }, 200);

        return el;
    }

    static trackInfo(track: Track, trackUser: User) {
        return vertical(
            horizontal(
                PlayerTemplates.playerTrackTitle(track, () => {
                    playerExpanded.value = false;
                    navigate(`/track/${track.id}`);
                }),
                create("div")
                    .classes("hideOnMidBreakpoint")
                    .children(InteractionTemplates.interactions(EntityType.track, track, {
                        overrideActions: [InteractionType.like, InteractionType.repost],
                    }))
                    .build(),
            ).classes("align-center", "align-children").build(),
            UserTemplates.userLink(UserWidgetContext.player, trackUser),
            horizontal(PlayerTemplates.noSubscriptionInfo(), PlayerTemplates.playingFrom()),
        ).classes("align-center", "no-gap").build();
    }

    private static moreMenu(track: Track) {
        const popId = `player-menu-${track.id}`;
        const popover = create("div")
            .classes("generic-popover", "flex-v")
            .id(popId)
            .attributes("popover", "manual")
            .children(
                InteractionTemplates.interactions(EntityType.track, track, {
                    overrideActions: [InteractionType.like, InteractionType.repost],
                }),
                QueueTemplates.queueButton(),
            ).build() as HTMLElement;

        const btn = GenericTemplates.roundIconButton(
            { icon: "more_horiz", adaptive: true },
            () => {
                const r = btn.getBoundingClientRect();
                popover.style.position = "fixed";
                popover.style.bottom = `${window.innerHeight - r.top + 2}px`;
                popover.style.right = `${window.innerWidth - r.right}px`;
                popover.style.top = "auto";
                popover.style.left = "auto";
                popover.togglePopover();
            },
            t("OPEN_MENU"),
            ["showOnMidBreakpoint"],
        );

        return create("div")
            .classes("relative", "round-button", "showOnMidBreakpoint")
            .children(btn, popover)
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
            PlayManager.nextLoopMode,
            t("CHANGE_LOOP_MODE"),
        );
    }

    static shuffleButton() {
        const disabled = compute(pf => {
            return pf?.type === FeedType.explore || pf?.type === FeedType.following;
        }, playingFrom);

        return GenericTemplates.roundIconButton(
            {
                icon: compute(s => s ? Icons.SHUFFLE_ON : Icons.SHUFFLE_OFF, shuffling),
                adaptive: true,
                isUrl: true,
            },
            () => {
                if (disabled.value) {
                    return;
                }
                shuffling.value = !shuffling.value;
            },
            t("TOGGLE_SHUFFLE"),
            [],
            disabled,
        );
    }

    private static playerPopout(track: Track) {
        const vClass = compute((v): string => (v ? "visible" : "hide"), playerExpanded);
        const trackUser = track.user!;
        const cover = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            cover.value = Util.getTrackCover(track.id);
        }
        const tabs: any[] = [`${t("PLAYER")}`, `${t("QUEUE")}`];
        const tabContents = [
            PlayerTemplates.mobilePlayerTab(track, cover, trackUser),
            QueueTemplates.fullQueueList(),
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
                    }),
                ).classes("align-children", "space-between", "mobile-player"),
                ...tabContents,
            ).build();
    }

    private static mobilePlayerTab(track: Track, cover: Signal<string>, trackUser: User) {
        return vertical(
            vertical(
                horizontal(
                    MusicTemplates.cover(EntityType.track, track, CoverContext.mobilePlayer, () => {
                        const windowWidth = window.innerWidth;
                        if (windowWidth < 600) {
                            navigate(`${RoutePath.track}/` + track.id);
                        } else {
                            Ui.showImageModal(cover);
                        }
                    }),
                ).classes("align-center"),
                horizontal(PlayerTemplates.trackInfo(track, trackUser)),
            ),
            vertical(
                PlayerTemplates.mobileAudioPlayer(track),
                create("div")
                    .classes("flex", "hideOnMidBreakpoint")
                    .children(
                        PlayerTemplates.loudnessControl(track),
                        QueueTemplates.queueButton(),
                    ).build(),
            ),
        ).classes("space-between", "mobile-player")
         .styles("flex-grow", "1")
         .build();
    }
}