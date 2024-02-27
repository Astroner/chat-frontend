export const arrayBufferToBlob = (src: ArrayBuffer) => {
    return new Blob([src]);
};

const encoder = new TextEncoder();
export const stringToArrayBuffer = (src: string) => encoder.encode(src).buffer;

const decoder = new TextDecoder();
export const arrayBufferToString = (src: ArrayBuffer) => decoder.decode(src);

export const arrayBufferToReadableStream = (src: ArrayBuffer) =>
    new ReadableStream({
        type: 'bytes',
        start(controller) {
            controller.enqueue(new Uint8Array(src));
            controller.close();
        },
    });

export const readableStreamToArrayBuffer = async (
    stream: ReadableStream<Uint8Array>,
): Promise<ArrayBuffer> => {
    const reader = stream.getReader();

    let result: Uint8Array | null = null;

    let red;
    do {
        red = await reader.read();
        if (red.value) {
            if (!result) result = red.value;
            else {
                const merged: Uint8Array = new Uint8Array(
                    result.byteLength + red.value.byteLength,
                );
                merged.set(result, 0);
                merged.set(red.value, result.byteLength);

                result = merged;
            }
        }
    } while (!red.done);

    if (!result) throw new Error('Failed to read');

    return result.buffer;
};

export const arrayBufferToBase64 = (src: ArrayBuffer) => {
    var base64 = '';
    var encodings =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var bytes = new Uint8Array(src);
    var byteLength = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63; // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4; // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2; // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
};

export const base64ToArrayBuffer = (src: string) => {
    const raw = atob(src);

    const bytes = Uint8Array.from(
        raw.split('').map((char) => char.charCodeAt(0)),
    );

    return bytes.buffer;
};

