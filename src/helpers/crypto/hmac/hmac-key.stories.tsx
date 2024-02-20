import { useState } from 'react';

import { Meta, StoryFn } from '@storybook/react';

import { HMACKey } from './hmac-key.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    stringToArrayBuffer,
} from '../../arraybuffer-utils';
import {
    FieldConsumer,
    FormProvider,
    useController,
} from '@schematic-forms/react';
import { Str } from '@schematic-forms/core';
import { ECDHKey } from '../ecdh/ecdh-key.class';

const meta: Meta = {
    title: 'Crypto/HMAC key',
};

export default meta;

export const IssueKey: StoryFn = () => {
    const [key, setKey] = useState('');

    const generate = async () => {
        const key = await HMACKey.generate();

        setKey(arrayBufferToBase64(await key.toRawBytes()));
    };

    return (
        <div>
            <button onClick={generate}>Generate</button>
            {key && (
                <div>
                    <h3>Key</h3>
                    {key}
                </div>
            )}
        </div>
    );
};

export const DeriveFromECDH: StoryFn = () => {
    const [key, setKey] = useState('');

    const { controller, submit } = useController({
        fields: {
            publicKey: Str(true),
            privateKey: Str(true),
        },
        async submit(form) {
            const pub = await ECDHKey.fromSPKI(
                base64ToArrayBuffer(form.publicKey),
            );

            const pr = await ECDHKey.fromPKCS8(
                base64ToArrayBuffer(form.privateKey),
            );

            const key = await HMACKey.fromECDH(pub, pr);

            setKey(arrayBufferToBase64(await key.toRawBytes()));
        },
    });

    return (
        <FormProvider controller={controller}>
            <form onSubmit={(e) => (e.preventDefault(), submit())}>
                <div>
                    <FieldConsumer field="publicKey">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="Public ECDH key in SPKI base64"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="privateKey">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="Private ECDH key in PKCS8 base64"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <button type="submit">Derive</button>
                </div>
            </form>
            {key && (
                <div>
                    <h3>Key</h3>
                    {key}
                </div>
            )}
        </FormProvider>
    );
};

export const SignData: StoryFn = () => {
    const [signature, setSignature] = useState('');

    const { controller, submit } = useController({
        fields: {
            key: Str(true),
            data: Str(true),
        },
        async submit(form) {
            const key = await HMACKey.fromRawBytes(
                base64ToArrayBuffer(form.key),
            );

            const signature = await key.sign(stringToArrayBuffer(form.data));

            setSignature(arrayBufferToBase64(signature));
        },
    });

    return (
        <FormProvider controller={controller}>
            <form onSubmit={(e) => (e.preventDefault(), submit())}>
                <div>
                    <FieldConsumer field="key">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="HMAC base64 encoded key"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="data">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="Data"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <button type="submit">Sign</button>
                </div>
            </form>
            {signature && (
                <div>
                    <h3>Signature</h3>
                    {signature}
                </div>
            )}
        </FormProvider>
    );
};

export const VerifySignature: StoryFn = () => {
    const [result, setResult] = useState('');

    const { controller, submit } = useController({
        fields: {
            key: Str(true),
            data: Str(true),
            signature: Str(true),
        },
        async submit(form) {
            const key = await HMACKey.fromRawBytes(
                base64ToArrayBuffer(form.key),
            );

            const signature = base64ToArrayBuffer(form.signature);

            const result = await key.verify(
                signature,
                stringToArrayBuffer(form.data),
            );

            setResult(result ? 'VERIFIED' : 'FAILED');
        },
    });

    return (
        <FormProvider controller={controller}>
            <form onSubmit={(e) => (e.preventDefault(), submit())}>
                <div>
                    <FieldConsumer field="key">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="HMAC base64 encoded key"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="data">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="Data"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="signature">
                        {({ value, setValue }) => (
                            <textarea
                                placeholder="Signature in base64"
                                value={value ?? ''}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        )}
                    </FieldConsumer>
                </div>
                <div>
                    <button type="submit">Verify</button>
                </div>
            </form>
            {result && (
                <div>
                    <h3>Result</h3>
                    {result}
                </div>
            )}
        </FormProvider>
    );
};
