import { EventListener, EventTemplate, Subscription } from "../../types";
import { Connection } from "../connection/connection.class";
import { KeysIndex } from "../../crypto/keys-index/keys-index.class";
import { EncryptionKey } from "../../crypto/crypto.types";
import { ProtocolMessage } from "./protocol-client.types";
import { deserializeMessage, serializeMessage } from "./message-serialization";

type ProtocolClientEvent = ProtocolMessage & { keyID: string }

export class ProtocolClient {
    private listeners = new Set<EventListener<ProtocolClientEvent>>()

    private connectionSub: Subscription | null = null;

    constructor(
        private connection: Connection,
        private keysIndex: KeysIndex
    ) {}

    init() {
        this.connectionSub = this.connection.addEventListener(async ev => {
            if(ev.type !== "MESSAGE") return;

            let buffer: ArrayBuffer;
            switch(ev.data.type) {
                case "blob":
                    buffer = await ev.data.data.arrayBuffer()
            }

            const data = await this.keysIndex.tryToDecrypt(buffer);
            if(!data) return

            const message = await deserializeMessage(data.data);

            if(!message) return;

            this.sendEvent({
                keyID: data.keyID,
                ...message
            })
        })
    }

    destroy() {
        this.connectionSub?.unsubscribe();
    }

    async postMessage(message: ProtocolMessage, key: EncryptionKey) {
        const cipher = await key.encrypt(await serializeMessage(message));
        this.connection.sendMessage(cipher);
    }

    addEventListener(handler: EventListener<ProtocolMessage>): Subscription {
        this.listeners.add(handler);

        return {
            unsubscribe: () => this.listeners.delete(handler)
        }
    }

    private sendEvent(ev: ProtocolClientEvent) {
        this.listeners.forEach(cb => cb(ev));
    }
}