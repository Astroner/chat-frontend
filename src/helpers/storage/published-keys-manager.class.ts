import { EncryptionKey } from "../crypto/crypto.types"
import { KeysIndex } from "../crypto/keys-index/keys-index.class";
import { RSAEncryptionKey } from "../crypto/rsa/rsa-encryption-key.class";

export type PublishedKeyInfo = {
    id: string;
    issuedAt: Date;
    publicKey: EncryptionKey,
    privateKey: EncryptionKey,
    timesUsed: number
}

export class PublishedKeysManager {
    private publishedKeys = new Map<string, PublishedKeyInfo>();

    constructor(
        private keysIndex: KeysIndex
    ) {}

    async issueKey() {
        const { privateKey, publicKey } = await RSAEncryptionKey.generatePair(8192);

        const id = crypto.randomUUID();

        this.publishedKeys.set(id, {
            timesUsed: 0,
            id,
            issuedAt: new Date(),
            privateKey,
            publicKey
        })

        this.keysIndex.addKey(id, privateKey);

        return {
            id,
            publicKey,
        }
    }

    getKeyInfo(id: string): Readonly<PublishedKeyInfo> | undefined {
        return this.publishedKeys.get(id);
    }

    registerKeyUsage(id: string) {
        const info = this.publishedKeys.get(id);
        if(!info) return;
        
        info.timesUsed += 1;
    }
}