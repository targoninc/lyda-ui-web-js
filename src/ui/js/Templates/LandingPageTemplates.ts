import { AuthApi } from "../Api/AuthApi.ts";
import { GenericTemplates, horizontal, vertical } from "./generic/GenericTemplates.ts";
import { FormTemplates } from "./generic/FormTemplates.ts";
import { UserValidator } from "../Classes/Validators/UserValidator.ts";
import { finalizeLogin, target, Util } from "../Classes/Util.ts";
import { notify } from "../Classes/Ui.ts";
import { navigate } from "../Routing/Router.ts";
import { currentUser } from "../state.ts";
import { RoutePath } from "../Routing/routes.ts";
import {
    AnyNode,
    compute,
    create,
    HtmlPropertyValue,
    InputType,
    Signal,
    signal,
    signalMap,
    StringOrSignal,
    when,
} from "@targoninc/jess";
import { button, error, errorList, heading, input } from "@targoninc/jess-components";
import { NotificationType } from "../Enums/NotificationType.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { MfaOption } from "@targoninc/lyda-shared/src/Enums/MfaOption.ts";
import { sendMfaRequest } from "../Classes/Helpers/Mfa.ts";
import { AuthenticationResponseJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";

export interface AuthData {
    termsOfService: boolean;
    id?: number;
    username: string;
    displayname: string;
    email: string;
    password: string;
    password2: string;
    mfaCode?: string;
    mfaMethod?: MfaOption;
    verification?: AuthenticationResponseJSON;
    challenge?: string;
}

export class LandingPageTemplates {
    static newLandingPage() {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "auth-box", "card")
                    .children(LandingPageTemplates.registrationLoginBox())
                    .build(),
            ).build();
    }

    static registrationLoginBox() {
        const templateMap: Record<
            string,
            (step: Signal<string>, user: Signal<AuthData>) => AnyNode
        > = {
            email: LandingPageTemplates.emailBox,
            "check-email": LandingPageTemplates.checkEmailBox,
            register: LandingPageTemplates.registerBox,
            registering: LandingPageTemplates.registeringBox,
            login: LandingPageTemplates.loginBox,
            "check-mfa": LandingPageTemplates.checkForMfaBox,
            "logging-in": LandingPageTemplates.loggingInBox,
            "mfa-select": LandingPageTemplates.mfaSelection,
            "mfa-request": LandingPageTemplates.mfaRequest,
            "verify-mfa": LandingPageTemplates.mfaVerify,
            complete: LandingPageTemplates.completeBox,
            "reset-password": LandingPageTemplates.resetPasswordBox,
            "password-reset": LandingPageTemplates.enterNewPasswordBox,
            "password-reset-requested": LandingPageTemplates.passwordResetRequestedBox,
            "verify-email": LandingPageTemplates.verifyEmailBox,
        };
        const altEntryPoints = ["password-reset", "verify-email"];
        let firstStep: keyof typeof templateMap | undefined = "email";
        if (altEntryPoints.some(entryPoint => window.location.pathname.includes(entryPoint))) {
            firstStep = altEntryPoints.find(entryPoint =>
                window.location.pathname.includes(entryPoint),
            ) as keyof typeof templateMap;
        }
        const step = signal<keyof typeof templateMap>(firstStep ?? "email");
        step.subscribe(s => console.log(`step ${s}`));
        const user = signal<AuthData>({
            email: "",
            username: "",
            displayname: "",
            password: "",
            password2: "",
            termsOfService: false,
        });
        const history = signal<string[]>([]);
        const pageMap: Record<string, string> = {
            email: `${t("EMAIL")}`,
            register: `${t("REGISTER")}`,
            login: `${t("LOGIN")}`,
            "mfa-select": `${t("SELECT_MFA")}`,
            "mfa-request": `${t("VERIFY_MFA")}`,
            complete: `${t("COMPLETE")}`,
        };

        const template = signal(LandingPageTemplates.templatedLandingPageBox(pageMap, history, step, templateMap, step.value, user));
        step.subscribe((newStep: keyof typeof templateMap) => {
            if (pageMap[newStep] && !history.value.includes(newStep) && newStep !== "email") {
                if (!history.value.includes("email")) {
                    history.value = ["email", ...history.value, newStep];
                } else {
                    history.value = [...history.value, newStep];
                }
            }
            template.value = LandingPageTemplates.templatedLandingPageBox(pageMap, history, step, templateMap, newStep, user);
        });

        return template;
    }

    private static templatedLandingPageBox(pageMap: Record<string, string>, history: Signal<string[]>, step: Signal<keyof Record<string, (step: Signal<string>, user: Signal<AuthData>) => AnyNode>>, templateMap: Record<string, (step: Signal<string>, user: Signal<AuthData>) => AnyNode>, newStep: string, user: Signal<AuthData>) {
        return vertical(
            create("div")
                .classes("flex")
                .children(GenericTemplates.breadcrumbs(pageMap, history, step))
                .build(),
            templateMap[newStep](step, user),
        ).classes("fullWidth").build();
    }

    static completeBox() {
        Api.getUserById(null).then((user) => {
            if (user) {
                currentUser.value = user;
            }
        });
        navigate(RoutePath.profile);

        return LandingPageTemplates.waitingBox(t("COMPLETE"), t("REDIRECTING"));
    }

    static mfaSelection(step: Signal<string>, user: Signal<AuthData>) {
        const options = signal<{ type: MfaOption }[]>([]);
        const selected = signal<MfaOption | undefined>(user.value.mfaMethod);
        Api.getMfaOptions(user.value.email, user.value.password).then(data => {
            if (data) {
                options.value = data.options;
                if (options.value.length === 1) {
                    selected.value = options.value[0].type;
                }
            }
        });
        selected.subscribe(s => {
            user.value = {
                ...user.value,
                mfaMethod: s,
            };
            step.value = "mfa-request";
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("SELECT_MFA_METHOD"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("p")
                            .text(t("PLEASE_SELECT_MFA_METHOD"))
                            .build(),
                        signalMap(options, vertical(), o =>
                            LandingPageTemplates.mfaOption(o.type, selected),
                        ),
                    ).build(),
            ).build();
    }

    static mfaOption(opt: MfaOption, selected: Signal<MfaOption | undefined>) {
        const icon: Record<MfaOption, string> = {
            [MfaOption.email]: "forward_to_inbox",
            [MfaOption.totp]: "qr_code",
            [MfaOption.webauthn]: "passkey",
        };
        const text: Record<MfaOption, StringOrSignal> = {
            [MfaOption.email]: t("EMAIL"),
            [MfaOption.totp]: t("TOTP"),
            [MfaOption.webauthn]: t("PASSKEY"),
        };

        return button({
            icon: { icon: icon[opt] },
            text: text[opt],
            onclick: () => (selected.value = opt),
        });
    }

    static mfaRequest(step: Signal<string>, user: Signal<AuthData>) {
        const isSubmittable = [MfaOption.email, MfaOption.totp].includes(user.value.mfaMethod!);
        const codeNotSet = compute(u => !u.mfaCode || u.mfaCode.trim().length === 0, user);
        const loading = signal(false);

        sendMfaRequest(loading, step, user, user.value.mfaMethod!);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("MFA_VERIFICATION"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("p")
                            .text(t("MFA_ENABLED_ENTER_CODE"))
                            .build(),
                        when(
                            isSubmittable,
                            FormTemplates.textField(t("CODE"), "mfa-code", t("CODE"), "text",
                                "", true,
                                (value: string) => {
                                    user.value = {
                                        ...user.value,
                                        mfaCode: value.trim(),
                                    };
                                    if (value.trim().length === 6) {
                                        step.value = "verify-mfa";
                                    }
                                }, true,
                            ),
                        ),
                        horizontal(
                            when(
                                isSubmittable,
                                button({
                                    text: t("SUBMIT"),
                                    icon: { icon: "login" },
                                    classes: ["positive"],
                                    disabled: compute((c, l) => c || l, codeNotSet, loading),
                                    onclick: () => step.value = "verify-mfa",
                                }),
                            ),
                            when(loading, GenericTemplates.loadingSpinner()),
                        ).classes("align-children"),
                    )
                    .build(),
            ).build();
    }

    static mfaVerify(step: Signal<string>, user: Signal<AuthData>) {
        if (user.value.mfaMethod! === MfaOption.webauthn) {
            Api.verifyWebauthn(user.value.verification!, user.value.challenge!)
               .then(() => step.value = "logging-in")
               .catch(() => step.value = "mfa-request");
        } else {
            Api.verifyTotp(user.value.id!, user.value.mfaCode!, user.value.mfaMethod!)
               .then(() => step.value = "logging-in")
               .catch(() => step.value = "mfa-request");
        }

        return horizontal();
    }

    static verifyEmailBox() {
        const code = Util.getUrlParameter("code");
        const error$ = signal<string>("");
        const done = signal(false);
        const activating = signal(true);

        if (code) {
            Api.verifyEmail(code)
               .then(() => (done.value = true))
               .catch(e => (error$.value = e ?? "Unknown error"))
               .finally(() => (activating.value = false));
        } else {
            error$.value = `${t("MISSING_CODE")}`;
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("EMAIL_VERIFICATION"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        when(
                            activating,
                            create("p")
                                .text(t("VERIFYING_EMAIL_WITH_CODE", code))
                                .build(),
                        ),
                        when(done, create("p")
                            .text(t("EMAIL_NOW_VERIFIED"))
                            .build(),
                        ),
                        when(
                            done,
                            button({
                                text: t("GO_TO_PROFILE"),
                                icon: { icon: "person" },
                                classes: ["positive"],
                                onclick: () => navigate(RoutePath.profile),
                            }),
                        ),
                        when(
                            compute(e => e.length > 0, error$),
                            error(error$),
                        ),
                    ).build(),
            ).build();
    }

    static registeringBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.register(
            user.value.username,
            user.value.displayname,
            user.value.email,
            user.value.password,
            () => (step.value = "complete"),
            () => (step.value = "register"),
        ).then();

        return LandingPageTemplates.waitingBox(t("REGISTERING"), t("PLEASE_WAIT"));
    }

    static checkForMfaBox(step: Signal<string>, user: Signal<AuthData>) {
        Api.getMfaOptions(user.value.email, user.value.password).then(data => {
            if (!data) {
                step.value = "logging-in";
                return;
            }

            const options = data.options;
            user.value = {
                ...user.value,
                id: data.userId,
            };
            if (options.length === 0) {
                step.value = "logging-in";
            } else {
                step.value = "mfa-select";
            }
        });

        return LandingPageTemplates.waitingBox(t("CHECKING_FOR_MFA"), t("PLEASE_WAIT"));
    }

    static loggingInBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.login(
            user.value.email,
            user.value.password,
            user.value.challenge,
            (data: { user: User }) => {
                notify(`${t("LOGGED_IN_AS_NAME", data.user.username)}`, NotificationType.success);
                Api.getUserById(data.user.id).then((user) => {
                    if (user) {
                        finalizeLogin(step, user);
                    }
                });
            },
            () => {
                step.value = "login";
            },
        ).then();

        return LandingPageTemplates.waitingBox(t("LOGGING_IN"), t("PLEASE_WAIT"));
    }

    static waitingBox(title: HtmlPropertyValue, message: HtmlPropertyValue) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1").text(title).build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.loadingSpinner(),
                        create("span").text(message).build(),
                    )
                    .build(),
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
                step.value = "check-mfa";
            }
        };
        const email = compute((u: AuthData) => u.email, user);
        const password = compute((u: AuthData) => u.password, user);

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("LOGIN"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        input<string>({
                            type: InputType.text,
                            name: "email",
                            label: t("EMAIL"),
                            placeholder: t("EMAIL"),
                            value: email,
                            required: true,
                            attributes: ["autocomplete", "email"],
                            onchange: value => {
                                AuthApi.userExists(
                                    value,
                                    () => {
                                        user.value = {
                                            ...user.value,
                                            email: value,
                                        };
                                    },
                                    () => {
                                        errors.value = [
                                            `${t("ERROR_EMAIL_NOT_REGISTERED")}`,
                                        ];
                                    },
                                );
                            },
                        }),
                        LandingPageTemplates.passwordInput(
                            password,
                            user,
                            () => (step.value = "check-mfa"),
                            true,
                        ),
                        button({
                            text: t("LOGIN"),
                            id: "mfaCheckTrigger",
                            disabled: compute(
                                u =>
                                    !u.email ||
                                    !u.password ||
                                    u.email.trim().length === 0 ||
                                    u.password.trim().length === 0,
                                user,
                            ),
                            onclick: continueLogin,
                            icon: {
                                icon: "login",
                                adaptive: true,
                            },
                            classes: ["secondary", "positive"],
                        }),
                        errorList(errors),
                        GenericTemplates.inlineLink(
                            () => {
                                step.value = "reset-password";
                            },
                            t("CHANGE_FORGOT_PASSWORD"),
                            false,
                        ),
                        GenericTemplates.inlineLink(() => {
                            step.value = "register";
                        }, t("REGISTER_INSTEAD")),
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
                    .text(t("FORGOT_PASSWORD"))
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
                                    label: t("EMAIL"),
                                    placeholder: t("EMAIL"),
                                    value: email,
                                    required: true,
                                    onchange: value => {
                                        user.value = {
                                            ...user.value,
                                            email: value,
                                        };
                                    },
                                    onkeydown: (e: KeyboardEvent) => {
                                        if (e.key === "Enter") {
                                            user.value = {
                                                ...user.value,
                                                email: target(e).value,
                                            };
                                        }
                                    },
                                }),
                            )
                            .build(),
                        button({
                            text: "Next",
                            id: "checkEmailTrigger",
                            classes: ["positive"],
                            disabled: compute(u => !u.email || u.email.trim().length === 0, user),
                            onclick: async () => {
                                try {
                                    await Api.requestPasswordReset(email.value);
                                    notify(
                                        `${t("PASSWORD_RESET_REQUESTED")}`,
                                        NotificationType.success,
                                    );
                                    step.value = "password-reset-requested";
                                } catch (error: any) {
                                    errors.value = [error];
                                }
                            },
                        }),
                        errorList(errors),
                    )
                    .build(),
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
                    .text(t("ENTER_NEW_PASSWORD"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        LandingPageTemplates.passwordInput(password, user),
                        input<string>({
                            type: InputType.password,
                            name: "password-confirm",
                            label: t("CONFIRM_PASSWORD"),
                            placeholder: t("CONFIRM_PASSWORD"),
                            attributes: ["autocomplete", "password"],
                            value: passwordConfirm,
                            required: true,
                            onchange: value => {
                                user.value = {
                                    ...user.value,
                                    password2: value,
                                };
                            },
                            onkeydown: (e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                    user.value = {
                                        ...user.value,
                                        password2: target(e).value,
                                    };
                                }
                            },
                        }),
                        button({
                            text: t("NEXT"),
                            classes: ["positive"],
                            disabled: compute(
                                u =>
                                    !u.password ||
                                    u.password.trim().length === 0 ||
                                    u.password !== u.password2 ||
                                    u.password2.trim().length === 0 ||
                                    !token,
                                user,
                            ),
                            onclick: async () => {
                                if (!token) {
                                    notify(`${t("TOKEN_MISSING")}`, NotificationType.error);
                                    return;
                                }
                                try {
                                    await Api.resetPassword(
                                        token,
                                        user.value.password,
                                        user.value.password2,
                                    );
                                    notify(
                                        `${t("PASSWORD_UPDATED")}`,
                                        NotificationType.success,
                                    );
                                    step.value = "login";
                                } catch (error: any) {
                                    errors.value = [error];
                                }
                            },
                        }),
                        errorList(errors),
                    )
                    .build(),
            ).build();
    }

    private static passwordInput(
        password: Signal<string>,
        user: Signal<AuthData>,
        onEnter: Function = () => {},
        focusImmediately = false,
    ) {
        setTimeout(() => {
            if (focusImmediately) {
                const input = document.querySelector("[name='password']") as HTMLInputElement;
                input?.focus();
            }
        }, 100);

        return input<string>({
            type: InputType.password,
            name: "password",
            label: t("PASSWORD"),
            placeholder: t("PASSWORD"),
            value: password,
            required: true,
            attributes: ["autocomplete", "password"],
            onchange: value => {
                user.value = {
                    ...user.value,
                    password: value,
                };
            },
            onkeydown: (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    user.value = {
                        ...user.value,
                        password: target(e).value,
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
                    .text(t("PASSWORD_RESET_REQUESTED"))
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        create("span")
                            .text(t("CHECK_EMAIL_FOR_RESET_LINK")).build(),
                        button({
                            text: t("GO_TO_LOGIN"),
                            id: "mfaCheckTrigger",
                            disabled: compute(u => !u.email || u.email.trim().length === 0, user),
                            onclick: () => {
                                step.value = "login";
                            },
                            classes: ["secondary", "positive"],
                        }),
                    )
                    .build(),
            ).build();
    }

    static checkEmailBox(step: Signal<string>, user: Signal<AuthData>) {
        AuthApi.userExists(
            user.value.email,
            (data: User) => {
                user.value = {
                    ...user.value,
                    username: data.username,
                    displayname: data.displayname,
                };
                step.value = "login";
            },
            () => {
                step.value = "register";
            },
        );

        return LandingPageTemplates.waitingBox(t("CHECKING_EMAIL"), t("PLEASE_WAIT"));
    }

    static registerBox(step: Signal<string>, user: Signal<AuthData>) {
        const errors = signal<string[]>([]);
        const touchedFields = new Set<string>();
        for (const key in user.value) {
            // @ts-expect-error ts is stupid
            if (Object.hasOwn(user.value, key) && user.value[key] !== "") {
                touchedFields.add(key);
            }
        }
        user.subscribe(newUser => {
            errors.value = UserValidator.validateRegistration(newUser, touchedFields);
        });
        const emailInUseError = `${t("ERROR_EMAIL_IN_USE")}`;
        const continueRegistration = () => {
            errors.value = UserValidator.validateRegistration(user.value, touchedFields);
            if (errors.value.length === 0) {
                AuthApi.userExists(
                    user.value.email,
                    () => {
                        errors.value = [emailInUseError];
                    },
                    () => {
                        step.value = "registering";
                    },
                );
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
            .classes("flex-v")
            .children(
                create("h1")
                    .text(t("REGISTER"))
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FormTemplates.textField(
                            t("USERNAME"),
                            "username",
                            t("USERNAME"),
                            "text",
                            user.value.username,
                            true,
                            (value: string) => {
                                if (!touchedFields.has("username") && value) {
                                    touchedFields.add("username");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    username: value,
                                };
                            },
                            true,
                            () => {},
                            ["flex-grow"],
                        ),
                        FormTemplates.textField(
                            t("DISPLAY_NAME"),
                            "displayname",
                            t("DISPLAY_NAME"),
                            "text",
                            user.value.username,
                            true,
                            (value: string) => {
                                if (!touchedFields.has("displayname") && value) {
                                    touchedFields.add("displayname");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    displayname: value,
                                };
                            },
                            false,
                            () => {},
                            ["flex-grow"],
                        ),
                        input<string>({
                            type: InputType.email,
                            name: "email",
                            label: t("EMAIL"),
                            placeholder: t("EMAIL"),
                            value: user.value.email,
                            required: true,
                            debounce: 500,
                            validators: [
                                async v => {
                                    return new Promise<string[] | null | undefined>(resolve => {
                                        AuthApi.userExists(
                                            v,
                                            () => {
                                                errors.value = [emailInUseError];
                                                resolve([emailInUseError]);
                                            },
                                            () => {
                                                const tmpErrors = [...errors.value];
                                                tmpErrors.splice(
                                                    tmpErrors.indexOf(emailInUseError),
                                                    1,
                                                );
                                                errors.value = tmpErrors;
                                                resolve(null);
                                            },
                                        );
                                    });
                                },
                            ],
                            onchange: value => {
                                if (!touchedFields.has("email") && value) {
                                    touchedFields.add("email");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    email: value,
                                };
                            },
                        }),
                        FormTemplates.textField(
                            t("PASSWORD"),
                            "password",
                            t("PASSWORD"),
                            "password",
                            user.value.password,
                            true,
                            (value: string) => {
                                if (!touchedFields.has("password") && value) {
                                    touchedFields.add("password");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    password: value,
                                };
                            },
                            false,
                            () => {},
                            ["flex-grow"],
                        ),
                        FormTemplates.textField(
                            t("REPEAT_PASSWORD"),
                            "password",
                            t("REPEAT_PASSWORD"),
                            "password",
                            user.value.password2,
                            true,
                            (value: string) => {
                                if (!touchedFields.has("password2") && value) {
                                    touchedFields.add("password2");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    password2: value,
                                };
                            },
                            false,
                            () => {},
                            ["flex-grow"],
                        ),
                        FormTemplates.checkBoxField("tos-checkbox", t("AGREE_TO_TOS"), false, true,
                            () => {
                                if (!touchedFields.has("termsOfService")) {
                                    touchedFields.add("termsOfService");
                                    checkAllFieldsTouched();
                                }
                                user.value = {
                                    ...user.value,
                                    termsOfService: !user.value.termsOfService,
                                };
                            },
                        ),
                        GenericTemplates.inlineLink("https://targoninc.com/tos", t("READ_TOS")),
                        button({
                            text: t("REGISTER"),
                            id: "registerTrigger",
                            disabled: compute(
                                (e, allTouched) => e.length > 0 || !allTouched,
                                errors,
                                allFieldsTouched,
                            ),
                            onclick: continueRegistration,
                            icon: {
                                icon: "person_add",
                                adaptive: true,
                            },
                            classes: ["secondary", "positive"],
                        }),
                        when(
                            allFieldsTouched,
                            create("div")
                                .classes("flex-v")
                                .children(errorList(errors))
                                .build(),
                        ),
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
        const loginDisabled = compute((u, e) => !u.email || u.email.trim().length === 0 || e.length > 0, user, errors);

        return create("div")
            .classes("flex-v", "align-center", "fullWidth")
            .children(
                vertical(
                    vertical(
                        heading({
                            level: 1,
                            text: t("ENTER_LYDA"),
                        }),
                        horizontal(
                            create("div")
                                .classes("flex", "space-outwards")
                                .children(
                                    input<string>({
                                        type: InputType.text,
                                        name: "email",
                                        placeholder: t("EMAIL"),
                                        value: user.value.email,
                                        required: true,
                                        classes: ["bigger-input", "rounded-max"],
                                        onchange: value => {
                                            user.value = {
                                                ...user.value,
                                                email: value,
                                            };
                                        },
                                        onkeydown: (e: KeyboardEvent) => {
                                            if (e.key === "Enter") {
                                                user.value = {
                                                    ...user.value,
                                                    email: target(e).value,
                                                };
                                                triggerLogin();
                                            }
                                        },
                                    }),
                                    create("input")
                                        .classes("hidden")
                                        .name("password")
                                        .type(InputType.password)
                                        .onchange(e => {
                                            user.value = {
                                                ...user.value,
                                                password: target(e).value,
                                            };
                                        }).build(),
                                ).build(),
                            button({
                                text: t("NEXT"),
                                id: "checkEmailTrigger",
                                disabled: loginDisabled,
                                onclick: triggerLogin,
                                icon: {
                                    icon: "arrow_forward",
                                    adaptive: true,
                                },
                                classes: ["special", "bigger-input", "rounded-max"],
                            }),
                        ),
                    ),
                ).classes("email-special-box", "animated-background", "align-children")
                 .build(),
                create("div")
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
