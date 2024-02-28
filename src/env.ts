const createEnv = () => {
    const serverURL = new URL(
        process.env.NEXT_PUBLIC_API_ADDRESS ?? 'http://localhost:3030',
    );

    const WS_ADDRESS = `${serverURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${serverURL.host}/connect`;

    return {
        API_ADDRESS: serverURL.toString(),
        WS_ADDRESS,
        NODE_ENV: process.env.NODE_ENV,
        PUSH_PUBLIC_KEY: process.env.NEXT_PUBLIC_PUSH_PUBLIC_KEY ?? 'error',
    };
};

export type EnvType = ReturnType<typeof createEnv>;

export const env = createEnv();
