import { EncryptionKey } from "../../crypto/crypto.types"

export type KeysIndexConfig = {
    initialKeys?: Array<{ id: string, key: EncryptionKey }>
}

export class KeysIndex {
    private keys = new Map<string, EncryptionKey>();

    constructor(private config?: KeysIndexConfig) {
        if(config?.initialKeys)
            for(const entry of config.initialKeys) {
                this.keys.set(entry.id, entry.key);
            }
    }

    addKey(id: string, key: EncryptionKey) {
        this.keys.set(id, key);
    }

    removeKey(id: string) {
        this.keys.delete(id);
    }

    tryToDecrypt(cipher: ArrayBuffer) {
        return Promise.any(
            Array
                .from(this.keys.entries())
                .map(async ([keyID, key]) => {
                    const data = await key.decrypt(cipher);

                    return { keyID, data };
                })
        )
    }
}