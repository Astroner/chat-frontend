import { CKeyPair } from "../crypto.types";

export class ECDHKey {
    static async generatePair(): Promise<CKeyPair<ECDHKey>> {
        const { privateKey, publicKey } = await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            true,
            ["deriveKey"]
        );

        return {
            publicKey: new ECDHKey(publicKey),
            privateKey: new ECDHKey(privateKey)
        }
    }

    static async fromJSON(src: string) {
        const jwk: JsonWebKey = JSON.parse(src);

        const key = await crypto.subtle.importKey('jwk', jwk, { name: "ECDH", namedCurve: "P-256" }, true, jwk.key_ops as KeyUsage[] ?? ["deriveKey"]);

        return new ECDHKey(key);
    }

    static async fromPKCS8(src: ArrayBuffer) {
        const key = await crypto.subtle.importKey(
            "pkcs8", 
            src, 
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ['deriveKey'],
        );

        return new ECDHKey(key);
    }

    static async fromSPKI(src: ArrayBuffer) {
        const key = await crypto.subtle.importKey(
            "spki", 
            src, 
            { name: "ECDH", namedCurve: "P-256" },
            true,
            [],
        );

        return new ECDHKey(key);
    }

    constructor(private key: CryptoKey) {

    }

    getKey() {
        return this.key;
    }

    async toJSON() {
        return JSON.stringify(await crypto.subtle.exportKey("jwk", this.key));
    }

    /**
     * 
     * @returns {ArrayBuffer}
     * @description only for public key
     */
    async toSPKI() {
        return crypto.subtle.exportKey("spki", this.key);
    }

    /**
     * 
     * @returns {ArrayBuffer}
     * @description only for private key
     */
    async toPKCS8() {
        return crypto.subtle.exportKey("pkcs8", this.key);
    }
}