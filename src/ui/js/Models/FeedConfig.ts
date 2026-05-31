import { Signal, StringOrSignal, AnyNode, isSignal } from "@targoninc/jess";

export interface FeedColumn<T> {
    key: string;
    header: StringOrSignal;
    render: (item: T, index: number) => any;
}

export interface FeedMenuAction<T> {
    label: StringOrSignal;
    icon?: StringOrSignal;
    onclick: (item: T, e: Event) => void;
    show?: (item: T) => boolean;
}

export interface FeedConfig<T extends { id: number }> {
    id?: string;
    columns: FeedColumn<T>[] | Signal<FeedColumn<T>[]>;
    pageSize: number;
    fetchPage: (offset: number, limit: number, filter?: string, sortBy?: string, sortDir?: 'asc' | 'desc') => Promise<T[]>;
    buildMenuActions: (item: T) => FeedMenuAction<T>[];
    onPlayToggle: (item: T) => Promise<void>;
    isPlaying: (itemId: number) => Signal<boolean>;
    isLoading?: (itemId: number) => Signal<boolean>;
    buildInteractions?: (item: T) => AnyNode[];
    showSearch?: boolean;
    compact?: boolean;
    onNavigate?: (item: T) => void;
    dateRender?: (item: T) => AnyNode;
    actionDateHeader?: StringOrSignal;
    actionDateRender?: (item: T) => AnyNode;
    header?: AnyNode;
    filterState?: Signal<string>;
}

export function resolveColumns<T>(columns: FeedConfig<T>["columns"]): FeedColumn<T>[] {
    return isSignal(columns) ? columns.value : columns;
}
