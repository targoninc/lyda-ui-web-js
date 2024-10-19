import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Icons} from "../Enums/Icons.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {AlbumActions} from "./AlbumActions.ts";
import {PlaylistActions} from "./PlaylistActions.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {CommentTemplates} from "../Templates/CommentTemplates.ts";
import {TrackEditTemplates} from "../Templates/TrackEditTemplates.ts";
import {Ui} from "../Classes/Ui.ts";
import {navigate} from "../Routing/Router.ts";

export class TrackActions {
    static async savePlay(id) {
        return await Api.postAsync(Api.endpoints.tracks.actions.savePlay, {
            id: id,
        });
    }

    static savePlayAfterTime(id, seconds) {
        setTimeout(async () => {
            await TrackActions.savePlay(id);
        }, seconds * 1000);
    }

    static async unfollowUserFromElement(userId) {
        const res = await Api.postAsync(Api.endpoints.user.actions.unfollow, {
            id: userId
        });

        if (res.code !== 200) {
            Ui.notify("Error while trying to unfollow user: " + res.data, "error");
            return;
        }

        return res;
    }

    static async deleteTrackFromElement(e) {
        if (!confirm) {
            return;
        }
        const res = await Api.postAsync(Api.endpoints.tracks.actions.delete, {
            id: e.target.id,
        });
        if (res.code === 200) {
            PlayManager.removeStreamClient(e.target.id);
            QueueManager.removeFromManualQueue(e.target.id);
            Ui.notify(res.data, "success");
            navigate("profile");
        } else {
            Ui.notify("Error trying to delete track: " + res.data, "error");
        }
    }

