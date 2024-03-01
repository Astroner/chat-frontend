import { env } from '../env';
import { Subscription } from '../helpers/types';

export type PushNotificationsState =
    | { type: 'denied' }
    | { type: 'not-asked' }
    | {
          type: 'granted';
          subscription: PushSubscription;
      };

export type ServiceWorkerServiceState =
    | { type: 'IDLE' }
    | { type: 'LOADING' }
    | {
          type: 'ACTIVE';
          pushNotifications: PushNotificationsState;
      };

export class ServiceWorkerService {
    private state: ServiceWorkerServiceState = { type: 'IDLE' };

    private listeners = new Set<VoidFunction>();

    private registration: ServiceWorkerRegistration | null = null;

    async init() {
        this.setState({ type: 'LOADING' });

        await navigator.serviceWorker.register('/service-worker.js');

        this.registration = await navigator.serviceWorker.ready;

        const pushState = await this.registration.pushManager.permissionState({
            userVisibleOnly: true,
            applicationServerKey: env.PUSH_PUBLIC_KEY,
        });

        let pushNotifications: PushNotificationsState;

        switch (pushState) {
            case 'denied':
                pushNotifications = { type: 'denied' };

                break;

            case 'prompt':
                pushNotifications = { type: 'not-asked' };

                break;

            case 'granted': {
                const subscription = await this.registration.pushManager.getSubscription();
                if(subscription) {
                    pushNotifications = {
                        type: 'granted',
                        subscription
                    }
                } else {
                    pushNotifications = {
                        type: 'not-asked',
                    }
                }

                break;
            }
        }

        this.setState({
            type: 'ACTIVE',
            pushNotifications,
        });

        return {
            type: 'ACTIVE',
            pushNotifications,
        };
    }

    getState(): Readonly<ServiceWorkerServiceState> {
        return this.state;
    }

    addKey(id: string, key: CryptoKey) {
        this.registration?.active?.postMessage({
            type: 'add-key',
            id,
            key,
        });
    }

    deleteKey(id: string) {
        this.registration?.active?.postMessage({
            type: 'delete-key',
            id,
        });
    }

    clearKeys() {
        this.registration?.active?.postMessage({
            type: 'delete-all',
        });
    }

    async pushSubscribe() {
        if (this.state.type !== 'ACTIVE' || !this.registration)
            return 'loading';

        if (this.state.pushNotifications.type === 'granted') {
            return this.state.pushNotifications.subscription.toJSON();
        } else if (this.state.pushNotifications.type === 'denied') {
            return 'denied';
        }
        try {
            const sub = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: env.PUSH_PUBLIC_KEY,
            });

            this.setState({
                ...this.state,
                pushNotifications: {
                    type: 'granted',
                    subscription: sub,
                },
            });

            return sub.toJSON();
        } catch {
            this.setState({
                ...this.state,
                pushNotifications: {
                    type: 'denied',
                },
            });

            return 'denied';
        }
    }

    async pushUnsubscribe() {
        if (
            this.state.type !== 'ACTIVE' ||
            this.state.pushNotifications.type !== 'granted'
        )
            return;

        await this.state.pushNotifications.subscription.unsubscribe();

        this.setState({
            ...this.state,
            pushNotifications: { type: 'not-asked' },
        });
    }

    subscribe(cb: VoidFunction): Subscription {
        this.listeners.add(cb);

        return {
            unsubscribe: () => {
                this.listeners.delete(cb);
            },
        };
    }

    private setState(state: ServiceWorkerServiceState) {
        this.state = state;

        this.listeners.forEach((cb) => cb());
    }
}
