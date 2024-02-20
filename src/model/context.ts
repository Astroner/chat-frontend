import { createContext } from 'react';

import { Network } from './network.class';
import { Storage } from './storage.class';
import { SmartStorage } from './smart-storage.class';

export const NetworkContext = createContext<Network>(null as any);
export const StorageContext = createContext<Storage>(null as any);
export const SmartStorageContext = createContext<SmartStorage>(null as any);
