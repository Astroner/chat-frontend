import { Meta, StoryFn } from "@storybook/react";

import { ConnectionsManager } from "./connections-manager.class"
import { useEffect } from "react";
import { AesGcmKey } from "../../crypto/aes-gcm/aes-gcm-key.class";
import { ECDHKey } from "../../crypto/ecdh/ecdh-key.class";

const meta: Meta = {
    title: "Storage/Connections Manager",
}

export default meta;


export const Default: StoryFn = () => {
    useEffect(() => {
        (async () => {
            const manager = new ConnectionsManager();            
            await manager.createNewConnectionRequest();

            const { id } = await manager.createNewConnectionRequest();
            const connection = manager.getConnection(id);
            if(connection?.isRequested()) {
                const { publicKey } = await ECDHKey.generatePair();
                await connection.confirm(publicKey)
            }
            console.log("created", manager);

            const buffer = await manager.export();

            console.log(new Uint8Array(buffer));

            const imported = await ConnectionsManager.import(buffer);

            console.log("imported", imported);
        })()
    }, [])

    return (
        <div>
            Check console
        </div>
    )
}