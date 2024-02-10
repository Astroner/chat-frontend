export type EventTemplate<T extends string, Data = {}> = Data & {
    type: T;
};

export type EventListener<E> = (e: E) => void;

export type Subscription = {
    unsubscribe: VoidFunction;
};
