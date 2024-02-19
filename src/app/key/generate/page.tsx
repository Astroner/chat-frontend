"use client"

import { FormProvider, useController, usePending } from "@schematic-forms/react";
import { Str } from "@schematic-forms/core";
import { useRouter } from "next/navigation";

import { useStorage } from "@/src/model/hooks";

import { Button } from "@/src/components/button/button.component";
import { FormInput } from "@/src/components/form/form-input.component";

import { DotsLoader } from "../../components/dots-loader/dots-loader.component";

import cn from "./page.module.scss";

export default function Generate() {
    const [, storage] = useStorage();
    const router = useRouter();

    const { controller, submit } = useController({
        fields: {
            keyName: Str(true, "")
        },
        async submit({ keyName }) {
            const state = storage.getState();

            if(state.type !== "READY") return;

            const { id } = await state.published.issueKey(keyName);

            router.push(`/key?id=${id}`)
        }
    })

    const { isPending } = usePending(controller);

    return (
        <main className={cn.root}>
            <FormProvider controller={controller}>
                {
                    !isPending 
                    ? (
                        <form className={cn.container} onSubmit={e => (e.preventDefault(), submit())}>
                            <h1>Generating invite</h1>
                            <FormInput field="keyName" placeholder="Invite Name" />
                            <Button submit color="orange" >Generate</Button>
                        </form>
                    )
                    : (
                        <DotsLoader style={{ width: "100%", height: "100%" }} />
                    )
                }
            </FormProvider>
        </main>
    )
}