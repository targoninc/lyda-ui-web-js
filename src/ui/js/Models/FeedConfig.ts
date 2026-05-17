import { Signal, StringOrSignal, AnyNode } from "@targoninc/jess";

export interface FeedColumn<T> {
    key: string;
    header: StringOrSignal;
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
    fetchPage: (offset: number, limit: number, filter?: string) => Promise<T[]>;
    buildMenuActions: (item: T) => FeedMenuAction<T>[];
    onPlayToggle: (item: T) => Promise<void>;
    isPlaying: (itemId: number) => Signal<boolean>;
    isLoading?: (itemId: number) => Signal<boolean>;
    buildInteractions?: (item: T) => AnyNode[];
    showSearch?: boolean;
}
