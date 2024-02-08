import { CKeyPair, SigningKey } from './crypto.types';

export class RSASignKey implements SigningKey {
    static async generatePair(): Promise<CKeyPair<RSASignKey>> {
        const { publicKey, privateKey } = await crypto.subtle.generateKey(
            {
                name: 'RSA-PSS',
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['sign', 'verify'],
        );

        return {
            privateKey: new RSASignKey(privateKey),
            publicKey: new RSASignKey(publicKey),
        };
    }

    static async fromJSON(data: string): Promise<RSASignKey> {
        const json = JSON.parse(data);

        return new RSASignKey(
            await crypto.subtle.importKey(
                'jwk',
                json,
                {
                    name: 'RSA-PSS',
                    hash: 'SHA-256',
                },
                !!json.ext,
                (json.key_ops as KeyUsage[]) ?? [],
            ),
        );
    }

    constructor(private key: CryptoKey) {}

    async createSignature(data: ArrayBuffer): Promise<ArrayBuffer> {
        const signature = await crypto.subtle.sign(
            {
                name: 'RSA-PSS',
                saltLength: 32,
            },
            this.key,
            data,
        );

        return signature;
    }

    async verify(data: ArrayBuffer, signature: ArrayBuffer) {
        const result = await crypto.subtle.verify(
            {
                name: 'RSA-PSS',
                saltLength: 32,
            },
            this.key,
            signature,
            data,
        );

        return result;
    }

    async toJSON() {
        const data = await crypto.subtle.exportKey('jwk', this.key);

        return JSON.stringify(data);
    }
}
