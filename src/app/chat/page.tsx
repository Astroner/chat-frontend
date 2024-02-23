'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useNetwork, useStorage } from '@/src/model/hooks';
import { HomeLink } from '@/src/components/home-link.component';
import { DotsLoader } from '@/src/components/dots-loader/dots-loader.component';

import { Messages } from './components/messages/messages.component';
import { ChatInput } from './components/chat-input/chat-input.component';

import cn from './page.module.scss';

const dotsLoaderStyle = {
    flexGrow: 1
};

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
        // setChatInfo({
        //     id: "ASDASD",
        //     connectionID: "ASDASD",
        //     messages: new Array(200).fill(null).map((_) => ({
        //         origin: "SERVER",
        //         text: "ASDASD"
        //     })).concat([{ origin: "CLIENT", text: "ASDAasdhjgd jasdl;kj agshdjk kal;sdj hjakhlsdlk jjajshdkh kla;sjdhj ahklsdk lajhsdghk asd SD" }]),
        //     state: "PENDING",
        //     title: "Memes"
        // })

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
            <div className={cn.header}>
                <HomeLink />
                <h1>{chatInfo.title}</h1>
            </div>
            {chatInfo.state === 'PENDING' && <DotsLoader
                style={dotsLoaderStyle}
                dotsNumber='huge'
            />}
            {chatInfo.state === 'ACTIVE' && (
                <div className={cn.container}>
                    <Messages 
                        className={cn.messages}
                        messages={chatInfo.messages.map((item) => ({
                            text: item.text,
                            origin: item.origin,
                        }))}
                    />
                    <div className={cn.input}>
                        <ChatInput
                            onSubmit={sendMessage}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
