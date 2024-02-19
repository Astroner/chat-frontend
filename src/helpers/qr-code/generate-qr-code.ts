import { toDataURL } from 'qrcode';

export const generateQRCode = async (data: string) => {
    const url = await toDataURL(data, {
        errorCorrectionLevel: 'L',
        color: {
            light: "#000000ff",
            dark: "#ffffffff"
        }
    });

    return url;
};
