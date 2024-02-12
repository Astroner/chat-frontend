import { AesGcmKey } from '../crypto/aes-gcm/aes-gcm-key.class';
import { ECDHKey } from '../crypto/ecdh/ecdh-key.class';
import { RSAEncryptionKey } from '../crypto/rsa/rsa-encryption-key.class';

type ConnectionStateTemplate<T extends string, Data = {}> = Data & {
    status: T;
};

export type EstablishedConnection = ConnectionStateTemplate<
    'established',
    {
        establishedAt: Date;
        aesKey: AesGcmKey;
    }
>;

export type PreEstablishedConnection = ConnectionStateTemplate<
    'preEstablished',
    {
        confirmedAt: Date;
        aesKey: AesGcmKey;

        finish: VoidFunction;
    }
>;

export type PendingConnection = ConnectionStateTemplate<
    'pending',
    {
        registeredAt: Date;
        ecdhPublicKey: ECDHKey;
        responseRSA: RSAEncryptionKey;

        accept(ecdhPrivateKey: ECDHKey): Promise<AesGcmKey>;
    }
>;

export type RequestedConnection = ConnectionStateTemplate<
    'requested',
    {
        createdAt: Date;
        ecdhPrivateKey: ECDHKey;

        confirm: (ecdhPublicKey: ECDHKey) => Promise<AesGcmKey>;
    }
>;

export class ConnectionEntry {
    public status: 'established' | 'preEstablished' | 'requested' | 'pending';

    public establishedAt?: Date;
    public confirmedAt?: Date;
    public createdAt?: Date;
    public registeredAt?: Date;

    public ecdhPrivateKey?: ECDHKey;
    public aesKey?: AesGcmKey;

    public ecdhPublicKey?: ECDHKey;
    public responseRSA?: RSAEncryptionKey;

    constructor(
        init:
            | EstablishedConnection
            | Omit<PreEstablishedConnection, 'finish'>
            | Omit<RequestedConnection, 'confirm'>
            | Omit<PendingConnection, 'accept'>,
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

                break;

            case 'pending':
                this.registeredAt = init.registeredAt;
                this.ecdhPublicKey = init.ecdhPublicKey;
                this.responseRSA = init.responseRSA;

                break;
        }
    }

    isRequested(): this is RequestedConnection {
        return this.status === 'requested';
    }

    isPreEstablishedConnection(): this is PreEstablishedConnection {
        return this.status === 'preEstablished';
    }

    isEstablished(): this is EstablishedConnection {
        return this.status === 'established';
    }

    isPending(): this is PendingConnection {
        return this.status === 'pending';
    }

    finish() {
        if (this.status !== 'preEstablished')
            throw new Error('Strange behavior');
        this.status = 'established';
        this.establishedAt = new Date();
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

        return aes;
    }
}

export class ConnectionsManager {
    private connections = new Map<string, ConnectionEntry>();

    async createNewConnectionRequest() {
        const id = crypto.randomUUID();

        const { privateKey: ecdhPrivateKey, publicKey: ecdhPublicKey } =
            await ECDHKey.generatePair();

        const entry = new ConnectionEntry({
            status: 'requested',
            ecdhPrivateKey,
            createdAt: new Date(),
        });

        this.connections.set(id, entry);

        return {
            id,
            ecdhPublicKey,
        };
    }

    createPendingConnection(
        ecdhPublicKey: ECDHKey,
        responseRSA: RSAEncryptionKey,
    ) {
        const entry = new ConnectionEntry({
            status: 'pending',
            ecdhPublicKey,
            registeredAt: new Date(),
            responseRSA,
        });

        const id = crypto.randomUUID();

        this.connections.set(id, entry);

        return {
            id,
        };
    }

    getConnection(id: string): Readonly<ConnectionEntry> | undefined {
        return this.connections.get(id);
    }

    deleteConnection(id: string) {
        this.connections.delete(id);
    }
}
