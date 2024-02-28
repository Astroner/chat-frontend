"use client"

import { HomeLink } from "@/src/components/home-link.component";
import { Button } from "@/src/components/button/button.component";
import { ButtonLink } from "@/src/components/button-link/button-link.component";

import cn from "./page.module.scss";

export default function SettingsPage() {
    return (
        <>
            <header className={cn.header}>
                <HomeLink className={cn.home} color="purple" />
                <h1>Settings</h1>
            </header>
            <main className={cn.root}>
                <div className={cn.list}>
                    <ButtonLink href="/console" color="orange">Developer Console</ButtonLink>
                </div>
            </main>
        </>
    )
}