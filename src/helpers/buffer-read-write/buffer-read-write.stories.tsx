import { Meta, StoryFn, StoryObj } from '@storybook/react';

import { BufferBuilder } from './buffer-builder.class';
import { BufferReader } from './buffer-reader.class';
import { useState } from 'react';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../arraybuffer-utils';

const meta: Meta<typeof BufferBuilder> = {
    title: 'helpers/Buffer Read Write',
};

export default meta;

export const Builder: StoryFn = () => {
    const [input, setInput] = useState('20');

    const [builder, setBuilder] = useState<BufferBuilder | null>();
    const [data, setData] = useState<string | null>(null);
    const [exported, setExported] = useState<string | null>(null);

    const update = () => {
        if (!builder) return;

        const str = Array.from(new Uint8Array(builder.getBuffer()))
            .map((n) => {
                const str = n.toString(16);

                return str.length < 2 ? '0' + str : str;
            })
            .join(' ');

        setData(str);
        setInput('');
    };

    const create = () => {
        setBuilder(new BufferBuilder(+input));

        setInput('');
    };

    const appendByte = () => {
        if (!builder) return;

        builder.appendByte(+input);

        update();
    };

    const appendUint16 = () => {
        if (!builder) return;

        builder.appendUint16(+input);

        update();
    };

    const appendString = () => {
        if (!builder) return;

        builder.appendString(input);

        update();
    };

    const exportData = () => {
        if (!builder) return;

        setExported(arrayBufferToBase64(builder.getBuffer()));
    };

    return (
        <div>
            <input
                placeholder={builder ? 'Data to write' : 'Buffer length'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            {!builder ? (
                <div>
                    <button onClick={create}>Create buffer</button>
                </div>
            ) : (
                <>
                    <div>
                        <button onClick={appendByte}>Append byte</button>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={appendUint16}>Append Uint16</button>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={appendString}>Append string</button>
                    </div>
                </>
            )}
            {data && (
                <div>
                    <h3>Data</h3>
                    {data}
                </div>
            )}
            {builder && (
                <div style={{ marginTop: 30 }}>
                    <button onClick={exportData}>Export to Base64</button>
                    {exported && (
                        <>
                            <h3>Base 64</h3>
                            {exported}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export const Reader: StoryFn = () => {
    const [input, setInput] = useState('');

    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [data, setData] = useState<string[]>([]);
    const [reader, setReader] = useState<BufferReader | null>(null);
    const [display, setDisplay] = useState('');

    const update = (buff = buffer, read = reader) => {
        if (!buff || !read) return;

        const str = Array.from(new Uint8Array(buff, read.getCursor()))
            .map((n) => {
                const str = n.toString(16);

                return str.length < 2 ? '0' + str : str;
            })
            .join(' ');

        setDisplay(str);
    };

    const init = () => {
        const buff = base64ToArrayBuffer(input);

        const reader = new BufferReader(buff);

        setBuffer(buff);
        setReader(reader);

        update(buff, reader);
    };

    const readByte = () => {
        if (!reader) return;

        const n = reader.readByte();

        setData((p) => p.concat([n + '']));

        update();
    };

    const readUint16 = () => {
        if (!reader) return;

        const n = reader.readUint16();

        setData((p) => p.concat([n + '']));

        update();
    };

    const readString = () => {
        if (!reader) return;

        const str = reader.readString();

        setData((p) => p.concat([str]));

        update();
    };

    return (
        <div>
            {display && (
                <>
                    <h3>Buffer:</h3>
                    <div>{display}</div>
                </>
            )}
            {!reader ? (
                <>
                    <input
                        placeholder="Buffer in base64"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <div>
                        <button onClick={init}>Create</button>
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <button onClick={readByte}>Read byte</button>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={readUint16}>Read Uint16</button>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={readString}>Read string</button>
                    </div>
                </>
            )}
            <h3>Read:</h3>
            <ul>{data?.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
    );
};
