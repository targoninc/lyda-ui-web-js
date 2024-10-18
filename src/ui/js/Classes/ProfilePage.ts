import {Api} from "./Api.ts";
import {Ui} from "./Ui.ts";
import {UserTemplates} from "../Templates/UserTemplates.ts";
import {GenericTemplates} from "../Templates/GenericTemplates.ts";

export class ProfilePage {
    static async addTabSectionAsync(element, user, selfUser, isOwnProfile) {
        const container = document.createElement("div");
        container.classList.add("flex-v");
        element.appendChild(container);
        const tracksContainer = GenericTemplates.containerWithSpinner("tracks-container");
        const albumsContainer = GenericTemplates.containerWithSpinner("albums-container");
        const playlistsContainer = GenericTemplates.containerWithSpinner("playlists-container");
        const repostsContainer = GenericTemplates.containerWithSpinner("reposts-container");

        const tabs = ["Tracks", "Albums", "Playlists", "Reposts"];
        const tabContents = [tracksContainer, albumsContainer, playlistsContainer, repostsContainer];
        const tabSelector = GenericTemplates.tabSelector(tabs, (i) => {
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

    static async addTracksAsync(element, user, selfUser, isOwnProfile) {
        const tracksRes = await Api.getAsync(Api.endpoints.tracks.byUserId, { id: user.id, name: user.username });
        if (tracksRes.code !== 200) {
            Ui.notify(tracksRes.data, "error");
            return;
        }
        const tracks = tracksRes.data;
        const trackCards = UserTemplates.trackCards(tracks, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(trackCards);
    }

    static async addAlbumsAsync(element, user, selfUser, isOwnProfile, isLoggedIn) {
        const albumsRes = await Api.getAsync(Api.endpoints.albums.byUserId, {
            id: user.id, name: user.username
        });
        if (albumsRes.code !== 200) {
            Ui.notify(albumsRes.data, "error");
            return;
        }
        const albums = albumsRes.data;
        const albumCards = UserTemplates.albumCards(albums, selfUser, isOwnProfile, isLoggedIn);
        element.innerHTML = "";
        element.appendChild(albumCards);
    }

    static async addPlaylistsAsync(element, user, selfUser, isOwnProfile, isLoggedIn) {
        const playlistsRes = await Api.getAsync(Api.endpoints.playlists.byUserId, {
            id: user.id, name: user.username
        });
        if (playlistsRes.code !== 200) {
            Ui.notify(playlistsRes.data, "error");
            return;
        }
        const playlists = playlistsRes.data;
        const playlistCards = UserTemplates.playlistCards(playlists, selfUser, isOwnProfile, isLoggedIn);
        element.innerHTML = "";
        element.appendChild(playlistCards);
    }

    static async addRepostsAsync(element, user, selfUser, isOwnProfile) {
        const repostsRes = await Api.getAsync(Api.endpoints.reposts.byUserId, {
            id: user.id, name: user.username
        });
        if (repostsRes.code !== 200) {
            Ui.notify(repostsRes.data, "error");
            return;
        }
        const reposts = repostsRes.data;
        const repostCards = UserTemplates.trackCards(reposts, user.id, selfUser, isOwnProfile);
        element.innerHTML = "";
        element.appendChild(repostCards);
    }
}