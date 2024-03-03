import { FC, memo, useCallback, useEffect, useState } from 'react';

import { useNetwork, useStorage } from '@/src/model/hooks';
import { Button } from '@/src/components/button/button.component';

import cn from './requests.module.scss';
import { Request } from './request.component';
import { useRouter } from 'next/navigation';

export type RequestsProps = {};

export const Requests: FC<RequestsProps> = memo((props) => {
    const router = useRouter();
    const [storage] = useStorage();
    const [network] = useNetwork();

    const [invites, setInvites] = useState<
        Array<{ key: string; from: string }>
    >([]);

    const accept = useCallback(
        async (id: string, from: string) => {
            if (network.type !== 'READY' || storage.type !== 'READY') return;

            await network.chat.acceptConnection(id);
            const { id: chatID } = storage.chats.createChat(from, id);
            router.push(`/chat?id=${chatID}`);
        },
        [network, router, storage],
    );

    const decline = useCallback(
        (id: string) => {
            if (network.type !== 'READY') return;

            network.chat.declineConnection(id);
        },
        [network],
    );

    useEffect(() => {
        if (storage.type !== 'READY') return;

        const items = new Array<{ key: string; from: string }>();

        for (const { key, connection } of storage.connections.getAll()) {
            if (connection.status !== 'pending') continue;
            items.push({
                key,
                from: connection.from,
            });
        }

        setInvites(items);

        const sub = storage.connections.subscribe(() => {
            const items = new Array<{ key: string; from: string }>();

            for (const { key, connection } of storage.connections.getAll()) {
                if (connection.status !== 'pending') continue;
                items.push({
                    key,
                    from: connection.from,
                });
            }

            setInvites(items);
        });

        return () => {
            sub.unsubscribe();
        };
    }, [storage]);

    if (invites.length === 0 || network.type !== 'READY') return null;

    return (
        <div className={cn.root}>
            <h2>Requests</h2>
            <div className={cn.list}>
                {invites.map((item) => (
                    <Request
                        key={item.key}
                        from={item.from}
                        id={item.key}
                        onAccept={accept}
                        onDecline={decline}
                    />
                ))}
            </div>
        </div>
    );
});
