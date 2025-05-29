import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {UserTemplates} from "../Templates/account/UserTemplates.ts";
import {GenericTemplates} from "../Templates/generic/GenericTemplates.ts";
import {AnyElement} from "@targoninc/jess";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "./Util.ts";
import {MusicTemplates} from "../Templates/music/MusicTemplates.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { NotificationType } from "../Enums/NotificationType.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";

export class ProfilePage {
    static async addTabSectionAsync(element: AnyElement, user: User, isOwnProfile: boolean) {
        const container = document.createElement("div");
        container.classList.add("flex-v");
        element.appendChild(container);
        const tracksContainer = GenericTemplates.containerWithSpinner("tracks-container");
        const albumsContainer = GenericTemplates.containerWithSpinner("albums-container");
        const playlistsContainer = GenericTemplates.containerWithSpinner("playlists-container");
        const repostsContainer = GenericTemplates.containerWithSpinner("reposts-container");
        const historyContainer = GenericTemplates.containerWithSpinner("history-container");

        const tabs = ["Tracks", "Albums", "Playlists", "Reposts", "Listening History"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer, repostsContainer, historyContainer];
        const tabSelector = GenericTemplates.combinedSelector(tabs, (i: number) => {
            tabContents.forEach((c, j) => {
                c.style.display = i === j ? "block" : "none";
            });
        }, 0);
        container.append(tabSelector, ...tabContents);
        ProfilePage.addAlbumsAsync(albumsContainer, user, isOwnProfile).then();
        ProfilePage.addTracksAsync(tracksContainer, user, isOwnProfile).then();
        ProfilePage.addPlaylistsAsync(playlistsContainer, user, isOwnProfile).then();
        ProfilePage.addRepostsAsync(repostsContainer, user, isOwnProfile).then();
        historyContainer.replaceChildren(MusicTemplates.feed("history", {
            userId: user.id
        }));
    }

    static async addTracksAsync(element: AnyElement, user: User, isOwnProfile: boolean) {
        const res = await Api.getAsync<Track[]>(ApiRoutes.getTrackByUserId, { id: user.id, name: user.username });
        if (res.code !== 200) {
            notify("Error while getting tracks: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const tracks = res.data;
        const trackCards = UserTemplates.profileTrackList(tracks, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(trackCards);
    }

    static async addAlbumsAsync(element: AnyElement, user: User, isOwnProfile: boolean) {
        const res = await Api.getAsync<Album[]>(ApiRoutes.getAlbumsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting albums: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const albums = res.data;
        const albumCards = UserTemplates.albumCards(albums, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(albumCards);
    }

    static async addPlaylistsAsync(element: AnyElement, user: User, isOwnProfile: boolean) {
        const res = await Api.getAsync<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting playlists: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const playlists = res.data;
        const playlistCards = UserTemplates.playlistCards(playlists, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(playlistCards);
    }

    static async addRepostsAsync(element: AnyElement, user: User, isOwnProfile: boolean) {
        const res = await Api.getAsync<Track[]>(ApiRoutes.getRepostsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting reposts: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const reposts = res.data;
        const repostCards = UserTemplates.profileRepostList(reposts, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(repostCards);
    }
}