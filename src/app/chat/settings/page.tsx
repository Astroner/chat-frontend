'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/src/components/button/button.component';
import { Switch } from '@/src/components/switch/switch.component';
import { useServiceWorker } from '@/src/services/hooks';
import { useNetwork, useStorage } from '@/src/model/hooks';

import { useChatInfo } from '../helpers/use-chat-info';

import cn from './page.module.scss';

export default function ChatSettingsPage() {
    const params = useSearchParams();
    const router = useRouter();
    const [serviceWorkerState, serviceWorker] = useServiceWorker();
    const [network] = useNetwork();
    const [storage] = useStorage();

    const [deletePressed, setDeletePressed] = useState(false);

    const chatID = useMemo(() => {
        return params.get('id') ?? null;
    }, [params]);

    const [chatInfo, chats, connections] = useChatInfo(
        chatID /*{
        id: "ASDASD",
        connectionID: "ASDASD",
        messages: new Array(200).fill(null).map((_) => ({
            origin: "SERVER",
            text: "ASDASD"
        })).concat([{ origin: "CLIENT", text: "ASDAasdhjgd jasdl;kj agshdjk kal;sdj hjakhlsdlk jjajshdkh kla;sjdhj ahklsdk lajhsdghk asd SD" }]),
        state: "ACTIVE",
        title: "Memes",
        pushNotifications: true
    }*/,
    );

    const back = useCallback(() => {
        router.back();
    }, [router]);

    // BAD: the process of push notifications enabling should be moved into separate entity
    const toggleNotifications = useCallback(
        async (value: boolean) => {
            if (
                !chats ||
                serviceWorkerState.type !== 'ACTIVE' ||
                serviceWorkerState.pushNotifications.type === 'denied' ||
                network.type !== 'READY' ||
                storage.type !== 'READY'
            )
                return;
            chats.setChatData(chatInfo.id, (p) => ({
                ...p,
                pushNotifications: value,
            }));

            if (value) {
                const connection = connections.getConnection(
                    chatInfo.connectionID,
                );
                if (!connection || !connection.isEstablished()) return;

                if (serviceWorkerState.pushNotifications.type === 'not-asked') {
                    const result = await serviceWorker.pushSubscribe();
                    if (result === 'denied' || result === 'loading') return;

                    if (!result.endpoint || !result.keys) return;

                    const { id: pushSubscriptionID } =
                        await network.http.addPushSubscription(
                            result.endpoint,
                            result.keys.p256dh,
                            result.keys.auth,
                        );

                    storage.common.setData({
                        ...storage.common.getData(),
                        pushSubscriptionID,
                    });
                }

                serviceWorker.addKey(chatInfo.id, connection.hmacKey.getKey());
            } else {
                serviceWorker.deleteKey(chatInfo.id);
            }
        },
        [
            chats,
            chatInfo,
            serviceWorkerState,
            serviceWorker,
            connections,
            network,
            storage,
        ],
    );

    // BAD: Should also be moved somewhere
    const deleteChat = useCallback(() => {
        if (!deletePressed) return setDeletePressed(true);

        if (storage.type !== 'READY' || !chatInfo) return;

        storage.connections.deleteConnection(chatInfo.connectionID);
        serviceWorker.deleteKey(chatInfo.id);
        storage.chats.deleteChat(chatInfo.id);

        router.push('/');
    }, [deletePressed, storage, chatInfo, router, serviceWorker]);

    if (!chatInfo) return null;

    return (
        <>
            <header className={cn.header}>
                <Button
                    className={cn.back}
                    color="purple"
                    size={'small'}
                    icon="arrow-back"
                    onClick={back}
                >
                    Back
                </Button>
                <h1>Chat Settings</h1>
            </header>
            <main className={cn.root}>
                <div className={cn.item}>
                    <div className={cn.item__label}>Send notifications</div>
                    <Switch
                        disabled={
                            serviceWorkerState.type !== 'ACTIVE' ||
                            serviceWorkerState.pushNotifications.type ===
                                'denied'
                        }
                        size="small"
                        value={chatInfo.pushNotifications}
                        onChange={toggleNotifications}
                    />
                </div>
                {serviceWorkerState.type === 'ACTIVE' &&
                    serviceWorkerState.pushNotifications.type === 'denied' && (
                        <div>Push notifications were disabled</div>
                    )}
                <Button
                    className={cn.delete}
                    color="orange"
                    onClick={deleteChat}
                >
                    {deletePressed ? 'Confirm' : 'Delete chat'}
                </Button>
            </main>
        </>
    );
}
