import {Icons} from "../Enums/Icons.js";
import {AuthApi} from "../Classes/AuthApi.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {UserValidator} from "../Classes/Validators/UserValidator.ts";
import {finalizeLogin} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {FJSC} from "../../fjsc";
import {InputType} from "../../fjsc/Types.ts";
import {User} from "../Models/DbModels/User.ts";
import {HtmlPropertyValue, Signal, create, signal, computedSignal, ifjs} from "../../fjsc/f2.ts";
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
        const templateMap = {
            "email": LandingPageTemplates.emailBox,
            "check-email": LandingPageTemplates.checkEmailBox,
            "register": LandingPageTemplates.registerBox,
            "login": LandingPageTemplates.loginBox,
            "checking-mfa": LandingPageTemplates.checkForMfaBox,
            "logging-in": LandingPageTemplates.loggingInBox,
            "registering": LandingPageTemplates.registeringBox,
            "mfa": LandingPageTemplates.mfaBox,
            "complete": LandingPageTemplates.completeBox,
            "reset-password": LandingPageTemplates.resetPasswordBox,
            "password-reset": LandingPageTemplates.enterNewPasswordBox,
            "password-reset-requested": LandingPageTemplates.passwordResetRequestedBox,
        };
        const altEntryPoints = ["password-reset"];
        let firstStep: keyof typeof templateMap | undefined = "email";
        if (altEntryPoints.some(entryPoint => window.location.pathname.includes(entryPoint))) {
            firstStep = altEntryPoints.find(entryPoint => window.location.pathname.includes(entryPoint)) as keyof typeof templateMap;
        }
        const step = signal<keyof typeof templateMap>(firstStep ?? "email");
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
        const pageMap = {
            "email": "E-Mail",
            "register": "Register",
            "login": "Login",
            "mfa": "2FA",
            "complete": "Complete"
        };

        const template = signal(templateMap[step.value](step, user));
        step.subscribe((newStep: keyof typeof pageMap) => {
            if (pageMap[newStep] && !history.value.includes(newStep)) {
                history.value = [
                    ...history.value,
                    newStep
                ];
            }
            template.value = create("div")
                .classes("flex-v")
                .children(
                    create("div")
                        .classes("flex")
                        .children(
                            GenericTemplates.breadcrumbs(pageMap, history, step)
                        ).build(),
                    templateMap[newStep](step, user)
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
                        FormTemplates.textField("Code", "mfa-code", "Code", "text", "", true, (value: string) => {
                            user.value = {
                                ...user.value,
                                mfaCode: value
                            };
                        }, true, () => {
                        }),
                        GenericTemplates.action(Icons.RIGHT, "Submit", "loginTrigger", () => {
                            step.value = "logging-in";
                        }, [], ["secondary", "positive"])
                    ).build(),
            ).build();
    }

    static registeringBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.register(user.value.username, user.value.displayname, user.value.email, user.value.password, (res: ApiResponse<any>) => {
            if (res.code === 200) {
                step.value = "complete";
            } else {
                Ui.notify(`Failed to register: ${res.data.error}`, "error");
                step.value = "email";
            }
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
        AuthApi.login(user.value.email, user.value.password, user.value.mfaCode, (data: { user: User }) => {
            Ui.notify("Logged in as " + data.user.username, "success");
            AuthApi.user(data.user.id, (user: User) => {
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
                        LandingPageTemplates.passwordInput(password, user, () => step.value = "checking-mfa"),
                        GenericTemplates.inlineLink(() => {
                            step.value = "reset-password";
                        }, "Change/forgot password?", false),
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

    static resetPasswordBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal(new Set<string>());
        user.subscribe((newUser: AuthData) => {
            errors.value = UserValidator.validateLogin(newUser);
        });
        const email = computedSignal<string>(user, (u: AuthData) => u.email);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Forgot password")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("div")
                            .classes("flex", "space-outwards")
                            .children(
                                FJSC.input<string>({
                                    type: InputType.text,
                                    name: "email",
                                    label: "E-Mail",
                                    placeholder: "E-Mail",
                                    value: email,
                                    required: true,
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
                                        }
                                    },
                                }),
                            ).build(),
                        FJSC.button({
                            text: "Next",
                            id: "checkEmailTrigger",
                            classes: ["positive"],
                            disabled: computedSignal(user, (u: AuthData) => !u.email || u.email.trim().length === 0),
                            onclick: async () => {
                                const res = await AuthApi.requestPasswordReset(email.value);
                                if (res.code === 200) {
                                    Ui.notify("Password reset requested, check your email", "success");
                                    step.value = "password-reset-requested";
                                } else {
                                    Ui.notify(`Failed to reset password: ${res.data.error}`, "error");
                                    errors.value = new Set([
                                        ...errors.value,
                                        res.data.error
                                    ]);
                                }
                            },
                        }),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    static enterNewPasswordBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal(new Set<string>());
        user.subscribe((newUser: AuthData) => {
            errors.value = UserValidator.validatePasswordReset(newUser);
        });
        const password = computedSignal<string>(user, (u: AuthData) => u.password);
        const passwordConfirm = computedSignal<string>(user, (u: AuthData) => u.password2);
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get("token");

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Enter new password")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        LandingPageTemplates.passwordInput(password, user),
                        FJSC.input<string>({
                            type: InputType.password,
                            name: "password-confirm",
                            label: "Confirm password",
                            placeholder: "Confirm password",
                            value: passwordConfirm,
                            required: true,
                            onchange: (value) => {
                                user.value = {
                                    ...user.value,
                                    password2: value
                                };
                            },
                            onkeydown: (e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                    user.value = {
                                        ...user.value,
                                        password2: e.target?.value
                                    };
                                }
                            },
                        }),
                        FJSC.button({
                            text: "Next",
                            classes: ["positive"],
                            disabled: computedSignal(user, (u: AuthData) => !u.password || u.password.trim().length === 0 || u.password !== u.password2 || u.password2.trim().length === 0 || !token),
                            onclick: async () => {
                                if (!token) {
                                    Ui.notify("Token is missing", "error");
                                    return;
                                }
                                const res = await AuthApi.resetPassword(token, user.value.password, user.value.password2);
                                if (res.code === 200) {
                                    Ui.notify("Password updated, you can now log in", "success");
                                    step.value = "login";
                                } else {
                                    Ui.notify(`Failed to reset password: ${res.data.error}`, "error");
                                    errors.value = new Set([
                                        ...errors.value,
                                        res.data.error
                                    ]);
                                }
                            },
                        }),
                        LandingPageTemplates.errorList(errors),
                    ).build(),
            ).build();
    }

    private static passwordInput(password: Signal<string>, user: Signal<AuthData>, onEnter: Function = () => {}) {
        return FJSC.input<string>({
            type: InputType.password,
            name: "password",
            label: "Password",
            placeholder: "Password",
            value: password,
            required: true,
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
                    onEnter();
                }
            },
        });
    }

    static passwordResetRequestedBox(step: Signal<string>, user: Signal<AuthData>) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Password reset requested")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        create("span")
                            .text("Please check your email for a password reset link. After you've reset your password, you can log in.")
                            .build(),
                        FJSC.button({
                            text: "Go to Login",
                            id: "mfaCheckTrigger",
                            disabled: computedSignal(user, (u: AuthData) => !u.email || u.email.trim().length === 0),
                            onclick: () => {
                                step.value = "login";
                            },
                            classes: ["secondary", "positive"]
                        }),
                    ).build()
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

    static errorList(errorState: Signal<Set<string>>) {
        const container = signal(create("div").classes("flex-v").build());
        errorState.subscribe((newErrors: Set<string>) => {
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
        const errors = signal(new Set<string>());
        const touchedFields = new Set<string>();
        for (const key in user.value) {
            // @ts-ignore
            if (Object.hasOwn(user.value, key) && user.value[key] !== "") {
                touchedFields.add(key);
            }
        }
        user.subscribe((newUser: AuthData) => {
            errors.value = UserValidator.validateRegistration(newUser, touchedFields);
        });
        const emailInUseError = "This E-mail address is already in use. Please use a different one.";
        const continueRegistration = () => {
            errors.value = UserValidator.validateRegistration(user.value, touchedFields);
            if (errors.value.size === 0) {
                AuthApi.userExists(user.value.email, () => {
                    errors.value = new Set([
                        ...errors.value,
                        emailInUseError
                    ]);
                }, () => {
                    step.value = "registering";
                });
            }
        };
        if (user.value.email) {
            AuthApi.userExists(user.value.email, () => {
                errors.value = new Set([
                    ...errors.value,
                    emailInUseError
                ]);
            });
        }
        const allFieldsTouched = signal(false);
        function checkAllFieldsTouched() {
            allFieldsTouched.value = touchedFields.size === 6;
        }

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Register")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FormTemplates.textField("Username", "username", "Username", "text", user.value.username, true, (value: string) => {
                            if (!touchedFields.has("username") && value) {
                                touchedFields.add("username");
                                checkAllFieldsTouched();
                            }
                            user.value = {
                                ...user.value,
                                username: value
                            };
                        }, true, () => {
                        }, ["flex-grow"]),
                        FormTemplates.textField("Display name", "displayname", "Display name", "text", user.value.username, true, (value: string) => {
                            if (!touchedFields.has("displayname") && value) {
                                touchedFields.add("displayname");
                                checkAllFieldsTouched();
                            }
                            user.value = {
                                ...user.value,
                                displayname: value
                            };
                        }, false, () => {
                        }, ["flex-grow"]),
                        FJSC.input<string>({
                            type: InputType.email,
                            name: "email",
                            label: "Email",
                            placeholder: "E-Mail",
                            value: user.value.email,
                            required: true,
                            debounce: 500,
                            validators: [
                                async (v) => {
                                    return new Promise<string[] | null | undefined>((resolve) => {
                                        AuthApi.userExists(v, () => {
                                            errors.value = new Set([
                                                ...errors.value,
                                                emailInUseError
                                            ]);
                                            resolve([emailInUseError]);
                                        }, () => {
                                            const tmpErrors = [...errors.value];
                                            tmpErrors.splice(tmpErrors.indexOf(emailInUseError), 1);
                                            errors.value = new Set(tmpErrors);
                                            resolve(null);
                                        });
                                    });
                                }
                            ],
                            onchange: (value) => {
                                if (!touchedFields.has("email") && value) {
                                    touchedFields.add("email");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    email: value
                                };
                            },
                        }),
                        FormTemplates.textField("Password", "password", "Password", "password", user.value.password, true, (value: string) => {
                            if (!touchedFields.has("password") && value) {
                                touchedFields.add("password");
                                checkAllFieldsTouched();
                            }
                            user.value = {
                                ...user.value,
                                password: value
                            };
                        }, false, () => {
                        }, ["flex-grow"]),
                        FormTemplates.textField("Repeat password", "password-2", "Repeat password", "password", user.value.password2, true, (value: string) => {
                            if (!touchedFields.has("password2") && value) {
                                touchedFields.add("password2");
                                checkAllFieldsTouched();
                            }
                            user.value = {
                                ...user.value,
                                password2: value
                            };
                        }, false, () => {
                        }, ["flex-grow"]),
                        FormTemplates.checkBoxField("tos-checkbox", "I agree to the Terms of Service & Privacy Policy", false, true, () => {
                            if (!touchedFields.has("termsOfService")) {
                                touchedFields.add("termsOfService");
                                checkAllFieldsTouched();
                            }
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
                        ifjs(allFieldsTouched, create("div").classes("flex-v").children(
                            LandingPageTemplates.errorList(errors)
                        ).build()),
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
                            .classes("flex", "space-outwards")
                            .children(
                                FJSC.input<string>({
                                    type: InputType.text,
                                    name: "email",
                                    label: "E-Mail",
                                    placeholder: "E-Mail",
                                    value: user.value.email,
                                    required: true,
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
