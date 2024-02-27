import { FC, memo, useEffect } from 'react';
import { useNetwork, useStorage } from '../model/hooks';
import { useRouter } from 'next/navigation';

export const NetworkStorageBind: FC = memo(() => {
    const [network] = useNetwork();
    const [storage] = useStorage();
    const router = useRouter();

    useEffect(() => {
        if (network.type !== 'READY' || storage.type !== 'READY') return;

        const sub = network.chat.addEventListener(async (ev) => {
            switch (ev.type) {
                case 'newPendingConnection': {
                    if (
                        window.confirm(
                            `New connection request from "${ev.from}"`,
                        )
                    ) {
                        await network.chat.acceptConnection(ev.id);
                        const {id} = storage.chats.createChat(ev.from, ev.id);
                        router.push(`/chat?id=${id}`);
                    } else {
                        network.chat.declineConnection(ev.id);
                    }

                    break;
                }

                case 'connectionDeclined': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (chat) storage.chats.deleteChat(chat.id);

                    break;
                }

                case 'connectionEstablished': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (chat)
                        storage.chats.setChatData(chat.id, {
                            state: 'ACTIVE',
                        });

                    break;
                }

                case 'message': {
                    const chat = storage.chats.getByConnectionID(ev.id);
                    if (chat)
                        storage.chats.setChatData(chat.id, (p) => ({
                            ...p,
                            messages: p.messages.concat([
                                { origin: 'SERVER', text: ev.message },
                            ]),
                        }));

                    break;
                }
            }
        });

        return () => {
            sub.unsubscribe();
        };
    }, [network, storage, router]);

    return null;
});