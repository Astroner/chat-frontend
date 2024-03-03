import { Meta, StoryFn, StoryObj } from "@storybook/react";

import { NotificationsView } from "./notifications-view.component"
import { useEffect, useMemo } from "react";
import { NotificationsService } from "@/src/services/notifications/notifications.service";
import { NotificationsContext } from "@/src/services/context";

const meta: Meta<typeof NotificationsView> = {
    title: "Components/NotificationsView",
    component: NotificationsView,
}

export default meta;

export const Default: StoryFn = () => {
    const notifications = useMemo(() => new NotificationsService(), []);

    useEffect(() => {
        const t = setInterval(() => {
            const text = new Array(Math.ceil(Math.random() * 100)).fill(null).map(() => {
                const workLength = Math.ceil(Math.random() * 20);

                return new Array(workLength).fill('t').join('')
            }).join(' ');

            notifications.addNotification(text);
        }, 1000);

        return () => {
            clearInterval(t);
        }
    }, [notifications])

    return (
        <NotificationsContext.Provider value={notifications}>
            <NotificationsView />
        </NotificationsContext.Provider>
    )
}