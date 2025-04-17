import {create} from "../../../fjsc/src/f2.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";

export class DashboardTemplates {
    static dashboardPage() {
        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.inlineLink(() => navigate(RoutePath.moderation), "Moderation")
            ).build();
    }
}