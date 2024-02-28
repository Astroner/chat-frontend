"use client"

import { useEffect, useMemo, useState } from "react";

import { getDevtools } from "@/src/devtools";
import { HomeLink } from "@/src/components/home-link.component";
import { Button } from "@/src/components/button/button.component";

import cn from "./page.module.scss";

export default function ConsolePage() {

    const [logs, setLogs] = useState(() => getDevtools().console.getEntries());

    useEffect(() => {
        const sub = getDevtools().console.addEventListener(ev => {
            switch(ev.type) {
                case "entry":
                    setLogs((p) => [...p, ev.entry]);
                    break;
            }
        })

        return () => {
            sub.unsubscribe();
        }
    }, [])


    const entries = useMemo(() => {
        const lines = [];

        for(const log of logs) {
            lines.push(log.args.join(" "))
        }

        return lines;
    }, [logs])

    return (
        <>
            <header className={cn.header}>
                <HomeLink className={cn.home} color="purple" />
                <h1>Console</h1>
            </header>
            <main className={cn.root}>
                <div className={cn.list}>
                    {entries.map((entry, i) => (
                        <div key={i}>
                            {entry}
                        </div>
                    ))}
                </div>
            </main>
        </>
    )
}