import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {UserTemplates} from "../Templates/UserTemplates.ts";
import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {User} from "../Models/DbModels/User.ts";
import {AnyElement} from "../../fjsc/src/f2.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {getErrorMessage} from "./Util.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class ProfilePage {
    static async addTabSectionAsync(element: AnyElement, user: User, selfUser: User|null, isOwnProfile: boolean) {
        const container = document.createElement("div");
        container.classList.add("flex-v");
        element.appendChild(container);
        const tracksContainer = GenericTemplates.containerWithSpinner("tracks-container");
        const albumsContainer = GenericTemplates.containerWithSpinner("albums-container");
        const playlistsContainer = GenericTemplates.containerWithSpinner("playlists-container");
        const repostsContainer = GenericTemplates.containerWithSpinner("reposts-container");

        const tabs = ["Tracks", "Albums", "Playlists", "Reposts"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer, repostsContainer];
        const tabSelector = GenericTemplates.tabSelector(tabs, (i: number) => {
            tabContents.forEach((c, j) => {
                c.style.display = i === j ? "block" : "none";
            });
        }, 0);
        container.append(tabSelector, tracksContainer, albumsContainer, playlistsContainer, repostsContainer);
        ProfilePage.addAlbumsAsync(albumsContainer, user, selfUser, isOwnProfile).then();
        ProfilePage.addTracksAsync(tracksContainer, user, selfUser, isOwnProfile).then();
        ProfilePage.addPlaylistsAsync(playlistsContainer, user, selfUser, isOwnProfile).then();
        ProfilePage.addRepostsAsync(repostsContainer, user, selfUser, isOwnProfile).then();
    }

    static async addTracksAsync(element: AnyElement, user: User, selfUser: User|null, isOwnProfile: boolean) {
        const res = await Api.getAsync<Track[]>(ApiRoutes.getTrackByUserId, { id: user.id, name: user.username });
        if (res.code !== 200) {
            notify("Error while getting tracks: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const tracks = res.data;
        const trackCards = UserTemplates.trackCards(tracks, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(trackCards);
    }

    static async addAlbumsAsync(element: AnyElement, user: User, selfUser: User|null, isOwnProfile: boolean) {
        const res = await Api.getAsync<Album[]>(ApiRoutes.getAlbumsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting albums: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const albums = res.data;
        const albumCards = UserTemplates.albumCards(albums, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(albumCards);
    }

    static async addPlaylistsAsync(element: AnyElement, user: User, selfUser: User|null, isOwnProfile: boolean) {
        const res = await Api.getAsync<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting playlists: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const playlists = res.data;
        const playlistCards = UserTemplates.playlistCards(playlists, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(playlistCards);
    }

    static async addRepostsAsync(element: AnyElement, user: User, selfUser: User|null, isOwnProfile: boolean) {
        const res = await Api.getAsync<Track[]>(ApiRoutes.getRepostsByUserId, {
            id: user.id, name: user.username
        });
        if (res.code !== 200) {
            notify("Error while getting reposts: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        const reposts = res.data;
        const repostCards = UserTemplates.trackCards(reposts, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(repostCards);
    }
}