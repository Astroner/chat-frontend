import { FC, memo, useEffect } from 'react';
import { useNetwork, useStorage } from '../model/hooks';
import { useRouter } from 'next/navigation';
import { useNotifications, useServiceWorker } from './hooks';

export const NetworkStorageBind: FC = memo(() => {
    const [networkState, network] = useNetwork();
    const [storage] = useStorage();
    const router = useRouter();
    const [, notifications] = useNotifications('NO_UPDATES');
    const [serviceWorkerState, serviceWorker] = useServiceWorker();

    useEffect(() => {
        const nState = network.getState();
        if (storage.type !== 'READY' || nState.type !== 'IDLE') return;
        if (storage.common.getData().onlineOnStartup) {
            network.init(
                storage.connections,
                storage.published,
                storage.common,
            );
        }
    }, [storage, network]);

    useEffect(() => {
        if (serviceWorkerState.type !== 'ACTIVE' || storage.type !== 'READY')
            return;

        serviceWorker.getCalledKeys().then((chats) => {
            for (const chatID of chats) {
                storage.chats.setChatData(chatID, {
                    hasUnreadMessages: true,
                });
            }
        });
    }, [serviceWorkerState, storage, serviceWorker]);

    useEffect(() => {
        if (networkState.type !== 'READY' || storage.type !== 'READY') return;

        const sub = networkState.chat.addEventListener(async (ev) => {
            switch (ev.type) {
                case 'newPendingConnection': {
                    notifications.addNotification(
                        `New connection request from "${ev.from}"`,
                    );
                    break;
                }

                case 'connectionDeclined': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (!chat) break;

                    storage.chats.deleteChat(chat.id);
                    notifications.addNotification(
                        `Request to "${chat.title}" was declined`,
                    );

                    break;
                }

                case 'connectionEstablished': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (!chat) break;

                    storage.chats.setChatData(chat.id, {
                        state: 'ACTIVE',
                    });

                    notifications.addNotification(
                        `Established connection with "${chat.title}"`,
                    );

                    break;
                }

                case 'message': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (chat) {
                        const search = new URLSearchParams(location.search);
                        const currentChatID = search.get('id');

                        if (
                            location.pathname !== '/chat' ||
                            !currentChatID ||
                            currentChatID !== chat.id
                        ) {
                            notifications.addNotification(
                                `${chat.title}: ${ev.message}`,
                            );
                            storage.chats.setChatData(chat.id, {
                                hasUnreadMessages: true,
                            });
                        }

                        storage.chats.setChatData(chat.id, (p) => ({
                            ...p,
                            messages: p.messages.concat([
                                { origin: 'SERVER', text: ev.message },
                            ]),
                        }));
                    }

                    break;
                }
            }
        });

        return () => {
            sub.unsubscribe();
        };
    }, [networkState, storage, router, notifications]);

    return null;
});
