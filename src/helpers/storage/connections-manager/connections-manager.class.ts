import { BufferBuilder } from '../../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';
import { AesGcmKey } from '../../crypto/aes-gcm/aes-gcm-key.class';
import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import { ConnectionEntry } from './connection-entity.class';
import { ConnectionData } from './connections-manager.types';

export type PortableConnections = Array<{
    key: string;
    connection: ConnectionData[keyof ConnectionData];
}>;

export class ConnectionsManager {
    static async import(buffer: ArrayBuffer): Promise<ConnectionsManager> {
        const reader = new BufferReader(buffer);

        const connectionsNumber = reader.readByte();

        const data: PortableConnections = await Promise.all(
            new Array(connectionsNumber)
                .fill(null)
                .map(() => {
                    const key = reader.readString();
                    const status = reader.readByte();
                    const date = new Date(reader.readString());

                    switch (status) {
                        case 0:
                            return {
                                key,
                                date,
                                data: {
                                    type: 'requested' as 'requested',
                                    ecdhPrivateKey: reader.readBytes(),
                                    responseRSAPrivateKey: reader.readBytes(),
                                },
                            };

                        case 1:
                            return {
                                key,
                                date,
                                data: {
                                    type: 'pending' as 'pending',
                                    from: reader.readString(),
                                    ecdhPublicKey: reader.readBytes(),
                                    responseRSA: reader.readBytes(),
                                },
                            };

                        case 2:
                            return {
                                key,
                                date,
                                data: {
                                    type: 'preEstablished' as 'preEstablished',
                                    aesKey: reader.readBytes(),
                                },
                            };

                        case 3:
                            return {
                                key,
                                date,
                                data: {
                                    type: 'established' as 'established',
                                    aesKey: reader.readBytes(),
                                },
                            };
                    }

                    throw new Error('Unexpected connection type');
                })
                .map(
                    async ({
                        key,
                        date,
                        data,
                    }): Promise<PortableConnections[0]> => {
                        let connection: ConnectionData[keyof ConnectionData];

                        switch (data.type) {
                            case 'requested': {
                                const [ecdhPrivateKey, responseRSAPrivateKey] =
                                    await Promise.all([
                                        ECDHKey.fromPKCS8(data.ecdhPrivateKey),
                                        RSAEncryptionKey.fromPKCS8(
                                            data.responseRSAPrivateKey,
                                        ),
                                    ]);

                                connection = {
                                    status: 'requested',
                                    createdAt: date,
                                    ecdhPrivateKey,
                                    responseRSAPrivateKey,
                                };

                                break;
                            }

                            case 'pending': {
                                const [ecdhPublicKey, responseRSA] =
                                    await Promise.all([
                                        ECDHKey.fromSPKI(data.ecdhPublicKey),
                                        RSAEncryptionKey.fromPKCS8(
                                            data.responseRSA,
                                        ),
                                    ]);

                                connection = {
                                    status: 'pending',
                                    from: data.from,
                                    registeredAt: date,
                                    ecdhPublicKey,
                                    responseRSA,
                                };

                                break;
                            }

                            case 'preEstablished': {
                                const aesKey = await AesGcmKey.fromRawBytes(
                                    data.aesKey,
                                );

                                connection = {
                                    status: 'preEstablished',
                                    aesKey,
                                    confirmedAt: date,
                                };

                                break;
                            }

                            case 'established': {
                                const aesKey = await AesGcmKey.fromRawBytes(
                                    data.aesKey,
                                );

                                connection = {
                                    status: 'established',
                                    aesKey,
                                    establishedAt: date,
                                };

                                break;
                            }
                        }

                        return {
                            key,
                            connection,
                        };
                    },
                ),
        );

        return new ConnectionsManager(data);
    }

    private listeners = new Set<VoidFunction>();

    private connections = new Map<string, ConnectionEntry>();

    constructor(inits?: PortableConnections) {
        if (inits) {
            const api = {
                onChange: this.sendUpdate,
                onDestroy: this.deleteConnection,
            };

            for (const { key, connection } of inits)
                this.connections.set(
                    key,
                    new ConnectionEntry(connection, key, api),
                );
        }
    }

