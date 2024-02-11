import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';

export type ProtocolMessageDict = {
    message: {
        message: string;
    };

    connectionRequest: {
        from: string;
        ecdhPublicKey: ECDHKey;
        responseRSA: RSAEncryptionKey;
    };
    connectionRequestAccept: {
        ecdhPublicKey: ECDHKey;
    };
    connectionEstablished: {};
    connectionRequestDecline: {};
};

export type NamedProtocolMessageDict = {
    [K in keyof ProtocolMessageDict]: ProtocolMessageDict[K] & {
        type: K;
    };
};

export type ProtocolMessage =
    NamedProtocolMessageDict[keyof NamedProtocolMessageDict];
