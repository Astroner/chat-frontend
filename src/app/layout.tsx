'use client';

import { useEffect, useMemo } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import 'normalize.css';

import { Storage } from '../model/storage.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import { GZip } from '../helpers/compression/gzip.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../helpers/arraybuffer-utils';
import { StorageContext, NetworkContext } from '../model/context';
import { Network } from '../model/network.class';
import { env } from '../env';

import './globals.scss';
import { Subscription, joinSubs } from '../helpers/types';
import { ChatClient } from '../helpers/network/chat-client/chat-client.class';
import { ChatStorage } from '../helpers/storage/chat-storage.class';
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';

const inter = Inter({ subsets: ['latin'] });

const STORAGE_KEY = 'memes_and_prekols';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const keysIndex = useMemo(() => new KeysIndex(), []);
    const signsIndex = useMemo(() => new SignsIndex(), []);
    const gzip = useMemo(() => new GZip(), []);

    const storage = useMemo(() => {
        // return new Storage(
        //     {
        //         save: async (data) => {
        //             localStorage.setItem(
        //                 STORAGE_KEY,
        //                 arrayBufferToBase64(data),
        //             );
        //         },
        //         hasData: async () => !!localStorage.getItem(STORAGE_KEY),
        //         load: async () => {
        //             const data = localStorage.getItem(STORAGE_KEY);
        //             if (!data) throw new Error('A');

        //             return base64ToArrayBuffer(data);
        //         },
        //     },
        //     keysIndex,
        //     gzip,
        // )

        let stored: ArrayBuffer | null = null;

        return new Storage(
            {
                save: async (data) => {
                    stored = data;
                },
                hasData: async () => !!stored,
                load: async () => stored!,
            },
            keysIndex,
            signsIndex,
            gzip,
        );
    }, [gzip, keysIndex, signsIndex]);

    const network = useMemo(
        () => new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex, signsIndex),
        [keysIndex, signsIndex],
    );

    // useEffect(() => {
    //     if(location.pathname !== "/login") router.push(`/login?next=${location.pathname + location.search}`);
    // }, [router])

    useEffect(() => {
        let mounted = true;

        storage.init('memes');
        // .then(({ connections, published }) => {
        //     if(!mounted) return;
        //     network.init(connections, published);
        // })

        return () => {
            mounted = false;
            storage.destroy();
            network.destroy();
        };
    }, [network, storage]);

    // TODO: Move it into separate service
    useEffect(() => {
        let clientSub: Subscription | null = null;

        const sub = network.subscribe(() => {
            const nState = network.getState();
            const sState = storage.getState();

            if (nState.type !== 'READY' || sState.type !== 'READY') return;

            const { chat: client } = nState;
            const { chats } = sState;

            clientSub = client.addEventListener(async (ev) => {
                switch (ev.type) {
                    case 'newPendingConnection': {
                        if (
                            window.confirm(
                                `New connection request from "${ev.from}"`,
                            )
                        ) {
                            await client.acceptConnection(ev.id);
                            chats.createChat(ev.from, ev.id);
                        } else {
                            client.declineConnection(ev.id);
                        }

                        break;
                    }

                    case 'connectionDeclined': {
                        const chat = chats.getByConnectionID(ev.id);
                        if (chat) chats.deleteChat(chat.id);

                        break;
                    }

                    case 'connectionEstablished': {
                        const chat = chats.getByConnectionID(ev.id);
                        if (chat)
                            chats.setChatData(chat.id, {
                                state: 'ACTIVE',
                            });

                        break;
                    }

                    case 'message': {
                        const chat = chats.getByConnectionID(ev.id);
                        if (chat)
                            chats.setChatData(chat.id, (p) => ({
                                ...p,
                                messages: p.messages.concat([
                                    { origin: 'SERVER', text: ev.message },
                                ]),
                            }));

                        break;
                    }
                }
            });
        });

        return () => {
            sub.unsubscribe();
            clientSub?.unsubscribe();
        };
    }, [network, storage]);

    return (
        <StorageContext.Provider value={storage}>
            <NetworkContext.Provider value={network}>
                <html lang="en">
                    <head>
                        <title>Chat</title>
                    </head>
                    <body className={inter.className}>{children}</body>
                </html>
            </NetworkContext.Provider>
        </StorageContext.Provider>
    );
}
