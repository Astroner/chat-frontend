import { EventTemplate, EventListener, Subscription } from "../helpers/types";

export type ConsoleEntry = 
    | { type: 'log', args: any[] }
    | { type: 'error', args: any[] };

export type ConsoleEvent = 
    | EventTemplate<'entry', { entry: ConsoleEntry }>;

export class Console {
    private entries: ConsoleEntry[] = [];
    private listeners = new Set<EventListener<ConsoleEvent>>();

    constructor() {}

    init() {
        const originalLog = console.log;

        console.log = (...args) => {

            const entry: ConsoleEntry = { type: 'log', args };
            this.entries.push(entry)
            this.sendEvent({ type: "entry", entry })
            originalLog(...args);
        }

        const originalError = console.error;

        console.error = (...args) => {

            const entry: ConsoleEntry = { type: 'error', args };
            this.entries.push(entry)
            this.sendEvent({ type: 'entry', entry });
            originalError(...args);
        }
    }

    getEntries(): ReadonlyArray<ConsoleEntry> {
        return this.entries;
    }

    addEventListener(cb: EventListener<ConsoleEvent>): Subscription {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb)
        }
    }

    private sendEvent(ev: ConsoleEvent) {
        this.listeners.forEach(cb => cb(ev));
    }
}