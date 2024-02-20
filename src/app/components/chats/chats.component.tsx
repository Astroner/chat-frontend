import { useNetwork, useStorage } from "@/src/model/hooks";
import Link from "next/link";
import { FC, memo, useEffect, useState } from "react";


export type ChatsProps = {

}

export const Chats: FC<ChatsProps> = memo(props => {
    const [storage] = useStorage();
    
    const [chats, setChats] = useState(() => {
        if(storage.type !== "READY") return null;

        return storage.chats.getAll()
    })

    useEffect(() => {
        if(storage.type !== "READY") return;

        const sub = storage.chats.subscribe(() => setChats(storage.chats.getAll()))

        return () => {
            sub.unsubscribe();
        }
    }, [storage])


    if(!chats) return;
    return (
        <div>
            {chats.map(chat => (
                <Link href={`/chat?id=${chat.id}`} key={chat.id}>{chat.title}</Link>
            ))}
        </div>
    )
})