import { EventTemplate, Subscription } from '../../types';
import { wait } from '../../wait';

export type ConnectionDataTemplate<T extends string, Data> = {
    type: T;
    data: Data;
};

export type ConnectionData = 
    | ConnectionDataTemplate<'arrayBuffer', ArrayBuffer>
    | ConnectionDataTemplate<'string', string>;

export type ConnectionEvent =
    | EventTemplate<'CONNECTED'>
    | EventTemplate<'CONNECTING'>
    | EventTemplate<'MESSAGE', { data: ConnectionData; timestamp: number }>
    | EventTemplate<'ERROR'>
    | EventTemplate<'RECONNECTING'>
    | EventTemplate<'CLOSED'>;

export type ConnectionEventHandler = (ev: ConnectionEvent) => void;

export enum CONNECTION_CLOSE_CODE {
    DONE = 1000,
    GOING_AWAY = 1001,
    NO_STATUS = 1005,
    NETWORK_TROUBLES = 1006,
}

const connectWebSocket = (address: string) =>
    new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(address);
        ws.binaryType = "arraybuffer";

        const closeHandler = (ev: CloseEvent) => reject(ev.code);
        const errorHandler = () => reject(CONNECTION_CLOSE_CODE.NO_STATUS);

        ws.addEventListener('close', closeHandler);
        ws.addEventListener('error', errorHandler);

        ws.addEventListener('open', (e) => {
            ws.removeEventListener('close', closeHandler);
            ws.removeEventListener('error', errorHandler);

            resolve(ws);
        });
    });

export class Connection {
    static MAX_RECONNECT_ATTEMPTS = 5;
    static RECONNECT_TIMEOUT_MS = 1000 * 30; // 30s
    static TIMESTAMP_ORIGIN = Math.round(performance.timeOrigin)

    private listeners = new Set<ConnectionEventHandler>();

    private socket: WebSocket | null = null;

    private STARTED = false;

    constructor(private address: string) {}

    async connect() {
        if (this.STARTED) return;

        this.STARTED = true;

        this.sendEvent({ type: 'CONNECTING' });
        await this.reconnect();
    }

    sendMessage(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (!this.socket) return false;

        this.socket.send(data);

        return true;
    }

    addEventListener(handler: ConnectionEventHandler): Subscription {
        this.listeners.add(handler);

        return {
            unsubscribe: () => {
                this.listeners.delete(handler);
            },
        };
    }

    async destroy() {
        this.STARTED = false;
        this.socket?.close();
        this.socket = null;
    }

    private sendEvent(ev: ConnectionEvent) {
        this.listeners.forEach((cb) => cb(ev));
    }

    private async reconnect(reconnects = 1) {
        if (reconnects === Connection.MAX_RECONNECT_ATTEMPTS) {
            this.sendEvent({ type: 'ERROR' });

            throw new Error('Failed to connect to the server');
        }

        try {
            this.socket = await connectWebSocket(this.address);
            this.assignListeners();
            this.sendEvent({ type: 'CONNECTED' });
        } catch (e) {
            await wait(Connection.RECONNECT_TIMEOUT_MS);

            await this.reconnect(reconnects + 1);
        }
    }

    private assignListeners() {
        if (!this.socket) return;

        this.socket.addEventListener('message', (message) => {
            let data: ConnectionData;
            if (message.data instanceof ArrayBuffer) {
                data = {
                    type: 'arrayBuffer',
                    data: message.data,
                };
            } else if(typeof message.data === "string"){
                data = {
                    type: 'string',
                    data: message.data
                }
            } else {
                return;
            }

            this.sendEvent({
                type: 'MESSAGE',
                data,
                timestamp: Connection.TIMESTAMP_ORIGIN + Math.round(message.timeStamp),
            });
        });

        this.socket.addEventListener('close', (closeEvent) => {
            if (closeEvent.code !== CONNECTION_CLOSE_CODE.DONE) {
                this.sendEvent({ type: 'RECONNECTING' });
                this.reconnect();
            } else {
                this.sendEvent({ type: 'CLOSED' });
            }
        });
    }
}
