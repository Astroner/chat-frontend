'use client';

import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { env } from '../env';

import cn from './page.module.scss';
import { Input } from '../components/input/input.component';
import {
    FieldConsumer,
    FormProvider,
    useController,
} from '@schematic-forms/react';
import { Button } from '../components/button/button.component';
import { Str } from '@schematic-forms/core';
import { AesGcmKey } from '../helpers/crypto/aes-gcm/aes-gcm-key.class';
import {
    ChatInfo,
    ChatState,
    ChatStorage,
    MessageOrigin,
} from '../helpers/storage/chat-storage.class';
import { ConnectionsManager } from '../helpers/storage/connections-manager/connections-manager.class';
import { PublishedKeysManager } from '../helpers/storage/published-keys-manager/published-keys-manager.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import { Connection } from '../helpers/network/connection/connection.class';
import { ProtocolClient } from '../helpers/network/protocol-client/protocol-client.class';
import { ChatClient } from '../helpers/network/chat-client/chat-client.class';
import {
    arrayBufferToBase64,
    arrayBufferToString,
    base64ToArrayBuffer,
    stringToArrayBuffer,
} from '../helpers/arraybuffer-utils';
import { useAsyncCallback } from '@dogonis/hooks';
import { RSAEncryptionKey } from '../helpers/crypto/rsa/rsa-encryption-key.class';
import { Messages } from './components/messages/messages.component';
import { Chat } from './components/chat/chat.component';
import { Subscription } from '../helpers/types';
import { GZip } from '../helpers/compression/gzip.class';
import { BufferBuilder } from '../helpers/buffer-read-write/buffer-builder.class';
import { BufferReader } from '../helpers/buffer-read-write/buffer-reader.class';

const STORAGE_KEY = 'AKSHDGJALSD';

