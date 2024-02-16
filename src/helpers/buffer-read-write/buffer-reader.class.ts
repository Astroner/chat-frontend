import { arrayBufferToString } from "../arraybuffer-utils";

export class BufferReader {
    private bytes: Uint8Array;

    private cursor = 0;

    constructor(
        private buffer: ArrayBuffer
    ) {
        this.bytes = new Uint8Array(buffer);
    }

    readByte() {
        const result = this.bytes.at(this.cursor++);

        if(typeof result === "undefined") throw new Error("Out of bounds");

        return result;
    }

    readUint16() {
        const arr = new Uint16Array(this.buffer.slice(this.cursor, this.cursor + 2));
        const result = arr.at(0);

        if(typeof result === "undefined") throw new Error("Out of bounds");

        this.cursor += 2;

        return result;
    }

    readString(length?: number) {
        const dataLength = length ?? this.readUint16();
        const arr = new Uint8Array(this.buffer, this.cursor, dataLength);

        this.cursor += arr.byteLength;

        return arrayBufferToString(arr);
    }

    readBytes(length?: number) {
        const dataLength = length ?? this.readUint16();

        const buffer = this.buffer.slice(this.cursor, this.cursor + dataLength);

        this.cursor += dataLength;

        return buffer;
    }

    getCursor() {
        return this.cursor;
    }
}