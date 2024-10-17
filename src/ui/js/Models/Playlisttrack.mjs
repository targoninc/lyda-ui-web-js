import { Music } from 'src/ui/js/Models/Music.mjs';
import { Playlist } from 'src/ui/js/Models/Playlist.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Playlisttrack {
    /** @var {number} playlistId */
    playlistId;
    /** @var {number} trackId */
    trackId;
    /** @var {number} userId */
    userId;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {number} position */
    position;
    /** @var {Music|null} music */
    music = null;
    /** @var {Playlist|null} playlist */
    playlist = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.playlistId = data.playlistId;
        this.trackId = data.trackId;
        this.userId = data.userId;
        this.createdAt = data.createdAt;
        this.position = data.position;
        this.music = data.music;
        this.playlists = data.playlists;
        this.users = data.users;
    }
}