'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useNetwork, useStorage } from '@/src/model/hooks';

import cn from './page.module.scss';
import { ButtonLink } from '@/src/components/button-link/button-link.component';
import { HomeLink } from '@/src/components/home-link.component';
import { Chat } from '../components/chat/chat.component';

export default function ChatPage() {
    const params = useSearchParams();
    const [storage] = useStorage();
    const [network] = useNetwork();

    const chatID = useMemo(() => {
        return params.get('id') ?? null;
    }, [params]);

    const [chatInfo, setChatInfo] = useState(() => {
        if (storage.type !== 'READY' || !chatID) return null;

        return storage.chats.getChat(chatID);
    });

    const sendMessage = useCallback(
        (text: string) => {
            if (
                !chatInfo ||
                network.type !== 'READY' ||
                storage.type !== 'READY'
            )
                return;

            const connection = storage.connections.getConnection(
                chatInfo.connectionID,
            );

            if (!connection?.isEstablished()) return;

            network.chat.sendMessage(connection, text);
            storage.chats.setChatData(chatInfo.id, (p) => ({
                ...p,
                messages: p.messages.concat([{ origin: 'CLIENT', text }]),
            }));
        },
        [chatInfo, network, storage],
    );

    useEffect(() => {
        if (storage.type !== 'READY' || !chatID) return;

        const sub = storage.chats.subscribe(() =>
            setChatInfo(storage.chats.getChat(chatID)),
        );

        return () => {
            sub.unsubscribe();
        };
    }, [chatID, storage]);

    if (!chatInfo) return null;

    return (
        <main className={cn.root}>
            <HomeLink />
            <h1>{chatInfo.title}</h1>
            {chatInfo.state === 'PENDING' && 'Loading...'}
            {chatInfo.state === 'ACTIVE' && (
                <Chat
                    messages={chatInfo.messages.map((item) => ({
                        text: item.text,
                        origin: item.origin,
                    }))}
                    onSubmit={sendMessage}
                />
            )}
        </main>
    );
}
