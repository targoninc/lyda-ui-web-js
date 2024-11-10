export class Router {
    currentRoute = null;
    routes: any[];
    preRouteChange: Function = () => {};
    postRouteChange: Function = () => {};
    onNoRouteFound: Function = () => {};

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
        const path = window.location.pathname.substring(1);
        const route = this.routes.find(r => path.startsWith(r.path) || (r.aliases && r.aliases.some((a: string) => path.startsWith(a))));
        this.currentRoute = route;
        if (route) {
            const params = this.getParams(path, route);
            this.preRouteChange && await this.preRouteChange(route, params);
            route.handler && await route.handler(route, params);
            this.postRouteChange && await this.postRouteChange(route,params);
        } else {
            this.onNoRouteFound && await this.onNoRouteFound();
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
    // @ts-ignore
    (<Router>window.router).navigate(path).then();
}

export function reload() {
    // @ts-ignore
    (<Router>window.router).reload();
}

export interface Route {
    path: string;
    params?: string[];
    aliases?: string[];
}