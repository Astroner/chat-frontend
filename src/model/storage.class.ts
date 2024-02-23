import {
    arrayBufferToString,
    stringToArrayBuffer,
} from '@/src/helpers/arraybuffer-utils';
import { BufferBuilder } from '@/src/helpers/buffer-read-write/buffer-builder.class';
import { BufferReader } from '@/src/helpers/buffer-read-write/buffer-reader.class';
import { GZip } from '@/src/helpers/compression/gzip.class';
import { AesGcmKey } from '@/src/helpers/crypto/aes-gcm/aes-gcm-key.class';
import { KeysIndex } from '@/src/helpers/crypto/keys-index/keys-index.class';
import { ChatStorage } from '@/src/helpers/storage/chat-storage.class';
import { ConnectionsManager } from '@/src/helpers/storage/connections-manager/connections-manager.class';
import { PublishedKeysManager } from '@/src/helpers/storage/published-keys-manager/published-keys-manager.class';
import { Subscription, joinSubs } from '@/src/helpers/types';
import { SignsIndex } from '../helpers/crypto/signs-index/signs-index.class';
import { CommonStorage } from '../helpers/storage/common-storage.class';

export type StorageState =
    | { type: 'IDLE' }
    | { type: 'LOADING' }
    | {
          type: 'READY';
          chats: ChatStorage;
          connections: ConnectionsManager;
          published: PublishedKeysManager;
          common: CommonStorage;
      };

export type StorageEnv = {
    hasData(): Promise<boolean>;
    save(data: ArrayBuffer): Promise<void>;
    load(): Promise<ArrayBuffer>;
};

export class Storage {
    static PASSWORD_SALT = Uint8Array.from([
        124, 158, 73, 238, 216, 204, 48, 8, 30, 52, 65, 251, 13, 175, 32, 141,
    ]);

    private listeners = new Set<VoidFunction>();

    private sub: Subscription | null = null;

    private state: StorageState = { type: 'IDLE' };

    constructor(
        private env: StorageEnv,
        private keysIndex: KeysIndex,
        private signsIndex: SignsIndex,
        private gzip: GZip,
    ) {}

    async init(password: string) {
        this.setState({ type: 'LOADING' });

        const aesKey = await AesGcmKey.fromPassword(
            password,
            Storage.PASSWORD_SALT,
        );

        let chats: ChatStorage;
        let connections: ConnectionsManager;
        let published: PublishedKeysManager;
        let common: CommonStorage;

        if (await this.env.hasData()) {
            const cipher = await this.env.load();

            const serializedData = await aesKey.decrypt(cipher);

            const reader = new BufferReader(serializedData);

            const chatsData = reader.readBytes();
            const connectionsData = reader.readBytes();
            const publishedData = reader.readBytes();
            const commonData = reader.readBytes();

            const [ch, con, pubs, com] = await Promise.all([
                this.gzip
                    .decompress(chatsData)
                    .then(
                        (data) =>
                            new ChatStorage(
                                JSON.parse(arrayBufferToString(data)),
                            ),
                    ),
                ConnectionsManager.import(connectionsData),
                PublishedKeysManager.import(publishedData, this.keysIndex),
                CommonStorage.import(commonData)
            ]);

            chats = ch;
            connections = con;
            published = pubs;
            common = com;
        } else {
            chats = new ChatStorage();
            connections = new ConnectionsManager();
            published = new PublishedKeysManager(this.keysIndex);
            common = new CommonStorage();
        }

        for (const { id, privateKey } of published.getAll()) {
            this.keysIndex.addKey(id, privateKey);
        }

        for (const { key, connection } of connections.getAll()) {
            switch (connection.status) {
                case 'requested':
                    this.keysIndex.addKey(
                        key,
                        connection.responseRSAPrivateKey,
                    );

                    break;

                case 'established':
                case 'preEstablished':
                    this.keysIndex.addKey(key, connection.aesKey);
                    this.signsIndex.addKey(key, connection.hmacKey);

                    break;
            }
        }

        const dataToStore = {
            chats: await this.gzip.compress(
                stringToArrayBuffer(JSON.stringify(chats.getAll())),
            ),
            connections: await connections.export(),
            published: await published.export(),
            common: await common.export()
        };

        const save = async () => {
            const builder = new BufferBuilder();

            builder.appendBuffer(dataToStore.chats);
            builder.appendBuffer(dataToStore.connections);
            builder.appendBuffer(dataToStore.published);
            builder.appendBuffer(dataToStore.common);

            const cipher = await aesKey.encrypt(builder.getBuffer());

            await this.env.save(cipher);
        };

        this.sub = joinSubs(
            chats.subscribe(async () => {
                dataToStore.chats = await this.gzip.compress(
                    stringToArrayBuffer(JSON.stringify(chats.getAll())),
                );
                save();
            }),
            connections.subscribe(async () => {
                dataToStore.connections = await connections.export();
                save();
            }),
            published.subscribe(async () => {
                dataToStore.published = await published.export();
                save();
            }),
            common.subscribe(async () => {
                dataToStore.common = await common.export();
                save();
            }),
        );

        await save();

        this.setState({
            type: 'READY',
            chats,
            connections,
            published,
            common
        });

        return {
            type: 'READY',
            chats,
            connections,
            published,
            common
        };
    }

    async hasEntry() {
        return this.env.hasData();
    }

    getState(): Readonly<StorageState> {
        return this.state;
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }

    destroy() {
        this.sub?.unsubscribe();
        this.setState({ type: 'IDLE' });
    }

    private setState(state: StorageState) {
        this.state = state;
        this.listeners.forEach((cb) => cb());
    }
}
