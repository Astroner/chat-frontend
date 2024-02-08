import { useEffect, useMemo, useState } from "react";
import { Meta, StoryObj } from "@storybook/react";
import { ErrorConsumer, FieldConsumer, FormProvider, useController, usePending } from "@schematic-forms/react";
import { Str } from "@schematic-forms/core";

import { HTTPClient } from "./http-client.class"
import { Contact } from "./http-client.responses";
import { RSASignKey } from "../../crypto/rsa-sign-key.class";

type StoryArgs = { 
    apiAddress: string
}

const meta: Meta<StoryArgs> = {
    title: "HTTP Client",
    args: {
        apiAddress: "http://localhost:4040/"
    }
}

export default meta;

type Story = StoryObj<StoryArgs>;

export const PostContact: Story = {
    render: (args) => {
        
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const client = useMemo(() => new HTTPClient(args.apiAddress), [args.apiAddress])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { controller, submit } = useController({
            fields: {
                name: Str(true),
                publicKey: Str(true),
                publicSign: Str(true)
            },
            submit: async data => {
                await client.postNewContact(data);
            }
        })


        return (
            <div>
                <FormProvider controller={controller}>
                    <FieldConsumer field="name">
                        {({ value, setValue }) => <textarea placeholder="name" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                    <FieldConsumer field="publicKey">
                        {({ value, setValue }) => <textarea placeholder="publicKey" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                    <FieldConsumer field="publicSign">
                        {({ value, setValue }) => <textarea placeholder="publicSign" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                    <ErrorConsumer>
                        {({ errorCode }) => errorCode}
                    </ErrorConsumer>
                    <button onClick={submit}>Submit</button>
                </FormProvider>
            </div>
        )
    }
}

export const FindContact: Story = {
    render: (args) => {

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [status, setStatus] = useState<Contact | "NOTHING" | "IDLE" | "LOADING">("IDLE");

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const client = useMemo(() => new HTTPClient(args.apiAddress), [args.apiAddress])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { controller, submit } = useController({
            fields: {
                name: Str(true),
            },
            submit: async ({ name }) => {
                setStatus("LOADING");
                const contact = await client.searchContact(name);

                if(contact) setStatus(contact.data)
                else setStatus("NOTHING")
            }
        })


        return (
            <div>
                <FormProvider controller={controller}>
                    <FieldConsumer field="name">
                        {({ value, setValue }) => <input placeholder="name" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                    <ErrorConsumer>
                        {({ errorCode }) => errorCode}
                    </ErrorConsumer>
                    <button onClick={submit} type="submit">Submit</button>
                    <div>
                        {
                            status === "IDLE"
                            ? "IDLE"
                            : status === "LOADING"
                            ? "Loading..."
                            : status === "NOTHING"
                            ? "Found none"
                            : (
                                <>
                                    <div style={{ marginBottom: "10px" }}>
                                        <div>Name</div>
                                        {status.name}
                                    </div>
                                    <div style={{ marginBottom: "10px" }}>
                                        <div>Public key</div>
                                        {status.publicKey}
                                    </div>
                                    <div style={{ marginBottom: "10px" }}>
                                        <div>Public sign</div>
                                        {status.publicSign}
                                    </div>
                                </>
                            )
                        }
                    </div>
                </FormProvider>
            </div>
        )
    },
}

export const UpdateContact: Story = {
    render: (args) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const client = useMemo(() => new HTTPClient(args.apiAddress), [args.apiAddress]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { controller, submit } = useController({
            fields: {
                name: Str(true),
                key: Str(true),
                newName: Str(),
                newPublicKey: Str(),
                newPublicSign: Str()
            },
            submit: async (data) => {
                const key = await RSASignKey.fromJSON(data.key);

                const update: Partial<Contact> = {
                    name: data.newName ? data.newName : undefined,
                    publicKey: data.newPublicKey ? data.newPublicKey : undefined,
                    publicSign: data.newPublicSign ? data.newPublicSign : undefined,
                }

                client.updateContact(data.name, update, key);
            }
        })

        return (
            <FormProvider controller={controller}>
                <div>
                    <FieldConsumer field="name">
                        {({ value, setValue }) => <input placeholder="Name" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="key">
                        {({ value, setValue }) => <textarea placeholder="JWK private key" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="newName">
                        {({ value, setValue }) => <input placeholder="New name" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="newPublicKey">
                        {({ value, setValue }) => <textarea placeholder="New JWK public key" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="newPublicSign">
                        {({ value, setValue }) => <textarea placeholder="New JWK public sign" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <button onClick={submit}>Submit</button>
                </div>
            </FormProvider>
        )
    }
}

export const DeleteContact: Story = {
    render: (args) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const client = useMemo(() => new HTTPClient(args.apiAddress), [args.apiAddress]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { controller, submit } = useController({
            fields: {
                name: Str(true),
                key: Str(true),
            },
            submit: async (data) => {
                const key = await RSASignKey.fromJSON(data.key);
                
                await client.deleteContact(data.name, key);
            }
        })

        return (
            <FormProvider controller={controller}>
                <div>
                    <FieldConsumer field="name">
                        {({ value, setValue }) => <input placeholder="name" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <FieldConsumer field="key">
                        {({ value, setValue }) => <textarea placeholder="Private JWK key" value={value} onChange={e => setValue(e.target.value)} />}
                    </FieldConsumer>
                </div>
                <div>
                    <button onClick={submit}>Submit</button>
                </div>
            </FormProvider>
        )
    }
}
