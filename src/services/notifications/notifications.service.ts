import {
    EventListener,
    EventTemplate,
    Subscription,
} from '../../helpers/types';

export type NotificationData = {
    id: string;
    text: string;
};

export type NotificationEntry = NotificationData & {
    state: 'visible' | 'closing';
};

export type NotificationEvent =
    | EventTemplate<'new-notification', NotificationData>
    | EventTemplate<'notification-begin-close', NotificationData>
    | EventTemplate<'notification-removed', NotificationData>;

export class NotificationsService {
    static NOTIFICATION_DURATION_MS = 3000;
    static NOTIFICATION_CLOSE_DURATION_MS = 300;

    private listeners = new Set<EventListener<NotificationEvent>>();

    private COUNTER = 0;

    private notifications = new Map<string, NotificationEntry>();

    private timeouts = new Set<NodeJS.Timeout>();

    private notificationsDisabled = false;

    destroy() {
        this.listeners.clear();
        this.timeouts.forEach((t) => clearTimeout(t));
    }

    enableNotifications() {
        this.notificationsDisabled = false;
    }

    disableNotifications() {
        this.notificationsDisabled = true;
    }

    addNotification(text: string) {
        if(this.notificationsDisabled) return;

        const id = '' + this.COUNTER++;

        this.notifications.set(id, {
            id,
            state: 'visible',
            text,
        });

        this.timeouts.add(
            setTimeout(() => {
                this.notifications.set(id, {
                    id,
                    state: 'closing',
                    text,
                });

                this.sendEvent({
                    type: 'notification-begin-close',
                    id,
                    text,
                });

                this.timeouts.add(
                    setTimeout(() => {
                        this.notifications.delete(id);

                        this.sendEvent({
                            type: 'notification-removed',
                            id,
                            text,
                        });
                    }, NotificationsService.NOTIFICATION_CLOSE_DURATION_MS),
                );
            }, NotificationsService.NOTIFICATION_DURATION_MS),
        );

        queueMicrotask(() => {
            this.sendEvent({
                type: 'new-notification',
                id,
                text,
            });
        });

        return id;
    }

    getNotifications(): ReadonlyArray<NotificationEntry> {
        return Array.from(this.notifications.values());
    }

    addEventListener(listener: EventListener<NotificationEvent>): Subscription {
        this.listeners.add(listener);

        return {
            unsubscribe: () => this.listeners.delete(listener),
        };
    }

    private sendEvent(ev: NotificationEvent) {
        this.listeners.forEach((cb) => cb(ev));
    }
}
