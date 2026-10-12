import {Config} from "../Classes/Config.ts";

export class Links {
    static get BASE_URL() {
        return Config.baseUrl;
    }
	
    static LINK(path: string) {
        return Links.BASE_URL + "/" + path;
    }

    static PROFILE(path: string) {
        return Links.LINK("profile/" + path);
    }
}