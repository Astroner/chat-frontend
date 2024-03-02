import { useContext, useEffect, useState } from 'react';

import { ServiceWorkerContext, WindowFocusContext } from './context';
import {
    ServiceWorkerService,
    ServiceWorkerServiceState,
} from './service-worker.service';

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

export const useWindowFocus = () => {
    const service = useContext(WindowFocusContext);

    const [state, setState] = useState(() => service.getState());

    useEffect(() => {
        const sub = service.subscribe(() => setState(service.getState()))

        return () => {
            sub.unsubscribe()
        }
    }, [service])

    return state;
}