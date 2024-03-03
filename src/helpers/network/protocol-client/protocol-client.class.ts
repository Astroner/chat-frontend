import { EventListener, Subscription } from '../../types';
import { Connection } from '../connection/connection.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import { EncryptionKey, SigningKey } from '../../crypto/crypto.types';
import { ProtocolMessage } from './protocol-client.types';
import { deserializeMessage, serializeMessage } from './message-serialization';
import { BufferBuilder } from '../../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';
import { SignsIndex } from '../../crypto/signs-index/signs-index.class';
import { CommonStorage } from '../../storage/common-storage.class';
import { getHash } from '../../crypto/hash/get-hash';

export type ProtocolClientEvent =
    | (ProtocolMessage & { keyID: string; timestamp: number })
    | {
          type: 'signature-mismatch';
          keyID: string;
          timestamp: number;
          signature?: ArrayBuffer;
          cipher: ArrayBuffer;
          data: ArrayBuffer;
      };

export class ProtocolClient {
    private listeners = new Set<EventListener<ProtocolClientEvent>>();

    private connectionSub: Subscription | null = null;

    constructor(
        private connection: Connection,
        private keysIndex: KeysIndex,
        private signsIndex: SignsIndex,
        private commonStorage: CommonStorage,
    ) {}

    init() {
        this.connectionSub = this.connection.addEventListener(async (ev) => {
            if (ev.type !== 'MESSAGE') return;

            if (ev.data.type !== 'arrayBuffer') return;

            this.handleMessage(ev.data.data, ev.timestamp);
            this.commonStorage.updateLastMessage(
                ev.timestamp,
                await getHash(ev.data.data),
            );
        });
    }

    async dispatchMessage(timestamp: number, data: ArrayBuffer) {
        await Promise.all([
            this.handleMessage(data, timestamp),
            getHash(data).then((hash) =>
                this.commonStorage.updateLastMessage(timestamp, hash),
            ),
        ]);
    }

    destroy() {
        this.connectionSub?.unsubscribe();
    }

    async postMessage(
        message: ProtocolMessage,
        encryptionKey: EncryptionKey,
        signingKey?: SigningKey,
    ) {
        const payload = new BufferBuilder();

        payload.appendBoolean(!!signingKey);

        const cipher = await encryptionKey.encrypt(
            await serializeMessage(message),
        );

        if (signingKey) {
            payload.appendBuffer(await signingKey.createSignature(cipher));
        }

        payload.appendBuffer(cipher);

        const transfer = payload.getBuffer();

        this.commonStorage.updateLastMessage(
            Date.now(),
            await getHash(transfer),
        );
        this.connection.sendMessage(transfer);
    }

    addEventListener(
        handler: EventListener<ProtocolClientEvent>,
    ): Subscription {
        this.listeners.add(handler);

        return {
            unsubscribe: () => this.listeners.delete(handler),
        };
    }

    private sendEvent(ev: ProtocolClientEvent) {
        queueMicrotask(() => {
            this.listeners.forEach((cb) => cb(ev));
        })
    }

    private async handleMessage(buffer: ArrayBuffer, timestamp: number) {
        const reader = new BufferReader(buffer);

        const hasSignature = reader.readBool();

        const signature = hasSignature ? reader.readBytes() : null;

        const cipher = reader.readBytes();

        const data = await this.keysIndex.tryToDecrypt(cipher);
        if (!data) return;

        if (signature) {
            if (
                !(await this.signsIndex.verifyForKey(
                    data.keyID,
                    cipher,
                    signature,
                ))
            ) {
                this.sendEvent({
                    type: 'signature-mismatch',
                    cipher,
                    data: data.data,
                    keyID: data.keyID,
                    signature,
                    timestamp,
                });
                return;
            }
        } else if (this.signsIndex.hasSigningKey(data.keyID)) {
            this.sendEvent({
                type: 'signature-mismatch',
                cipher,
                data: data.data,
                keyID: data.keyID,
                timestamp,
            });

            return;
        }

        const message = await deserializeMessage(data.data);

        if (!message) return;

        this.sendEvent({
            keyID: data.keyID,
            timestamp,
            ...message,
        });
    }
}
