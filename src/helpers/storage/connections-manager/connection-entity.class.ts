import { AesGcmKey } from '../../crypto/aes-gcm/aes-gcm-key.class';
import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
import { HMACKey } from '../../crypto/hmac/hmac-key.class';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import {
    ConnectionData,
    ConnectionMix,
    FullConnectionType,
} from './connections-manager.types';

export type ConnectionEntityDependencies = {
    onChange: VoidFunction;
    onDestroy: (id: string) => void;
};

export class ConnectionEntry implements ConnectionMix {
    public status!: 'established' | 'preEstablished' | 'requested' | 'pending';

    public establishedAt?: Date;
    public confirmedAt?: Date;
    public createdAt?: Date;
    public registeredAt?: Date;

    public ecdhPrivateKey?: ECDHKey;
    public aesKey?: AesGcmKey;
    public hmacKey?: HMACKey;

    public ecdhPublicKey?: ECDHKey;
    public responseRSA?: RSAEncryptionKey;

    public responseRSAPrivateKey?: RSAEncryptionKey;

    public from?: string;

    constructor(
        init: ConnectionData[keyof ConnectionData],
        private id: string,
        private api: ConnectionEntityDependencies,
    ) {
        this.updateState(init, true);
    }

    isRequested(): this is FullConnectionType['requested'] {
        return this.status === 'requested';
    }

    isPreEstablished(): this is FullConnectionType['preEstablished'] {
        return this.status === 'preEstablished';
    }

    isEstablished(): this is FullConnectionType['established'] {
        return this.status === 'established';
    }

    isPending(): this is FullConnectionType['pending'] {
        return this.status === 'pending';
    }

    finish() {
        if (!this.isPreEstablished())
            throw new Error('Strange behavior');


        this.updateState({
            status: "established",
            aesKey: this.aesKey,
            hmacKey: this.hmacKey,
            establishedAt: new Date(),
        })
    }

    async confirm(ecdhPublicKey: ECDHKey) {
        if (this.status !== 'requested' || !this.ecdhPrivateKey)
            throw new Error('Strange behavior');

        const aesKey = await AesGcmKey.fromECDH(
            ecdhPublicKey,
            this.ecdhPrivateKey,
        );

        const hmacKey = await HMACKey.fromECDH(
            ecdhPublicKey,
            this.ecdhPrivateKey,
        );

        this.updateState({
            status: "preEstablished",
            aesKey,
            hmacKey,
            confirmedAt: new Date(),
        })

        return { aesKey, hmacKey };
    }

    async accept(ecdhPrivateKey: ECDHKey) {
        if (this.status !== 'pending' || !this.ecdhPublicKey)
            throw new Error('Strange behavior');

        const aes = await AesGcmKey.fromECDH(
            this.ecdhPublicKey,
            ecdhPrivateKey,
        );

        const hmacKey = await HMACKey.fromECDH(
            this.ecdhPublicKey,
            ecdhPrivateKey
        );

        this.updateState({
            status: "preEstablished",
            aesKey: aes,
            hmacKey: hmacKey,
            confirmedAt: new Date(),
        })

        return { aes, hmacKey };
    }

    getPortable(): ConnectionData[keyof ConnectionData] {
        if (this.isRequested())
            return {
                status: 'requested',
                createdAt: this.createdAt,
                ecdhPrivateKey: this.ecdhPrivateKey,
                responseRSAPrivateKey: this.responseRSAPrivateKey,
            };

        if (this.isPending())
            return {
                status: 'pending',
                ecdhPublicKey: this.ecdhPublicKey,
                registeredAt: this.registeredAt,
                responseRSA: this.responseRSA,
                from: this.from,
            };

        if (this.isPreEstablished())
            return {
                status: 'preEstablished',
                aesKey: this.aesKey,
                confirmedAt: this.confirmedAt,
                hmacKey: this.hmacKey
            };

        if (this.isEstablished())
            return {
                status: 'established',
                aesKey: this.aesKey,
                establishedAt: this.establishedAt,
                hmacKey: this.hmacKey
            };

        throw new Error('Unknown connection type');
    }

    destroy() {
        this.api.onDestroy(this.id);
    }

    private updateState(next: ConnectionData[keyof ConnectionData], quiet = false) {
        this.status = next.status;

        switch (next.status) {
            case 'established':
                this.establishedAt = next.establishedAt;
                this.aesKey = next.aesKey;
                this.hmacKey = next.hmacKey;

                break;

            case 'preEstablished':
                this.aesKey = next.aesKey;
                this.confirmedAt = next.confirmedAt;
                this.hmacKey = next.hmacKey;

                break;

            case 'requested':
                this.createdAt = next.createdAt;
                this.ecdhPrivateKey = next.ecdhPrivateKey;
                this.responseRSAPrivateKey = next.responseRSAPrivateKey;

                break;

            case 'pending':
                this.registeredAt = next.registeredAt;
                this.ecdhPublicKey = next.ecdhPublicKey;
                this.responseRSA = next.responseRSA;
                this.from = next.from;

                break;
        
        }

        if(!quiet) this.api.onChange();
    }
}
