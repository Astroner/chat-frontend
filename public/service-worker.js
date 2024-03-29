const base64ToArrayBuffer = (src) => {
    try {
        const raw = atob(src);

        const bytes = Uint8Array.from(
            raw.split('').map((char) => char.charCodeAt(0)),
        );

        return bytes;
    } catch (e) {
        return null;
    }
};
/**
 * @type {Promise<void> | boolean}
 */
let initialized = false;

/**
 * @type {Map<string, { id: string, key: CryptoKey, bytes: Uint8Array }>}
 */
const keys = new Map();

const importKeys = async () => {
    const decoder = new TextDecoder();

    const storage = await caches.open('v1');

    try {
        const res = await storage.match('memes');

        if (!res) return;

        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let cursor = 0;

        const itemsNumber = bytes[cursor++];

        const initialKeys = await Promise.all(
            new Array(itemsNumber)
                .fill(null)
                .map(() => {
                    const idLength = bytes[cursor++];

                    const id = decoder.decode(
                        buffer.slice(cursor, cursor + idLength),
                    );
                    cursor += idLength;

                    const keyLength = new Uint16Array(
                        buffer.slice(cursor, cursor + 2),
                    );
                    cursor += 2;

                    const keyMaterial = buffer.slice(
                        cursor,
                        cursor + keyLength,
                    );
                    cursor += keyLength;

                    return {
                        id,
                        keyMaterial,
                    };
                })
                .map(async (item) => {
                    const key = await crypto.subtle.importKey(
                        'raw',
                        item.keyMaterial,
                        { name: 'HMAC', hash: 'SHA-256' },
                        false,
                        ['sign', 'verify'],
                    );

                    return {
                        id: item.id,
                        bytes: new Uint8Array(item.keyMaterial),
                        key,
                    };
                }),
        );

        for (const key of initialKeys) {
            keys.set(key.id, key);
        }
    } catch (e) {
        console.error(e);
        // BAD/TODO: Instead of resetting keys, try to ask main thread to repeat keys
        storage.delete('memes');
    }
};

const updateStorage = async () => {
    const encoder = new TextEncoder();

    const storage = await caches.open('v1');

    let bufferLength = 1;
    for (const key of keys.values()) {
        bufferLength += 1 + key.id.length;
        bufferLength += 2 + key.bytes.length;
    }

    const bytes = new Uint8Array(bufferLength);
    let cursor = 0;

    bytes[cursor++] = keys.size;

    for (const key of keys.values()) {
        bytes[cursor++] = key.id.length;
        bytes.set(encoder.encode(key.id), cursor);
        cursor += key.id.length;

        bytes.set(
            new Uint8Array(Uint16Array.from([key.bytes.length]).buffer),
            cursor,
        );
        cursor += 2;

        bytes.set(key.bytes, cursor);
        cursor += key.bytes.byteLength;
    }

    await storage.put('memes', new Response(bytes));
};

/**
 * @type {Set<string>}
 */
const calledKeys = new Set();

const importCalledKeys = async () => {
    const storage = await caches.open('v1');

    const res = await storage.match('prekols');

    if (!res) return;

    for (const key of await res.json()) {
        calledKeys.add(key);
    }
};

const updateCalledKeys = async () => {
    const storage = await caches.open('v1');

    await storage.put(
        'prekols',
        new Response(JSON.stringify(Array.from(calledKeys.values()))),
    );
};

const initialize = async () => {
    if (!initialized) {
        initialized = Promise.all([importKeys(), importCalledKeys()]);

        await initialized;

        initialized = true;
    } else if (initialized instanceof Promise) {
        await initialized;
    }

    return;
};

self.addEventListener('install', async () => {
    initialize();
});

let notificationsEnabled = true;
let notificationResetTimeout = null;

let calledKeysWereRetrieved = false;

self.addEventListener('message', async (event) => {
    const { data } = event;
    await initialize();

    switch (data.type) {
        case 'add-key':
            const bytes = await crypto.subtle.exportKey('raw', data.key);
            keys.set(data.id, {
                id: data.id,
                key: data.key,
                bytes: new Uint8Array(bytes),
            });

            updateStorage();

            break;

        case 'delete-key':
            keys.delete(data.id);

            updateStorage();

            break;

        case 'delete-all':
            keys.clear();

            updateStorage();

            break;

        case 'disable-notifications':
            notificationsEnabled = false;
            if (notificationResetTimeout) {
                clearTimeout(notificationResetTimeout);
                notificationResetTimeout = null;
            }
            notificationResetTimeout = setTimeout(() => {
                notificationsEnabled = true;
                notificationResetTimeout = null;
            }, 22);

            break;

        case 'enable-notifications':
            notificationsEnabled = true;
            if (notificationResetTimeout) {
                clearTimeout(notificationResetTimeout);
                notificationResetTimeout = null;
            }

            break;

        case 'get-called-keys':
            event.ports[0].postMessage({
                type: 'called-keys',
                keys: Array.from(calledKeys.values()),
            });
            calledKeysWereRetrieved = true;

            calledKeys.clear();
            await updateCalledKeys();

            break;
    }
});

self.addEventListener('push', async (event) => {
    event.waitUntil(
        Promise.resolve().then(async () => {
            if (!notificationsEnabled) return;

            await initialize();

            if (keys.size === 0) return;

            const message = event.data?.text();

            if (!message) return;

            const buffer = base64ToArrayBuffer(message);

            if (!buffer) return;

            const hasSignature = buffer[0];

            if (!hasSignature) return;

            let cursor = 1;
            const signatureLength = new Uint16Array(
                buffer.buffer.slice(cursor, cursor + 2),
            )[0];
            cursor += 2;

            if (cursor + signatureLength >= buffer.byteLength) return;

            const signature = buffer.buffer.slice(
                cursor,
                cursor + signatureLength,
            );
            cursor += signatureLength;

            const dataLength = new Uint16Array(
                buffer.buffer.slice(cursor, cursor + 2),
            )[0];
            cursor += 2;

            if (cursor + dataLength > buffer.byteLength) return;

            const data = buffer.buffer.slice(cursor, cursor + dataLength);

            try {
                const id = await Promise.any(
                    Array.from(keys.values()).map(async ({ key, id }) => {
                        const result = await crypto.subtle.verify(
                            'HMAC',
                            key,
                            signature,
                            data,
                        );

                        if (!result) throw new Error('Failed');

                        return id;
                    }),
                );

                if (
                    (await clients.matchAll({ includeUncontrolled: true }))
                        .length === 0
                ) {
                    calledKeys.add(id);
                    await updateCalledKeys();
                }
            } catch {
                return;
            }

            self.registration.showNotification('New message');
        }),
    );
});

self.addEventListener('notificationclick', async (event) => {
    event.notification.close();

    event.waitUntil(
        Promise.all([
            clients.matchAll({
                includeUncontrolled: true,
            }),
            self.registration.getNotifications(),
        ]).then(async ([allClients, notifications]) => {
            if (allClients.length === 0) {
                await clients.openWindow('/login');
            } else {
                allClients[0].focus();
            }

            for (const notification of notifications) {
                notification.close();
            }
        }),
    );
});
