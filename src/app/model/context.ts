import { createContext } from 'react';

import { Network } from './network.class';
import { Storage } from './storage.class';

export const NetworkContext = createContext<Network>(null as any);
export const StorageContext = createContext<Storage>(null as any);
