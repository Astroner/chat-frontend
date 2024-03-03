import { Meta, StoryFn } from "@storybook/react";
import { useEffect, useMemo, useState } from "react";

import { NotificationEntry, NotificationsService } from "./notifications.service"
import { FieldConsumer, FormProvider, useController } from "@schematic-forms/react";
import { Str } from "@schematic-forms/core";

const meta: Meta = {
    title: "Services/Notifications",
}

export default meta;


export const Default: StoryFn = () => {
    const [notifications, setNotifications] = useState<ReadonlyArray<NotificationEntry>>([]);

    const service = useMemo(() => new NotificationsService(), []);
    
    const createNotificationForm = useController({
        fields: {
            text: Str(true)
        },
        submit({ text }) {
            service.addNotification(text);
        }
    })

    useEffect(() => {
        const sub = service.addEventListener(ev => {
            setNotifications(service.getNotifications());
        })

        return () => {
            sub.unsubscribe();
            service.destroy();
        }
    }, [service])

    return (
        <div>
            <FormProvider controller={createNotificationForm.controller}>
                <form onSubmit={e => (e.preventDefault(), createNotificationForm.submit(), createNotificationForm.clear())}>
                    <FieldConsumer field="text">
                        {({ value, setValue }) => (
                            <div>
                                <input placeholder="Text" value={value ?? ""} onChange={e => setValue(e.target.value)} />
                            </div>
                        )}
                    </FieldConsumer>
                    <button type="submit">Create Notification</button>
                </form>
            </FormProvider>
            <ul>
                {notifications.map(item => (
                    <li
                        key={item.id}
                        style={{
                            opacity: item.state === 'visible' ? 1 : 0,
                            height: item.state === 'visible' ? 50 : 0,
                            overflow: 'hidden',
                            transition: 'opacity .3s, height .3s',
                            border: '1px solid black'
                        }}
                    >{item.text}</li>
                ))}
            </ul>
        </div>
    )
}