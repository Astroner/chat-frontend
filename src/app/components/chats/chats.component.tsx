import { FC, memo, useEffect, useState } from 'react';
import Link from 'next/link';

import { useNetwork, useStorage } from '@/src/model/hooks';

import cn from './chats.module.scss';

export type ChatsProps = {};

export const Chats: FC<ChatsProps> = memo((props) => {
    const [storage] = useStorage();

    const [chats, setChats] = useState(() => {
        if (storage.type !== 'READY') return null;

        return storage.chats.getAll();
    });

    useEffect(() => {
        if (storage.type !== 'READY') return;

        setChats(storage.chats.getAll());

        const sub = storage.chats.subscribe(() =>
            setChats(storage.chats.getAll()),
        );

        return () => {
            sub.unsubscribe();
        };
    }, [storage]);

    if (!chats) return;
    return (
        <div className={cn.root}>
            <h1>{chats.length > 0 ? 'Chats' : 'No chats created'}</h1>
            <div className={cn.list}>
                {chats.map((chat) => (
                    <Link
                        href={`/chat?id=${chat.id}`}
                        key={chat.id}
                        className={cn.chat}
                    >
                        {chat.title}
                    </Link>
                ))}
            </div>
        </div>
    );
});