    static async deleteCommentFromElement(e) {
        await Ui.getConfirmationModal("Delete comment", "Are you sure you want to delete this comment?", "Yes", "No", async () => {
            const commentId = e.target.getAttribute("id");
            if (commentId === "") {
                return;
            }
            const res = await Api.postAsync(Api.endpoints.comments.actions.delete, {
                id: commentId,
            });

            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }

            const commentCount = document.querySelector(".stats-count.comments");
            commentCount.innerText = parseInt(commentCount.innerText) - 1;
            const comment = document.querySelector(".comment-in-list[id='" + commentId + "']");
            comment.remove();
            if (document.querySelectorAll(".comment-in-list").length === 0) {
                const noComments = document.querySelector(".no-comments");
                if (noComments !== null) {
                    noComments.classList.remove("hidden");
                }
            }
        }, () => {
        }, Icons.WARNING);
    }

    static async newCommentFromElement(e) {
        if (e.key !== "Enter") {
            return;
        }
        e.preventDefault();

        const content = e.target.value;
        if (content === "") {
            return;
        }
        if (content.length > 1000) {
            Ui.notify("Comment is too long", "error");
            return;
        }
        const trackId = Util.getTrackIdFromEvent(e);
        if (trackId === "") {
            return;
        }
        e.target.value = "";

        const parentId = e.target.getAttribute("parent_id");

        const res = await Api.postAsync(Api.endpoints.comments.actions.new, {
            id: trackId,
            content: content,
            parentId: parentId === "" ? 0 : parentId,
        });

        if (res.code !== 200) {
            Ui.notify(res.data, "error");
            return;
        }

        const commentId = res.data;
        const commentCount = document.querySelector(".stats-count.comments");
        commentCount.innerText = parseInt(commentCount.innerText) + 1;
        const user = await Util.getUserAsync();
        const comment = {
            id: commentId,
            content: content,
            user: user,
            userId: user.id,
            avatar: await Util.getAvatarFromUserIdAsync(user.id),
            username: user.username,
            displayname: user.displayname,
            trackId: trackId,
            parentId: parentId === "" ? 0 : parentId,
            canEdit: true,
            createdAt: new Date().toISOString()
        };
        const commentData = {
            canEdit: true,
            comment: Util.mapNullToEmptyString(comment, user)
        };
        const commentElement = CommentTemplates.commentInList(commentData);
        const commentList = document.querySelector(".comment-list");
        commentList.appendChild(commentElement);
        const noComments = document.querySelector(".no-comments");
        if (noComments !== null) {
            noComments.classList.add("hidden");
        }

        const allCommentLists = document.querySelectorAll(".comment-list");
        allCommentLists.forEach((c) => {
            Util.nestCommentElementsByCommentList(c);
        });
        Util.nestCommentElementsByParents();
    }

    static async likeTrack(id) {
        return await Api.postAsync(Api.endpoints.tracks.actions.like, { id });
    }

    static async unlikeTrack(id) {
        return await Api.postAsync(Api.endpoints.tracks.actions.unlike, { id });
    }

    static async repostTrack(id) {
        return await Api.postAsync(Api.endpoints.tracks.actions.repost, { id });
    }

    static async unrepostTrack(id) {
        return await Api.postAsync(Api.endpoints.tracks.actions.unrepost, { id });
    }

    static async runFollowFunctionFromElement(e, userId, following) {
        const button = e.target;
        const span = button.querySelector("span");
        const img = button.querySelector("img");
        if (following.value) {
            const res = await TrackActions.unfollowUserFromElement(userId);
            if (res.code !== 200) {
                return;
            }
            span.innerText = "Follow";
            img.src = Icons.FOLLOW;
        } else {
            const res = await TrackActions.followUserFromElement(userId);
            if (res.code !== 200) {
                return;
            }
            span.innerText = "Unfollow";
            img.src = Icons.UNFOLLOW;
        }
        following.value = !following.value;
    }

    static async followUserFromElement(userId) {
        const res = await Api.postAsync(Api.endpoints.user.actions.follow, {
            id: userId,
        });

        if (res.code !== 200) {
            Ui.notify("Error while trying to follow user: " + res.data, "error");
            return res;
        }

        return res;
    }

    static async getCollabTypes() {
        const res = await Api.getAsync(Api.endpoints.tracks.collabTypes);
        if (res.code !== 200) {
            Ui.notify("Error while trying to get collab types: " + res.data, "error");
            return [];
        }
        return res.data;
    }

    static async toggleLike(id, isEnabled) {
        if (!Util.isLoggedIn()) {
            Ui.notify("You must be logged in to like tracks", "error");
            return false;
        }
        if (isEnabled) {
            const res = await TrackActions.unlikeTrack(id);
            if (res.code !== 200) {
                return false;
            }
        } else {
            const res = await TrackActions.likeTrack(id);
            if (res.code !== 200) {
                return false;
            }
        }
        return true;
    }

    static async toggleRepost(id, isEnabled) {
        if (!Util.isLoggedIn()) {
            Ui.notify("You must be logged in to repost tracks", "error");
            return false;
        }
        if (isEnabled) {
            const res = await TrackActions.unrepostTrack(id);
            if (res.code !== 200) {
                return false;
            }
        } else {
            const res = await TrackActions.repostTrack(id);
            if (res.code !== 200) {
                return false;
            }
        }
        return true;
    }

    static async openTrackFromElement(e) {
        if (e.target.classList.contains("cover-container")) {
            return;
        }
        let trackId = Util.getTrackIdFromEvent(e);
        if (trackId === "") {
            return;
        }
        navigate("track/" + trackId);
    }

    static async replaceCover(e) {
        if (e.target.getAttribute("canEdit") !== "true") {
            return;
        }
        const oldSrc = e.target.src;
        const loader = document.querySelector("#cover-loader");
        loader && loader.classList.remove("hidden");
        let fileInput = document.createElement("input");
        const id = parseInt(Util.getTrackIdFromEvent(e));
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            let file = e.target.files[0];
            if (!file) {
                loader && loader.classList.add("hidden");
                return;
            }
            let formData = new FormData();
            formData.append("cover", file);
            formData.append("id", id.toString());
            let response = await fetch(Api.endpoints.tracks.actions.uploadCover, {
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (response.status === 200) {
                loader && loader.classList.add("hidden");
                Ui.notify("Cover updated", "success");
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            }
        };
        fileInput.click();
    }

    static replyToComment(e) {
        const input = document.querySelector(".comment-box-input[track_id='" + e.target.getAttribute("track_id") + "']");
        if (e.target.innerText === "Reply") {
            const replyButtons = document.querySelectorAll(".replyButton[track_id='" + e.target.getAttribute("track_id") + "']");
            replyButtons.forEach(button => {
                button.innerText = "Reply";
            });
            input.setAttribute("parent_id", e.target.id);
            input.placeholder = "Reply to " + document.querySelector(".user-widget[comment_id='" + e.target.id + "']").getAttribute("username") + "...";
            input.focus();
            e.target.innerText = "Cancel";
        } else {
            input.setAttribute("parent_id", "0");
            input.placeholder = "New comment...";
            e.target.innerText = "Reply";
        }
    }

    static async moveTrackDownInList(positionsState, track, type, list) {
        let map = positionsState.value;
        const position = map.findIndex(id => id === track.id);
        let success;
        if (type === "album") {
            success = await AlbumActions.moveTrackInAlbum(list.id, track.id, position + 1);
        } else {
            success = await PlaylistActions.moveTrackInPlaylist(list.id, track.id, position + 1);
        }
        if (success) {
            this.moveTrackToPosition(map, position, position + 1, positionsState);
        }
    }

    static async moveTrackUpInList(positionsState, track, type, list) {
        let map = positionsState.value;
        const position = map.findIndex(id => id === track.id);
        let success;
        if (type === "album") {
            success = await AlbumActions.moveTrackInAlbum(list.id, track.id, position - 1);
        } else {
            success = await PlaylistActions.moveTrackInPlaylist(list.id, track.id, position - 1);
        }
        if (success) {
            this.moveTrackToPosition(map, position, position - 1, positionsState);
        }
    }

    static moveTrackToPosition(map, position, targetPosition, positionsState) {
        const idToMove = map[position];
        map = map.filter(id => id !== idToMove);

        const mapBeforeTarget = map.slice(0, targetPosition);
        const mapAfterTarget = map.slice(targetPosition);
        map = mapBeforeTarget.concat([idToMove]).concat(mapAfterTarget);

        const sourceElements = document.querySelectorAll(".track-in-list");
        let i = 0;
        for (const id of map) {
            let insertAfterNode;
            for (const element of sourceElements) {
                if (element.getAttribute("track_id") === id.toString()) {
                    insertAfterNode = element;
                    break;
                }
            }
            const anchorNode = insertAfterNode.parentNode.querySelector(".dropzone[reference_id='" + i + "']");
            if (anchorNode === null) {
                continue;
            }
            anchorNode.parentNode.insertBefore(insertAfterNode, anchorNode.nextSibling);
            i++;
        }
        positionsState.value = map;
    }

    static async removeTrackFromList(positionsState, track, type, list, elementReference) {
        await Ui.getConfirmationModal("Remove track from " + type, "Are you sure you want to remove this track from " + list.name +"?", "Yes", "No", async () => {
            let success;
            if (type === "album") {
                success = await AlbumActions.removeTrackFromAlbum(track.id, list.id);
            } else {
                success = await PlaylistActions.removeTrackFromPlaylist(track.id, list.id);
            }
            if (success && elementReference) {
                elementReference.remove();
            }
        }, () => {
        }, Icons.WARNING);
    }

    static reorderTrack(type, listId, trackId, positionsState, newPosition) {
        let success;
        if (type === "album") {
            success = AlbumActions.moveTrackInAlbum(listId, trackId, newPosition);
        } else {
            success = PlaylistActions.moveTrackInPlaylist(listId, trackId, newPosition);
        }
        if (success) {
            let map = positionsState.value;
            const position = map.findIndex(id => id === trackId);
            this.moveTrackToPosition(map, position, newPosition, positionsState);
        }
    }

    static async removeCollaboratorFromTrack(trackId, userId) {
        const res = await Api.postAsync(Api.endpoints.tracks.actions.removeCollaborator, {
            id: trackId,
            userId: userId,
        });

        if (res.code !== 200) {
            Ui.notify("Error while trying to remove collaborator: " + res.data, "error");
            return;
        }

        const collaborator = document.querySelector(".collaborator[user_id='" + userId + "']");
        collaborator.remove();
    }

    static async addCollaboratorToTrack(trackId, userId, collabType) {
        const res = await Api.postAsync(Api.endpoints.tracks.actions.addCollaborator, {
            id: trackId,
            userId: userId,
            collabType: collabType,
        });

        if (res.code !== 200) {
            Ui.notify("Error while trying to add collaborator: " + res.data, "error");
            return;
        }

        return res.data;
    }

    static async updateTrackProperty(trackId, property, initialValue, callback = null) {
        Ui.getTextAreaInputModal("Edit " + property, "Enter new track " + property, initialValue, "Save", "Cancel", async (description) => {
            const res = await Api.postAsync(Api.endpoints.tracks.actions.update, {
                id: trackId,
                field: property,
                value: description
            });
            if (res.code !== 200) {
                Ui.notify("Failed to update " + property, "error");
                return;
            }
            const user = LydaCache.get("user").content;
            user.description = description;
            LydaCache.set("user", new CacheItem(user));
            Ui.notify(property + " updated", "success");
            if (callback) {
                callback(description);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    static async getUnapprovedTracks() {
        const res = await Api.getAsync(Api.endpoints.tracks.unapprovedCollabs);
        if (res.code !== 200) {
            Ui.notify("Error while trying to get unapproved tracks: " + res.data, "error");
            return [];
        }
        return res.data;
    }

    static async approveCollab(id, name = "track") {
        const res = await Api.postAsync(Api.endpoints.tracks.actions.approveCollab, {
            id: id,
        });
        if (res.code !== 200) {
            Ui.notify("Error while trying to approve collab: " + res.data, "error");
            return;
        }

        Ui.notify(`Collab on ${name} approved`, "success");
        const collab = document.querySelector(".collab[id='" + id + "']");
        if (collab) {
            collab.remove();
        }
    }

    static async denyCollab(id, name = "track") {
        const res = await Api.postAsync(Api.endpoints.tracks.actions.denyCollab, {
            id: id,
        });
        if (res.code !== 200) {
            Ui.notify("Error while trying to deny collab: " + res.data, "error");
            return;
        }

        Ui.notify(`Collab on ${name} denied`, "success");
        const collab = document.querySelector(".collab[id='" + id + "']");
        if (collab) {
            collab.remove();
        }
    }

    static async updateTrackFull(track) {
        const res = await Api.postAsync(Api.endpoints.tracks.actions.updateFull, {
            id: track.id,
            title: track.title,
            collaborators: track.collaborators,
            description: track.description,
            genre: track.genre,
            release_date: track.releaseDate,
            visibility: track.visibility,
            isrc: track.isrc,
            upc: track.upc,
            price: track.price,
        });
        if (res.code !== 200) {
            Ui.notify("Error while trying to update track: " + res.data, "error");
            return;
        }

        return res.data;
    }

    static getTrackEditModal(track) {
        const confirmCallback2 = async (newTrack) => {
            Util.removeModal();
            await TrackActions.updateTrackFull(newTrack);
            Ui.notify("Track updated", "success");
            window.router.reload();
        };
        const cancelCallback2 = () => {
            Util.removeModal();
        };
        const modal = TrackEditTemplates.editTrackModal(track, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }
}