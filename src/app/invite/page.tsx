'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import cn from './page.module.scss';
import { FormProvider, useController } from '@schematic-forms/react';
import { Str } from '@schematic-forms/core';
import { FormInput } from '@/src/components/form/form-input.component';
import { Button } from '@/src/components/button/button.component';
import { useNetwork, useStorage } from '@/src/model/hooks';
import { RSAEncryptionKey } from '@/src/helpers/crypto/rsa/rsa-encryption-key.class';
import { base64ToArrayBuffer } from '@/src/helpers/arraybuffer-utils';
import Link from 'next/link';
import { useNotifications } from '@/src/services/hooks';

export default function Invite() {
    const search = useSearchParams();
    const router = useRouter();
    const [, storage] = useStorage();
    const [, network] = useNetwork();

    const name = useMemo(() => {
        return search.get('name') ?? null;
    }, [search]);

    const keyParam = useMemo(() => {
        const param = search.get('key');

        if (!param) return null;

        return param.replaceAll(' ', '+');
    }, [search]);

    const { controller, submit } = useController({
        fields: {
            name: Str(true, name ?? undefined),
            from: Str(true),
        },
        async submit(data) {
            if (!keyParam) return;

            const networkState = network.getState();
            const storageState = storage.getState();

            if (storageState.type !== 'READY') return;

            let chat;

            if (networkState.type !== 'READY') {
                const { chat: Chat } = await network.init(
                    storageState.connections,
                    storageState.published,
                    storageState.common,
                );
                chat = Chat;
            } else if (networkState.type === 'READY') {
                chat = networkState.chat;
            } else {
                return;
            }

            const rsaKey = await RSAEncryptionKey.fromSPKI(
                base64ToArrayBuffer(keyParam),
            );

            const { id: connectionID } = await chat.sendConnectionRequest(
                rsaKey,
                data.from,
            );

            const { id: chatID } = storageState.chats.createChat(
                data.name,
                connectionID,
            );

            router.push(`/chat?id=${chatID}`);
        },
    });

    return (
        <main className={cn.root}>
            <FormProvider controller={controller}>
                <form
                    className={cn.container}
                    onSubmit={(e) => (e.preventDefault(), submit())}
                >
                    <Link href={'/'} className={cn.home}>
                        <Button icon="arrow-back" color="orange" size="small">
                            Home
                        </Button>
                    </Link>
                    <h1>Connection form</h1>
                    <FormInput placeholder="Chat name" field="name" />
                    <FormInput placeholder="Sender" field="from" />
                    <Button submit color="orange">
                        Connect
                    </Button>
                </form>
            </FormProvider>
        </main>
    );
}
