import { AesGcmKey } from "../../crypto/aes-gcm/aes-gcm-key.class";
import { ECDHKey } from "../../crypto/ecdh/ecdh-key.class";
import { RSAEncryptionKey } from "../../crypto/rsa/rsa-encryption-key.class";

type ConnectionType = {
    requested: {
        data: {
            createdAt: Date;
            ecdhPrivateKey: ECDHKey;
            responseRSAPrivateKey: RSAEncryptionKey
        },
        methods: {
            confirm: (ecdhPublicKey: ECDHKey) => Promise<AesGcmKey>;
        }
    },
    pending: {
        data: {
            registeredAt: Date;
            ecdhPublicKey: ECDHKey;
            responseRSA: RSAEncryptionKey;
            from: string;
        },
        methods: {
            accept(ecdhPrivateKey: ECDHKey): Promise<AesGcmKey>;
        }
    },
    preEstablished: {
        data: {
            confirmedAt: Date;
            aesKey: AesGcmKey;
        },
        methods: {
            finish: VoidFunction;
        }
    },
    established: {
        data: {
            establishedAt: Date;
            aesKey: AesGcmKey;
        },
        methods: {}
    }
};

export type ConnectionData = {
    [K in keyof ConnectionType]: ConnectionType[K]['data'] & {
        status: K
    }
}

export type FullConnectionType = {
    [K in keyof ConnectionType]: ConnectionType[K]['data'] & ConnectionType[K]['methods']
}

export type EstablishedConnection = FullConnectionType['established'];

export type ConnectionMix = Partial<Omit<FullConnectionType[keyof FullConnectionType], 'status'>> & {
    status: keyof ConnectionType
}

