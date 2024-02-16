import { Meta, StoryFn, StoryObj } from '@storybook/react';

import { PublishedKeysManager } from './published-keys-manager.class';
import { useState } from 'react';
import { KeysIndex } from '../../crypto/keys-index/keys-index.class';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
} from '../../arraybuffer-utils';

const meta: Meta = {
    title: 'Storage/Published Keys Manager',
};

export default meta;

export const Default: StoryFn = () => {
    const [initData, setInitData] = useState('');

    const [published, setPublished] = useState<PublishedKeysManager | null>(
        null,
    );
    const [keys, setKeys] = useState<string[]>([]);
    const [exported, setExported] = useState('');

    const create = async () => {
        if (!initData)
            return setPublished(new PublishedKeysManager(new KeysIndex()));
        const buffer = base64ToArrayBuffer(initData);

        const storage = await PublishedKeysManager.import(
            buffer,
            new KeysIndex(),
        );

        setKeys(storage.getAll().map((a) => a.id));

        setPublished(storage);
    };

    const issueKey = async () => {
        if (!published) return;

        const info = await published.issueKey();

        setKeys((p) => p.concat([info.id]));
    };

    const exportData = async () => {
        if (!published) return;

        const data = await published.export();

        setExported(arrayBufferToBase64(data));
    };

    return (
        <div>
            {!published ? (
                <>
                    <div>
                        <textarea
                            placeholder="Data to import Base64"
                            value={initData}
                            onChange={(e) => setInitData(e.target.value)}
                        />
                    </div>
                    <button onClick={create}>Create</button>
                </>
            ) : (
                <>
                    <button onClick={issueKey}>Issue new key</button>
                    <h3>Keys</h3>
                    <ul>
                        {keys.map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                    <div style={{ marginTop: 30 }}>
                        <button onClick={exportData}>Export</button>
                        {exported && (
                            <>
                                <h3>Exported</h3>
                                <button
                                    onClick={() =>
                                        navigator.clipboard.writeText(exported)
                                    }
                                >
                                    Copy to clipboard
                                </button>
                                <div
                                    style={{
                                        width: 500,
                                        wordWrap: 'break-word',
                                    }}
                                >
                                    {exported}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
