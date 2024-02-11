import { Meta, StoryFn } from '@storybook/react';

import { generateQRCode } from './generate-qr-code';
import { useEffect, useState } from 'react';

const meta: Meta = {
    title: 'QR Code',
};

export default meta;

export const TextToQRCode: StoryFn<{ data: string }> = ({ data }) => {
    const [codeURL, setCodeURL] = useState<string | null>();

    useEffect(() => {
        if (!data) return;

        let mounted = true;

        generateQRCode(data)
            .then((url) => {
                if (mounted) setCodeURL(url);
                else URL.revokeObjectURL(url);
            })
            .catch(() => alert('Error'));

        return () => {
            mounted = false;
        };
    }, [data]);

    useEffect(() => {
        if (!codeURL) return;

        return () => {
            URL.revokeObjectURL(codeURL);
        };
    }, [codeURL]);

    return (
        <div>
            {codeURL ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                <img src={codeURL} />
            ) : (
                'Loading...'
            )}
        </div>
    );
};

TextToQRCode.args = {
    data: 'https://google.com',
};
