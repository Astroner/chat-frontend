import {
    arrayBufferToReadableStream,
    readableStreamToArrayBuffer,
} from '../arraybuffer-utils';

export class GZip {
    compress(data: ArrayBuffer) {
        return readableStreamToArrayBuffer(
            arrayBufferToReadableStream(data).pipeThrough<Uint8Array>(
                new CompressionStream('gzip'),
            ),
        );
    }

    decompress(data: ArrayBuffer) {
        return readableStreamToArrayBuffer(
            arrayBufferToReadableStream(data).pipeThrough(
                new DecompressionStream('gzip'),
            ),
        );
    }
}
