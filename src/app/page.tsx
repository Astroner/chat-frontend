"use client"

import { FormEvent, useContext, useEffect, useMemo, useRef, useState } from "react";
import { env } from "../env";


export default function Home() {
    const textArea = useRef<HTMLTextAreaElement>(null);

    const [messages, setMessages] = useState<string[]>([]);

    const [ws, setWS] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(env.WS_ADDRESS);
        setWS(ws);

        return () => {
            setWS(null);
            ws.close();
        }
    }, [])

    useEffect(() => {
        if(!ws) return;
        (async () => {
            const { privateKey, publicKey } = await window.crypto.subtle.generateKey(
                {
                  name: "RSA-OAEP",
                  modulusLength: 4096,
                  publicExponent: new Uint8Array([1, 0, 1]),
                  hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"],
            );

            const message = "ssss";

            const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, new TextEncoder().encode(message));

            const decrypt = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);


            console.log(new TextDecoder().decode(decrypt));
        })()

        const handler = (message: MessageEvent) => {
            setMessages(p => p.concat([`[SERVER] ${new Date(message.timeStamp).toISOString()} : ${message.data}`]))
        }

        ws.addEventListener("message", handler);

        return () => {
            ws.removeEventListener("message", handler)
        }
    }, [ws])

    const send = (e: FormEvent) => {
        e.preventDefault();
        if(!textArea.current || !ws || textArea.current.value.length === 0) return;

        const message = textArea.current.value;
        textArea.current.value = "";
        ws.send(message);
        setMessages(p => p.concat([`[CLIENT] ${new Date().toISOString()} : ${message}`]))
    }

    return (
        <>
            <form onSubmit={send}>
                <textarea ref={textArea}>
                
                </textarea>
                <input type="submit" value="Send"></input>
            </form>
            <ul>
                {messages.map((message, i) => (
                    <li key={i}>
                        {message}
                    </li>
                ))}
            </ul>
        </>
    );
}
