import {
    arrayBufferToString,
    stringToArrayBuffer,
} from '../../arraybuffer-utils';
import { BufferBuilder } from '../../buffer-read-write/buffer-builder.class';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';
import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import { ProtocolMessage, ProtocolMessageDict } from './protocol-client.types';

export enum PackageType {
    MESSAGE,
    CONNECT_REQUEST,
    CONNECT_REQUEST_STATUS,
}

export enum ConnectRequestStatus {
    ACCEPT,
    DECLINE,
    ESTABLISHED,
    ESTABLISHED_CONFIRM,

    ENUM_LENGTH,
}

type Serializers = {
    [K in keyof ProtocolMessageDict]: (
        data: ProtocolMessageDict[K],
        builder: BufferBuilder,
    ) => Promise<void> | void;
};

const serializer: Serializers = {
    message: (data, builder) => {
        builder
            .appendByte(PackageType.MESSAGE)
            .appendString(data.message)
            .getBuffer();
    },
    connectionRequest: async (data, builder) => {
        if (data.from.length > 30) throw new Error('From is out of range');

        const [ecdh, rsa] = await Promise.all([
            data.ecdhPublicKey.toSPKI(),
            data.responseRSA.toSPKI(),
        ]);

        builder
            .appendByte(PackageType.CONNECT_REQUEST)
            .appendByte(data.from.length)
            .appendString(data.from, 'SKIP_LENGTH')
            .appendBuffer(ecdh)
            .appendBuffer(rsa)
            .getBuffer();
    },
    connectionRequestAccept: async (data, builder) => {
        const ecdh = await data.ecdhPublicKey.toSPKI();

        builder
            .appendByte(PackageType.CONNECT_REQUEST_STATUS)
            .appendByte(ConnectRequestStatus.ACCEPT)
            .appendBuffer(ecdh);
    },
    connectionRequestDecline: (_, builder) => {
        builder
            .appendByte(PackageType.CONNECT_REQUEST_STATUS)
            .appendByte(ConnectRequestStatus.DECLINE);
    },
    connectionEstablished: (_, builder) => {
        builder
            .appendByte(PackageType.CONNECT_REQUEST_STATUS)
            .appendByte(ConnectRequestStatus.ESTABLISHED);
    },
    connectionEstablishedConfirm: async (_, builder) => {
        builder
            .appendByte(PackageType.CONNECT_REQUEST_STATUS)
            .appendByte(ConnectRequestStatus.ESTABLISHED_CONFIRM);
    },
};

export const serializeMessage = async (
    message: ProtocolMessage,
): Promise<ArrayBuffer> => {
    const builder = new BufferBuilder();

    const status = serializer[message.type](message as any, builder);

    if (status instanceof Promise) {
        await status;
    }

    return builder.getBuffer();
};

type Deserializer = {
    [K in PackageType]: (
        reader: BufferReader,
    ) => Promise<ProtocolMessage> | ProtocolMessage;
};

const deserializer: Deserializer = {
    [PackageType.MESSAGE]: (reader) => {
        return {
            type: 'message',
            message: reader.readString(),
        };
    },
    [PackageType.CONNECT_REQUEST]: async (reader) => {
        const fromLength = reader.readByte();

        const from = reader.readString(fromLength);

        const [ecdhPublicKey, responseRSA] = await Promise.all([
            ECDHKey.fromSPKI(reader.readBytes()),
            RSAEncryptionKey.fromSPKI(reader.readBytes()),
        ]);

        return {
            type: 'connectionRequest',
            from,
            ecdhPublicKey,
            responseRSA,
        };
    },
    [PackageType.CONNECT_REQUEST_STATUS]: async (reader) => {
        const status: ConnectRequestStatus = reader.readByte();

        switch (status) {
            case ConnectRequestStatus.ACCEPT:
                return {
                    type: 'connectionRequestAccept',
                    ecdhPublicKey: await ECDHKey.fromSPKI(reader.readBytes()),
                };

            case ConnectRequestStatus.DECLINE:
                return {
                    type: 'connectionRequestDecline',
                };

            case ConnectRequestStatus.ESTABLISHED:
                return {
                    type: 'connectionEstablished',
                };

            case ConnectRequestStatus.ESTABLISHED_CONFIRM:
                return {
                    type: 'connectionEstablishedConfirm',
                };
        }

        throw new Error('Unknown type');
    },
};

export const deserializeMessage = async (
    message: ArrayBuffer,
): Promise<ProtocolMessage | null> => {
    const reader = new BufferReader(message);

    const type = reader.readByte();

    if (!(type in deserializer)) return null;

    return deserializer[type as PackageType](reader);
};
