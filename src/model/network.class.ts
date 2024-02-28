import { KeysIndex } from '@/src/helpers/crypto/keys-index/keys-index.class';
import { ChatClient } from '@/src/helpers/network/chat-client/chat-client.class';
import { Connection } from '@/src/helpers/network/connection/connection.class';
import { HTTPClient } from '@/src/helpers/network/http-client/http-client.class';
import { ProtocolClient } from '@/src/helpers/network/protocol-client/protocol-client.class';
import { ConnectionsManager } from '@/src/helpers/storage/connections-manager/connections-manager.class';
import { PublishedKeysManager } from '@/src/helpers/storage/published-keys-manager/published-keys-manager.class';
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';
import { getHash } from '../helpers/crypto/hash/get-hash';
import { CommonStorage } from '../helpers/storage/common-storage.class';

export type NetworkState =
    | { type: 'IDLE' }
    | { type: 'CONNECTING' }
    | {
          type: 'READY';
          socket: Connection;
          protocol: ProtocolClient;
          chat: ChatClient;
          http: HTTPClient;
      };

export class Network {
    private listeners = new Set<VoidFunction>();

    private state: NetworkState = { type: 'IDLE' };

    constructor(
        private wsAddress: string,
        private httpUrl: string,
        private keysIndex: KeysIndex,
        private signsIndex: SignsIndex,
    ) {}

    async init(
        connections: ConnectionsManager,
        publishedKeys: PublishedKeysManager,
        common: CommonStorage,
    ) {
        const start = Date.now();

        this.setState({ type: 'CONNECTING' });
        const connection = new Connection(this.wsAddress);

        await connection.connect();

        const protocol = new ProtocolClient(
            connection,
            this.keysIndex,
            this.signsIndex,
            common,
        );
        protocol.init();

        const chatClient = new ChatClient(
            protocol,
            connections,
            publishedKeys,
            this.keysIndex,
            this.signsIndex,
        );

        chatClient.init();

        const http = new HTTPClient(this.httpUrl);

        const lastMessage = common.getData().lastMessage;
        

        if (lastMessage) {
            const messages = await http.getMessages(
                lastMessage.timestamp - 2000,
                start,
            );

            const lastMessageCodes = new BigUint64Array(lastMessage.hash);

            try {
                const lastMessageIndex = await Promise.any(messages.map(async (item, i) => {
                    const hash = await getHash(item.data);
    
                    const messageCodes = new BigUint64Array(hash);
    
                    const isDifferent = messageCodes.find((item, i) => item !== lastMessageCodes[i]);
    
                    if(!!isDifferent) throw new Error("")
    
                    return i;
                }))

                const newMessages = messages.slice(lastMessageIndex + 1);

                for (const message of newMessages) {
                    protocol.dispatchMessage(
                        Number(message.timestamp),
                        message.data,
                    );
                }
            } catch(e) {
                throw new Error('Could not find starting message'); // TODO request from wider range
            }
        }

        this.setState({
            type: 'READY',
            chat: chatClient,
            http,
            protocol,
            socket: connection,
        });

        return {
            type: 'READY',
            chat: chatClient,
            http: new HTTPClient(this.httpUrl),
            protocol,
            socket: connection,
        };
    }

    getState(): Readonly<NetworkState> {
        return this.state;
    }

    async destroy() {
        if (this.state.type !== 'READY') return;

        this.state.chat.destroy();
        this.state.protocol.destroy();
        await this.state.socket.destroy();

        this.setState({ type: 'IDLE' });
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    private setState(state: NetworkState) {
        this.state = state;
        this.listeners.forEach((cb) => cb());
    }
}
