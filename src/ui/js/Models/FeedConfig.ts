import { Signal, StringOrSignal } from "@targoninc/jess";

export interface FeedColumn<T> {
    key: string;
    header: string;
    render: (item: T, index: number) => any;
}

export interface FeedMenuAction<T> {
    label: StringOrSignal;
    icon?: string;
    onclick: (item: T) => void;
    show?: (item: T) => boolean;
}

export interface FeedConfig<T extends { id: number }> {
    id?: string;
    columns: FeedColumn<T>[];
    pageSize: number;
    fetchPage: (offset: number, limit: number) => Promise<T[]>;
    buildMenuActions: (item: T) => FeedMenuAction<T>[];
    onPlayToggle: (item: T) => Promise<void>;
    isPlaying: (itemId: number) => Signal<boolean>;
    isLoading?: (itemId: number) => Signal<boolean>;
}
