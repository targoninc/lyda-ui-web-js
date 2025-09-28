import { compute, signal } from "@targoninc/jess";
import { en } from "./en.ts";
import { de } from "./de.ts";
import { SelectOption } from "@targoninc/jess-components";
import { LydaCache } from "../js/Cache/LydaCache.ts";
import { CacheItem } from "../js/Cache/CacheItem.ts";
import { Api } from "../js/Api/Api.ts";
import { ga } from "./ga.ts";

export type TranslationFunction = (...args: any[]) => void;
export type TranslationValue = string | TranslationFunction;

export type BaseTranslation = Record<string, TranslationValue>;

type TranslationKey = keyof (typeof en);
export type Translation = Record<TranslationKey, TranslationValue>;

export enum Language {
    en = "en",
    de = "de",
    ga = "ga",
}

export const LanguageOptions: SelectOption<Language>[] = [
    { id: Language.en, name: "English" },
    { id: Language.de, name: "Deutsch" },
    { id: Language.ga, name: "Gaeilge" },
];

const translations: Record<Language, Translation> = {
    [Language.en]: en,
    [Language.de]: de,
    [Language.ga]: ga,
};

const url = new URL(window.location.href);
const param = url.searchParams.get("lang");
let guessedLang;
if (!param) {
    guessedLang = navigator.language.split("-").at(0);
}
const defaultLanguage = (param ?? guessedLang ?? Language.en) as Language;
if (!Object.values(Language).includes(defaultLanguage)) {
    guessedLang = Language.en;
}

export const language = signal(defaultLanguage);
language.subscribe((lang, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("language", new CacheItem(lang));
    Api.updateUserSetting("language", lang).then();
});

export function getTranslation(lookup: TranslationKey | string, lang: Language) {
    const l = translations[lang];
    if (!l) {
        if (lang !== defaultLanguage) {
            return getTranslation(lookup, defaultLanguage);
        }

        return "<i18n/ERR: Lang not found>";
    }

    if (l[lookup as TranslationKey]) {
        return l[lookup as TranslationKey];
    }

    const foundKey = Object.keys(en).find((key) => en[key as TranslationKey] === lookup);
    if (foundKey) {
        return getTranslation(foundKey, lang);
    }

    if (lang !== defaultLanguage) {
        return getTranslation(lookup, defaultLanguage);
    }

    return "<i18n/ERR: Key not found>";
}

export function t(lookup: TranslationKey, ...args: any[]) {
    return compute(l => {
        const tl = getTranslation(lookup, l);
        if (tl.constructor === Function) {
            return (tl as Function)(...args);
        }

        return tl;
    }, language);
}
