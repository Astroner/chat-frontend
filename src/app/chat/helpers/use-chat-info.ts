import { useEffect, useMemo, useState } from "react";

import { ChatInfo, ChatStorage } from "@/src/helpers/storage/chat-storage.class";
import { useStorage } from "@/src/model/hooks";
import { ConnectionsManager } from "@/src/helpers/storage/connections-manager/connections-manager.class";

export const useChatInfo = (chatID: string | null, mock?: ChatInfo) => {
    const [storage] = useStorage();

    const [info, setInfo] = useState(() => {
        if(mock) return mock;

        if(storage.type !== "READY" || !chatID) return null;

        return storage.chats.getChat(chatID);
    })

    const result = useMemo<[ChatInfo, ChatStorage, ConnectionsManager] | [null, null, null]>(() => {
        if(!info || storage.type !== "READY") return [null, null, null];

        return [info, storage.chats, storage.connections]
    }, [info, storage]);

    useEffect(() => {
        if(storage.type !== "READY" || !chatID || mock) return;

        setInfo(storage.chats.getChat(chatID));

        const sub = storage.chats.subscribe(() => setInfo(storage.chats.getChat(chatID)))

        return () => {
            sub.unsubscribe();
        }
    }, [chatID, mock, storage])


    return result;
}