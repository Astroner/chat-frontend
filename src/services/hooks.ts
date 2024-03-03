import { useContext, useEffect, useState } from 'react';

import {
    NotificationsContext,
    ServiceWorkerContext,
    WindowFocusContext,
} from './context';
import {
    ServiceWorkerService,
    ServiceWorkerServiceState,
} from './service-worker.service';
import {
    NotificationEntry,
    NotificationsService,
} from './notifications/notifications.service';
import { WindowFocusService } from './window-focus.service';

export const useServiceWorker = (): [
    ServiceWorkerServiceState,
    ServiceWorkerService,
] => {
    const service = useContext(ServiceWorkerContext);

    const [state, setState] = useState(() => service.getState());

    useEffect(() => {
        const sub = service.subscribe(() => setState(service.getState()));

        return () => {
            sub.unsubscribe();
        };
    }, [service]);

    return [state, service];
};

export const useWindowFocus = (
    disableUpdates?: 'NO_UPDATES',
): [DocumentVisibilityState, WindowFocusService] => {
    const service = useContext(WindowFocusContext);

    const [state, setState] = useState(() => service.getState());

    useEffect(() => {
        if (disableUpdates) return;

        const sub = service.subscribe(() => setState(service.getState()));

        return () => {
            sub.unsubscribe();
        };
    }, [service, disableUpdates]);

    return [state, service];
};

export const useNotifications = (
    disableUpdates?: 'NO_UPDATES',
): [ReadonlyArray<NotificationEntry>, NotificationsService] => {
    const service = useContext(NotificationsContext);

    const [notifications, setNotifications] = useState(() =>
        service.getNotifications(),
    );

    useEffect(() => {
        if (disableUpdates) return;

        setNotifications(service.getNotifications());

        const sub = service.addEventListener(() =>
            setNotifications(service.getNotifications()),
        );

        return () => {
            sub.unsubscribe();
        };
    }, [service, disableUpdates]);

    return [notifications, service];
};
