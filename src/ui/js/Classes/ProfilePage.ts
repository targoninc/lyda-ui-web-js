import {Api} from "../Api/Api.ts";
import {notify, Ui} from "./Ui.ts";
import {UserTemplates} from "../Templates/UserTemplates.ts";
import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {User} from "../Models/DbModels/User.ts";
import {AnyElement} from "../../fjsc/f2.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class ProfilePage {
    static async addTabSectionAsync(element: AnyElement, user: User, selfUser: User, isOwnProfile: boolean) {
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

    static async addTracksAsync(element: AnyElement, user: User, selfUser: User, isOwnProfile: boolean) {
        const tracksRes = await Api.getAsync(ApiRoutes.getTrackByUserId, { id: user.id, name: user.username });
        if (tracksRes.code !== 200) {
            notify(tracksRes.data, "error");
            return;
        }
        const tracks = tracksRes.data;
        const trackCards = UserTemplates.trackCards(tracks, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(trackCards);
    }

    static async addAlbumsAsync(element: AnyElement, user: User, selfUser: User, isOwnProfile: boolean) {
        const albumsRes = await Api.getAsync(ApiRoutes.getAlbumByUserId, {
            id: user.id, name: user.username
        });
        if (albumsRes.code !== 200) {
            notify(albumsRes.data, "error");
            return;
        }
        const albums = albumsRes.data;
        const albumCards = UserTemplates.albumCards(albums, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(albumCards);
    }

    static async addPlaylistsAsync(element: AnyElement, user: User, selfUser: User, isOwnProfile: boolean) {
        const playlistsRes = await Api.getAsync(ApiRoutes.getPlaylistsByUserId, {
            id: user.id, name: user.username
        });
        if (playlistsRes.code !== 200) {
            notify(playlistsRes.data, "error");
            return;
        }
        const playlists = playlistsRes.data;
        const playlistCards = UserTemplates.playlistCards(playlists, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(playlistCards);
    }

    static async addRepostsAsync(element: AnyElement, user: User, selfUser: User, isOwnProfile: boolean) {
        const repostsRes = await Api.getAsync(ApiRoutes.getRepostsByUserId, {
            id: user.id, name: user.username
        });
        if (repostsRes.code !== 200) {
            notify(repostsRes.data, "error");
            return;
        }
        const reposts = repostsRes.data;
        const repostCards = UserTemplates.trackCards(reposts, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(repostCards);
    }
}