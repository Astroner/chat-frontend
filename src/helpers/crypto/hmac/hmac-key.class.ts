import { SigningKey } from '../crypto.types';
import { ECDHKey } from '../ecdh/ecdh-key.class';

export class HMACKey implements SigningKey {
    static async generate() {
        const key = await crypto.subtle.generateKey(
            { name: 'HMAC', hash: 'SHA-256' },
            true,
            ['sign', 'verify'],
        );

        return new HMACKey(key);
    }

    static async fromRawBytes(src: ArrayBuffer) {
        const key = await crypto.subtle.importKey(
            'raw',
            src,
            { name: 'HMAC', hash: 'SHA-256' },
            true,
            ['sign', 'verify'],
        );

        return new HMACKey(key);
    }

    static async fromECDH(publicKey: ECDHKey, privateKey: ECDHKey) {
        const key = await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: publicKey.getKey(),
            },
            privateKey.getKey(),
            {
                name: 'HMAC',
                hash: 'SHA-256',
                length: 256,
            },
            true,
            ['sign', 'verify'],
        );

        return new HMACKey(key);
    }

    constructor(private key: CryptoKey) {}

    createSignature(data: ArrayBuffer) {
        return crypto.subtle.sign('HMAC', this.key, data);
    }

    verify(data: ArrayBuffer, signature: ArrayBuffer) {
        return crypto.subtle.verify('HMAC', this.key, signature, data);
    }

    async toRawBytes() {
        return crypto.subtle.exportKey('raw', this.key);
    }

    getKey() {
        return this.key;
    }
}
