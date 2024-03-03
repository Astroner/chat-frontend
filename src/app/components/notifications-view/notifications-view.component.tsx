import { FC, memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useNotifications } from '@/src/services/hooks';

import cn from './notifications-view.module.scss';

export type NotificationsViewProps = {};

export const NotificationsView: FC<NotificationsViewProps> = memo((props) => {
    const [notifications] = useNotifications();

    const [root, setRoot] = useState<null | Element>(null);

    useEffect(() => {
        setRoot(document.body);
    }, []);

    if (!root) return null;

    return createPortal(
        <div className={cn.root}>
            {notifications.map((item) => (
                <div
                    key={item.id}
                    className={cn['notification--' + item.state]}
                >
                    {item.text}
                </div>
            ))}
        </div>,
        root,
    );
});
