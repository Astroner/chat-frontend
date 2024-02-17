'use client';

import { Inter } from 'next/font/google';
import 'normalize.css';

import './globals.scss';
import { useMemo } from 'react';
import { Storage } from './model/storage.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import { GZip } from '../helpers/compression/gzip.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../helpers/arraybuffer-utils';
import { StorageContext, NetworkContext } from './model/context';
import { Network } from './model/network.class';
import { env } from '../env';

const inter = Inter({ subsets: ['latin'] });

const STORAGE_KEY = 'memes_and_prekols';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const keysIndex = useMemo(() => new KeysIndex(), []);
    const gzip = useMemo(() => new GZip(), []);

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
        [gzip, keysIndex],
    );

    const network = useMemo(
        () => new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex),
        [keysIndex],
    );

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
