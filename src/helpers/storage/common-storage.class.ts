import { BufferBuilder } from '../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../buffer-read-write/buffer-reader.class';

export type CommonStorageData = {
    lastMessage?: {
        timestamp: number;
        hash: ArrayBuffer;
    };
    pushSubscriptionID?: string;
    onlineOnStartup: boolean;
};

const DefaultCommonStorageState: CommonStorageData = {
    onlineOnStartup: false,
};

export class CommonStorage {
    static import(buffer: ArrayBuffer) {
        try {
            const reader = new BufferReader(buffer);

            const hasLastMessage = reader.readByte();
            let lastMessage: CommonStorageData['lastMessage'];
            if (hasLastMessage) {
                lastMessage = {
                    timestamp: Number(reader.readUint64()),
                    hash: reader.readBytes(32),
                };
            }

            const hasPushSubscription = reader.readBool();
            let pushSubscriptionID: CommonStorageData['pushSubscriptionID'];
            if (hasPushSubscription) {
                const length = reader.readByte();
                pushSubscriptionID = reader.readString(length);
            }

            const onlineOnStartup = reader.readBool();

            return new CommonStorage({
                lastMessage,
                pushSubscriptionID,
                onlineOnStartup,
            });
        } catch (e) {
            console.error(e);

            return new CommonStorage();
        }
    }

    private listeners = new Set<VoidFunction>();

    constructor(private data: CommonStorageData = DefaultCommonStorageState) {}

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
     *
     * [pushSubscriptionID]
     * pushSubscriptionID exists - 1 byte
     *  id exists:
     *      length: 1 byte
     *      string data
     *
     * [onlineOnStartup] - 1 byte boolean
     */
    export() {
        const builder = new BufferBuilder();

        builder.appendByte(this.data.lastMessage ? 1 : 0);
        if (this.data.lastMessage) {
            builder.appendUint64(this.data.lastMessage.timestamp);
            builder.appendBuffer(this.data.lastMessage.hash, 'SKIP_LENGTH');
        }

        builder.appendBoolean(!!this.data.pushSubscriptionID);
        if (this.data.pushSubscriptionID) {
            builder.appendByte(this.data.pushSubscriptionID.length);
            builder.appendString(this.data.pushSubscriptionID, 'SKIP_LENGTH');
        }

        builder.appendBoolean(this.data.onlineOnStartup);

        return builder.getBuffer();
    }

    private sendUpdate() {
        this.listeners.forEach((cb) => cb());
    }
}
