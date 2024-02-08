import { wait } from "../../wait";


type ConnectionEventTemplate<T extends string, Data = {}> = Data & {
    type: T;
}

export type ConnectionEvent = 
    | ConnectionEventTemplate<"CONNECTED">
    | ConnectionEventTemplate<"CONNECTING">
    | ConnectionEventTemplate<"MESSAGE", { data: string, timestamp: number }>
    | ConnectionEventTemplate<"ERROR">
    | ConnectionEventTemplate<"RECONNECTING">
    | ConnectionEventTemplate<"CLOSED">

export type ConnectionEventHandler = (ev: ConnectionEvent) => void;

export enum CONNECTION_CLOSE_CODE {
    DONE = 1000,
    GOING_AWAY = 1001,
    NO_STATUS = 1005,
    NETWORK_TROUBLES = 1006,
}

const connectWebSocket = (address: string) => new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(address);

    const closeHandler = (ev: CloseEvent) => reject(ev.code);
    const errorHandler = () => reject(CONNECTION_CLOSE_CODE.NO_STATUS);

    ws.addEventListener("close", closeHandler);
    ws.addEventListener("error", errorHandler);
    
    ws.addEventListener("open", () => {
        ws.removeEventListener("close", closeHandler);
        ws.removeEventListener("error", errorHandler);

        resolve(ws);
    })
})

export class Connection {
    static MAX_RECONNECT_ATTEMPTS = 5;
    static RECONNECT_TIMEOUT_MS = 1000 * 30; // 30s

    private listeners = new Set<ConnectionEventHandler>();

    private socket: WebSocket | null = null;

    constructor(private address: string) {}

    async connect() {
        this.sendEvent({ type: "CONNECTING" });
        await this.reconnect();
    }

    sendMessage(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if(!this.socket) return false;
        
        this.socket.send(data);

        return true;
    }

    addEventListener(handler: ConnectionEventHandler) {
        this.listeners.add(handler);

        return {
            unsubscribe: () => {
                this.listeners.delete(handler);
            }
        }
    }

    async destroy() {
        this.socket?.close();
        this.socket = null;
    }

    private sendEvent(ev: ConnectionEvent) {
        this.listeners.forEach(cb => cb(ev));
    }

    private async reconnect(reconnects = 1) {
        if(reconnects === Connection.MAX_RECONNECT_ATTEMPTS) {
            this.sendEvent({ type: "ERROR" });

            throw new Error("Failed to connect to the server");
        }

        try {
            this.socket = await connectWebSocket(this.address);
            this.assignListeners();
            this.sendEvent({ type: "CONNECTED" });
        } catch(e) {
            await wait(Connection.RECONNECT_TIMEOUT_MS);

            await this.reconnect(reconnects + 1);
        }
    }

    private assignListeners() {
        if(!this.socket) return;

        this.socket.addEventListener("message", (message) => {
            this.sendEvent({ type: "MESSAGE", data: message.data, timestamp: message.timeStamp })
        })

        this.socket.addEventListener("close", (closeEvent) => {
            if(closeEvent.code !== CONNECTION_CLOSE_CODE.DONE) {
                this.sendEvent({ type: "RECONNECTING" });
                this.reconnect();
            } else {
                this.sendEvent({ type: "CLOSED" })
            }
        })
    }
}