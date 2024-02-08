import { CKeyPair, EncryptionKey } from './crypto.types';

export class RSAEncryptionKey implements EncryptionKey {
    static async generatePair(): Promise<CKeyPair<RSAEncryptionKey>> {
        const { privateKey, publicKey } = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['encrypt', 'decrypt'],
        );

        return {
            publicKey: new RSAEncryptionKey(publicKey),
            privateKey: new RSAEncryptionKey(privateKey),
        };
    }

    static async fromJSON(data: string) {
        const jsonData: JsonWebKey = JSON.parse(data);

        return new RSAEncryptionKey(
            await crypto.subtle.importKey(
                'jwk',
                jsonData,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256',
                },
                !!jsonData.ext,
                (jsonData.key_ops as KeyUsage[]) ?? [],
            ),
        );
    }

    constructor(private key: CryptoKey) {}

    async encrypt(src: ArrayBuffer) {
        const encrypted = await crypto.subtle.encrypt(
            this.key.algorithm,
            this.key,
            src,
        );

        return encrypted;
    }

    async decrypt(bytes: ArrayBuffer) {
        const data = new Uint8Array(
            await crypto.subtle.decrypt(this.key.algorithm, this.key, bytes),
        );

        return data;
    }

    async toJSON() {
        const key = await crypto.subtle.exportKey('jwk', this.key);

        return JSON.stringify(key);
    }
}
