import {PlayManager} from "./PlayManager.ts";
import {currentTrackId, playingElsewhere, playingHere} from "../state.ts";

export enum StreamingEvent {
    trackStart = "track-start",
    trackStop = "track-stop",
    requestPlayingElsewhere = "request-playing-elsewhere"
}

export const broadCastChannel = new BroadcastChannel("lyda-streaming");

function getId() {
    return Math.random().toString(36).substring(7);
}
let lastSentId: string;

export class StreamingBroadcaster {
    static send(event: StreamingEvent, data: any = null) {
        console.log("Sending message to broadcast channel: ", event, data);
        lastSentId = getId();
        broadCastChannel.postMessage({
            event,
            data,
            id: lastSentId
        });
    }

    static initializeReceiver() {
        broadCastChannel.onmessage = async (e) => {
            if (e.origin !== window.location.origin) {
                console.warn("Received message from unknown origin: ", e);
                return;
            }
            console.log("Received message from broadcast channel: ", e.data);
            const data = e.data;
            switch (data.event) {
                case StreamingEvent.trackStart:
                    await PlayManager.stopAllAsync();
                    playingElsewhere.value = true;
                    break;
                case StreamingEvent.trackStop:
                    playingElsewhere.value = false;
                    break;
                case StreamingEvent.requestPlayingElsewhere:
                    if (!playingElsewhere.value && playingHere.value && data.id !== lastSentId) {
                        StreamingBroadcaster.send(StreamingEvent.trackStart, currentTrackId.value);
                    }
                    break;
            }
        };
        StreamingBroadcaster.send(StreamingEvent.requestPlayingElsewhere);
    }
}