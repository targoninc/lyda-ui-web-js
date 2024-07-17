import { Playlist } from 'Playlist.mjs';
import { User } from 'User.mjs';

export class Playlistlike {
    /** @var {number} userId */
    userId;
    /** @var {number} playlistId */
    playlistId;
    /** @var {Date|null} createdAt */
    createdAt = null;
    /** @var {Playlist|null} playlist */
    playlist = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.userId = data.userId;
        this.playlistId = data.playlistId;
        this.createdAt = data.createdAt;
        this.playlists = data.playlists;
        this.users = data.users;
    }
}