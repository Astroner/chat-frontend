import { BufferBuilder } from '../../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';

export type PublishedKeyInfo = {
    id: string;
    name: string;
    timesUsed: number;
    issuedAt: Date;
    publicKey: RSAEncryptionKey;
    privateKey: RSAEncryptionKey;
};

export class PublishedKeysManager {
    static async import(
        data: ArrayBuffer,
        keysIndex: KeysIndex,
    ): Promise<PublishedKeysManager> {
        try {
            const reader = new BufferReader(data);

            const entitiesNumber = reader.readByte();

            const entities: PublishedKeyInfo[] = await Promise.all(
                new Array(entitiesNumber)
                    .fill(null)
                    .map(() => {
                        const id = reader.readString();
                        const name = reader.readString();
                        const timesUsed = reader.readUint16();
                        const issuedAtISO = reader.readString();
                        const publicRsaKey = reader.readBytes();
                        const privateRsaKey = reader.readBytes();

                        return {
                            id,
                            timesUsed,
                            name,
                            issuedAtISO,
                            publicRsaKey,
                            privateRsaKey,
                        };
                    })
                    .map(async (entry): Promise<PublishedKeyInfo> => {
                        const [publicKey, privateKey] = await Promise.all([
                            RSAEncryptionKey.fromSPKI(entry.publicRsaKey),
                            RSAEncryptionKey.fromPKCS8(entry.privateRsaKey),
                        ]);

                        return {
                            id: entry.id,
                            name: entry.name,
                            issuedAt: new Date(entry.issuedAtISO),
                            timesUsed: entry.timesUsed,
                            privateKey,
                            publicKey,
                        };
                    }),
            );

            return new PublishedKeysManager(keysIndex, entities);
        } catch (e) {
            console.error(e);
            return new PublishedKeysManager(keysIndex);
        }
    }

    private listeners = new Set<VoidFunction>();

    private publishedKeys = new Map<string, PublishedKeyInfo>();

    constructor(
        private keysIndex: KeysIndex,
        inits?: PublishedKeyInfo[],
    ) {
        if (inits)
            for (const info of inits) this.publishedKeys.set(info.id, info);
    }

    async issueKey(name: string) {
        const { privateKey, publicKey } =
            await RSAEncryptionKey.generatePair(4096);

        const id = crypto.randomUUID();

        this.publishedKeys.set(id, {
            timesUsed: 0,
            id,
            issuedAt: new Date(),
            privateKey,
            publicKey,
            name,
        });

        this.keysIndex.addKey(id, privateKey);

        this.sendUpdate();

        return {
            id,
            publicKey,
        };
    }

    getKeyInfo(id: string): Readonly<PublishedKeyInfo> | null {
        return this.publishedKeys.get(id) ?? null;
    }

    registerKeyUsage(id: string) {
        const info = this.publishedKeys.get(id);
        if (!info) return;

        info.timesUsed += 1;

        this.sendUpdate();
    }

    getAll(): PublishedKeyInfo[] {
        return Array.from(this.publishedKeys.values());
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    /**
     * format:
     * number of items(N): 1byte
     * items: array of Items
     *
     * Items:
     * id = 2bytes length + data
     * name - length + string
     * timesUsed - 2 bytes
     * issuedAtISO = 2bytes string length + data
     * publicRsaKey = 2bytes length + data in SPKI format
     * privateRSAKey = 2bytes length + data in PKCS8 format
     */
    async export(): Promise<ArrayBuffer> {
        const prepared = await Promise.all(
            Array.from(this.publishedKeys.values()).map(async (info) => {
                const [privateKey, publicKey] = await Promise.all([
                    info.privateKey.toPKCS8(),
                    info.publicKey.toSPKI(),
                ]);

                const issuedAt = info.issuedAt.toISOString();

                return {
                    id: info.id,
                    name: info.name,
                    timesUsed: info.timesUsed,
                    issuedAt,
                    publicKey,
                    privateKey,
                };
            }),
        );

        const builder = new BufferBuilder();
        builder.appendByte(prepared.length);

        for (const item of prepared) {
            builder.appendString(item.id);
            builder.appendString(item.name);
            builder.appendUint16(item.timesUsed);
            builder.appendString(item.issuedAt);
            builder.appendBuffer(item.publicKey);
            builder.appendBuffer(item.privateKey);
        }

        return builder.getBuffer();
    }

    private sendUpdate = () => {
        this.listeners.forEach((cb) => cb());
    };
}
