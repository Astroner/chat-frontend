import { Meta, StoryFn } from '@storybook/react';

import { ProtocolClient } from './protocol-client.class';
import { useEffect, useMemo, useState } from 'react';
import { Connection } from '../connection/connection.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import {
    FieldConsumer,
    FormProvider,
    useController,
} from '@schematic-forms/react';
import { Enum, Str } from '@schematic-forms/core';
import { EncryptionKey, SigningKey } from '../../crypto/crypto.types';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import { AesGcmKey } from '../../crypto/aes-gcm/aes-gcm-key.class';
import { HMACKey } from '../../crypto/hmac/hmac-key.class';
import { base64ToArrayBuffer } from '../../arraybuffer-utils';
import { SignsIndex } from '../../crypto/signs-index/signs-index.class';

const meta: Meta = {
    title: 'Network/Protocol Client',
};

export default meta;

export const Default: StoryFn = () => {
    const [connection, setConnection] = useState<Connection | null>(null);
    const { controller: connectionController, submit: connect } = useController(
        {
            fields: {
                address: Str(true),
            },
            submit(data) {
                setConnection(new Connection(data.address));
            },
        },
    );

    const [storedKeys, setStoredKeys] = useState<string[]>([]);
    const keysIndex = useMemo(() => new KeysIndex(), []);

    const [storedSigns, setStoredSigns] = useState<string[]>([]);
    const signsIndex = useMemo(() => new SignsIndex(), []);

    const { controller: KeyIndexController, submit: addKey } = useController({
        fields: {
            id: Str(true),
            keyType: Enum(['RSA', 'AES'] as ['RSA', 'AES'], true, 'RSA'),
            key: Str(true),
        },
        async submit(data) {
            let key: EncryptionKey;
            try {
                if (data.keyType === 'RSA') {
                    key = await RSAEncryptionKey.fromJSON(data.key);
                } else {
                    key = await AesGcmKey.fromJSON(data.key);
                }
            } catch {
                return {
                    key: 'INVALID KEY',
                };
            }

            keysIndex.addKey(data.id, key);
            setStoredKeys((p) => p.concat([data.id]));
        },
    });

    const { controller: SignsIndexController, submit: addSign } = useController(
        {
            fields: {
                id: Str(true),
                key: Str(true),
            },
            async submit(data) {
                const key = await HMACKey.fromRawBytes(
                    base64ToArrayBuffer(data.key),
                );

                signsIndex.addKey(data.id, key);
                setStoredSigns((p) => p.concat([data.id]));
            },
        },
    );

    const client = useMemo(() => {
        if (!connection) return null;

        return new ProtocolClient(connection, keysIndex, signsIndex);
    }, [connection, keysIndex, signsIndex]);

    const { controller, submit } = useController({
        fields: {
            key: Str(true),
            keyType: Enum(['RSA', 'AES'] as ['RSA', 'AES'], true, 'RSA'),
            signingKey: Str(),
            message: Str(true),
        },
        async submit(
            data,
            postData: (s: {
                encryptionKey: EncryptionKey;
                signingKey?: SigningKey;
                message: string;
            }) => void,
        ) {
            let encryptionKey: EncryptionKey;
            try {
                if (data.keyType === 'RSA') {
                    encryptionKey = await RSAEncryptionKey.fromJSON(data.key);
                } else {
                    encryptionKey = await AesGcmKey.fromJSON(data.key);
                }
            } catch {
                return {
                    key: 'INVALID KEY',
                };
            }

            let signingKey: SigningKey | undefined;

            if (data.signingKey) {
                signingKey = await HMACKey.fromRawBytes(
                    base64ToArrayBuffer(data.signingKey),
                );
            }

            postData({
                encryptionKey,
                message: data.message,
                signingKey,
            });
        },
    });

    const sendMessage = async (data: {
        encryptionKey: EncryptionKey;
        signingKey?: SigningKey;
        message: string;
    }) => {
        if (!client) return;

        client.postMessage(
            {
                type: 'message',
                message: data.message,
            },
            data.encryptionKey,
            data.signingKey,
        );
    };

    useEffect(() => {
        if (!connection) return;
        connection.addEventListener((ev) => console.log('WS', ev));

        connection.connect();

        return () => {
            connection.destroy();
        };
    }, [connection]);

    useEffect(() => {
        if (!client) return;

        client.init();

        client.addEventListener((ev) => console.log('CLIENT', ev));

        return () => {
            client.destroy();
        };
    }, [client]);

    return (
        <div>
            <div>
                <h3>Keys Index</h3>
                <FormProvider controller={KeyIndexController}>
                    <FieldConsumer field="id">
                        {({ value, setValue }) => (
                            <div>
                                <textarea
                                    placeholder="Key ID"
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                            </div>
                        )}
                    </FieldConsumer>
                    <FieldConsumer field="key">
                        {({ value, setValue, error }) => (
                            <div>
                                <textarea
                                    placeholder="JWK encryption key"
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                                {error}
                            </div>
                        )}
                    </FieldConsumer>
                    <FieldConsumer field="keyType">
                        {({ value, setValue }) => (
                            <div>
                                <select
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                >
                                    <option value="RSA">RSA</option>
                                    <option value="AES">AES</option>
                                </select>
                            </div>
                        )}
                    </FieldConsumer>
                </FormProvider>
                <button onClick={addKey}>Add Key</button>
                <ul>
                    {storedKeys.map((id) => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            </div>
            <div>
                <h3>Signs Index</h3>
                <FormProvider controller={SignsIndexController}>
                    <FieldConsumer field="id">
                        {({ value, setValue }) => (
                            <div>
                                <textarea
                                    placeholder="Key ID"
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                            </div>
                        )}
                    </FieldConsumer>
                    <FieldConsumer field="key">
                        {({ value, setValue, error }) => (
                            <div>
                                <textarea
                                    placeholder="HMAC key in base64"
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                                {error}
                            </div>
                        )}
                    </FieldConsumer>
                </FormProvider>
                <button onClick={addSign}>Add Sign</button>
                <ul>
                    {storedSigns.map((id) => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            </div>
            <FormProvider controller={connectionController}>
                <div>
                    <h3>Connection Address</h3>
                    <FieldConsumer field="address">
                        {({ value, setValue }) => (
                            <input
                                placeholder="Address"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                    <button onClick={connect}>Connect</button>
                </div>
            </FormProvider>
            {client && (
                <div>
                    <h3>Send Message</h3>
                    <FormProvider controller={controller}>
                        <FieldConsumer field="keyType">
                            {({ value, setValue }) => (
                                <div>
                                    <select
                                        value={value ?? ''}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    >
                                        <option value="RSA">RSA</option>
                                        <option value="AES">AES</option>
                                    </select>
                                </div>
                            )}
                        </FieldConsumer>
                        <FieldConsumer field="key">
                            {({ value, setValue, error }) => (
                                <div>
                                    <textarea
                                        placeholder="JWK encryption key"
                                        value={value ?? ''}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                    {error}
                                </div>
                            )}
                        </FieldConsumer>
                        <FieldConsumer field="message">
                            {({ value, setValue }) => (
                                <div>
                                    <textarea
                                        placeholder="Message"
                                        value={value ?? ''}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </FieldConsumer>
                        <FieldConsumer field="signingKey">
                            {({ value, setValue, error }) => (
                                <div>
                                    <textarea
                                        placeholder="(Optional) HMAC signing key in base64"
                                        value={value ?? ''}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                    {error}
                                </div>
                            )}
                        </FieldConsumer>
                        <div>
                            <button onClick={() => submit(sendMessage)}>
                                Send
                            </button>
                        </div>
                    </FormProvider>
                </div>
            )}
        </div>
    );
};
