import { AesGcmKey } from '../../crypto/aes-gcm/aes-gcm-key.class';
import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
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
    public status: 'established' | 'preEstablished' | 'requested' | 'pending';

    public establishedAt?: Date;
    public confirmedAt?: Date;
    public createdAt?: Date;
    public registeredAt?: Date;

    public ecdhPrivateKey?: ECDHKey;
    public aesKey?: AesGcmKey;

    public ecdhPublicKey?: ECDHKey;
    public responseRSA?: RSAEncryptionKey;

    public responseRSAPrivateKey?: RSAEncryptionKey;

    public from?: string;

    constructor(
        init: ConnectionData[keyof ConnectionData],
        private id: string,
        private api: ConnectionEntityDependencies,
    ) {
        this.status = init.status;

        switch (init.status) {
            case 'established':
                this.establishedAt = init.establishedAt;
                this.aesKey = init.aesKey;

                break;

            case 'preEstablished':
                this.aesKey = init.aesKey;
                this.confirmedAt = init.confirmedAt;

                break;

            case 'requested':
                this.createdAt = init.createdAt;
                this.ecdhPrivateKey = init.ecdhPrivateKey;
                this.responseRSAPrivateKey = init.responseRSAPrivateKey;

                break;

            case 'pending':
                this.registeredAt = init.registeredAt;
                this.ecdhPublicKey = init.ecdhPublicKey;
                this.responseRSA = init.responseRSA;
                this.from = init.from;

                break;
        }
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
        if (this.status !== 'preEstablished')
            throw new Error('Strange behavior');
        this.status = 'established';
        this.establishedAt = new Date();

        this.api.onChange();
    }

    async confirm(ecdhPublicKey: ECDHKey) {
        if (this.status !== 'requested' || !this.ecdhPrivateKey)
            throw new Error('Strange behavior');

        this.status = 'preEstablished';

        const aesKey = await AesGcmKey.fromECDH(
            ecdhPublicKey,
            this.ecdhPrivateKey,
        );

        this.aesKey = aesKey;
        this.confirmedAt = new Date();

        this.api.onChange();

        return aesKey;
    }

    async accept(ecdhPrivateKey: ECDHKey): Promise<AesGcmKey> {
        if (this.status !== 'pending' || !this.ecdhPublicKey)
            throw new Error('Strange behavior');

        const aes = await AesGcmKey.fromECDH(
            this.ecdhPublicKey,
            ecdhPrivateKey,
        );

        this.status = 'preEstablished';
        this.aesKey = aes;
        this.confirmedAt = new Date();

        this.api.onChange();

        return aes;
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
            };

        if (this.isEstablished())
            return {
                status: 'established',
                aesKey: this.aesKey,
                establishedAt: this.establishedAt,
            };

        throw new Error('Unknown connection type');
    }

    destroy() {
        this.api.onDestroy(this.id);
    }
}
