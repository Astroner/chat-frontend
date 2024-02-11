import {
    arrayBufferToString,
    stringToArrayBuffer,
    writeUint16At,
} from '../../arraybuffer-utils';
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
}

type Serializers = {
    [K in keyof ProtocolMessageDict]: (
        data: ProtocolMessageDict[K],
    ) => Promise<ArrayBuffer>;
};

const serializer: Serializers = {
    message: async (data) => {
        const payload = stringToArrayBuffer(data.message);

        const buffer = new ArrayBuffer(1 + payload.byteLength);

        const messageType = new Uint8Array(buffer);
        messageType[0] = PackageType.MESSAGE;
        messageType.set(payload, 1);

        return buffer;
    },
    connectionRequest: async (data) => {
        if (data.from.length > 30) throw new Error('From is out of range');

        const [ecdh, rsa] = await Promise.all([
            data.ecdhPublicKey.toSPKI(),
            data.responseRSA.toSPKI(),
        ]);

        let bufferLength =
            1 + 1 + data.from.length + 2 + ecdh.byteLength + 2 + rsa.byteLength;

        const bytes = new Uint8Array(bufferLength);

        let bufferCursor = 1;
        bytes[0] = PackageType.CONNECT_REQUEST; // Message type

        bytes[bufferCursor] = data.from.length;
        bufferCursor += 1;
        bytes.set(stringToArrayBuffer(data.from), bufferCursor);
        bufferCursor += data.from.length;

        writeUint16At(bytes, ecdh.byteLength, bufferCursor); // ECDH pub key length
        bufferCursor += 2;
        bytes.set(new Uint8Array(ecdh), bufferCursor); // ECDH key;
        bufferCursor += ecdh.byteLength;

        writeUint16At(bytes, rsa.byteLength, bufferCursor); // RSA pub key length
        bufferCursor += 2;

        bytes.set(new Uint8Array(rsa), bufferCursor);

        return bytes.buffer;
    },
    connectionRequestAccept: async (data) => {
        const payload = await data.ecdhPublicKey.toSPKI();

        const buffer = new Uint8Array(1 + 1 + payload.byteLength);
        buffer[0] = PackageType.CONNECT_REQUEST_STATUS;
        buffer[1] = ConnectRequestStatus.ACCEPT;
        buffer.set(new Uint8Array(payload), 1 + 1);

        return buffer;
    },
    connectionRequestDecline: async () => {
        const buffer = new Uint8Array(2);

        buffer[0] = PackageType.CONNECT_REQUEST_STATUS;
        buffer[1] = ConnectRequestStatus.DECLINE;

        return buffer;
    },
    connectionEstablished: async () => {
        const buffer = new Uint8Array(2);

        buffer[0] = PackageType.CONNECT_REQUEST_STATUS;
        buffer[1] = ConnectRequestStatus.ESTABLISHED;

        return buffer;
    },
};

export const serializeMessage = async (
    message: ProtocolMessage,
): Promise<ArrayBuffer> => {
    return serializer[message.type](message as any);
};

export const deserializeMessage = async (
    message: ArrayBuffer,
): Promise<ProtocolMessage | null> => {
    const bytes = new Uint8Array(message);

    const type: PackageType = bytes[0];

    switch (type) {
        case PackageType.MESSAGE:
            return {
                type: 'message',
                message: arrayBufferToString(bytes.slice(1)),
            };

        case PackageType.CONNECT_REQUEST:
            let bufferCursor = 1;

            const fromLength = bytes[bufferCursor];
            bufferCursor += 1;
            const from = arrayBufferToString(
                bytes.slice(bufferCursor, bufferCursor + fromLength),
            );
            bufferCursor += fromLength;

            const ecdhLength = new Uint16Array(
                bytes.slice(bufferCursor, bufferCursor + 2).buffer,
            )[0];
            bufferCursor += 2;

            const ecdh = await ECDHKey.fromSPKI(
                bytes.slice(bufferCursor, bufferCursor + ecdhLength).buffer,
            );
            bufferCursor += ecdhLength;

            bufferCursor += 2;

            const rsa = await RSAEncryptionKey.fromSPKI(
                bytes.slice(bufferCursor).buffer,
            );

            return {
                type: 'connectionRequest',
                from,
                ecdhPublicKey: ecdh,
                responseRSA: rsa,
            };

        case PackageType.CONNECT_REQUEST_STATUS:
            const status: ConnectRequestStatus = bytes[1];
            switch (status) {
                case ConnectRequestStatus.ESTABLISHED:
                    return { type: 'connectionEstablished' };

                case ConnectRequestStatus.DECLINE:
                    return { type: 'connectionRequestDecline' };

                case ConnectRequestStatus.ACCEPT:
                    const ecdhPublicKey = await ECDHKey.fromSPKI(
                        bytes.slice(2),
                    );

                    return {
                        type: 'connectionRequestAccept',
                        ecdhPublicKey,
                    };
            }

        default:
            return null;
    }
};
