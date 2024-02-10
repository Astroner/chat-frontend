import { arrayBufferToString, stringToArrayBuffer } from "../../arraybuffer-utils";
import { ECDHKey } from "../../crypto/ecdh/ecdh-key.class";
import { RSAEncryptionKey } from "../../crypto/rsa/rsa-encryption-key.class";
import { ProtocolMessage, ProtocolMessageDict } from "./protocol-client.types";

export enum PackageType {
    MESSAGE,
    CONNECT_REQUEST,
    CONNECT_REQUEST_STATUS
}

export enum ConnectRequestStatus {
    ACCEPT,
    DECLINE,
    ESTABLISHED
}

type Serializers = {
    [K in keyof ProtocolMessageDict]: (data: ProtocolMessageDict[K]) => Promise<ArrayBuffer>
}

const serializer: Serializers = {
    message: async (data) => {
        const payload = stringToArrayBuffer(data.message);

        const buffer = new ArrayBuffer(1 + payload.byteLength);

        const messageType = new Uint8Array(buffer);
        messageType[0] = PackageType.MESSAGE;
        messageType.set(payload, 1);

        return buffer;
    },
    connectionRequest: async data => {
        const [ecdh, rsa] = await Promise.all([
            data.ecdhPublicKey.toSPKI(),
            data.responseRSA.toSPKI()
        ])

        const buffer = new Uint8Array(1 + 2 + ecdh.byteLength + 2 + rsa.byteLength);

        buffer[0] = PackageType.CONNECT_REQUEST; // Message type

        buffer.set(Uint16Array.from([ecdh.byteLength]), 1); // ECDH pub key length
        buffer.set(new Uint8Array(ecdh), 3) // ECDH key;

        buffer.set(Uint16Array.from([rsa.byteLength]), 1 + 2 + ecdh.byteLength);// RSA pub key length
        buffer.set(new Uint8Array(rsa), 1 + 2 + ecdh.byteLength + 2);

        return buffer;
    },
    connectionRequestAccept: async (data) => {
        const payload = await data.ecdhPublicKey.toSPKI();

        const buffer = new Uint8Array(1 + 1 + payload.byteLength);
        buffer[0] = PackageType.CONNECT_REQUEST_STATUS;
        buffer[1] = ConnectRequestStatus.ACCEPT;
        buffer.set(new Uint8Array(payload), 1 + 1)

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
}

export const serializeMessage = async (message: ProtocolMessage): Promise<ArrayBuffer> => {
    return serializer[message.type](message as any);
}

export const deserializeMessage = async (message: ArrayBuffer): Promise<ProtocolMessage | null> => {
    const bytes = new Uint8Array(message);

    const type: PackageType = bytes[0];

    switch (type) {
        case PackageType.MESSAGE:
            return {
                type: "message",
                message: arrayBufferToString(bytes.slice(1))
            };

        case PackageType.CONNECT_REQUEST:
            const ecdhLength = new Uint16Array(bytes.slice(1))[0];
            const ecdh = await ECDHKey.fromSPKI(bytes.slice(1 + 2, 1 + 2 + ecdhLength));

            const rsa = await RSAEncryptionKey.fromSPKI(bytes.slice(1 + 2 + ecdhLength + 2));
            
            return {
                type: "connectionRequest",
                ecdhPublicKey: ecdh,
                responseRSA: rsa
            }

        case PackageType.CONNECT_REQUEST_STATUS:
            const status: ConnectRequestStatus = bytes[1];
            switch(status) {
                case ConnectRequestStatus.ESTABLISHED: 
                    return { type: "connectionEstablished" }
                
                case ConnectRequestStatus.DECLINE:
                    return { type: "connectionRequestDecline" }

                case ConnectRequestStatus.ACCEPT:
                    const ecdhPublicKey = await ECDHKey.fromSPKI(bytes.slice(2));

                    return {
                        type: "connectionRequestAccept",
                        ecdhPublicKey
                    }
            }

        default:
            return null
    }
}