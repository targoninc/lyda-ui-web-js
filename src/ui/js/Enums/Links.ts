export class Links {
    static get BASE_URL() {
        return window.location.origin;
    }
	
    static LINK(path: string) {
        return Links.BASE_URL + "/" + path;
    }

    static PROFILE(path: string) {
        return Links.LINK("profile/" + path);
    }
}