import {router} from "../../main.ts";
import {signal} from "../../fjsc/src/signals.ts";

export class Router {
    public currentRoute = signal<Route|null>(null);
    public currentParams = signal<{
        [key: string]: string;
    }>({});
    routes: any[];
    protected preRouteChange: Function = () => {};
    protected postRouteChange: Function = () => {};
    protected onNoRouteFound: Function = () => {};

    constructor(routes: Route[], preRouteChange: Function = () => {}, postRouteChange: Function = () => {}, onNoRouteFound: Function = () => {}) {
        this.routes = routes;
        this.preRouteChange = preRouteChange;
        this.postRouteChange = postRouteChange;
        this.onNoRouteFound = onNoRouteFound;
        this.init();
    }

    init() {
        window.onpopstate = () => this.handleRouteChange();
        this.handleRouteChange().then();
    }

    async handleRouteChange() {
        let path = window.location.pathname.substring(1);
        if (path === "") {
            path = "/";
        }
        const page = path.split("/").filter(p => p !== "")[0] ?? "/";
        let route = this.routes.find(r => page === r.path || (r.aliases && r.aliases.some((a: string) => path === a)));
        if (!route) {
            route = this.routes.find(r => page.startsWith(r.path) || (r.aliases && r.aliases.some((a: string) => path.startsWith(a))));
        }
        this.currentRoute.value = route;
        if (route) {
            const params = this.getParams(path, route);
            this.currentParams.value = params;
            this.preRouteChange && await this.preRouteChange(route, params);
            route.handler && await route.handler(route, params);
            this.postRouteChange && await this.postRouteChange(route,params);
        } else {
            this.onNoRouteFound && await this.onNoRouteFound();
            this.currentParams.value = {};
        }
    }

    getParams(fullPath: string, route: any) {
        const path = fullPath.split("/").filter(p => p !== "");
        const params: {
            [key: string]: string;
        } = {};
        for (let i = 0; i < path.length; i++) {
            params["path_" + i] = path[i];
        }
        const urlParams = new URLSearchParams(window.location.search);
        for (let [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        if (route.params) {
            for (let i = 0; i < route.params.length; i++) {
                params[route.params[i]] = params["path_" + (i + 1)];
            }
        }
        return params;
    }

    async navigate(path: string) {
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        history.pushState({}, "", window.location.origin + path);
        await this.handleRouteChange();
    }

    reload() {
        this.handleRouteChange().then();
    }
}

export function navigate(path: string, params: string[] = []) {
    if (params.length > 0) {
        path += "?" + params.join("&");
    }
    router.navigate(path).then();
}

export function reload() {
    router.reload();
}

export interface Route {
    path: string;
    title?: string;
    params?: string[];
    aliases?: string[];
}