'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import 'normalize.css';

import { Storage } from '../model/storage.class';
import { KeysIndex } from '../helpers/crypto/keys-index/keys-index.class';
import { GZip } from '../helpers/compression/gzip.class';
import {
    StorageContext,
    NetworkContext,
    SmartStorageContext,
} from '../model/context';
import { Network } from '../model/network.class';
import { env } from '../env';

import './globals.scss';
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';
import { NetworkStorageBind } from '../services/network-storage-bind.component';
import { SmartStorage } from '../model/smart-storage.class';
import { ServiceWorkerService } from '../services/service-worker.service';
import { ServiceWorkerContext } from '../services/context';

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
    const serviceWorker = useMemo(() => new ServiceWorkerService(), []);
    const storageEnv = useMemo(() => new SmartStorage('EXTERNAL'), []);

    const storage = useMemo(() => {
        return new Storage(storageEnv, keysIndex, signsIndex, gzip);
    }, [gzip, keysIndex, signsIndex, storageEnv]);

    const network = useMemo(
        () =>
            new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex, signsIndex),
        [keysIndex, signsIndex],
    );

    useEffect(() => {
        if(env.NODE_ENV === "development") return;

        if(location.pathname !== "/login") {
            if(location.pathname === '/invite') {
                router.push(`/login?next=${location.pathname + location.search}`);
            } else {
                router.push(`/login`);
            }
        }
    }, [router])

    useEffect(() => {
        serviceWorker.init();
    }, [serviceWorker])

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
    }, [network, storage, router]);


    // useEffect(() => {
    //     (async () => {
    //         await Notification.requestPermission();
    //         await navigator.serviceWorker.register("/service-worker.js")
    //         const registration = await navigator.serviceWorker.ready;
    //         const sub = await registration.pushManager.subscribe({
    //             userVisibleOnly: true,
    //             applicationServerKey: env.PUSH_PUBLIC_KEY
    //         })
    //         console.log(sub.toJSON());
    //     })()

    // }, [])

    return (
        <StorageContext.Provider value={storage}>
            <NetworkContext.Provider value={network}>
                <SmartStorageContext.Provider value={storageEnv}>
                    <ServiceWorkerContext.Provider value={serviceWorker}>
                        <html lang="en">
                            <head>
                                <title>Chat</title>
                            </head>
                            <body className={inter.className}>
                                <NetworkStorageBind />
                                {children}
                            </body>
                        </html>
                    </ServiceWorkerContext.Provider>
                </SmartStorageContext.Provider>
            </NetworkContext.Provider>
        </StorageContext.Provider>
    );
}
