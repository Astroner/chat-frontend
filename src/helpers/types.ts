export type EventTemplate<T extends string, Data = {}> = Data & {
    type: T;
};

export type EventListener<E> = (e: E) => void;

export type Subscription = {
    unsubscribe: VoidFunction;
};

export const joinSubs = (...subs: Subscription[]): Subscription => {
    return {
        unsubscribe: () => {
            for (const sub of subs) {
                sub.unsubscribe();
            }
        },
    };
};
