"use client"

import { useEffect, useState } from 'react';

import { useStorage } from '@/src/model/hooks';

import cn from './page.module.scss';
import Link from 'next/link';
import { ButtonLink } from '@/src/components/button-link/button-link.component';
import { Button } from '@/src/components/button/button.component';

export default function Keys() {
    const [storage] = useStorage();

    const [keys, setKeys] = useState(() => {
        if(storage.type !== "READY") return null;

        return storage.published.getAll();
    }) 

    useEffect(() => {
        if(storage.type !== "READY") return

        const sub = storage.published.subscribe(() => setKeys(storage.published.getAll()))

        return () => {
            sub.unsubscribe();
        }
    }, [storage])

    if(!keys) return null;

    return (
        <main className={cn.root}>
            <ButtonLink href='/' color='orange' size='small' icon='arrow-back'>Home</ButtonLink>
            <h1>Issued Invites</h1>
            <ul>
                {keys.map(key => (
                    <li key={key.id}>
                        <Link href={`/key?id=${key.id}`}>{key.name}</Link>
                        <Button icon='close' />
                    </li>
                ))}
            </ul>
        </main>
    )
}
