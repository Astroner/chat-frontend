import { createContext } from 'react';
import { ServiceWorkerService } from './service-worker.service';
import { WindowFocusService } from './window-focus.service';

export const ServiceWorkerContext = createContext<ServiceWorkerService>(
    null as any,
);

export const WindowFocusContext = createContext<WindowFocusService>(null as any);