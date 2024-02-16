import { Meta, StoryFn } from '@storybook/react';

import { ChatClient } from './chat-client.class';
import {
    FieldConsumer,
    FormProvider,
    useController,
} from '@schematic-forms/react';
import { Str } from '@schematic-forms/core';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Connection } from '../connection/connection.class';
import { ProtocolClient } from '../protocol-client/protocol-client.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../../arraybuffer-utils';
import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import { ConnectionsManager } from '../../storage/connections-manager/connections-manager.class';
import { PublishedKeysManager } from '../../storage/published-keys-manager/published-keys-manager.class';

const meta: Meta = {
    title: 'Network/Chat Client',
};

export default meta;

const ClientView: FC<{
    client: ChatClient;
    connections: ConnectionsManager;
}> = ({ client, connections }) => {
    const [connectionIDS, setConnectionIDs] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);

    const {
        controller: ConnectController,
        submit: connect,
        clear: clearConnectForm,
    } = useController({
        fields: {
            addressKey: Str(true, ''),
            from: Str(true, ''),
        },
        async submit(data) {
            const key = await RSAEncryptionKey.fromSPKI(
                base64ToArrayBuffer(data.addressKey),
            );

            await client.sendConnectionRequest(key, data.from);

            clearConnectForm();
        },
    });

    const {
        controller: SendMessageController,
        submit: sendMessage,
        clear: clearSendMessageForm,
    } = useController({
        fields: {
            connectionID: Str(true, ''),
            message: Str(true, ''),
        },
        async submit(data) {
            const connection = connections.getConnection(data.connectionID);
            if (!connection || !connection.isEstablished()) return;

            client.sendMessage(connection, data.message);
            setMessages((p) =>
                p.concat([`TO ${data.connectionID}: ${data.message}`]),
            );
            clearSendMessageForm();
        },
    });

    useEffect(() => {
        const sub = client.addEventListener((ev) => {
            switch (ev.type) {
                case 'connectionEstablished':
                    setConnectionIDs((p) => p.concat([ev.id]));
                    break;

                case 'message':
                    setMessages((p) =>
                        p.concat([`FROM ${ev.id}: ${ev.message}`]),
                    );
                    break;

                case 'newPendingConnection':
                    if (
                        window.confirm(`Accept connection from "${ev.from}"?`)
                    ) {
                        client.acceptConnection(ev.id);
                    } else {
                        client.declineConnection(ev.id);
                    }

                    break;

                default:
                    console.log(ev);
            }
        });

        return () => sub.unsubscribe();
    }, [client]);

    return (
        <div>
            <h3>Client</h3>
            <div style={{ marginTop: '40px' }}>
                <h2>Request Connection</h2>
                <FormProvider controller={ConnectController}>
                    <form onSubmit={(e) => (e.preventDefault(), connect())}>
                        <div>
                            <FieldConsumer field="addressKey">
                                {({ value, setValue }) => (
                                    <textarea
                                        placeholder="Address Base64 Key"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                )}
                            </FieldConsumer>
                        </div>
                        <div>
                            <FieldConsumer field="from">
                                {({ value, setValue }) => (
                                    <input
                                        placeholder="From"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                )}
                            </FieldConsumer>
                        </div>
                        <button type="submit">Connect</button>
                    </form>
                </FormProvider>
            </div>
            <div style={{ marginTop: '40px' }}>
                <h2>Connection IDs</h2>
                <ul>
                    {connectionIDS.map((i) => (
                        <li key={i}>{i}</li>
                    ))}
                </ul>
            </div>
            <div style={{ marginTop: '40px', display: 'flex' }}>
                <div>
                    <h2>Send message</h2>
                    <FormProvider controller={SendMessageController}>
                        <form
                            onSubmit={(e) => (
                                e.preventDefault(), sendMessage()
                            )}
                        >
                            <div>
                                <FieldConsumer field="connectionID">
                                    {({ value, setValue }) => (
                                        <input
                                            placeholder="Connection ID"
                                            value={value}
                                            onChange={(e) =>
                                                setValue(e.target.value)
                                            }
                                        />
                                    )}
                                </FieldConsumer>
                            </div>
                            <div>
                                <FieldConsumer field="message">
                                    {({ value, setValue }) => (
                                        <textarea
                                            placeholder="Message"
                                            value={value}
                                            onChange={(e) =>
                                                setValue(e.target.value)
                                            }
                                        />
                                    )}
                                </FieldConsumer>
                            </div>
                            <button type="submit">Send</button>
                        </form>
                    </FormProvider>
                </div>
                <div>
                    <h2>Messages</h2>
                    <ul>
                        {messages.map((a, i) => (
                            <li key={i}>{a}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export const Default: StoryFn = () => {
    const keysIndex = useMemo(() => new KeysIndex(), []);
    const connectionsManager = useMemo(() => new ConnectionsManager(), []);
    const publishedManager = useMemo(
        () => new PublishedKeysManager(keysIndex),
        [keysIndex],
    );

    const [connection, setConnection] = useState<Connection | null>(null);
    const [client, setClient] = useState<ChatClient | null>(null);
    const [issuedKey, setIssuedPublicKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { controller: ConnectionController, submit: connect } = useController(
        {
            fields: {
                address: Str(true, ''),
            },
            submit({ address }) {
                setConnection(new Connection(address));
            },
        },
    );

    const issueKey = async () => {
        setIsLoading(true);
        const { publicKey } = await publishedManager.issueKey();

        setIssuedPublicKey(arrayBufferToBase64(await publicKey.toSPKI()));
        setIsLoading(false);
    };

    useEffect(() => {
        if (!connection) return;

        let protocol: ProtocolClient;
        let client: ChatClient;
        (async () => {
            setIsLoading(true);
            await connection.connect();

            protocol = new ProtocolClient(connection, keysIndex);
            protocol.init();

            client = new ChatClient(
                protocol,
                connectionsManager,
                publishedManager,
                keysIndex,
            );
            client.init();

            setClient(client);
            setIsLoading(false);
        })();

        return () => {
            client.destroy();
            protocol.destroy();
            connection.destroy();
        };
    }, [connection, keysIndex, connectionsManager, publishedManager]);

    return (
        <div>
            <div>
                <FormProvider controller={ConnectionController}>
                    <form onSubmit={(e) => (e.preventDefault(), connect())}>
                        <FieldConsumer field="address">
                            {({ value, setValue }) => (
                                <input
                                    placeholder="Address"
                                    value={value ?? ''}
                                    onChange={(e) => setValue(e.target.value)}
                                />
                            )}
                        </FieldConsumer>
                        <button type="submit">Connect</button>
                    </form>
                </FormProvider>
            </div>
            <div>
                <h2>Invite key</h2>
                <button onClick={issueKey}>Issue Invite Key</button>
                {issuedKey && (
                    <div>
                        <h3>Key</h3>
                        {issuedKey}
                        <button onClick={() => setIssuedPublicKey(null)}>
                            Clear
                        </button>
                    </div>
                )}
            </div>
            {isLoading && <div>Loading...</div>}
            {client && (
                <ClientView client={client} connections={connectionsManager} />
            )}
        </div>
    );
};
