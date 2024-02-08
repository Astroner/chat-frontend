export const arrayBufferToHex = (src: ArrayBuffer) => {
    return Array.from(new Uint8Array(src))
        .map((n) => {
            const code = n.toString(16);
            
            return code.length < 2 ? "0" + code : code;
        })
        .join("");
}

export const hexToArrayBuffer = (src: string) => {
    const chars = src.split("");

    const signatureBytes: number[] = []

    while(chars.length > 0) {
        const byte = chars.splice(0, 2).join("");

        signatureBytes.push(parseInt(byte, 16));
    }

    const signatureBuffer = Uint8Array.from(signatureBytes);

    return signatureBuffer;
}

export const arrayBufferToBlob = (src: ArrayBuffer) => {
    return new Blob([src])
}


const encoder = new TextEncoder();
export const stringToArrayBuffer = (src: string) => encoder.encode(src);


const decoder = new TextDecoder();
export const arrayBufferToString = (src: ArrayBuffer) => decoder.decode(src);