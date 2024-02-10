import { Meta, StoryFn } from "@storybook/react";

import { KeysIndex } from "./keys-index.class"
import { useMemo, useState } from "react";
import { FieldConsumer, FormProvider, useController } from "@schematic-forms/react";
import { Enum, Str } from "@schematic-forms/core";
import { EncryptionKey } from "../crypto.types";
import { AesGcmKey } from "../aes-gcm/aes-gcm-key.class";
import { RSAEncryptionKey } from "../rsa/rsa-encryption-key.class";
import { arrayBufferToString, base64ToArrayBuffer,  } from "../../arraybuffer-utils";

const meta: Meta = {
    title: "Crypto/Keys Index",
}

export default meta;

export const Default: StoryFn = () => {
    const [storedKeys, setStoredKeys] = useState<string[]>([]);

    const index = useMemo(() => new KeysIndex(), []);

    const [searchResult, setSearchResult] = useState<{ key: string, data: string } | null>(null);

    const { controller: AddController, submit: AddKey } = useController({
        fields: {
            id: Str(true),
            keyType: Enum(["RSA-OAEP", "AES-GCM"] as ["RSA-OAEP", "AES-GCM"], true, "RSA-OAEP"),
            key: Str(true),
        },
        async submit(data) {
            let key: EncryptionKey;

            switch(data.keyType) {
                case "AES-GCM":
                    key = await AesGcmKey.fromJSON(data.key);
                    break;
                
                case "RSA-OAEP":
                    key = await RSAEncryptionKey.fromJSON(data.key);
            }

            index.addKey(data.id, key);
            setStoredKeys(p => p.concat([data.id]))
        }
    })

    const { controller: IndexController, submit: TryToDecrypt } = useController({
        fields: {
            cipher: Str(true),
        },
        async submit(data) {
            try {
                setSearchResult(null)
                const result = await index.tryToDecrypt(base64ToArrayBuffer(data.cipher));
                if(!result) return {
                    cipher: "NOPE"
                };

                setSearchResult({
                    key: result.keyID,
                    data: arrayBufferToString(result.data)
                })
            } catch(e) {
                return {
                    cipher: "No Keys found"
                }
            }
        }
    })

    return (
        <div>
            <div>
                <h3>Add key</h3>
                <FormProvider controller={AddController}>
                    <div>
                        <FieldConsumer field="id">
                            {({ value, setValue }) => <input placeholder="ID" value={value} onChange={e => setValue(e.target.value)} />}
                        </FieldConsumer>
                    </div>
                    <div>
                        <FieldConsumer field="keyType">
                            {({ value, setValue }) => (
                                <select value={value} onChange={e => setValue(e.target.value)}>
                                    <option value="RSA-OAEP">RSA-OAEP</option>
                                    <option value="AES-GCM">AES-GCM</option>
                                </select>
                            )}
                        </FieldConsumer>
                    </div>
                    <div>
                        <FieldConsumer field="key">
                            {({ value, setValue }) => <textarea placeholder="JWK" value={value} onChange={e => setValue(e.target.value)} />}
                        </FieldConsumer>
                    </div>
                    <div>
                        <button onClick={AddKey}>Add</button>
                    </div>
                </FormProvider>
            </div>
            <div>
                <h3>Stored keys:</h3>
                {
                    storedKeys.length === 0
                    ? "Empty"
                    : <ul>
                        {storedKeys.map(item => <li key={item}>{item}</li>)}
                    </ul>
                }
            </div>
            <div>
                <h3>Try to get key</h3>
                <FormProvider controller={IndexController}>
                    <FieldConsumer field="cipher">
                        {({ value, setValue, error }) => (
                            <div>
                                <textarea placeholder="Cipher" value={value} onChange={e => setValue(e.target.value)} />
                                {error && <div>{error}</div>}
                            </div>
                        )}
                    </FieldConsumer>
                    <button onClick={TryToDecrypt}>Decrypt</button>
                </FormProvider>
                {searchResult && (
                    <div>
                        <h3>Result</h3>
                        <div>Key: {searchResult.key}</div>
                        <div>Data: {searchResult.data}</div>
                    </div>
                )}
            </div>
        </div>
    )
}