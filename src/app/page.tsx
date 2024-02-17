'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAsyncCallback } from '@dogonis/hooks';
import {
    FieldConsumer,
    FormProvider,
    useController,
} from '@schematic-forms/react';
import { Str } from '@schematic-forms/core';

import { Input } from '../components/input/input.component';
import { Button } from '../components/button/button.component';
import { ChatInfo } from '../helpers/storage/chat-storage.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../helpers/arraybuffer-utils';
import { RSAEncryptionKey } from '../helpers/crypto/rsa/rsa-encryption-key.class';
import { Chat } from './components/chat/chat.component';
import { joinSubs } from '../helpers/types';
import { GZip } from '../helpers/compression/gzip.class';

import { env } from '../env';

import cn from './page.module.scss';

import { Storage, StorageState } from './model/storage.class';
import { Network, NetworkState } from './model/network.class';

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

    const gzip = useMemo<GZip>(() => new GZip(), []);
    const keysIndex = useMemo<KeysIndex>(() => new KeysIndex(), []);
    const network = useMemo(
        () => new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex),
        [keysIndex],
    );
    const storage = useMemo(
        () =>
            new Storage(
                {
                    save: async (data) => {
                        localStorage.setItem(
                            STORAGE_KEY,
                            arrayBufferToBase64(data),
                        );
                    },
                    hasData: async () => !!localStorage.getItem(STORAGE_KEY),
                    load: async () => {
                        const data = localStorage.getItem(STORAGE_KEY);
                        if (!data) throw new Error('A');

                        return base64ToArrayBuffer(data);
                    },
                },
                keysIndex,
                gzip,
            ),
        [keysIndex, gzip],
    );

    const [storageState, setStorageState] = useState<StorageState>(() =>
        storage.getState(),
    );

    const [networkState, setNetworkState] = useState<NetworkState>(() =>
        network.getState(),
    );

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
            await storage.init(password);

            setScene({ name: 'CHATS' });
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

    const connect = () => {
        if (storageState.type !== 'READY') return;

        network.init(storageState.connections, storageState.published);
    };

    const [createKey] = useAsyncCallback(async () => {
        if (storageState.type !== 'READY') return;

        const { id } = await storageState.published.issueKey();

        setScene({ name: 'PUBLISHED_KEY', id });
    }, [storageState]);

    const copyToClipboard = useCallback(() => {
        if (!publishedKeyInfo) return;

        navigator.clipboard.writeText(publishedKeyInfo.base64PublicKey);
    }, [publishedKeyInfo]);

    const call = async (from: string, to: string, key: RSAEncryptionKey) => {
        if (networkState.type !== 'READY' || storageState.type !== 'READY')
            return;

        const { id: connectionID } =
            await networkState.chat.sendConnectionRequest(key, from);
        storageState.chats.createChat(to, connectionID);
    };

    const sendMessage = (message: string) => {
        if (
            networkState.type !== 'READY' ||
            !currentChatInfo ||
            storageState.type !== 'READY'
        )
            return;

        const connection = storageState.connections.getConnection(
            currentChatInfo.connectionID,
        );

        if (!connection || !connection.isEstablished()) return;

        networkState.chat.sendMessage(connection, message);
        storageState.chats.setChatData(currentChatInfo.id, (prev) => ({
            ...prev,
            messages: prev.messages.concat([
                {
                    origin: 'CLIENT',
                    text: message,
                },
            ]),
        }));
    };

    useEffect(() => {
        const sub = storage.subscribe(() => {
            setStorageState(storage.getState());
        });

        return () => {
            sub.unsubscribe();
        };
    }, [storage]);

    useEffect(() => {
        const sub = network.subscribe(() => {
            setNetworkState(network.getState());
        });

        return () => {
            sub.unsubscribe();
        };
    }, [network]);

    useEffect(() => {
        if (networkState.type !== 'READY' || storageState.type !== 'READY')
            return;

        const sub = networkState.chat.addEventListener((event) => {
            console.log(event);
            switch (event.type) {
                case 'newPendingConnection': {
                    if (
                        window.confirm(
                            `New connection request from '${event.from}'`,
                        )
                    ) {
                        networkState.chat.acceptConnection(event.id);
                        storageState.chats.createChat(event.from, event.id);
                    } else {
                        networkState.chat.declineConnection(event.id);
                    }
                    break;
                }

                case 'connectionEstablished': {
                    const chat = storageState.chats.getByConnectionID(event.id);
                    console.log(chat);
                    if (!chat) return;

                    alert(`Connection with "${chat.title}" was established`);

                    storageState.chats.setChatData(chat.id, (prev) => {
                        return {
                            ...prev,
                            state: 'ACTIVE',
                        };
                    });

                    break;
                }

                case 'connectionDeclined': {
                    const chat = storageState.chats.getByConnectionID(event.id);
                    if (!chat) return;

                    const info = storageState.chats.getChat(chat.id);
                    if (!info) return;

                    alert(`Chat invite for "${info.title}" was declined`);

                    break;
                }

                case 'message': {
                    const chat = storageState.chats.getByConnectionID(event.id);
                    if (!chat) return;

                    storageState.chats.setChatData(chat.id, (prev) => ({
                        ...prev,
                        messages: prev.messages.concat([
                            {
                                origin: 'SERVER',
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
    }, [networkState, storageState]);

    useEffect(() => {
        if (scene.name !== 'PUBLISHED_KEY' || storageState.type !== 'READY')
            return;

        (async () => {
            const info = storageState.published.getKeyInfo(scene.id);
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
    }, [storageState, scene]);

    useEffect(() => {
        if (scene.name !== 'CHAT' || storageState.type !== 'READY') return;

        const info = storageState.chats.getChat(scene.id);

        if (!info) return;

        setCurrentChatInfo(info);

        const sub = storageState.chats.subscribe(() => {
            const info = storageState.chats.getChat(scene.id);

            if (!info) return;

            setCurrentChatInfo(info);
        });

        return () => {
            sub.unsubscribe();
        };
    }, [storageState, scene]);

    useEffect(() => {
        if (storageState.type !== 'READY') return;

        const chats = storageState.chats.getAll();
        setDisplayedChats(chats.map((a) => ({ title: a.title, id: a.id })));

        const publishedList = storageState.published.getAll();
        setPublishedKeysList(
            publishedList.map((item) => ({
                id: item.id,
                timesUsed: item.timesUsed,
            })),
        );

        const sub = joinSubs(
            storageState.chats.subscribe(() => {
                const chats = storageState.chats.getAll();

                setDisplayedChats(
                    chats.map((a) => ({ title: a.title, id: a.id })),
                );
            }),
            storageState.published.subscribe(async () => {
                const publishedList = storageState.published.getAll();

                setPublishedKeysList(
                    publishedList.map((item) => ({
                        id: item.id,
                        timesUsed: item.timesUsed,
                    })),
                );
            }),
        );

        return () => {
            sub.unsubscribe();
        };
    }, [storageState]);

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
            {scene.name === 'CHATS' && (
                <div>
                    {networkState.type === 'CONNECTING' ? (
                        'Connecting...'
                    ) : networkState.type === 'READY' ? (
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
                    {networkState.type === 'READY' && (
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
            {scene.name === 'PUBLISHED' && (
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
                                            item.origin === 'CLIENT'
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
