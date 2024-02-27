import { createContext } from "react";
import { ServiceWorkerService } from "./service-worker.service";

export const ServiceWorkerContext = createContext<ServiceWorkerService>(null as any);