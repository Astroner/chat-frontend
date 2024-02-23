import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../helpers/arraybuffer-utils';

import { StorageEnv } from './storage.class';

const LOCAL_STORAGE_KEY = 'memes_and_prekols';

export type SmartStorageType = 'EXTERNAL' | 'LOCAL_STORAGE';

export class SmartStorage implements StorageEnv {
    private listeners = new Set<VoidFunction>();

    private externalData: null | ArrayBuffer = null;

    constructor(private type: SmartStorageType = 'EXTERNAL') {}

    async setStorageType(nextType: SmartStorageType) {
        if (nextType === this.type) return;

        if (nextType === 'EXTERNAL') {
            const loaded = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!loaded) {
                this.externalData = null;
                return;
            }

            this.externalData = base64ToArrayBuffer(loaded);
        } else {
            this.externalData &&
                localStorage.setItem(
                    LOCAL_STORAGE_KEY,
                    arrayBufferToBase64(this.externalData),
                );
        }

        this.listeners.forEach((cb) => cb());
    }

    async hasData(): Promise<boolean> {
        if (this.type === 'EXTERNAL') {
            return !!this.externalData;
        } else {
            return !!localStorage.getItem(LOCAL_STORAGE_KEY);
        }
    }

    async save(data: ArrayBuffer): Promise<void> {
        if (this.type === 'EXTERNAL') {
            this.externalData = data;
        } else {
            localStorage.setItem(LOCAL_STORAGE_KEY, arrayBufferToBase64(data));
        }
    }

    async load(): Promise<ArrayBuffer> {
        if (this.type === 'EXTERNAL') {
            return this.externalData!;
        } else {
            return base64ToArrayBuffer(
                localStorage.getItem(LOCAL_STORAGE_KEY)!,
            );
        }
    }

    getType() {
        return this.type;
    }

    subscribe(cb: VoidFunction) {
        this.listeners.add(cb);

        return {
            unsubscribe: () => this.listeners.delete(cb),
        };
    }
}
