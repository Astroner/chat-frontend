import { Subscription } from "../helpers/types";

export class WindowFocusService {
    private listeners = new Set<VoidFunction>();

    private state: DocumentVisibilityState;

    constructor() {
        if(global.document) {
            this.state = document.visibilityState;
        } else {
            this.state = "hidden";
        }
    }

    init() {
        this.state = document.visibilityState;
        document.addEventListener('visibilitychange', this.handleChange);
    }

    destroy() {
        document.removeEventListener('visibilitychange', this.handleChange);
    }

    getState() {
        return this.state;
    }

    subscribe(cb: VoidFunction): Subscription {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb)
        }
    }

    private handleChange = () => {
        this.state = document.visibilityState;
        this.listeners.forEach(cb => cb());
    }
}