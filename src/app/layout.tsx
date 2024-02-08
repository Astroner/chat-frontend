"use client"

import { Inter } from 'next/font/google';
import 'normalize.css';

import './globals.scss';

const inter = Inter({ subsets: ['latin'] });

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
                <main>{children}</main>
            </body>
        </html>
    );
}
