import { useRef, useState } from 'react';
import { Meta } from '@storybook/react';

import { RSAEncryptionKey } from './rsa-encryption-key.class';
import { arrayBufferToHex, hexToArrayBuffer } from '../arraybuffer-utils';

const meta: Meta = {
    title: 'RSA Encryption Key Class',
};

export const RSAKeysIssuing = () => {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const issue = async () => {
        setIsLoading(true);
        const { privateKey, publicKey } = await RSAEncryptionKey.generatePair();

        const [pr, pub] = await Promise.all([
            privateKey.toJSON(),
            publicKey.toJSON(),
        ]);

        setPrivateKey(pr);
        setPublicKey(pub);
        setIsLoading(false);
    };

    return (
        <div>
            <button onClick={issue}>Issue keys pair</button>
            {isLoading && <div>Loading...</div>}
            <div>
                {publicKey && (
                    <div>
                        <h3>Public:</h3>
                        <div>{publicKey}</div>
                    </div>
                )}
            </div>
            <div>
                {privateKey && (
                    <div>
                        <h3>Private:</h3>
                        <div>{privateKey}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const RSAEncryptDecrypt = () => {
    const keyRef = useRef<HTMLTextAreaElement>(null);
    const dataRef = useRef<HTMLTextAreaElement>(null);

    const [result, setResult] = useState<string | 'LOADING' | null>(null);

    const encrypt = async () => {
        if (!keyRef.current || !dataRef.current) return;

        const data = dataRef.current.value;
        const key = keyRef.current.value;

        const rsaKey = await RSAEncryptionKey.fromJSON(key);

        setResult('LOADING');

        setResult(
            arrayBufferToHex(
                await rsaKey.encrypt(new TextEncoder().encode(data)),
            ),
        );
    };

    const decrypt = async () => {
        if (!keyRef.current || !dataRef.current) return;

        const data = dataRef.current.value;
        const key = keyRef.current.value;

        const rsaKey = await RSAEncryptionKey.fromJSON(key);

        setResult('LOADING');

        setResult(
            new TextDecoder().decode(
                await rsaKey.decrypt(hexToArrayBuffer(data)),
            ),
        );
    };

    return (
        <div>
            <textarea
                ref={keyRef}
                style={{ display: 'block' }}
                placeholder="RSA Web Json Key"
            />
            <textarea
                ref={dataRef}
                style={{ display: 'block' }}
                placeholder="Data"
            />
            <div>
                <button onClick={encrypt}>Encrypt</button>
                <button onClick={decrypt}>Decrypt</button>
            </div>
            {result && (
                <div>
                    <h3>Result</h3>
                    <div>{result}</div>
                </div>
            )}
        </div>
    );
};

export default meta;
