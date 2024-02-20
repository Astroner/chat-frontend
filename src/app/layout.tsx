'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import 'normalize.css';

import { Storage } from '../model/storage.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import { GZip } from '../helpers/compression/gzip.class';
import { StorageContext, NetworkContext, SmartStorageContext } from '../model/context';
import { Network } from '../model/network.class';
import { env } from '../env';

import './globals.scss';
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';
import { Service } from '../service/service.component';
import { SmartStorage } from '../model/smart-storage.class';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const keysIndex = useMemo(() => new KeysIndex(), []);
    const signsIndex = useMemo(() => new SignsIndex(), []);
    const gzip = useMemo(() => new GZip(), []);
    const storageEnv = useMemo(() => new SmartStorage(), []);

    const storage = useMemo(() => {
        return new Storage(
            storageEnv,
            keysIndex,
            signsIndex,
            gzip,
        );
    }, [gzip, keysIndex, signsIndex, storageEnv]);

    const network = useMemo(
        () =>
            new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex, signsIndex),
        [keysIndex, signsIndex],
    );

    // useEffect(() => {
    //     if(location.pathname !== "/login") {
    //         if(location.pathname === '/invite') {
    //             router.push(`/login?next=${location.pathname + location.search}`);
    //         } else {
    //             router.push(`/login`);
    //         }
    //     }
    // }, [router])

    useEffect(() => {
        storage.init('memes');
        // .then(({ connections, published }) => {
        //     if(!mounted) return;
        //     network.init(connections, published);
        // })

        return () => {
            storage.destroy();
            network.destroy();
        };
    }, [network, storage]);

    return (
        <StorageContext.Provider value={storage}>
            <NetworkContext.Provider value={network}>
                <SmartStorageContext.Provider value={storageEnv}>
                    <html lang="en">
                        <head>
                            <title>Chat</title>
                        </head>
                        <body className={inter.className}>
                            <Service />
                            {children}
                        </body>
                    </html>
                </SmartStorageContext.Provider>
            </NetworkContext.Provider>
        </StorageContext.Provider>
    );
}
