import {create, signal} from "https://fjs.targoninc.com/f.js";
import {Icons} from "../Enums/Icons.mjs";
import {AuthApi} from "../Classes/AuthApi.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {FormTemplates} from "./FormTemplates.mjs";
import {UserValidator} from "../Classes/Validators/UserValidator.mjs";
import {Util} from "../Classes/Util.mjs";
import {LydaCache} from "../Cache/LydaCache.mjs";
import {CacheItem} from "../Cache/CacheItem.mjs";
import {Ui} from "../Classes/Ui.mjs";

export class LandingPageTemplates {
    static newLandingPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "auth-box", "card")
                    .children(
                        LandingPageTemplates.registrationLoginBox()
                    ).build(),
            ).build();
    }

    static registrationLoginBox() {
        const step = signal("email");
        const user = signal({email: "", password: ""});
        const history = signal(["email"]);
        const templateMap = {
            "email": LandingPageTemplates.emailBox,
            "check-email": LandingPageTemplates.checkEmailBox,
            "register": LandingPageTemplates.registerBox,
            "login": LandingPageTemplates.loginBox,
            "checking-mfa": LandingPageTemplates.checkForMfaBox,
            "logging-in": LandingPageTemplates.loggingInBox,
            "registering": LandingPageTemplates.registeringBox,
            "mfa": LandingPageTemplates.mfaBox,
            "complete": LandingPageTemplates.completeBox
        };
        const pageMap = {
            "email": "E-Mail",
            "register": "Register",
            "login": "Login",
            "mfa": "2FA",
            "complete": "Complete"
        };

        const template = signal(templateMap[step.value](step, user));
        step.subscribe((newStep) => {
            history.value = [
                ...history.value,
                newStep
            ];
            template.value = create("div")
                .classes("flex-v")
                .children(
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.breadcrumbs(pageMap, history, step)
                        ).build(),
                    templateMap[newStep](step, user, history)
                ).build();
        });

        return template;
    }

    static completeBox() {
        return LandingPageTemplates.waitingBox("Complete", "Redirecting...");
    }

    static mfaBox(step, user) {
        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Two-factor authentication")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("p")
                            .text("You have two-factor authentication enabled. Please enter the code from the e-mail you just got sent to continue.")
                            .build(),
                        FormTemplates.textField("Code", "mfa-code", "Code", "text", "", true, (value) => {
                            user.value = {
                                ...user.value,
                                mfaCode: value
                            };
                        }, true, () => {
                        }, ["auth-input"]),
                        GenericTemplates.action(Icons.RIGHT, "Submit", "loginTrigger", () => {
                            step.value = "logging-in";
                        }, [], ["secondary", "positive"])
                    ).build(),
            ).build();
    }

    static registeringBox(step, user) {
        AuthApi.register(user.value.username, user.value.displayname, user.value.email, user.value.password, (res) => {
            console.log(res);
            step.value = "complete";
        });

        return LandingPageTemplates.waitingBox("Registering...", "Please wait");
    }

    static checkForMfaBox(step, user) {
        AuthApi.mfaRequest(user.value.email, user.value.password, (res) => {
            if (res.data && res.data !== "false") {
                step.value = "mfa";
            } else {
                step.value = "logging-in";
            }
        });

        return LandingPageTemplates.waitingBox("Checking for MFA...", "Please wait");
    }

    static loggingInBox(step, user) {
        AuthApi.login(user.value.email, user.value.password, user.value.mfaCode, (data) => {
            Ui.notify("Logged in as " + data.username, "success");
            Util.setCookie("token", data.token, 7);
            AuthApi.user(data.user_id, (user) => {
                LydaCache.set("user", new CacheItem(JSON.stringify(user)));
                LydaCache.set("sessionid", new CacheItem(Util.getSessionId()));
                step.value = "complete";

                let referrer = document.referrer;
                if (referrer !== "" && !referrer.includes("login")) {
                    window.location.href = referrer;
                } else {
                    window.location.href = "/home";
                }
            });
        });

        return LandingPageTemplates.waitingBox("Logging in...", "Please wait");
    }

    static waitingBox(title, message) {
        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.loadingSpinner(),
                        create("span")
                            .text(message)
                            .build()
                    ).build()
            ).build();
    }

    static loginBox(step, user) {
        const errors = signal(new Set());
        user.subscribe((newUser) => {
            errors.value = UserValidator.validateLogin(newUser);
        });
        const continueLogin = () => {
            errors.value = UserValidator.validateLogin(user.value);
            if (errors.value.size === 0) {
                step.value = "checking-mfa";
            }
        };

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Log in")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FormTemplates.textField("E-Mail", "email", "E-Mail", "email", user.value.email, true, (value) => {
                            AuthApi.userExists(value, () => {
                                user.value = {
                                    ...user.value,
                                    email: value
                                };
                            }, () => {
                                errors.value = [
                                    ...errors.value,
                                    "This E-mail address is not registered. Please register instead."
                                ];
                            });
                        }, false, () => {
                        }, ["auth-input"]),
                        FormTemplates.textField("Password", "password", "Password", "password", user.value.password, true, (value) => {
                            user.value = {
                                ...user.value,
                                password: value
                            };
                        }, true, (e) => {
                            if (e.key === "Enter") {
                                user.value = {
                                    ...user.value,
                                    password: e.target.value
                                };
                                step.value = "checking-mfa";
                            }
                        }, ["auth-input"]),
                        create("a")
                            .classes("inlineLink")
                            .href("/forgot-password")
                            .text("Change/forgot password?")
                            .build(),
                        create("a")
                            .classes("inlineLink")
                            .text("Register instead")
                            .onclick(() => {
                                continueLogin();
                            }).build(),
                        GenericTemplates.action(Icons.RIGHT, "Login", "mfaCheckTrigger", () => {
                            step.value = "checking-mfa";
                        }, [], ["secondary", "positive"]),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    static checkEmailBox(step, user) {
        AuthApi.userExists(user.value.email, (data) => {
            user.value = {
                ...user.value,
                username: data.username,
                displayname: data.displayname
            };
            step.value = "login";
        }, () => {
            step.value = "register";
        });

        return LandingPageTemplates.waitingBox("Checking E-mail address...", "Please wait");
    }

    static errorList(errorState) {
        const container = signal(create("div").classes("flex-v").build());
        errorState.subscribe((newErrors) => {
            container.value = create("div")
                .classes("flex-v", "nogap")
                .children(
                    ...[...newErrors].map((error) => {
                        return create("div")
                            .classes("error")
                            .text(error)
                            .build();
                    })
                ).build();
        });

        return container;
    }

    static registerBox(step, user) {
        const errors = signal(new Set());
        const touchedFields = new Set();
        for (const key in user.value) {
            if (Object.hasOwn(user.value, key) && user.value.key !== "") {
                touchedFields.add(key);
            }
        }
        user.subscribe((newUser) => {
            errors.value = UserValidator.validateRegistration(newUser, touchedFields);
        });
        const continueRegistration = () => {
            errors.value = UserValidator.validateRegistration(user.value, touchedFields);
            if (errors.value.size === 0) {
                step.value = "registering";
            }
        };

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Register")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FormTemplates.textField("Username", "username", "Username", "text", user.value.username, true, (value) => {
                            if (!touchedFields.has("username") && value) {
                                touchedFields.add("username");
                            }
                            user.value = {
                                ...user.value,
                                username: value
                            };
                        }, true, () => {
                        }, ["auth-input", "flexGrow"]),
                        FormTemplates.textField("Display name", "displayname", "Display name", "text", user.value.username, true, (value) => {
                            if (!touchedFields.has("displayname") && value) {
                                touchedFields.add("displayname");
                            }
                            user.value = {
                                ...user.value,
                                displayname: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flexGrow"]),
                        FormTemplates.textField("Email", "email", "Email", "email", user.value.email, true, (value) => {
                            if (!touchedFields.has("email") && value) {
                                touchedFields.add("email");
                            }
                            user.value = {
                                ...user.value,
                                email: value
                            };
                            AuthApi.userExists(value, () => {
                                errors.value = [
                                    ...errors.value,
                                    "This E-mail address is already in use. Please use a different one."
                                ];
                            });
                        }, false, () => {
                        }, ["auth-input", "flexGrow"]),
                        FormTemplates.textField("Password", "password", "Password", "password", user.value.password, true, (value) => {
                            if (!touchedFields.has("password") && value) {
                                touchedFields.add("password");
                            }
                            user.value = {
                                ...user.value,
                                password: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flexGrow"]),
                        FormTemplates.textField("Repeat password", "password-2", "Repeat password", "password", user.value.password, true, (value) => {
                            if (!touchedFields.has("password2") && value) {
                                touchedFields.add("password2");
                            }
                            user.value = {
                                ...user.value,
                                password2: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flexGrow"]),
                        FormTemplates.checkBoxField("I agree to the Terms of Service & Privacy Policy", "tos-checkbox", "I agree to the Terms of Service & Privacy Policy", false, true),
                        create("a")
                            .classes("inlineLink")
                            .href("https://targoninc.com/tos")
                            .target("_blank")
                            .text("Read the Terms of Service / Privacy Policy")
                            .build(),
                        GenericTemplates.action(Icons.RIGHT, "Register", "registerTrigger", () => {
                            continueRegistration();
                        }, [], ["secondary", "positive"]),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    static emailBox(step, user) {
        const errors = signal([]);
        user.subscribe((newUser) => {
            errors.value = UserValidator.validateEmailCheck(newUser);
        });
        const triggerLogin = () => {
            errors.value = UserValidator.validateEmailCheck(user.value);
            if (errors.value.size === 0) {
                step.value = "check-email";
            }
        };

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Enter your email")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex", "space-outwards", "auth-input")
                            .children(
                                create("label")
                                    .text("E-Mail")
                                    .for("email-input")
                                    .build(),
                                create("input")
                                    .classes("flexGrow")
                                    .name("email")
                                    .id("email-input")
                                    .type("text")
                                    .placeholder("E-Mail")
                                    .value(user.value.email)
                                    .required(true)
                                    .autocomplete("email")
                                    .onchange((e) => {
                                        user.value = {
                                            ...user.value,
                                            email: e.target.value
                                        };
                                    })
                                    .onkeydown((e) => {
                                        if (e.key === "Enter") {
                                            user.value = {
                                                ...user.value,
                                                email: e.target.value
                                            };
                                            triggerLogin();
                                        }
                                    }).build(),
                            ).build(),
                        GenericTemplates.action(Icons.RIGHT, "Next", "checkEmailTrigger", () => {
                            const email = document.getElementById("email-input").value;
                            user.value = {
                                ...user.value,
                                email
                            };
                            triggerLogin();
                        }, [], ["secondary", "positive"])
                    ).build(),
            ).build();
    }

    static footer() {
        return create("a")
            .href("https://targoninc.com/tos")
            .target("_blank")
            .text("Terms of Service")
            .build();
    }
}
