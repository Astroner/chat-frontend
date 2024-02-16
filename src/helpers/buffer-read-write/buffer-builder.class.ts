import { stringToArrayBuffer } from '../arraybuffer-utils';

export class BufferBuilder {
    private buffer: ArrayBuffer;
    private bytes: Uint8Array;

    private cursor = 0;

    constructor(private maxSize: number) {
        this.buffer = new ArrayBuffer(maxSize);
        this.bytes = new Uint8Array(this.buffer);
    }

    appendByte(value: number) {
        if (this.cursor + 1 > this.maxSize) {
            throw new Error(`Out of bounds`);
        }

        this.bytes[this.cursor++] = value;
    }

    appendUint16(num: number) {
        if (num > 255 * 256)
            throw new Error(`${num} is more than 2 bytes long`);

        if (this.cursor + 2 > this.maxSize) {
            throw new Error(`Out of bounds`);
        }

        const arr = Uint16Array.from([num]);

        this.bytes.set(
            new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength),
            this.cursor,
        );

        this.cursor += 2;
    }

    appendString(str: string, skipLength?: 'SKIP_LENGTH') {
        if (!skipLength) {
            this.appendUint16(str.length);
        }

        const serialized = stringToArrayBuffer(str);

        if (this.cursor + serialized.byteLength > this.maxSize) {
            throw new Error(`Out of bounds`);
        }

        this.bytes.set(serialized, this.cursor);

        this.cursor += serialized.byteLength;
    }

    appendBuffer(data: ArrayBuffer, skipLength?: 'SKIP_LENGTH') {
        if (!skipLength) {
            this.appendUint16(data.byteLength);
        }

        if (this.cursor + data.byteLength > this.maxSize) {
            throw new Error(`Out of bounds`);
        }

        const bytes = new Uint8Array(data);

        this.bytes.set(bytes, this.cursor);
        this.cursor += data.byteLength;
    }

    getBuffer() {
        return this.buffer;
    }

    getCursor() {
        return this.cursor;
    }

    getMaxSize() {
        return this.maxSize;
    }
}
