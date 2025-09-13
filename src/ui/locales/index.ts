import { compute, signal } from "@targoninc/jess";
import { en } from "./en.ts";
import { de } from "./de.ts";
import { SelectOption } from "@targoninc/jess-components";
import { LydaCache } from "../js/Cache/LydaCache.ts";
import { CacheItem } from "../js/Cache/CacheItem.ts";
import { Api } from "../js/Api/Api.ts";
import { currentUser } from "../js/state.ts";
import { getUserSettingValue } from "../js/Classes/Util.ts";

export type TranslationFunction = (...args: any[]) => void;

export type BaseTranslation = Record<string, string | TranslationFunction>;

type TranslationKey = keyof (typeof en);
export type Translation = Record<TranslationKey, string>;

export enum Language {
    en = "en",
    de = "de",
}

export const LanguageOptions: SelectOption<Language>[] = [
    { id: Language.en, name: "English" },
    { id: Language.de, name: "Deutsch" },
];

const translations: Record<Language, Translation> = {
    [Language.en]: en,
    [Language.de]: de,
};

const defaultLanguage = Language.en;

export const language = signal(defaultLanguage);
language.subscribe((lang, changed) => {
    if (!changed) {
        return;
    }
    LydaCache.set("language", new CacheItem(lang));
    Api.updateUserSetting("language", lang).then();
});
currentUser.subscribe(u => {
    if (u) {
        language.value = getUserSettingValue<Language>(u, "language");
    }
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

export function t(lookup: TranslationKey) {
    return compute(l => getTranslation(lookup, l), language);
}
