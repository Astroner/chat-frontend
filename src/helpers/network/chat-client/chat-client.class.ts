import { RSAEncryptionKey } from '../../crypto/rsa/rsa-encryption-key.class';
import {
    ProtocolClient,
    ProtocolClientEvent,
} from '../protocol-client/protocol-client.class';
import { ConnectionsManager } from '../../storage/connections-manager/connections-manager.class';
import { AesGcmKey } from '../../crypto/aes-gcm/aes-gcm-key.class';
import { EventListener, EventTemplate, Subscription } from '../../types';
import { PublishedKeysManager } from '../../storage/published-keys-manager/published-keys-manager.class';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import { ECDHKey } from '../../crypto/ecdh/ecdh-key.class';
import { EstablishedConnection } from '../../storage/connections-manager/connections-manager.types';
import { HMACKey } from '../../crypto/hmac/hmac-key.class';
import { SignsIndex } from '../../crypto/signs-index/signs-index.class';

export type ChatClientEvent =
    | EventTemplate<
          'message',
          {
              id: string;
              message: string;
          }
      >
    | EventTemplate<
          'connectionEstablished',
          {
              id: string;
              aesKey: AesGcmKey;
              hmacKey: HMACKey;
          }
      >
    | EventTemplate<
          'connectionDeclined',
          {
              id: string;
          }
      >
    | EventTemplate<
          'newPendingConnection',
          {
              id: string;
              from: string;
          }
      >;

export class ChatClient {
    private listeners = new Set<EventListener<ChatClientEvent>>();

    private protocolSub: Subscription | null = null;

    constructor(
        private protocolClient: ProtocolClient,
        private connectionsManager: ConnectionsManager,
        private publishedKeysManager: PublishedKeysManager,
        private keysIndex: KeysIndex,
        private signsIndex: SignsIndex,
    ) {}

    init() {
        this.protocolSub = this.protocolClient.addEventListener(
            this.protocolHandler.bind(this),
        );
    }

    destroy() {
        this.protocolSub?.unsubscribe();
    }

    async sendConnectionRequest(key: RSAEncryptionKey, from: string) {
        const request =
            await this.connectionsManager.createNewConnectionRequest();

        this.protocolClient.postMessage(
            {
                type: 'connectionRequest',
                from,
                ecdhPublicKey: request.ecdhPublicKey,
                responseRSA: request.rsaPublicKey,
            },
            key,
        );

        return {
            id: request.id,
        };
    }

    sendMessage(connection: EstablishedConnection, message: string) {
        this.protocolClient.postMessage(
            {
                type: 'message',
                message,
            },
            connection.aesKey,
            connection.hmacKey,
        );
    }

    async acceptConnection(connectionID: string) {
        const connection = this.connectionsManager.getConnection(connectionID);
        if (!connection || !connection.isPending()) return;

        const { privateKey, publicKey } = await ECDHKey.generatePair();

        await connection.accept(privateKey);

        this.protocolClient.postMessage(
            {
                type: 'connectionRequestAccept',
                ecdhPublicKey: publicKey,
            },
            connection.responseRSA,
        );
    }

    async declineConnection(connectionID: string) {
        const connection = this.connectionsManager.getConnection(connectionID);
        if (!connection || !connection.isPending()) return;

        connection.destroy();

        this.protocolClient.postMessage(
            {
                type: 'connectionRequestDecline',
            },
            connection.responseRSA,
        );
    }

    addEventListener(handler: EventListener<ChatClientEvent>): Subscription {
        this.listeners.add(handler);

        return {
            unsubscribe: () => this.listeners.delete(handler),
        };
    }

    private async protocolHandler(event: ProtocolClientEvent) {
        switch (event.type) {
            case 'connectionRequest': {
                const keyInfo = this.publishedKeysManager.getKeyInfo(
                    event.keyID,
                );
                if (!keyInfo) return;
                this.publishedKeysManager.registerKeyUsage(keyInfo.id);

                const { id } = this.connectionsManager.createPendingConnection(
                    event.ecdhPublicKey,
                    event.responseRSA,
                    event.from,
                );

                this.sendEvent({
                    type: 'newPendingConnection',
                    id,
                    from: event.from,
                });

                break;
            }

            case 'connectionRequestAccept': {
                const connection = this.connectionsManager.getConnection(
                    event.keyID,
                );
                if (!connection || !connection.isRequested()) return;

                const { aesKey, hmacKey } = await connection.confirm(
                    event.ecdhPublicKey,
                );

                this.protocolClient.postMessage(
                    {
                        type: 'connectionEstablished',
                    },
                    aesKey,
                    hmacKey,
                );

                break;
            }

            case 'connectionEstablished': {
                const connection = this.connectionsManager.getConnection(
                    event.keyID,
                );
                if (!connection || !connection.isPreEstablished()) return;

                connection.finish();

                this.protocolClient.postMessage(
                    {
                        type: 'connectionEstablishedConfirm',
                    },
                    connection.aesKey,
                    connection.hmacKey,
                );

                this.sendEvent({
                    type: 'connectionEstablished',
                    id: event.keyID,
                    aesKey: connection.aesKey,
                    hmacKey: connection.hmacKey,
                });

                break;
            }

            case 'connectionEstablishedConfirm': {
                const connection = this.connectionsManager.getConnection(
                    event.keyID,
                );
                if (!connection || !connection.isPreEstablished()) return;

                connection.finish();

                this.sendEvent({
                    type: 'connectionEstablished',
                    id: event.keyID,
                    aesKey: connection.aesKey,
                    hmacKey: connection.hmacKey,
                });

                break;
            }

            case 'connectionRequestDecline': {
                const connection = this.connectionsManager.getConnection(
                    event.keyID,
                );

                if (!connection || !connection.isRequested()) return;

                this.connectionsManager.deleteConnection(event.keyID);

                this.sendEvent({
                    type: 'connectionDeclined',
                    id: event.keyID,
                });

                break;
            }

            case 'message': {
                const connection = this.connectionsManager.getConnection(
                    event.keyID,
                );
                if (!connection || !connection.isEstablished()) return;

                this.sendEvent({
                    type: 'message',
                    id: event.keyID,
                    message: event.message,
                });

                break;
            }

            case 'signature-mismatch': {
                console.error(event);

                break;
            }
        }
    }

    private sendEvent(ev: ChatClientEvent) {
        this.listeners.forEach((cb) => cb(ev));
    }
}