    async createNewConnectionRequest() {
        const id = crypto.randomUUID();

        const { privateKey: ecdhPrivateKey, publicKey: ecdhPublicKey } =
            await ECDHKey.generatePair();

        const { privateKey: rsaPrivateKey, publicKey: rsaPublicKey } =
            await RSAEncryptionKey.generatePair();

        const entry = new ConnectionEntry(
            {
                status: 'requested',
                ecdhPrivateKey,
                createdAt: new Date(),
                responseRSAPrivateKey: rsaPrivateKey,
            },
            id,
            {
                onChange: this.sendUpdate,
                onDestroy: this.deleteConnection,
            },
        );

        this.connections.set(id, entry);

        return {
            id,
            ecdhPublicKey,
            rsaPublicKey,
            rsaPrivateKey,
        };
    }

    createPendingConnection(
        ecdhPublicKey: ECDHKey,
        responseRSA: RSAEncryptionKey,
        from: string,
    ) {
        const id = crypto.randomUUID();

        const entry = new ConnectionEntry(
            {
                status: 'pending',
                ecdhPublicKey,
                registeredAt: new Date(),
                responseRSA,
                from,
            },
            id,
            {
                onChange: this.sendUpdate,
                onDestroy: this.deleteConnection,
            },
        );

        this.connections.set(id, entry);

        return {
            id,
        };
    }

    getConnection(id: string): Readonly<ConnectionEntry> | undefined {
        return this.connections.get(id);
    }

    deleteConnection = (id: string) => {
        this.connections.delete(id);
        this.sendUpdate();
    };

    getAll(): PortableConnections {
        const result: PortableConnections = [];

        for (const [key, entry] of this.connections.entries()) {
            result.push({
                key,
                connection: entry.getPortable(),
            });
        }

        return result;
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    /**
     * format:
     * number of connections(N) - 1 byte
     * N Connections
     *
     * Connection:
     * id - 2 bytes id length, id string
     *
     * status - 1 byte
     *  00 - requested
     *  01 - pending
     *  02 - preEstablished
     *  03 - established
     *
     * Date - Date relative data for status - 2 bytes length, ISO string
     *
     * next data depends on the connection status:
     * [requested]
     * ecdhPrivateKey - 2 bytes length, ECDH private key in PKCS8 format
     * responseRSAPrivateKey - 2 bytes length, RSA private key in PKCS8 format
     *
     * [pending]
     * from - 2 bytes length, string
     * ecdhPublicKey - 2 bytes length, ECDH public key in SPKI format
     * responseRSA - 2 bytes length, RSA public key in SPKI format
     *
     * [preEstablished]
     * [established]
     * aesKey - 2 bytes length, aes-gcm key in PKCS8 format
     */
    async export(): Promise<ArrayBuffer> {
        const prepared = await Promise.all(
            this.getAll().map(async ({ key, connection }) => {
                const id = key;
                let status;
                let date;
                let data;

                switch (connection.status) {
                    case 'requested':
                        status = 0;
                        date = connection.createdAt.toISOString();

                        data = await Promise.all([
                            connection.ecdhPrivateKey.toPKCS8(),
                            connection.responseRSAPrivateKey.toPKCS8(),
                        ]);

                        break;

                    case 'pending':
                        status = 1;
                        date = connection.registeredAt.toISOString();
                        data = await Promise.all([
                            connection.from,
                            connection.ecdhPublicKey.toSPKI(),
                            connection.responseRSA.toSPKI(),
                        ]);

                        break;

                    case 'preEstablished':
                        status = 2;
                        date = connection.confirmedAt.toISOString();
                        data = await Promise.all([
                            connection.aesKey.toRawBytes(),
                        ]);

                        break;

                    case 'established':
                        status = 3;
                        date = connection.establishedAt.toISOString();
                        data = await Promise.all([
                            connection.aesKey.toRawBytes(),
                        ]);

                        break;
                }

                return {
                    id,
                    status,
                    date,
                    data,
                };
            }),
        );

        const builder = new BufferBuilder();
        builder.appendByte(prepared.length);

        for (const entry of prepared) {
            builder.appendString(entry.id);
            builder.appendByte(entry.status);
            builder.appendString(entry.date);

            for (const datum of entry.data) {
                if (typeof datum === 'string') {
                    builder.appendString(datum);
                } else {
                    builder.appendBuffer(datum);
                }
            }
        }

        return builder.getBuffer();
    }

    private sendUpdate = () => {
        this.listeners.forEach((cb) => cb());
    };
}
