import { SigningKey } from "../crypto.types";

export class SignsIndex {
    private keyIDToSign = new Map<string, SigningKey>();

    constructor() {}

    addKey(keyID: string, key: SigningKey) {
        this.keyIDToSign.set(keyID, key);
    }

    async verifyForKey(keyID: string, data: ArrayBuffer, signature: ArrayBuffer) {
        const key = this.keyIDToSign.get(keyID);
        
        if(!key) return false;

        return key.verify(data, signature);
    }

    hasSigningKey(keyID: string) {
        return this.keyIDToSign.has(keyID);
    }

    deleteKey(keyID: string) {
        this.keyIDToSign.delete(keyID);
    }
}