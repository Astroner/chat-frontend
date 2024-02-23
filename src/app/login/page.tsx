'use client';

import { useState } from 'react';
import { usePromiseCall } from '@dogonis/hooks';
import { useRouter, useSearchParams } from 'next/navigation';

import { useStorage } from '@/src/model/hooks';

import { Input } from '@/src/components/input/input.component';
import { Button } from '@/src/components/button/button.component';

import cn from './page.module.scss';

export default function Login() {
    const router = useRouter();
    const [, storage] = useStorage();

    const [input, setInput] = useState('');
    const [confirm, setConfirm] = useState('');

    const [loading, hasEntry] = usePromiseCall(() => storage.hasEntry(), []);

    const submit = async () => {
        if (loading) return;

        if (!hasEntry && input !== confirm) return;

        await storage.init(input);

        if (location.search.includes('next')) {
            const [, next] = location.search.split('next');

            router.push(next.slice(1));
        } else {
            router.push('/');
        }
    };

    return (
        <main className={cn.root}>
            <div className={cn.container}>
                <form onSubmit={(e) => (e.preventDefault(), submit())}>
                    <h1>{!loading && hasEntry ? 'Login' : 'Sign up'}</h1>
                    <Input
                        password
                        placeholder="Password"
                        value={input}
                        onChange={setInput}
                    />
                    {!loading && !hasEntry && (
                        <Input
                            password
                            placeholder="Confirm password"
                            value={confirm}
                            onChange={setConfirm}
                        />
                    )}
                    <Button submit color="orange">
                        Enter
                    </Button>
                </form>
                <div style={{ marginTop: 30 }}>
                    <Button submit color="orange">
                        Import Session
                    </Button>
                    <Button submit color="orange">
                        Create External Session
                    </Button>
                </div>
            </div>
        </main>
    );
}
