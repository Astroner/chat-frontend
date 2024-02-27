import Axios, { Axios as AxiosT, isAxiosError } from 'axios';

import { Contact } from './http-client.responses';
import {
    arrayBufferToBlob,
    stringToArrayBuffer,
} from '../../arraybuffer-utils';
import { SigningKey } from '../../crypto/crypto.types';
import { BufferReader } from '../../buffer-read-write/buffer-reader.class';

export class HTTPClient {
    private axios: AxiosT;

    constructor(baseURL: string) {
        this.axios = Axios.create({ baseURL });
    }

    async postNewContact(contact: Contact): Promise<void> {
        await this.axios.post('/contacts/create', contact);
    }

    async searchContact(name: string) {
        try {
            const result = await this.axios.post<Contact>('/contacts/find', {
                name,
            });

            return result;
        } catch (e) {
            if (!isAxiosError(e) || !e.response) throw e;

            if (e.response.status === 404) return null;

            throw e;
        }
    }

    async updateContact(
        name: string,
        update: Partial<Contact>,
        key: SigningKey,
    ) {
        const updateData = [];
        for (const value of Object.values(update)) {
            updateData.push(value);
        }

        if (updateData.length === 0) throw new Error('Nothing to update');

        const dataString = updateData.join('');

        const signature = await key.createSignature(
            stringToArrayBuffer(dataString),
        );

        const formData = new FormData();
        formData.append('name', name);
        formData.append('update', JSON.stringify(update));
        formData.append('signature', arrayBufferToBlob(signature));

        await this.axios.patch('/contacts/patch', formData);
    }

    async deleteContact(name: string, signingKey: SigningKey) {
        const signature = await signingKey.createSignature(
            stringToArrayBuffer(name),
        );
        const blob = arrayBufferToBlob(signature);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('signature', blob);

        await this.axios.delete('/contacts/delete', {
            data: formData,
        });
    }

    async getMessages(fromTimestamp?: number, toTimestamp?: number) {
        const { data } = await this.axios.get<ArrayBuffer>('/messages/all', {
            params: {
                from: fromTimestamp,
                to: toTimestamp,
            },
            responseType: 'arraybuffer',
        });

        const reader = new BufferReader(data);

        const messagesNumber = reader.readUint16();

        const messages = new Array(messagesNumber).fill(null).map(() => {
            const timestamp = reader.readUint64();
            const data = reader.readBytes();

            return {
                timestamp,
                data,
            };
        });

        return messages;
    }

    async addPushSubscription(endpoint: string, key: string, auth: string) {
        const { data } = await this.axios.post<{ id: string }>(
            '/subscription',
            {
                endpoint,
                key,
                auth,
            },
        );

        return data;
    }
}
