import { Meta, StoryObj } from '@storybook/react';

import { generateQRCode } from './generate-qr-code';
import { useEffect, useState } from 'react';

const meta: Meta = {
    title: 'QR Code',
};

export default meta;

export const TextToQRCode: StoryObj<{ data: string }> = {
    render: ({ data }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [codeURL, setCodeURL] = useState<string | null>();

        // eslint-disable-next-line react-hooks/rules-of-hooks
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

        // eslint-disable-next-line react-hooks/rules-of-hooks
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
    },
    args: {
        data: 'https://google.com',
    },
};
