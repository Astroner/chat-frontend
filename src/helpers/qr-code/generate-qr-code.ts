import { toDataURL } from 'qrcode';

export const generateQRCode = async (data: string) => {
    const url = await toDataURL(data, {
        errorCorrectionLevel: 'M',
    });

    return url;
};
