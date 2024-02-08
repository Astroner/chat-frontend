const createEnv = () => {
    const serverURL = new URL(process.env.NEXT_PUBLIC_API_ADDRESS ?? "http://localhost:3030");

    const WS_ADDRESS = `ws://${serverURL.host}/connect`;

    return {
        API_ADDRESS: serverURL.toString(),
        WS_ADDRESS
    }
}

export type EnvType = ReturnType<typeof createEnv>;

export const env = createEnv();
