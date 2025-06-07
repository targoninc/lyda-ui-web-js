import {AuthApi} from "../Api/AuthApi.ts";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {FormTemplates} from "./generic/FormTemplates.ts";
import {UserValidator} from "../Classes/Validators/UserValidator.ts";
import {finalizeLogin, target, Util} from "../Classes/Util.ts";
import {notify} from "../Classes/Ui.ts";
import {HttpClient, ApiResponse} from "../Api/HttpClient.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {navigate} from "../Routing/Router.ts";
import {currentUser} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {compute, Signal, signal, HtmlPropertyValue, AnyNode, create, InputType, when } from "@targoninc/jess";
import { button, error, errorList, input } from "@targoninc/jess-components";
import {NotificationType} from "../Enums/NotificationType.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";

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
        const templateMap: Record<string, (step: Signal<string>, user: Signal<AuthData>) => AnyNode> = {
            "email": LandingPageTemplates.emailBox,
            "check-email": LandingPageTemplates.checkEmailBox,
            "register": LandingPageTemplates.registerBox,
            "login": LandingPageTemplates.loginBox,
            "checking-mfa": LandingPageTemplates.checkForMfaBox,
            "logging-in": LandingPageTemplates.loggingInBox,
            "registering": LandingPageTemplates.registeringBox,
            "mfa-select": LandingPageTemplates.mfaSelection,
            "mfa": LandingPageTemplates.mfaBox,
            "complete": LandingPageTemplates.completeBox,
            "reset-password": LandingPageTemplates.resetPasswordBox,
            "password-reset": LandingPageTemplates.enterNewPasswordBox,
            "password-reset-requested": LandingPageTemplates.passwordResetRequestedBox,
            "verify-email": LandingPageTemplates.verifyEmailBox,
        };
        const altEntryPoints = ["password-reset", "verify-email"];
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
        step.subscribe((newStep: keyof typeof templateMap) => {
            // @ts-ignore
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
        AuthApi.user(null, user => {
            currentUser.value = user;
        });
        navigate(RoutePath.profile);

        return LandingPageTemplates.waitingBox("Complete", "Redirecting...");
    }

    static mfaSelection(step: Signal<string>, user: Signal<AuthData>) {
        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Select MFA method")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("p")
                            .text("Please select the MFA method you want to use.")
                            .build(),
                        ...methods.map(method => ({ method })),
                        button({
                            text: "Submit",
                            icon: { icon: "login" },
                            classes: ["positive"],
                            onclick: () => {
                                step.value = "logging-in";
                            }
                        }),
                    ).build(),
            ).build();
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
                        button({
                            text: "Submit",
                            icon: { icon: "login" },
                            classes: ["positive"],
                            onclick: () => {
                                step.value = "logging-in";
                            }
                        }),
                    ).build(),
            ).build();
    }

    static verifyEmailBox(step: Signal<string>, user: Signal<AuthData>) {
        const code = Util.getUrlParameter("code");
        const error$ = signal<string>("");
        const done = signal(false);
        const activating = signal(true);

        HttpClient.postAsync(ApiRoutes.verifyEmail, {
            activationCode: code
        }).then(res => {
            activating.value = false;
            if (res.code !== 200) {
                error$.value = res.data.error ?? "Unknown error";
            } else {
                done.value = true;
            }
        });

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Email verification")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        when(activating, create("p")
                            .text(`We're verifying your email with code ${code}...`)
                            .build()),
                        when(done, create("p")
                            .text(`This email is now verified!`)
                            .build()),
                        when(done, button({
                            text: "Go to profile",
                            icon: { icon: "person" },
                            classes: ["positive"],
                            onclick: () => navigate(RoutePath.profile)
                        })),
                        when(compute(e => e.length > 0, error$), error(error$))
                    ).build()
            ).build();
    }

    static registeringBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.register(user.value.username, user.value.displayname, user.value.email, user.value.password, (res: ApiResponse<any>) => {
            if (res.code === 200) {
                step.value = "complete";
            } else {
                notify(`Failed to register: ${res.data.error}`, NotificationType.error);
                step.value = "email";
            }
        });

        return LandingPageTemplates.waitingBox("Registering...", "Please wait");
    }

    static checkForMfaBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.getMfaOptions(user.value.email, user.value.password)

        AuthApi.mfaRequest(user.value.email, user.value.password, (res: ApiResponse<any>) => {
            if (res.data && res.data.user) {
                finalizeLogin(step, res.data.user);
            } else if (res.data && res.data.mfa_needed) {
                step.value = "mfa-select";
            } else {
                step.value = "logging-in";
            }
        }, () => {
            step.value = "login";
        });

        return LandingPageTemplates.waitingBox("Checking for MFA...", "Please wait");
    }

    static loggingInBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.login(user.value.email, user.value.password, user.value.mfaCode, (data: { user: User }) => {
            notify("Logged in as " + data.user.username, NotificationType.success);
            AuthApi.user(data.user.id, (user: User) => {
                finalizeLogin(step, user);
            });
        }, () => {
            step.value = "login";
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
        const errors = signal<string[]>([]);
        user.subscribe(newUser => {
            errors.value = UserValidator.validateLogin(newUser);
        });
        const continueLogin = () => {
            errors.value = UserValidator.validateLogin(user.value);
            if (errors.value.length === 0) {
                step.value = "checking-mfa";
            }
        };
        const email = compute((u: AuthData) => u.email, user);
        const password = compute((u: AuthData) => u.password, user);

        return create("div")
            .classes("flex-v", "align-center")
            .children(
                create("h1")
                    .text("Log in")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        input<string>({
                            type: InputType.text,
                            name: "email",
                            label: "E-Mail",
                            placeholder: "E-Mail",
                            value: email,
                            required: true,
                            attributes: ["autocomplete", "email"],
                            onchange: (value) => {
                                AuthApi.userExists(value, () => {
                                    user.value = {
                                        ...user.value,
                                        email: value
                                    };
                                }, () => {
                                    errors.value = [
                                        "This E-mail address is not registered. Please register instead."
                                    ];
                                });
                            },
                        }),
                        LandingPageTemplates.passwordInput(password, user, () => step.value = "checking-mfa", true),
                        button({
                            text: "Login",
                            id: "mfaCheckTrigger",
                            disabled: compute(u => !u.email || !u.password || u.email.trim().length === 0 || u.password.trim().length === 0, user),
                            onclick: continueLogin,
                            icon: {
                                icon: "login",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
                        errorList(errors),
                        GenericTemplates.inlineLink(() => {
                            step.value = "reset-password";
                        }, "Change/forgot password?", false),
                        GenericTemplates.inlineLink(() => {
                            step.value = "register";
                        }, "Register instead"),
                    ).build(),
            ).build();
    }

    static resetPasswordBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal<string[]>([]);
        user.subscribe(newUser => {
            errors.value = UserValidator.validateLogin(newUser);
        });
        const email = compute((u: AuthData) => u.email, user);

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
                                input<string>({
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
                                                email: target(e).value
                                            };
                                        }
                                    },
                                }),
                            ).build(),
                        button({
                            text: "Next",
                            id: "checkEmailTrigger",
                            classes: ["positive"],
                            disabled: compute(u => !u.email || u.email.trim().length === 0, user),
                            onclick: async () => {
                                const res = await AuthApi.requestPasswordReset(email.value);
                                if (res.code === 200) {
                                    notify("Password reset requested, check your email", NotificationType.success);
                                    step.value = "password-reset-requested";
                                } else {
                                    notify(`Failed to reset password: ${res.data.error}`, NotificationType.error);
                                    errors.value = [res.data.error];
                                }
                            },
                        }),
                        errorList(errors),
                    ).build(),
            ).build();
    }

    static enterNewPasswordBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal<string[]>([]);
        user.subscribe((newUser: AuthData) => {
            errors.value = UserValidator.validatePasswordReset(newUser);
        });
        const password = compute((u: AuthData) => u.password, user);
        const passwordConfirm = compute((u: AuthData) => u.password2, user);
        const token = Util.getUrlParameter("token");

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
                        input<string>({
                            type: InputType.password,
                            name: "password-confirm",
                            label: "Confirm password",
                            placeholder: "Confirm password",
                            attributes: ["autocomplete", "password"],
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
                                        password2: target(e).value
                                    };
                                }
                            },
                        }),
                        button({
                            text: "Next",
                            classes: ["positive"],
                            disabled: compute(u => !u.password || u.password.trim().length === 0 || u.password !== u.password2 || u.password2.trim().length === 0 || !token, user),
                            onclick: async () => {
                                if (!token) {
                                    notify("Token is missing", NotificationType.error);
                                    return;
                                }
                                const res = await AuthApi.resetPassword(token, user.value.password, user.value.password2);
                                if (res.code === 200) {
                                    notify("Password updated, you can now log in", NotificationType.success);
                                    step.value = "login";
                                } else {
                                    notify(`Failed to reset password: ${res.data.error}`, NotificationType.error);
                                    errors.value = [res.data.error];
                                }
                            },
                        }),
                        errorList(errors),
                    ).build(),
            ).build();
    }

    private static passwordInput(password: Signal<string>, user: Signal<AuthData>, onEnter: Function = () => {}, focusImmediately = false) {
        setTimeout(() => {
            if (focusImmediately) {
                const input = document.querySelector("[name='password']") as HTMLInputElement;
                input?.focus();
            }
        }, 100);

        return input<string>({
            type: InputType.password,
            name: "password",
            label: "Password",
            placeholder: "Password",
            value: password,
            required: true,
            attributes: ["autocomplete", "password"],
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
                        password: target(e).value
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
                        button({
                            text: "Go to Login",
                            id: "mfaCheckTrigger",
                            disabled: compute(u => !u.email || u.email.trim().length === 0, user),
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

    static registerBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal<string[]>([]);
        const touchedFields = new Set<string>();
        for (const key in user.value) {
            // @ts-ignore
            if (Object.hasOwn(user.value, key) && user.value[key] !== "") {
                touchedFields.add(key);
            }
        }
        user.subscribe(newUser => {
            errors.value = UserValidator.validateRegistration(newUser, touchedFields);
        });
        const emailInUseError = "This E-mail address is already in use. Please use a different one.";
        const continueRegistration = () => {
            errors.value = UserValidator.validateRegistration(user.value, touchedFields);
            if (errors.value.length === 0) {
                AuthApi.userExists(user.value.email, () => {
                    errors.value = [emailInUseError];
                }, () => {
                    step.value = "registering";
                });
            }
        };
        if (user.value.email) {
            AuthApi.userExists(user.value.email, () => {
                errors.value = [emailInUseError];
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
                        input<string>({
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
                                            errors.value = [emailInUseError];
                                            resolve([emailInUseError]);
                                        }, () => {
                                            const tmpErrors = [...errors.value];
                                            tmpErrors.splice(tmpErrors.indexOf(emailInUseError), 1);
                                            errors.value = tmpErrors;
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
                        FormTemplates.textField("Repeat password", "password", "Repeat password", "password", user.value.password2, true, (value: string) => {
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
                        button({
                            text: "Register",
                            id: "registerTrigger",
                            disabled: compute((e, allTouched) => e.length > 0 || !allTouched, errors, allFieldsTouched),
                            onclick: continueRegistration,
                            icon: {
                                icon: "person_add",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
                        when(allFieldsTouched, create("div").classes("flex-v").children(
                            errorList(errors)
                        ).build()),
                    ).build(),
            ).build();
    }

    static emailBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal<string[]>([]);
        user.subscribe(newUser => {
            errors.value = UserValidator.validateEmailCheck(newUser);
        });
        const triggerLogin = () => {
            errors.value = UserValidator.validateEmailCheck(user.value);
            if (errors.value.length === 0) {
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
                                input<string>({
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
                                                email: target(e).value
                                            };
                                            triggerLogin();
                                        }
                                    }
                                }),
                                create("input")
                                    .classes("hidden")
                                    .name("password")
                                    .type(InputType.password)
                                    .onchange((e) => {
                                        user.value = {
                                            ...user.value,
                                            password: target(e).value
                                        };
                                    })
                                    .build(),
                            ).build(),
                        button({
                            text: "Next",
                            id: "checkEmailTrigger",
                            disabled: compute((u, e) => !u.email || u.email.trim().length === 0 || e.length > 0, user, errors),
                            onclick: triggerLogin,
                            icon: {
                                icon: "arrow_forward",
                                adaptive: true
                            },
                            classes: ["secondary", "positive"]
                        }),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("h2")
                            .text("Why use Lyda?")
                            .build(),
                        LandingPageTemplates.lydaBenefits(),
                        create("p")
                            .styles("max-width", "300px")
                            .children(
                                create("span")
                                    .text("We are focused on building a platform that is both good for artists as well as listeners.")
                                    .build(),
                            ).build(),
                        create("p")
                            .classes("color-dim")
                            .styles("max-width", "300px")
                            .children(
                                create("span")
                                    .text("We want to make sure that artists can earn money from their work, and listeners can enjoy their music without ads.")
                                    .build(),
                            ).build(),
                        create("p")
                            .classes("color-dim")
                            .styles("max-width", "300px")
                            .children(
                                create("span")
                                    .text(" If you're curious about what we're building, you can take a look at our ")
                                    .build(),
                                GenericTemplates.inlineLink(() => navigate(RoutePath.roadmap), "roadmap"),
                            ).build(),
                    ).build(),
            ).build();
    }

    static lydaBenefits() {
        return create("div")
            .classes("flex")
            .children(
                GenericTemplates.benefit("Transparent royalties", "visibility"),
                GenericTemplates.benefit("No ads", "ad_group_off"),
                GenericTemplates.benefit("Social features", "people"),
            ).build();

        /* Add back marquee when we have more benefits
        return create("div")
            .classes("marquee")
            .styles("max-width", "min(500px, 100%)")
            .children(
                create("div")
                    .classes("scrolling", "flex")
                    .children(
                        GenericTemplates.benefit("Transparent royalties", "visibility"),
                        GenericTemplates.benefit("No ads", "ad_group_off"),
                        GenericTemplates.benefit("Social features", "people"),
                    ).build()
            ).build();*/
    }
}
