"use client"

import { HomeLink } from "@/src/components/home-link.component";

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

                </div>
            </main>
        </>
    )
}