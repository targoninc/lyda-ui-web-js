export class Links {
    static get BASE_URL() {
        return "https://lyda.app/";
    }
	
    static LINK(path) {
        return Links.BASE_URL + path;
    }

    static PROFILE(path) {
        return Links.LINK("profile/" + path);
    }
}