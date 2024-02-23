import { stringToArrayBuffer } from '../arraybuffer-utils';

type OperationTemplate<T, D> = {
    type: T;
    data: D;
};

type Operation =
    | OperationTemplate<'append-byte', number>
    | OperationTemplate<'append-uint16', number>
    | OperationTemplate<'append-uint64', number>
    | OperationTemplate<'append-string', { src: string; skipLength: boolean }>
    | OperationTemplate<
          'append-buffer',
          { src: ArrayBuffer; skipLength: boolean }
      >;

export class BufferBuilder {
    private operations: Operation[] = [];
    private bufferSize = 0;

    appendByte(value: number): BufferBuilder {
        this.operations.push({ type: 'append-byte', data: value });
        this.bufferSize += 1;

        return this;
    }

    appendUint16(num: number): BufferBuilder {
        this.operations.push({ type: 'append-uint16', data: num });
        this.bufferSize += 2;

        return this;
    }

    appendUint64(num: number): BufferBuilder {
        this.operations.push({ type: 'append-uint64', data: num });
        this.bufferSize += 8;

        return this;
    }

    appendString(str: string, skipLength?: 'SKIP_LENGTH'): BufferBuilder {
        this.operations.push({
            type: 'append-string',
            data: { src: str, skipLength: !!skipLength },
        });
        if (!skipLength) this.bufferSize += 2;
        this.bufferSize += str.length;

        return this;
    }

    appendBuffer(data: ArrayBuffer, skipLength?: 'SKIP_LENGTH'): BufferBuilder {
        this.operations.push({
            type: 'append-buffer',
            data: { src: data, skipLength: !!skipLength },
        });
        if (!skipLength) this.bufferSize += 2;
        this.bufferSize += data.byteLength;

        return this;
    }

    getBuffer() {
        const buffer = new ArrayBuffer(this.bufferSize);

        const bytes = new Uint8Array(buffer);
        let cursor = 0;

        for (const operation of this.operations) {
            switch (operation.type) {
                case 'append-byte':
                    bytes[cursor++] = operation.data;

                    break;

                case 'append-uint16': {
                    this.writeUint16(bytes, cursor, operation.data);
                    cursor += 2;

                    break;
                }

                case 'append-uint64': {
                    const data = BigUint64Array.from([BigInt(operation.data)]);
                    bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), cursor);

                    cursor += 8;

                    break;
                }

                case 'append-string': {
                    if (!operation.data.skipLength) {
                        this.writeUint16(
                            bytes,
                            cursor,
                            operation.data.src.length,
                        );
                        cursor += 2;
                    }

                    const serialized = stringToArrayBuffer(operation.data.src);

                    bytes.set(new Uint8Array(serialized), cursor);
                    cursor += serialized.byteLength;

                    break;
                }

                case 'append-buffer': {
                    if (!operation.data.skipLength) {
                        this.writeUint16(
                            bytes,
                            cursor,
                            operation.data.src.byteLength,
                        );
                        cursor += 2;
                    }

                    bytes.set(new Uint8Array(operation.data.src), cursor);
                    cursor += operation.data.src.byteLength;

                    break;
                }
            }
        }

        return buffer;
    }

    getCurrentSize() {
        return this.bufferSize;
    }

    private writeUint16(buffer: Uint8Array, offset: number, value: number) {
        if (value > 255 * 256)
            throw new Error(`${value} is more than 2 bytes long`);

        const arr = Uint16Array.from([value]);

        buffer.set(
            new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength),
            offset,
        );
    }
}
