import { stringToArrayBuffer } from '../../arraybuffer-utils';
import { EncryptionKey } from '../crypto.types';
import { ECDHKey } from '../ecdh/ecdh-key.class';

export class AesGcmKey implements EncryptionKey {
    static async generate() {
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
        );

        return new AesGcmKey(key);
    }

    static async fromPassword(password: string, salt: Uint8Array) {
        const origin = await crypto.subtle.importKey(
            'raw',
            stringToArrayBuffer(password),
            'PBKDF2',
            false,
            ['deriveKey'],
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                hash: 'SHA-256',
                salt,
                iterations: 100000,
            },
            origin,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
        );

        return new AesGcmKey(key);
    }

    static async fromJSON(src: string) {
        const jwk = JSON.parse(src);

        const key = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
        );

        return new AesGcmKey(key);
    }

    static async fromRawBytes(src: ArrayBuffer) {
        const key = await crypto.subtle.importKey("raw", src, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

        return new AesGcmKey(key);
    }

    static async fromECDH(publicKey: ECDHKey, privateKey: ECDHKey) {
        const key = await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: publicKey.getKey(),
            },
            privateKey.getKey(),
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt'],
        );

        return new AesGcmKey(key);
    }

    constructor(private key: CryptoKey) {}

    async encrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const cipher = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.key,
            data,
        );

        const result = new Uint8Array(cipher.byteLength + iv.byteLength);

        result.set(iv, 0);
        result.set(new Uint8Array(cipher), iv.byteLength);

        return result;
    }

    async decrypt(src: ArrayBuffer): Promise<ArrayBuffer> {
        const iv = src.slice(0, 12);

        const cipher = src.slice(12);

        const data = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.key,
            cipher,
        );

        return data;
    }

    async toJSON() {
        const jwk = await crypto.subtle.exportKey('jwk', this.key);

        return JSON.stringify(jwk);
    }
    
    async toRawBytes() {
        const data = await crypto.subtle.exportKey("raw", this.key);

        return data;
    }
}
