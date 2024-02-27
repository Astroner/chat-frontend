export type ChatMessage = {
    origin: 'SERVER' | 'CLIENT';
    text: string;
};

export type ChatInfo = {
    id: string;
    title: string;
    connectionID: string;
    state: 'ACTIVE' | 'PENDING';
    messages: ChatMessage[];
    pushNotifications: boolean;
};

export class ChatStorage {
    private listeners = new Set<VoidFunction>();

    private chats = new Map<string, ChatInfo>();

    private connectionIDToChatID = new Map<string, string>();

    constructor(inits?: ChatInfo[]) {
        if (inits)
            for (const info of inits) {
                this.chats.set(info.id, info);

                this.connectionIDToChatID.set(info.connectionID, info.id);
            }
    }

    createChat(title: string, connectionID: string): Readonly<ChatInfo> {
        const id = crypto.randomUUID();

        const chat: ChatInfo = {
            id,
            messages: [],
            title,
            connectionID,
            state: 'PENDING',
            pushNotifications: false
        };

        this.connectionIDToChatID.set(connectionID, id);

        this.chats.set(id, chat);

        this.sendUpdate();

        return chat;
    }

    setChatData(
        chatId: string,
        changeRequest: Partial<ChatInfo> | ((prev: ChatInfo) => ChatInfo),
    ) {
        const info = this.chats.get(chatId);

        if (!info) return;

        let nextState;
        if (typeof changeRequest === 'function') {
            nextState = changeRequest(info);
        } else {
            nextState = Object.assign({}, info, changeRequest);
        }

        this.chats.set(chatId, nextState);

        this.sendUpdate();
    }

    getChat(id: string): Readonly<ChatInfo> | null {
        return this.chats.get(id) ?? null;
    }

    getAll(): ReadonlyArray<ChatInfo> {
        return Array.from(this.chats.values());
    }

    getByConnectionID(connectionID: string): Readonly<ChatInfo> | null {
        const chatID = this.connectionIDToChatID.get(connectionID);
        if (!chatID) return null;

        return this.chats.get(chatID) ?? null;
    }

    deleteChat(id: string) {
        this.chats.delete(id);

        this.sendUpdate();
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    private sendUpdate() {
        this.listeners.forEach((cb) => cb());
    }
}
