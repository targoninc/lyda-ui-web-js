export class TrackProcessor {
    /**
     *
     * @param input {Music}
     */
    static forDownload(input) {
        const track = structuredClone(input);
        delete track.user;
        delete track.loudnessData;
        delete track.secretcode;
        delete track.analyzedFrequencyRatios;
        delete track.comments;
        delete track.tracklikes;
        delete track.plays;
        delete track.playlisttracks;
        delete track.albumtracks;
        delete track.hasAudio;
        delete track.trackCollaborators;
        return track;
    }
}