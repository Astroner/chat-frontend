import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Chat',
        start_url: '/',
        display: 'standalone',
        background_color: '#000',
        theme_color: '#575068',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '64x64',
                type: 'image/x-icon',
            },
            {
                src: '/hr.webp',
                sizes: '256x256',
                type: 'image/webp',
            },
        ],
    };
}
