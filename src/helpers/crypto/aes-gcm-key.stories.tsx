import { FC, useState } from "react";

import { Meta } from "@storybook/react";

import { AesGcmKey } from "./aes-gcm-key.class"
import { FieldConsumer, FormProvider, useController } from "@schematic-forms/react";
import { Str } from "@schematic-forms/core";
import { arrayBufferToHex, arrayBufferToString, hexToArrayBuffer, stringToArrayBuffer } from "../arraybuffer-utils";

const meta: Meta = {
    title: "AES-GCM Key",
}

export default meta;


export const IssueKey = () => {

    const [key, setKey] = useState<string>();

    const generate = async () => {
        const key = await AesGcmKey.generate();

        setKey(await key.toJSON());
    }

    return (
        <div>
            <button onClick={generate}>Issue a key</button>
            {key && (
                <div>
                    <h3>Key</h3>
                    {key}
                </div>
            )}
        </div>
    )
}

export const DeriveFromPassword = () => {
    const [password, setPassword] = useState<string>("");

    const [result, setResult] = useState<string>();

    const generate = async () => {
        if(!password) return;

        const salt = Uint8Array.from([124, 158, 73, 238, 216, 204, 48, 8, 30, 52, 65, 251, 13, 175, 32, 141]);
        
        const key = await AesGcmKey.fromPassword(password, salt);

        setResult(await key.toJSON());
    }

    return (
        <div>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={generate}>Generate</button>
            {result && (
                <div>
                    <h3>Result</h3>
                    {result}
                </div>
            )}
        </div>
    )
}

export const EncryptDecrypt: FC = () => {
    const [result, setResult] = useState<string>();

    const { controller, submit } = useController({
        fields: {
            input: Str(true),
            key: Str(true)
        },
        submit: async (data, mode: "E" | "D") => {
            const key = await AesGcmKey.fromJSON(data.key);

            if(mode === "E") {
                setResult(arrayBufferToHex(await key.encrypt(stringToArrayBuffer(data.input))));
                return;
            }

            setResult(arrayBufferToString(await key.decrypt(hexToArrayBuffer(data.input))));
        }
    })

    return (
        <FormProvider controller={controller}>
            <div>
                <FieldConsumer field="input">
                    {({ value, setValue }) => <textarea placeholder="Input" value={value} onChange={e => setValue(e.target.value)} />}
                </FieldConsumer>
            </div>
            <div>
                <FieldConsumer field="key">
                    {({ value, setValue }) => <textarea placeholder="JWK AES-GCM Key" value={value} onChange={e => setValue(e.target.value)} />}
                </FieldConsumer>
            </div>
            <div>
                <button onClick={() => submit("E")}>Encrypt</button>
                <button onClick={() => submit("D")}>Decrypt</button>
            </div>
            {result && (
                <div>
                    <h3>Result</h3>
                    {result}
                </div>
            )}
        </FormProvider>
    )
}