export default function Home() {
    const [scene, setScene] = useState<
        | { name: 'LOGIN' }
        | { name: 'CHATS' }
        | { name: 'PUBLISHED' }
        | { name: 'PUBLISHED_KEY'; id: string }
        | { name: 'START_CONVERSATION' }
        | { name: 'CHAT'; id: string }
    >({ name: 'LOGIN' });

    const keysIndex = useMemo<KeysIndex>(() => new KeysIndex(), []);
    const [storageEncryptionKey, setStorageEncryptionKey] =
        useState<AesGcmKey | null>(null);
    const gzip = useMemo(() => new GZip(), []);

    const [chatsStorage, setChatsStorage] = useState<ChatStorage | null>(null);
    const [connections, setConnections] = useState<ConnectionsManager | null>(
        null,
    );
    const [published, setPublished] = useState<PublishedKeysManager | null>(
        null,
    );

    const [chatClient, setChatClient] = useState<ChatClient | null>(null);

    const [displayedChats, setDisplayedChats] = useState<
        Array<{ title: string; id: string }>
    >([]);
    const [publishedKeysList, setPublishedKeysList] = useState<
        Array<{ id: string; timesUsed: number }>
    >([]);

    const [publishedKeyInfo, setPublishedKeyInfo] = useState<{
        id: string;
        base64PublicKey: string;
    } | null>(null);
    const [currentChatInfo, setCurrentChatInfo] = useState<ChatInfo | null>(
        null,
    );

    const loginController = useController({
        fields: {
            password: Str(true),
        },
        async submit({ password }) {
            const aes = await AesGcmKey.fromPassword(
                password,
                Uint8Array.from([
                    124, 158, 73, 238, 216, 204, 48, 8, 30, 52, 65, 251, 13,
                    175, 32, 141,
                ]),
            );

            setStorageEncryptionKey(aes);
        },
    });

    const startConversationCOntroller = useController({
        fields: {
            from: Str(true),
            to: Str(true),
            key: Str(true),
        },
        validators: {
            from: (str) => {
                if (str.length > 30) return new Error('TOO_BIG');
            },
        },
        async submit(
            { key: keySrc, from, to },
            cb: (from: string, to: string, key: RSAEncryptionKey) => void,
        ) {
            const key = await RSAEncryptionKey.fromSPKI(
                base64ToArrayBuffer(keySrc),
            );

            cb(from, to, key);
        },
    });

    const [connect, isConnecting, connection] = useAsyncCallback(
        async (hook) => {
            const connection = new Connection(env.WS_ADDRESS);

            await connection.connect();

            return connection;
        },
        [],
    );

    const [createKey] = useAsyncCallback(async () => {
        if (!published) return;

        const { id } = await published.issueKey();

        setScene({ name: 'PUBLISHED_KEY', id });
    }, [published]);

    const copyToClipboard = useCallback(() => {
        if (!publishedKeyInfo) return;

        navigator.clipboard.writeText(publishedKeyInfo.base64PublicKey);
    }, [publishedKeyInfo]);

    const call = async (from: string, to: string, key: RSAEncryptionKey) => {
        if (!chatClient || !chatsStorage) return;

        const { id: connectionID } = await chatClient.sendConnectionRequest(
            key,
            from,
        );

        chatsStorage.createChat(to, connectionID);
    };

    const sendMessage = (message: string) => {
        if (!chatClient || !currentChatInfo || !connections || !chatsStorage)
            return;

        const connection = connections.getConnection(
            currentChatInfo.connectionID,
        );

        if (!connection || !connection.isEstablished()) return;

        chatClient.sendMessage(connection, message);
        chatsStorage.setChatData(currentChatInfo.id, (prev) => ({
            ...prev,
            messages: prev.messages.concat([
                {
                    origin: MessageOrigin.CLIENT,
                    text: message,
                },
            ]),
        }));
    };

    useEffect(() => {
        if (!storageEncryptionKey) return;

        (async () => {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                setChatsStorage(new ChatStorage());
                setConnections(new ConnectionsManager());
                setPublished(new PublishedKeysManager(keysIndex));
            } else {
                const cipher = base64ToArrayBuffer(stored);

                const data = await storageEncryptionKey.decrypt(cipher);

                const reader = new BufferReader(data);

                const [chats, published, connections] = await Promise.all([
                    gzip
                        .decompress(reader.readBytes())
                        .then(
                            (data) =>
                                new ChatStorage(
                                    JSON.parse(arrayBufferToString(data)),
                                ),
                        ),
                    PublishedKeysManager.import(reader.readBytes(), keysIndex),
                    ConnectionsManager.import(reader.readBytes()),
                ]);

                setChatsStorage(chats);
                setConnections(connections);
                setPublished(published);

                for (const { key, connection } of connections.getAll()) {
                    switch (connection.status) {
                        case 'preEstablished':
                        case 'established':
                            keysIndex.addKey(key, connection.aesKey);

                            break;

                        case 'requested':
                            keysIndex.addKey(
                                key,
                                connection.responseRSAPrivateKey,
                            );

                            break;

                        case 'pending':
                            console.log('Pending one');

                            break;
                    }
                }

                for (const { id, privateKey } of published.getAll()) {
                    keysIndex.addKey(id, privateKey);
                }
            }

            setScene({ name: 'CHATS' });
        })();
    }, [storageEncryptionKey, keysIndex, gzip]);

    useEffect(() => {
        if (
            !chatsStorage ||
            !published ||
            !connections ||
            !storageEncryptionKey
        )
            return;

        let chatsStorageSub: Subscription;
        let connectionsSub: Subscription;
        let publishedSub: Subscription;

        (async () => {
            setDisplayedChats(
                chatsStorage
                    .getAll()
                    .map((a) => ({ title: a.title, id: a.id })),
            );

            setPublishedKeysList(
                published.getAll().map((item) => ({
                    id: item.id,
                    timesUsed: item.timesUsed,
                })),
            );

            const dataToStore = {
                messages: await gzip.compress(
                    stringToArrayBuffer(JSON.stringify(chatsStorage.getAll())),
                ),
                published: await published.export(),
                connections: await connections.export(),
            };

            const save = async () => {
                const builder = new BufferBuilder(
                    6 +
                        dataToStore.messages.byteLength +
                        dataToStore.published.byteLength +
                        dataToStore.connections.byteLength,
                );

                builder.appendBuffer(dataToStore.messages);
                builder.appendBuffer(dataToStore.published);
                builder.appendBuffer(dataToStore.connections);

                const buffer = builder.getBuffer();

                const data = await storageEncryptionKey.encrypt(buffer);

                const base64 = arrayBufferToBase64(data);

                localStorage.setItem(STORAGE_KEY, base64);
            };

            save();

            chatsStorageSub = chatsStorage.subscribe(async () => {
                const chats = chatsStorage.getAll();

                setDisplayedChats(
                    chats.map((a) => ({ title: a.title, id: a.id })),
                );

                dataToStore.messages = await gzip.compress(
                    stringToArrayBuffer(JSON.stringify(chatsStorage.getAll())),
                );

                save();
            });

            connectionsSub = connections.subscribe(async () => {
                dataToStore.connections = await connections.export();
            });

            publishedSub = published.subscribe(async () => {
                const publishedList = published.getAll();

                setPublishedKeysList(
                    publishedList.map((item) => ({
                        id: item.id,
                        timesUsed: item.timesUsed,
                    })),
                );

                dataToStore.published = await published.export();

                save();
            });
        })();

        return () => {
            chatsStorageSub.unsubscribe();
            connectionsSub.unsubscribe();
            publishedSub.unsubscribe();
        };
    }, [chatsStorage, connections, gzip, published, storageEncryptionKey]);

    useEffect(() => {
        if (!connection || !connections || !published) return;

        const protocol = new ProtocolClient(connection, keysIndex);
        protocol.init();

        const chatClient = new ChatClient(
            protocol,
            connections,
            published,
            keysIndex,
        );
        chatClient.init();

        setChatClient(chatClient);

        return () => {
            chatClient.destroy();
            protocol.destroy();
            connection.destroy();
        };
    }, [connection, connections, keysIndex, published]);

    useEffect(() => {
        if (!chatClient || !chatsStorage) return;

        const sub = chatClient.addEventListener((event) => {
            switch (event.type) {
                case 'newPendingConnection': {
                    if (
                        window.confirm(
                            `New connection request from '${event.from}'`,
                        )
                    ) {
                        chatClient.acceptConnection(event.id);
                        const { id } = chatsStorage.createChat(
                            event.from,
                            event.id,
                        );
                    } else {
                        chatClient.declineConnection(event.id);
                    }
                    break;
                }

                case 'connectionEstablished': {
                    const chat = chatsStorage.getByConnectionID(event.id);
                    if (!chat) return;

                    alert(`Connection with "${chat.title}" was established`);

                    chatsStorage.setChatData(chat.id, (prev) => {
                        return {
                            ...prev,
                            state: ChatState.ACTIVE,
                        };
                    });

                    break;
                }

                case 'connectionDeclined': {
                    const chat = chatsStorage.getByConnectionID(event.id);
                    if (!chat) return;

                    const info = chatsStorage.getChat(chat.id);
                    if (!info) return;

                    alert(`Chat invite for "${info.title}" was declined`);

                    break;
                }

                case 'message': {
                    const chat = chatsStorage.getByConnectionID(event.id);
                    if (!chat) return;

                    chatsStorage.setChatData(chat.id, (prev) => ({
                        ...prev,
                        messages: prev.messages.concat([
                            {
                                origin: MessageOrigin.SERVER,
                                text: event.message,
                            },
                        ]),
                    }));

                    break;
                }
            }
        });

        return () => {
            sub.unsubscribe();
        };
    }, [chatClient, chatsStorage]);

    useEffect(() => {
        if (scene.name !== 'PUBLISHED_KEY' || !published) return;

        (async () => {
            const info = published.getKeyInfo(scene.id);
            if (!info) return;

            setPublishedKeyInfo({
                id: info.id,
                base64PublicKey: arrayBufferToBase64(
                    await info.publicKey.toSPKI(),
                ),
            });
        })();

        return () => {
            setPublishedKeyInfo(null);
        };
    }, [published, scene]);

    useEffect(() => {
        if (scene.name !== 'CHAT' || !chatsStorage) return;

        const info = chatsStorage.getChat(scene.id);

        if (!info) return;

        setCurrentChatInfo(info);

        const sub = chatsStorage.subscribe(() => {
            const info = chatsStorage.getChat(scene.id);

            if (!info) return;

            setCurrentChatInfo(info);
        });

        return () => {
            sub.unsubscribe();
        };
    }, [chatsStorage, scene]);

    return (
        <main className={cn.root}>
            {scene.name === 'LOGIN' && (
                <div>
                    <FormProvider controller={loginController.controller}>
                        <FieldConsumer field="password">
                            {({ value, setValue }) => (
                                <Input
                                    placeholder="Storage Password"
                                    value={value ?? ''}
                                    onChange={setValue}
                                />
                            )}
                        </FieldConsumer>
                        <Button
                            variant="orange"
                            onClick={loginController.submit}
                        >
                            Enter
                        </Button>
                    </FormProvider>
                </div>
            )}
            {scene.name === 'CHATS' && chatsStorage && (
                <div>
                    {isConnecting ? (
                        'Connecting...'
                    ) : connection ? (
                        'Connected'
                    ) : (
                        <Button variant="orange" onClick={connect}>
                            Connect
                        </Button>
                    )}
                    {displayedChats.length > 0 ? (
                        <ul>
                            {displayedChats.map((info) => (
                                <li
                                    key={info.id}
                                    onClick={() =>
                                        setScene({ name: 'CHAT', id: info.id })
                                    }
                                >
                                    {info.title}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div>No Chats</div>
                    )}
                    {connection && (
                        <Button
                            variant="orange"
                            onClick={() =>
                                setScene({ name: 'START_CONVERSATION' })
                            }
                        >
                            Start conversation
                        </Button>
                    )}
                    <Button
                        variant="orange"
                        onClick={() => setScene({ name: 'PUBLISHED' })}
                    >
                        Published keys
                    </Button>
                </div>
            )}
            {scene.name === 'PUBLISHED' && published && (
                <div>
                    {publishedKeysList.length === 0 ? (
                        <div>Nothing published</div>
                    ) : (
                        <ul>
                            {publishedKeysList.map((item) => (
                                <li
                                    key={item.id}
                                    onClick={() =>
                                        setScene({
                                            name: 'PUBLISHED_KEY',
                                            id: item.id,
                                        })
                                    }
                                >
                                    {item.id} {item.timesUsed}
                                </li>
                            ))}
                        </ul>
                    )}
                    <Button variant="orange" onClick={createKey}>
                        Create new key
                    </Button>
                    <Button
                        variant="orange"
                        onClick={() => setScene({ name: 'CHATS' })}
                    >
                        Back To Chats
                    </Button>
                </div>
            )}
            {scene.name === 'PUBLISHED_KEY' && (
                <div>
                    {!publishedKeyInfo ? (
                        'Loading...'
                    ) : (
                        <>
                            <div>ID: {publishedKeyInfo.id}</div>
                            <div>Key:</div>
                            <div
                                style={{
                                    width: '100%',
                                    wordWrap: 'break-word',
                                }}
                            >
                                {publishedKeyInfo.base64PublicKey}
                            </div>

                            <Button variant="orange" onClick={copyToClipboard}>
                                Copy to clipboard
                            </Button>
                        </>
                    )}
                    <Button
                        variant="orange"
                        onClick={() => setScene({ name: 'PUBLISHED' })}
                    >
                        Back
                    </Button>
                </div>
            )}
            {scene.name === 'START_CONVERSATION' && (
                <div>
                    <FormProvider
                        controller={startConversationCOntroller.controller}
                    >
                        <form
                            onSubmit={(e) => (
                                e.preventDefault(),
                                startConversationCOntroller.submit(call)
                            )}
                        >
                            <FieldConsumer field="from">
                                {({ value, setValue, error }) => (
                                    <>
                                        <Input
                                            placeholder="From"
                                            value={value ?? ''}
                                            onChange={setValue}
                                        />
                                        {error}
                                    </>
                                )}
                            </FieldConsumer>
                            <FieldConsumer field="to">
                                {({ value, setValue, error }) => (
                                    <>
                                        <Input
                                            placeholder="To"
                                            value={value ?? ''}
                                            onChange={setValue}
                                        />
                                        {error}
                                    </>
                                )}
                            </FieldConsumer>
                            <FieldConsumer field="key">
                                {({ value, setValue }) => (
                                    <Input
                                        placeholder="Key"
                                        value={value ?? ''}
                                        onChange={setValue}
                                    />
                                )}
                            </FieldConsumer>
                            <Button submit variant="orange">
                                Connect
                            </Button>
                        </form>
                    </FormProvider>
                    <Button
                        variant="orange"
                        onClick={() => setScene({ name: 'CHATS' })}
                    >
                        Back To Chats
                    </Button>
                </div>
            )}
            {scene.name === 'CHAT' && (
                <div>
                    {!currentChatInfo ? (
                        'Loading...'
                    ) : (
                        <div>
                            <Chat
                                messages={currentChatInfo.messages.map(
                                    (item) => ({
                                        origin:
                                            item.origin === MessageOrigin.CLIENT
                                                ? 'CLIENT'
                                                : 'SERVER',
                                        text: item.text,
                                    }),
                                )}
                                onSubmit={sendMessage}
                            />
                        </div>
                    )}
                    <Button
                        variant="orange"
                        onClick={() => setScene({ name: 'CHATS' })}
                    >
                        Back To Chats
                    </Button>
                </div>
            )}
        </main>
    );
}
