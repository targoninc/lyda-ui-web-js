import {Icons} from "../Enums/Icons.js";
import {AuthApi} from "../Classes/AuthApi.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {UserValidator} from "../Classes/Validators/UserValidator.ts";
import {finalizeLogin} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {InputType} from "../../fjsc/Types.ts";
import {User} from "../DbModels/User.ts";
import {HtmlPropertyValue, Signal, create, signal, computedSignal} from "../../fjsc/f2.ts";
import {ApiResponse} from "../Classes/Api.ts";

export interface AuthData {
    termsOfService: boolean;
    username: string;
    displayname: string;
    email: string;
    password: string;
    password2: string;
    mfaCode: string;
}

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
        const user = signal<AuthData>({
            email: "",
            username: "",
            displayname: "",
            password: "",
            password2: "",
            mfaCode: "",
            termsOfService: false
        });
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
        step.subscribe((newStep: string) => {
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
        window.location.href = "/";

        return LandingPageTemplates.waitingBox("Complete", "Redirecting...");
    }

    static mfaBox(step: Signal<string>, user: Signal<AuthData>) {
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

    static registeringBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.register(user.value.username, user.value.displayname, user.value.email, user.value.password, (res: any) => {
            console.log(res);
            step.value = "complete";
        });

        return LandingPageTemplates.waitingBox("Registering...", "Please wait");
    }

    static checkForMfaBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.mfaRequest(user.value.email, user.value.password, (res: ApiResponse<any>) => {
            if (res.data && res.data.user) {
                finalizeLogin(step, res.data.user);
            } else if (res.data && res.data.mfa_needed) {
                step.value = "mfa";
            } else {
                step.value = "logging-in";
            }
        });

        return LandingPageTemplates.waitingBox("Checking for MFA...", "Please wait");
    }

    static loggingInBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.login(user.value.email, user.value.password, user.value.mfaCode, (data) => {
            Ui.notify("Logged in as " + data.username, "success");
            AuthApi.user(data.user_id, (user) => {
                finalizeLogin(step, user);
            });
        });

        return LandingPageTemplates.waitingBox("Logging in...", "Please wait");
    }

    static waitingBox(title: HtmlPropertyValue, message: HtmlPropertyValue) {
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

    static loginBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal(new Set<string>());
        user.subscribe((newUser: User) => {
            errors.value = UserValidator.validateLogin(newUser);
        });
        const continueLogin = () => {
            errors.value = UserValidator.validateLogin(user.value);
            if (errors.value.size === 0) {
                step.value = "checking-mfa";
            }
        };
        const email = computedSignal<string>(user, (u: AuthData) => u.email);
        const password = computedSignal<string>(user, (u: AuthData) => u.password);

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Log in")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FJSC.input<string>({
                            type: InputType.text,
                            name: "email",
                            label: "E-Mail",
                            placeholder: "E-Mail",
                            value: email,
                            required: true,
                            classes: ["auth-input"],
                            onchange: (value) => {
                                AuthApi.userExists(value, () => {
                                    user.value = {
                                        ...user.value,
                                        email: value
                                    };
                                }, () => {
                                    errors.value = new Set([
                                        ...errors.value,
                                        "This E-mail address is not registered. Please register instead."
                                    ]);
                                });
                            },
                        }),
                        FJSC.input<string>({
                            type: InputType.password,
                            name: "password",
                            label: "Password",
                            placeholder: "Password",
                            value: password,
                            required: true,
                            classes: ["auth-input"],
                            onchange: (value) => {
                                user.value = {
                                    ...user.value,
                                    password: value
                                };
                            },
                            onkeydown: (e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                    user.value = {
                                        ...user.value,
                                        password: e.target?.value
                                    };
                                    step.value = "checking-mfa";
                                }
                            },
                        }),
                        GenericTemplates.inlineLink("/forgot-password", "Change/forgot password?", false),
                        GenericTemplates.inlineLink(() => {
                            step.value = "register";
                        }, "Register instead"),
                        FJSC.button({
                            text: "Login",
                            id: "mfaCheckTrigger",
                            disabled: computedSignal(user, (u: AuthData) => !u.email || !u.password || u.email.trim().length === 0 || u.password.trim().length === 0),
                            onclick: continueLogin,
                            icon: {
                                icon: "login",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    static checkEmailBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.userExists(user.value.email, (data: User) => {
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

    static registerBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal(new Set());
        const touchedFields = new Set<string>();
        for (const key in user.value) {
            if (Object.hasOwn(user.value, key) && user.value.key !== "") {
                touchedFields.add(key);
            }
        }
        user.subscribe((newUser: AuthData) => {
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
                        }, ["auth-input", "flex-grow"]),
                        FormTemplates.textField("Display name", "displayname", "Display name", "text", user.value.username, true, (value) => {
                            if (!touchedFields.has("displayname") && value) {
                                touchedFields.add("displayname");
                            }
                            user.value = {
                                ...user.value,
                                displayname: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flex-grow"]),
                        FormTemplates.textField("Email", "email", "Email", "email", user.value.email, true, (value) => {
                            if (!touchedFields.has("email") && value) {
                                touchedFields.add("email");
                            }
                            user.value = {
                                ...user.value,
                                email: value
                            };
                            AuthApi.userExists(value, () => {
                                errors.value = new Set([
                                    ...errors.value,
                                    "This E-mail address is already in use. Please use a different one."
                                ]);
                            });
                        }, false, () => {
                        }, ["auth-input", "flex-grow"]),
                        FormTemplates.textField("Password", "password", "Password", "password", user.value.password, true, (value) => {
                            if (!touchedFields.has("password") && value) {
                                touchedFields.add("password");
                            }
                            user.value = {
                                ...user.value,
                                password: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flex-grow"]),
                        FormTemplates.textField("Repeat password", "password-2", "Repeat password", "password", user.value.password, true, (value) => {
                            if (!touchedFields.has("password2") && value) {
                                touchedFields.add("password2");
                            }
                            user.value = {
                                ...user.value,
                                password2: value
                            };
                        }, false, () => {
                        }, ["auth-input", "flex-grow"]),
                        FormTemplates.checkBoxField("tos-checkbox", "I agree to the Terms of Service & Privacy Policy", false, true, () => {
                            user.value = {
                                ...user.value,
                                termsOfService: !user.value.termsOfService
                            };
                        }),
                        GenericTemplates.inlineLink("https://targoninc.com/tos", "Read the Terms of Service / Privacy Policy"),
                        FJSC.button({
                            text: "Register",
                            id: "registerTrigger",
                            disabled: computedSignal(errors, (e: Set<string>) => e.size > 0),
                            onclick: continueRegistration,
                            icon: {
                                icon: "person_add",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    static emailBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal(new Set<string>());
        user.subscribe((newUser: AuthData) => {
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
                                FJSC.input<string>({
                                    type: InputType.text,
                                    name: "email",
                                    label: "E-Mail",
                                    placeholder: "E-Mail",
                                    value: user.value.email,
                                    required: true,
                                    classes: ["auth-input"],
                                    onchange: (value) => {
                                        user.value = {
                                            ...user.value,
                                            email: value
                                        };
                                    },
                                    onkeydown: (e: KeyboardEvent) => {
                                        if (e.key === "Enter") {
                                            user.value = {
                                                ...user.value,
                                                email: e.target?.value
                                            };
                                            triggerLogin();
                                        }
                                    }
                                }),
                            ).build(),
                        FJSC.button({
                            text: "Next",
                            id: "checkEmailTrigger",
                            disabled: computedSignal(user, (u: AuthData) => !u.email || u.email.trim().length === 0),
                            onclick: triggerLogin,
                            icon: {
                                icon: "arrow_forward",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
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
