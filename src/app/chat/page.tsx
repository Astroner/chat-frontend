'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useNetwork } from '@/src/model/hooks';
import { HomeLink } from '@/src/components/home-link.component';
import { DotsLoader } from '@/src/components/dots-loader/dots-loader.component';

import { Messages } from './components/messages/messages.component';
import { ChatInput } from './components/chat-input/chat-input.component';

import cn from './page.module.scss';
import { ButtonLink } from '@/src/components/button-link/button-link.component';
import { useChatInfo } from './helpers/use-chat-info';

const dotsLoaderStyle = {
    flexGrow: 1,
};

export default function ChatPage() {
    const params = useSearchParams();
    const router = useRouter();
    const [network] = useNetwork();

    const chatID = useMemo(() => {
        return params.get('id') ?? null;
    }, [params]);

    const [chatInfo, chats, connections] = useChatInfo(
        chatID /*, {
        id: "ASDASD",
        connectionID: "ASDASD",
        messages: new Array(200).fill(null).map((_) => ({
            origin: "SERVER",
            text: "ASDASD"
        })).concat([{ origin: "CLIENT", text: "ASDAasdhjgd jasdl;kj agshdjk kal;sdj hjakhlsdlk jjajshdkh kla;sjdhj ahklsdk lajhsdghk asd SD" }]),
        state: "ACTIVE",
        title: "Memes"
    }*/,
    );

    const sendMessage = useCallback(
        (text: string) => {
            if (!chatInfo || network.type !== 'READY') return;

            const connection = connections.getConnection(chatInfo.connectionID);

            if (!connection?.isEstablished()) return;

            network.chat.sendMessage(connection, text);
            chats.setChatData(chatInfo.id, (p) => ({
                ...p,
                messages: p.messages.concat([{ origin: 'CLIENT', text }]),
            }));
        },
        [chatInfo, network, chats, connections],
    );

    useEffect(() => {
        // No chat or chat was deleted
        if (!chatInfo) return router.push('/');
    }, [chatInfo, chats, router, network]);

    useEffect(() => {
        if (!chats || network.type !== 'READY' || !chatID) return;

        chats.setChatData(chatID, {
            hasUnreadMessages: false,
        });
    }, [network, chats, chatID]);

    if (!chatInfo) return null;

    return (
        <>
            <header className={cn.header}>
                <HomeLink className={cn.home} color="purple" />
                <h1>{chatInfo.title}</h1>
                <ButtonLink
                    className={cn.settings}
                    href={`/chat/settings/?id=${chatInfo.id}`}
                    icon="settings"
                    color="purple"
                    size="small"
                />
            </header>
            <main className={cn.root}>
                {chatInfo.state === 'PENDING' && (
                    <DotsLoader style={dotsLoaderStyle} dotsNumber="huge" />
                )}
                {chatInfo.state === 'ACTIVE' && (
                    <>
                        <Messages
                            className={
                                cn[
                                    'messages--' +
                                        (network.type !== 'READY' &&
                                        chatInfo.hasUnreadMessages
                                            ? 'small'
                                            : 'big')
                                ]
                            }
                            messages={chatInfo.messages.map((item) => ({
                                text: item.text,
                                origin: item.origin,
                            }))}
                        />
                        {network.type !== 'READY' &&
                            chatInfo.hasUnreadMessages && (
                                <h2 className={cn.reminder}>
                                    Go online to see new messages
                                </h2>
                            )}
                        <div className={cn.input}>
                            <ChatInput
                                offline={network.type !== 'READY'}
                                onSubmit={sendMessage}
                            />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
