"use client"

import { useCallback, useEffect, useState } from "react";
import { HomeLink } from "@/src/components/home-link.component";

import { Switch } from "@/src/components/switch/switch.component";
import { useServiceWorker } from "@/src/services/hooks";
import { useNetwork, useStorage } from "@/src/model/hooks";

import cn from "./page.module.scss";

export default function SettingsPage() {
    const [serviceWorkerState, serviceWorker] = useServiceWorker();
    const [storage] = useStorage();
    const [networkState, network] = useNetwork();
    const [onlineOnStartup, setOnlineOnStartup] = useState(() => {
        if(storage.type !== "READY") return false;

        return storage.common.getData().onlineOnStartup;
    });

    const togglePush = useCallback(async (enable: boolean) => {
        if(serviceWorkerState.type !== "ACTIVE" || storage.type !== "READY") return;

        if(enable) {
            const result = await serviceWorker.pushSubscribe();
            if(typeof result !== 'object') return;

            let http;
            if(networkState.type !== "READY") {
                const { http: initHttp } = await network.init(storage.connections, storage.published, storage.common);

                http = initHttp;
            } else {
                http = networkState.http
            }

            if(!result.endpoint || !result.keys) return;

            const { id: pushSubscriptionID } = await http.addPushSubscription(
                result.endpoint,
                result.keys.p256dh,
                result.keys.auth
            )

            storage.common.setData({
                ...storage.common.getData(),
                pushSubscriptionID
            })
        } else {
            serviceWorker.pushUnsubscribe();
            serviceWorker.clearKeys();
            const { pushSubscriptionID } = storage.common.getData();
            if(pushSubscriptionID && networkState.type === "READY") {
                networkState.http.deletePushSubscription(pushSubscriptionID);
            }
        }
    }, [serviceWorker, serviceWorkerState, storage, networkState, network])

    const toggleOnlineOnStartup = useCallback(async (value: boolean) => {
        if(storage.type !== "READY") return;

        storage.common.setData({
            ...storage.common.getData(),
            onlineOnStartup: value
        })  

        const networkState = network.getState();

        if(value) {  
            if(networkState.type === "IDLE") {
                await network.init(storage.connections, storage.published, storage.common);
            }
        }
    }, [storage, network])

    useEffect(() => {
        if(storage.type !== "READY") return;

        const sub = storage.common.subscribe(() => setOnlineOnStartup(storage.common.getData().onlineOnStartup));


        return () => {
            sub.unsubscribe()
        }
    }, [storage])

    if(serviceWorkerState.type !== "ACTIVE" || storage.type !== "READY") return null;
    return (
        <>
            <header className={cn.header}>
                <HomeLink className={cn.home} color="purple" />
                <h1>Settings</h1>
            </header>
            <main className={cn.root}>
                <div className={cn.list}>
                    <div className={cn.item}>
                        <h2>Push notifications</h2>
                        <Switch 
                            disabled={serviceWorkerState.pushNotifications.type === "denied"}
                            size="small"
                            value={serviceWorkerState.pushNotifications.type === "granted"}
                            onChange={togglePush}
                        />
                    </div>
                    {serviceWorkerState.pushNotifications.type === "denied" && (
                        <div>Push notifications are not allowed</div>
                    )}
                    <div className={cn.item}>
                        <h2>Go online on startup</h2>
                        <Switch 
                            size="small"
                            value={onlineOnStartup}
                            onChange={toggleOnlineOnStartup}
                        />
                    </div>
                </div>
            </main>
        </>
    )
}