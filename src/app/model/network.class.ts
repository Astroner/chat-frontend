import { KeysIndex } from '@/src/helpers/crypto/keys-index/keys-index.class';
import { ChatClient } from '@/src/helpers/network/chat-client/chat-client.class';
import { Connection } from '@/src/helpers/network/connection/connection.class';
import { HTTPClient } from '@/src/helpers/network/http-client/http-client.class';
import { ProtocolClient } from '@/src/helpers/network/protocol-client/protocol-client.class';
import { ConnectionsManager } from '@/src/helpers/storage/connections-manager/connections-manager.class';
import { PublishedKeysManager } from '@/src/helpers/storage/published-keys-manager/published-keys-manager.class';

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
    ) {}

    async init(
        connections: ConnectionsManager,
        publishedKeys: PublishedKeysManager,
    ) {
        this.setState({ type: 'CONNECTING' });
        const connection = new Connection(this.wsAddress);

        await connection.connect();

        const protocol = new ProtocolClient(connection, this.keysIndex);
        protocol.init();

        const chatClient = new ChatClient(
            protocol,
            connections,
            publishedKeys,
            this.keysIndex,
        );

        chatClient.init();

        this.setState({
            type: 'READY',
            chat: chatClient,
            http: new HTTPClient(this.httpUrl),
            protocol,
            socket: connection,
        });
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
