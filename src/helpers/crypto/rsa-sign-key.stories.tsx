import { Meta } from "@storybook/react";

import { RSASignKey } from "./rsa-sign-key.class"
import { useRef, useState } from "react";
import { arrayBufferToHex, hexToArrayBuffer } from "../arraybuffer-utils";

const meta: Meta<typeof RSASignKey> = {
    title: "RSA Key Sign Class",
}

export default meta;


export const RSAKeysIssuing = () => {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const issue = async () => {
        setIsLoading(true);
        const { privateKey, publicKey } = await RSASignKey.generatePair();

        const [pr, pub] = await Promise.all([
            privateKey.toJSON(), 
            publicKey.toJSON()
        ])

        setPrivateKey(pr)
        setPublicKey(pub)
        setIsLoading(false);
    }

    return (
        <div>
            <button onClick={issue}>
                Issue keys pair
            </button>
            {isLoading && <div>Loading...</div>}
            <div>
                {publicKey && (
                    <div>
                        <h3>Public:</h3>
                        <div>
                            {publicKey}
                        </div>
                    </div>
                )}
            </div>
            <div>
                {privateKey && (
                    <div>
                        <h3>Private:</h3>
                        <div>
                            {privateKey}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export const GetSignature = () => {

    const keyRef = useRef<HTMLTextAreaElement>(null);
    const dataRef = useRef<HTMLTextAreaElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);

    const getSignature = async () => {
        if(!keyRef.current?.value || !dataRef.current?.value) return;

        setIsLoading(true);

        const key = await RSASignKey.fromJSON(keyRef.current.value);

        setSignature(arrayBufferToHex(await key.createSignature(new TextEncoder().encode(dataRef.current.value))))
        setIsLoading(false);
    }

    return (
        <div>
            <div>
                <textarea ref={keyRef} placeholder="Private key in JWK" />
                <textarea ref={dataRef} placeholder="Data" />
            </div>
            <button onClick={getSignature}>Get Signature</button>
            {isLoading && "Loading..."}
            {signature && (
                <div>
                    <h3>Signature</h3>
                    <p>{signature}</p>
                </div>
            )}
        </div>
    )
}

export const VerifySignature = () => {

    const keyRef = useRef<HTMLTextAreaElement>(null);
    const dataRef = useRef<HTMLTextAreaElement>(null);
    const signatureRef = useRef<HTMLTextAreaElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);

    const verify = async () => {
        if(!keyRef.current?.value || !dataRef.current?.value || !signatureRef.current?.value) return;

        setIsLoading(true);

        const key = await RSASignKey.fromJSON(keyRef.current.value);

        setSignature(await key.verify(new TextEncoder().encode(dataRef.current.value), hexToArrayBuffer(signatureRef.current.value)) ? "TRUE" : "FALSE")
        setIsLoading(false);
    }

    return (
        <div>
            <div>
                <textarea ref={keyRef} placeholder="Public key in JWK" />
                <textarea ref={dataRef} placeholder="Data" />
                <textarea ref={signatureRef} placeholder="Signature" />
            </div>
            <button onClick={verify}>Verify Signature</button>
            {isLoading && "Loading..."}
            {signature && (
                <div>
                    <h3>Signature</h3>
                    <p>{signature}</p>
                </div>
            )}
        </div>
    )
}