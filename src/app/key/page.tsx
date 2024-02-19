'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { arrayBufferToBase64 } from '@/src/helpers/arraybuffer-utils';
import { generateQRCode } from '@/src/helpers/qr-code/generate-qr-code';
import { useStorage } from '@/src/model/hooks';
import { Button } from '@/src/components/button/button.component';

import cn from './page.module.scss';

export default function Key() {
    const [storageState] = useStorage();
    const params = useSearchParams();

    const [inviteUrl, setInviteUrl] = useState<string | null>();
    const [qr, setQr] = useState<null | string>();

    const info = useMemo(() => {
        const id = params.get('id');

        if (storageState.type !== 'READY' || !id) return null;

        return storageState.published.getKeyInfo(id);
    }, [params, storageState]);

    const copy = useCallback(() => {
        if (!inviteUrl) return;

        navigator.clipboard.writeText(inviteUrl);
    }, [inviteUrl]);

    useEffect(() => {
        if (!info) return;

        let mounted = true;

        info.publicKey.toSPKI().then((value) => {
            if (!mounted) return;

            setInviteUrl(
                `${location.origin}/invite?name=${info.name}&key=${arrayBufferToBase64(value)}`,
            );
        });

        return () => {
            mounted = false;
        };
    }, [info]);

    useEffect(() => {
        if (!inviteUrl) return;

        let mounted = true;

        generateQRCode(inviteUrl).then((qr) => {
            if (mounted) setQr(qr);
        });

        return () => {
            mounted = false;
        };
    }, [inviteUrl]);

    if (!info) return null;

    return (
        <main className={cn.root}>
            {qr && inviteUrl && (
                <div className={cn.content}>
                    <Link href="/">
                        <Button
                            className={cn.back}
                            color="orange"
                            icon="arrow-back"
                            size="small"
                        >
                            home
                        </Button>
                    </Link>
                    <h1>{info.name}</h1>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img style={{ width: '100%' }} src={qr} alt={inviteUrl} />
                    <div className={cn.url}>
                        <div className={cn.url__link}>{inviteUrl}</div>
                        <Button color="orange" onClick={copy}>
                            Copy URL
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}
