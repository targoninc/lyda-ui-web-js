import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { navigate } from "../Routing/Router.ts";
import { RoutePath } from "../Routing/routes.ts";
import { create } from "@targoninc/jess";
import { t } from "../../locales";
import { AuthTemplates } from "./account/AuthTemplates.ts";

export class LandingPageTemplates {
    static newLandingPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "auth-box", "card")
                    .children(AuthTemplates.registrationLoginBox())
                    .build(),
            ).build();
    }

    static landingPageInfo() {
        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .text(t("LANDER_QUESTION"))
                    .build(),
                LandingPageTemplates.lydaBenefits(),
                create("p")
                    .styles("max-width", "300px")
                    .children(
                        create("span")
                            .text(t("LANDER_PARAGRAPH_1"))
                            .build(),
                    ).build(),
                create("p")
                    .classes("color-dim")
                    .styles("max-width", "300px")
                    .children(
                        create("span")
                            .text(t("LANDER_PARAGRAPH_2"))
                            .build(),
                    ).build(),
                create("p")
                    .classes("color-dim")
                    .styles("max-width", "300px")
                    .children(
                        create("span")
                            .text(t("LANDER_ROADMAP"))
                            .build(),
                        GenericTemplates.inlineLink(() => navigate(RoutePath.roadmap), t("ROADMAP_INLINE")),
                    ).build(),
                create("p")
                    .classes("color-dim")
                    .styles("max-width", "300px")
                    .children(
                        create("span")
                            .text(t("LANDER_FAQ"))
                            .build(),
                        GenericTemplates.inlineLink(() => navigate(RoutePath.faq), t("FAQ_INLINE")),
                    ).build(),
            ).build();
    }

    static lydaBenefits() {
        // Add back marquee when we have more benefits
        return create("div")
            .classes("marquee")
            .children(
                create("div")
                    .classes("scrolling", "flex")
                    .children(
                        GenericTemplates.benefit(t("BENEFIT_TRANSPARENT_ROYALTIES"), "visibility"),
                        GenericTemplates.benefit(t("BENEFIT_NO_ADS"), "ad_group_off"),
                        GenericTemplates.benefit(t("BENEFIT_SOCIAL_FEATURES"), "people"),
                        GenericTemplates.benefit(t("BENEFIT_SUPPORT_ARTISTS"), "artist"),
                        GenericTemplates.benefit(t("BENEFIT_NOT_FUNDING_DRONES"), "drone"),
                        GenericTemplates.benefit(t("BENEFIT_TRANSPARENT_ROYALTIES"), "visibility"),
                        GenericTemplates.benefit(t("BENEFIT_NO_ADS"), "ad_group_off"),
                        GenericTemplates.benefit(t("BENEFIT_SOCIAL_FEATURES"), "people"),
                        GenericTemplates.benefit(t("BENEFIT_SUPPORT_ARTISTS"), "artist"),
                        GenericTemplates.benefit(t("BENEFIT_NOT_FUNDING_DRONES"), "drone"),
                    ).build(),
            ).build();
    }
}
