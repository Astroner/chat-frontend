import { Meta } from '@storybook/react';
import { useEffect, useRef, useState } from 'react';

import { Connection, ConnectionEvent } from './connection.class';
import { arrayBufferToBase64 } from '../../arraybuffer-utils';

const meta: Meta = {
    title: 'Network/WebSocket connection',
};

export const SimpleConnection = () => {
    const inputRef = useRef<HTMLInputElement>(null);

    const [addr, setAddr] = useState('');
    const [state, setState] = useState<ConnectionEvent['type'] | 'IDLE'>(
        'IDLE',
    );
    const [connection, setConnection] = useState<Connection | null>(null);
    const [messages, setMessages] = useState<
        Array<{
            timestamp: number;
            message: string;
            origin: 'SERVER' | 'CLIENT';
        }>
    >([]);

    const connect = () => {
        if (!addr) return;

        setConnection(new Connection(addr));
    };

    const sendMessage = () => {
        if (!inputRef.current || !inputRef.current.value || !connection) return;

        const message = inputRef.current.value;
        inputRef.current.value = '';

        if (connection.sendMessage(message))
            setMessages((p) =>
                p.concat([
                    { message, origin: 'CLIENT', timestamp: Date.now() },
                ]),
            );
    };

    useEffect(() => {
        if (!connection) return;

        setState('CONNECTING');
        connection.connect();

        const sub = connection.addEventListener(async (ev) => {
            switch (ev.type) {
                case 'MESSAGE':
                    let message: string;

                    switch (ev.data.type) {
                        case 'arrayBuffer':
                            message = `[ARRAY_BUFFER] ${arrayBufferToBase64(await ev.data.data)}`;
                            break;

                        case 'string':
                            message = `[STRING] ${ev.data.data}`;
                    }

                    setMessages((p) =>
                        p.concat([
                            {
                                origin: 'SERVER',
                                message,
                                timestamp: ev.timestamp,
                            },
                        ]),
                    );
                    break;

                default:
                    setState(ev.type);
                    break;
            }
        });

        return () => {
            sub.unsubscribe();
            connection.destroy();
        };
    }, [connection]);

    return (
        <div>
            <form onSubmit={(e) => (e.preventDefault(), connect())}>
                <label>
                    Websocket Address:
                    <input
                        value={addr}
                        onChange={(e) => setAddr(e.target.value)}
                    />
                </label>
                <button type="submit">Connect</button>
            </form>
            <div>Status: {state}</div>
            {state === 'CONNECTED' && (
                <form onSubmit={(e) => (e.preventDefault(), sendMessage())}>
                    <label>
                        Message:
                        <input ref={inputRef} placeholder="Message" />
                        <button type="submit">Submit</button>
                    </label>
                </form>
            )}
            <ul>
                {messages.map((item, i) => (
                    <li key={i}>{`[${item.origin}] ${item.message}`}</li>
                ))}
            </ul>
        </div>
    );
};

export default meta;
