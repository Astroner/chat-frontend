'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import cn from './page.module.scss';
import { FormProvider, useController } from '@schematic-forms/react';
import { Str } from '@schematic-forms/core';
import { FormInput } from '@/src/components/form/form-input.component';
import { Button } from '@/src/components/button/button.component';
import { useNetwork, useStorage } from '@/src/model/hooks';
import { RSAEncryptionKey } from '@/src/helpers/crypto/rsa/rsa-encryption-key.class';
import { base64ToArrayBuffer } from '@/src/helpers/arraybuffer-utils';

export default function Invite() {
    const search = useSearchParams();
    const [, storage] = useStorage();
    const [, network] = useNetwork();

    const name = useMemo(() => {
        return search.get('name') ?? null;
    }, [search]);

    const key = useMemo(() => {
        return search.get('key') ?? null;
    }, [search]);

    const { controller, submit } = useController({
        fields: {
            name: Str(true, name ?? undefined),
            from: Str(true),
        },
        async submit(data) {
            if (!key) return;

            const networkState = network.getState();
            const storageState = storage.getState();

            if (storageState.type !== 'READY') return;

            let chat;

            if (networkState.type !== 'READY') {
                const { chat: Chat } = await network.init(
                    storageState.connections,
                    storageState.published,
                );
                chat = Chat;
            } else if (networkState.type === 'READY') {
                chat = networkState.chat;
            } else {
                return;
            }

            const rsaKey = await RSAEncryptionKey.fromSPKI(
                base64ToArrayBuffer(key),
            );

            const { id: connectionID } = await chat.sendConnectionRequest(
                rsaKey,
                data.from,
            );

            storageState.chats.createChat(data.name, connectionID);

            // HERE
            // FIX PROBLEM WITH INCORRECT KEY FROM URL
        },
    });

    return (
        <main className={cn.root}>
            <FormProvider controller={controller}>
                <form
                    className={cn.container}
                    onSubmit={(e) => (e.preventDefault(), submit())}
                >
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
