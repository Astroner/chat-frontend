import { BufferBuilder } from '../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../buffer-read-write/buffer-reader.class';

export type CommonStorageData = {
    lastMessage?: {
        timestamp: number;
        hash: ArrayBuffer;
    };
};

export class CommonStorage {
    static import(buffer: ArrayBuffer) {
        const reader = new BufferReader(buffer);

        const hasLastMessage = reader.readByte();
        let lastMessage: CommonStorageData['lastMessage'];
        if (hasLastMessage) {
            lastMessage = {
                timestamp: Number(reader.readUint64()),
                hash: reader.readBytes(32),
            };
        }

        return new CommonStorage({
            lastMessage,
        });
    }

    private listeners = new Set<VoidFunction>();

    constructor(private data: CommonStorageData = {}) {}

    updateLastMessage(timestamp: number, hash: ArrayBuffer) {
        if (
            this.data.lastMessage &&
            this.data.lastMessage.timestamp >= timestamp
        )
            return;

        this.data.lastMessage = {
            hash,
            timestamp,
        };

        this.sendUpdate();
    }

    setData(data: CommonStorageData) {
        this.data = data;

        this.sendUpdate();
    }

    getData(): Readonly<CommonStorageData> {
        return this.data;
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    /**
     * Format:
     * [lastMessage]
     * lastMessageExists flag - 1 byte
     *  if exists:
     *      timestamp Uint64 - timestamp
     *      hash - 32bytes SHA-256 hash
     */
    export() {
        const builder = new BufferBuilder();

        builder.appendByte(this.data.lastMessage ? 1 : 0);
        if (this.data.lastMessage) {
            builder.appendUint64(this.data.lastMessage.timestamp);
            builder.appendBuffer(this.data.lastMessage.hash, 'SKIP_LENGTH');
        }

        return builder.getBuffer();
    }

    private sendUpdate() {
        this.listeners.forEach((cb) => cb());
    }
}
