import { EventListener, Subscription } from '../../types';
import { Connection } from '../connection/connection.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import { EncryptionKey, SigningKey } from '../../crypto/crypto.types';
import { ProtocolMessage } from './protocol-client.types';
import { deserializeMessage, serializeMessage } from './message-serialization';
import { BufferBuilder } from '../../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';
import { SignsIndex } from '../../crypto/signs-index/signs-index.class';

export type ProtocolClientEvent =
    | (ProtocolMessage & { keyID: string })
    | {
          type: 'signature-mismatch';
          keyID: string;
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
    ) {}

    init() {
        this.connectionSub = this.connection.addEventListener(async (ev) => {
            if (ev.type !== 'MESSAGE') return;

            let buffer: ArrayBuffer;
            switch (ev.data.type) {
                case 'blob':
                    buffer = await ev.data.data.arrayBuffer();
            }

            const reader = new BufferReader(buffer);

            const cipher = reader.readBytes();

            const data = await this.keysIndex.tryToDecrypt(cipher);
            if (!data) return;

            if (reader.hasNext()) {
                const signature = reader.readBytes();

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
                    });
                    return;
                }
            } else if (this.signsIndex.hasSigningKey(data.keyID)) {
                this.sendEvent({
                    type: 'signature-mismatch',
                    cipher,
                    data: data.data,
                    keyID: data.keyID,
                });

                return;
            }

            const message = await deserializeMessage(data.data);

            if (!message) return;

            this.sendEvent({
                keyID: data.keyID,
                ...message,
            });
        });
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

        const cipher = await encryptionKey.encrypt(
            await serializeMessage(message),
        );
        payload.appendBuffer(cipher);

        if (signingKey) {
            payload.appendBuffer(await signingKey.createSignature(cipher));
        }

        this.connection.sendMessage(payload.getBuffer());
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
        this.listeners.forEach((cb) => cb(ev));
    }
}
