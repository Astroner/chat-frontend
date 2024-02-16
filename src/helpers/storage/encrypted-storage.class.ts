import { AesGcmKey } from "../crypto/aes-gcm/aes-gcm-key.class"

export type StorageEnvironment = {
    save(data: ArrayBuffer): Promise<void>
    load(): Promise<ArrayBuffer | null>
}

export class EncryptedStorage {
    constructor(
        private env: StorageEnvironment,
        private encryptionKey: AesGcmKey,
    ) {}
    
    async getData() {
        const cipher = await this.env.load();

        if(!cipher) return null;

        const data = await this.encryptionKey.decrypt(cipher);

        return data;
    }

    async saveData(src: ArrayBuffer) {
        const cipher = await this.encryptionKey.encrypt(src);

        this.env.save(cipher);
    }
}