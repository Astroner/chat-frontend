import { Meta, StoryFn } from '@storybook/react';

import { ECDHKey } from './ecdh-key.class';
import { useState } from 'react';
import { arrayBufferToBase64 } from '../../arraybuffer-utils';

const meta: Meta = {
    title: 'Crypto/ECDH Key',
};

export default meta;

export const IssuePair: StoryFn<{ format: 'JWK' | 'Base64' }> = ({
    format,
}) => {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const issue = async () => {
        setIsLoading(true);
        const { privateKey, publicKey } = await ECDHKey.generatePair();

        const [pr, pub] =
            format === 'JWK'
                ? await Promise.all([privateKey.toJSON(), publicKey.toJSON()])
                : await Promise.all([
                      privateKey.toPKCS8().then(arrayBufferToBase64),
                      publicKey.toSPKI().then(arrayBufferToBase64),
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

IssuePair.argTypes = {
    format: {
        type: {
            name: 'enum',
            value: ['JWK', 'Base64'],
        },
    },
};

IssuePair.args = {
    format: 'JWK',
};
