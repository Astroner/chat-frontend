import { Meta, StoryFn } from "@storybook/react";
import { useMemo, useState } from "react";

import { GZip } from "./gzip.class"
import { arrayBufferToBase64, arrayBufferToString, base64ToArrayBuffer, stringToArrayBuffer } from "../arraybuffer-utils";

const meta: Meta = {
    title: "GZip Class",
}

export default meta;

export const Compress: StoryFn<{ inputFormat: "Base64" | "Text" }> = (args) => {
    const gzip = useMemo(() => new GZip(), []);

    const [value, setValue] = useState("");
    const [result, setResult] = useState("");
    const [compressionInfo, setCompressionInfo] = useState<{ original: number, compressed: number } | null>(null)

    const compress = async () => {
        if(!value) return;

        const original = value.length;

        const buffer = args.inputFormat === "Base64"
            ? base64ToArrayBuffer(value)
            : stringToArrayBuffer(value);


        const compressed = arrayBufferToBase64(await gzip.compress(buffer));


        setCompressionInfo({
            original,
            compressed: compressed.length
        })
        setResult((compressed));
    }

    return (
        <div>
            <textarea 
                placeholder={args.inputFormat === "Base64" ? "Binary Data in Base64" : "Text"} value={value} onChange={e => setValue(e.target.value)} />
            <div>
                <button onClick={compress}>Compress</button>
            </div>
            {compressionInfo && (
                <div>
                    Original: {compressionInfo.original}, Compressed: {compressionInfo.compressed}
                </div>
            )}
            {result && (
                <div>
                    <h3>Result</h3>
                    {result}
                </div>
            )}
        </div>
    )
}

Compress.argTypes = {
    inputFormat: {
        type: {
            name: "enum",
            value: ["Base64", "Text"],
        },
    }
}
Compress.args = {
    inputFormat: "Base64"
}

export const Decompress: StoryFn<{ outputFormat: "Base64" | "Text" }> = (args) => {
    const gzip = useMemo(() => new GZip(), []);

    const [value, setValue] = useState("");
    const [result, setResult] = useState("");

    const decompress = async () => {
        if(!value) return;

        const decompressed = await gzip.decompress(base64ToArrayBuffer(value));

        setResult(
            args.outputFormat === "Base64"
            ? arrayBufferToBase64(decompressed)
            : arrayBufferToString(decompressed)
        )
    }

    return (
        <div>
            <textarea placeholder="Compressed Data" value={value} onChange={e => setValue(e.target.value)} />
            <div>
                <button onClick={decompress}>Decompress</button>
            </div>
            {result && (
                <div>
                    <h3>Result</h3>
                    {result}
                </div>
            )}
        </div>
    )
}
Decompress.argTypes = {
    outputFormat: {
        type: {
            name: "enum",
            value: ["Base64", "Text"],
        },
    }
}
Decompress.args = {
    outputFormat: "Base64"
}