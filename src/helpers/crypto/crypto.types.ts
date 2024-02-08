export type CKeyPair<T> = {
    publicKey: T;
    privateKey: T;
};

export interface SigningKey {
    createSignature(data: ArrayBuffer): Promise<ArrayBuffer>;
    verify(data: ArrayBuffer, signature: ArrayBuffer): Promise<boolean>;
}

export interface EncryptionKey {
    encrypt(data: ArrayBuffer): Promise<ArrayBuffer>;
    decrypt(src: ArrayBuffer): Promise<ArrayBuffer>;
}
