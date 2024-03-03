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
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';
import { NetworkStorageBind } from '../services/network-storage-bind.component';
import { SmartStorage } from '../model/smart-storage.class';
import { ServiceWorkerService } from '../services/service-worker.service';
import { NotificationsContext, ServiceWorkerContext, WindowFocusContext } from '../services/context';

import { env } from '../env';

import './globals.scss';
import { WindowFocusService } from '../services/window-focus.service';
import { NotificationsService } from '../services/notifications/notifications.service';
import { NotificationsView } from './components/notifications-view/notifications-view.component';

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
    const windowFocus = useMemo(() => new WindowFocusService(), []);
    const notifications = useMemo(() => new NotificationsService(), []);
    const storageEnv = useMemo(
        () =>
            new SmartStorage(
                env.NODE_ENV === 'development' ? 'EXTERNAL' : 'LOCAL_STORAGE',
            ),
        [],
    );

    const storage = useMemo(() => {
        return new Storage(storageEnv, keysIndex, signsIndex, gzip);
    }, [gzip, keysIndex, signsIndex, storageEnv]);

    const network = useMemo(
        () =>
            new Network(env.WS_ADDRESS, env.API_ADDRESS, keysIndex, signsIndex),
        [keysIndex, signsIndex],
    );

    useEffect(() => {
        if (env.NODE_ENV === 'development') return;

        if (location.pathname !== '/login') {
            if (location.pathname === '/invite') {
                router.push(
                    `/login?next=${location.pathname + location.search}`,
                );
            } else {
                router.push(`/login`);
            }
        }

        // single time relocate to log-in
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        windowFocus.init();
        serviceWorker.init(windowFocus);

        return () => {
            windowFocus.destroy();
            serviceWorker.destroy();
        };
    }, [serviceWorker, windowFocus]);

    useEffect(() => {
        if (env.NODE_ENV !== 'development') return;

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
                    <ServiceWorkerContext.Provider value={serviceWorker}>
                        <WindowFocusContext.Provider value={windowFocus}>
                            <NotificationsContext.Provider value={notifications}>
                                <html lang="en">
                                    <head>
                                        <title>Chat</title>
                                    </head>
                                    <body className={inter.className}>
                                        <NotificationsView />
                                        <NetworkStorageBind />
                                        {children}
                                    </body>
                                </html>
                            </NotificationsContext.Provider>
                        </WindowFocusContext.Provider>
                    </ServiceWorkerContext.Provider>
                </SmartStorageContext.Provider>
            </NetworkContext.Provider>
        </StorageContext.Provider>
    );
}
