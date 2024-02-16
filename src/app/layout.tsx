'use client';

import { Inter } from 'next/font/google';
import 'normalize.css';

import './globals.scss';

const inter = Inter({ subsets: ['latin'] });

const STORAGE_KEY = "memes_and_prekols"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <html lang="en">
            <head>
                <title>Chat</title>
            </head>
            <body className={inter.className}>
                {children}
            </body>
        </html>
    );
}
